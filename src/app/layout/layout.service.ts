import { DOCUMENT } from '@angular/common';
import { DestroyRef, inject, Injectable, InjectionToken, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

/** Media query matching the mobile layout; keep in sync with `$ml-mobile-breakpoint`. */
export const LAYOUT_MOBILE_QUERY = new InjectionToken<string>('LAYOUT_MOBILE_QUERY', {
  factory: () => '(max-width: 768px)',
});

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

  closeMobile(): void {
    this.mobileOpen.set(false);
  }
}
