import { DOCUMENT } from '@angular/common';
import {
  computed,
  DestroyRef,
  effect,
  inject,
  Injectable,
  InjectionToken,
  signal,
} from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

/** Media query matching the mobile layout; keep in sync with `$ml-mobile-breakpoint`. */
export const LAYOUT_MOBILE_QUERY = new InjectionToken<string>('LAYOUT_MOBILE_QUERY', {
  factory: () => '(max-width: 768px)',
});

/** Smallest, largest, default and step of the base font size, in px. */
export const LAYOUT_MIN_FONT_SIZE = 10;
export const LAYOUT_MAX_FONT_SIZE = 20;
export const LAYOUT_DEFAULT_FONT_SIZE = 16;
export const LAYOUT_FONT_SIZE_STEP = 1;

@Injectable({ providedIn: 'root' })
export class LayoutService {
  // matchMedia is unavailable outside real browsers (SSR, jsdom).
  private readonly mediaQuery = inject(DOCUMENT).defaultView?.matchMedia?.(
    inject(LAYOUT_MOBILE_QUERY),
  );

  readonly isMobile = signal(this.mediaQuery?.matches ?? false);
  readonly mini = signal(false);
  readonly mobileOpen = signal(false);
  /**
   * True for a couple of frames after the breakpoint changes, so the layout can switch between
   * the desktop and mobile sidebar without animating (no expand + slide-away flash).
   */
  readonly breakpointChanging = signal(false);

  /**
   * Base font size in px, written to the root element. Every layout token is sized in `rem`,
   * so this scales the whole UI, not just the text.
   */
  readonly fontSize = signal(LAYOUT_DEFAULT_FONT_SIZE);
  readonly minFontSize = LAYOUT_MIN_FONT_SIZE;
  readonly maxFontSize = LAYOUT_MAX_FONT_SIZE;
  readonly canShrinkFont = computed(() => this.fontSize() > LAYOUT_MIN_FONT_SIZE);
  readonly canGrowFont = computed(() => this.fontSize() < LAYOUT_MAX_FONT_SIZE);

  private readonly window = inject(DOCUMENT).defaultView;
  private frame = 0;

  constructor() {
    const onChange = (event: MediaQueryListEvent) => {
      this.breakpointChanging.set(true);
      this.isMobile.set(event.matches);
      this.mobileOpen.set(false);
      this.endBreakpointChange();
    };
    this.mediaQuery?.addEventListener('change', onChange);
    inject(DestroyRef).onDestroy(() => {
      this.mediaQuery?.removeEventListener('change', onChange);
      this.window?.cancelAnimationFrame(this.frame);
    });

    inject(Router)
      .events.pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => this.closeMobile());

    const root = inject(DOCUMENT).documentElement;
    effect(() => (root.style.fontSize = `${this.fontSize()}px`));
  }

  /** Re-enable transitions after two frames: one renders the new layout, the next is safe. */
  private endBreakpointChange(): void {
    const win = this.window;
    if (!win) {
      this.breakpointChanging.set(false);
      return;
    }
    win.cancelAnimationFrame(this.frame);
    this.frame = win.requestAnimationFrame(() => {
      this.frame = win.requestAnimationFrame(() => this.breakpointChanging.set(false));
    });
  }

  toggle(): void {
    if (this.isMobile()) {
      this.mobileOpen.update((open) => !open);
    } else {
      this.mini.update((mini) => !mini);
    }
  }

  /** Clamped to [`minFontSize`, `maxFontSize`] and rounded to whole px. */
  setFontSize(px: number): void {
    const size = Math.round(px);
    this.fontSize.set(Math.min(LAYOUT_MAX_FONT_SIZE, Math.max(LAYOUT_MIN_FONT_SIZE, size)));
  }

  /** Steps the base font size by `LAYOUT_FONT_SIZE_STEP` px; a negative `steps` shrinks it. */
  changeFontSize(steps = 1): void {
    this.setFontSize(this.fontSize() + steps * LAYOUT_FONT_SIZE_STEP);
  }

  resetFontSize(): void {
    this.fontSize.set(LAYOUT_DEFAULT_FONT_SIZE);
  }

  closeMobile(): void {
    this.mobileOpen.set(false);
  }
}
