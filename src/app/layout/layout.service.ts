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

/** Media query matching the system dark preference; keep in sync with `_theme.scss`. */
export const LAYOUT_DARK_QUERY = new InjectionToken<string>('LAYOUT_DARK_QUERY', {
  factory: () => '(prefers-color-scheme: dark)',
});

export type LayoutTheme = 'light' | 'dark';

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
  private readonly darkQuery = inject(DOCUMENT).defaultView?.matchMedia?.(
    inject(LAYOUT_DARK_QUERY),
  );

  /** The system preference, kept up to date; used until the user picks a theme. */
  private readonly systemTheme = signal<LayoutTheme>(this.darkQuery?.matches ? 'dark' : 'light');
  /** The user's choice, or `null` while the system preference is still in charge. */
  private readonly chosenTheme = signal<LayoutTheme | null>(null);

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

  /** The theme in effect: the user's choice, else the system preference. */
  readonly theme = computed<LayoutTheme>(() => this.chosenTheme() ?? this.systemTheme());
  readonly isDark = computed(() => this.theme() === 'dark');
  /** True while the theme still follows the system preference. */
  readonly followsSystemTheme = computed(() => this.chosenTheme() === null);

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

    const onSchemeChange = (event: MediaQueryListEvent) =>
      this.systemTheme.set(event.matches ? 'dark' : 'light');
    this.darkQuery?.addEventListener('change', onSchemeChange);

    inject(DestroyRef).onDestroy(() => {
      this.mediaQuery?.removeEventListener('change', onChange);
      this.darkQuery?.removeEventListener('change', onSchemeChange);
      this.window?.cancelAnimationFrame(this.frame);
    });

    inject(Router)
      .events.pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => this.closeMobile());

    const root = inject(DOCUMENT).documentElement;
    effect(() => (root.style.fontSize = `${this.fontSize()}px`));
    // `_theme.scss` reads the attribute; writing it also pins the theme against later system
    // changes once the user has chosen one.
    effect(() => root.setAttribute('data-theme', this.theme()));
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

  setTheme(theme: LayoutTheme): void {
    this.chosenTheme.set(theme);
  }

  toggleTheme(): void {
    this.setTheme(this.isDark() ? 'light' : 'dark');
  }

  /** Hands the theme back to the system preference. */
  useSystemTheme(): void {
    this.chosenTheme.set(null);
  }

  closeMobile(): void {
    this.mobileOpen.set(false);
  }
}
