import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  Signal,
  signal,
  untracked,
  ViewEncapsulation,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import {
  ActivatedRoute,
  isActive,
  IsActiveMatchOptions,
  Router,
  RouterLink,
  RouterLinkActive,
  UrlTree,
} from '@angular/router';
import { MenuAutoExpand, MenuItemClickEvent, MenuItemModel, SubMenuItemModel } from '../menu.model';

type RouterLinkEntry = SubMenuItemModel & Required<Pick<SubMenuItemModel, 'routerLink'>>;

let nextSubmenuId = 0;

const EXACT_MATCH: IsActiveMatchOptions = {
  paths: 'exact',
  queryParams: 'exact',
  fragment: 'ignored',
  matrixParams: 'ignored',
};

const SUBSET_MATCH: IsActiveMatchOptions = {
  paths: 'subset',
  queryParams: 'subset',
  fragment: 'ignored',
  matrixParams: 'ignored',
};

@Component({
  selector: 'app-side-menu',
  imports: [RouterLink, RouterLinkActive, NgTemplateOutlet],
  templateUrl: './side-menu.html',
  styleUrl: './side-menu.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'side-menu',
    '[class.side-menu--mini]': 'mini()',
  },
})
export class SideMenu {
  readonly items = input.required<MenuItemModel[]>();
  /** Items pinned to the top of the menu; they don't scroll with `items`. */
  readonly headerItems = input<MenuItemModel[]>([]);
  /** Items pinned to the bottom of the menu; they don't scroll with `items`. */
  readonly footerItems = input<MenuItemModel[]>([]);
  /** Icons-only mode; child items are shown in a flyout on hover. Supports `[(mini)]`. */
  readonly mini = model(false);
  /** In mini mode, hide a flyout once one of its links is clicked (until the pointer leaves). */
  readonly closeFlyoutOnClick = input(true);
  /**
   * Ids of expanded items (expanded mode); several can be open at once. Supports two-way binding.
   * Seeded by each item's `expanded` flag and by `autoExpand`.
   */
  readonly expandedMenuItems = model<string[]>([]);
  /** Which URL match auto-expands an item with sub items (see `MenuAutoExpand`). */
  readonly autoExpand = input<MenuAutoExpand>('prefix');

  /**
   * Emitted when a main item, sub item or flyout title link is clicked (not the expand/collapse
   * chevron button), right after the entry's `command`. Emitted before the router navigates.
   */
  readonly menuItemClick = output<MenuItemClickEvent>();

  private readonly router = inject(Router);
  /** Same default base as `RouterLink` uses for relative commands. */
  private readonly route = inject(ActivatedRoute);

  /** Per item with sub items: "is this sub item active" signals (parent highlight). */
  private readonly childActive = computed(() =>
    this.childMatchers((child) => this.matchOptions(child)),
  );

  /** Per item with sub items: "should this sub item expand its parent" signals. */
  private readonly childExpands = computed(() => {
    const mode = this.autoExpand();
    if (mode === 'none') {
      return new Map<MenuItemModel, Signal<boolean>[]>();
    }
    const paths = mode === 'full' ? 'exact' : 'subset';
    return this.childMatchers((child) => ({ ...this.matchOptions(child), paths }));
  });

  /** Expanded state of items without an `id` (they can't be listed in `expandedMenuItems`). */
  private readonly expandedWithoutId = signal<ReadonlySet<MenuItemModel>>(new Set());

  /**
   * Last `expanded` flag seen per item; the flag is applied again whenever it changes. Keyed like
   * the expanded state itself: by `id`, or by object identity for entries without one.
   */
  private readonly seenExpandedById = new Map<string, boolean>();
  private readonly seenExpanded = new WeakMap<MenuItemModel, boolean>();

  /** Generated DOM ids of the inline submenus. */
  private readonly submenuIds = new WeakMap<MenuItemModel, string>();

  /** Item whose flyout was closed by a click; reset when the pointer or focus leaves it. */
  protected readonly closedFlyout = signal<MenuItemModel | null>(null);

  constructor() {
    // Apply each item's `expanded` flag: when the item first appears, and again whenever the
    // flag changes. In between the user owns the state, so the flag is only read, never written.
    effect(() => {
      const menu = [...this.headerItems(), ...this.items(), ...this.footerItems()];
      untracked(() => {
        for (const item of menu) {
          if (item.separator || !item.children?.length) {
            continue;
          }
          const expanded = !!item.expanded;
          const seen = this.seenExpandedFlag(item);
          if (seen === expanded) {
            continue;
          }
          this.markExpandedFlagSeen(item, expanded);
          // On first sight only `true` acts, so a missing flag doesn't fight `autoExpand`.
          if (seen === undefined && !expanded) {
            continue;
          }
          if (expanded !== this.isOpen(item)) {
            this.toggle(item);
          }
        }
      });
    });

    // Expand the items whose sub item matches the current URL (per `autoExpand`).
    effect(() => {
      const matched: MenuItemModel[] = [];
      for (const [item, matches] of this.childExpands()) {
        if (matches.some((match) => match())) {
          matched.push(item);
        }
      }
      untracked(() => {
        const missing = matched.filter((item) => !this.isOpen(item));
        const ids = missing.flatMap((item) => (item.id === undefined ? [] : [item.id]));
        const withoutId = missing.filter((item) => item.id === undefined);
        if (ids.length) {
          this.expandedMenuItems.update((expanded) => [...expanded, ...ids]);
        }
        if (withoutId.length) {
          this.expandedWithoutId.update((set) => new Set([...set, ...withoutId]));
        }
      });
    });
  }

  /** Item under the pointer (mini mode), kept to re-position its flyout while scrolling. */
  private hoveredItem: HTMLElement | null = null;

  /**
   * Flyouts are `position: fixed` so the scrollable nav doesn't clip them; place the flyout
   * next to its item and keep it inside the viewport.
   */
  protected positionFlyout(event: Event): void {
    if (!this.mini()) {
      return;
    }
    const li = event.currentTarget as HTMLElement;
    if (event.type === 'mouseenter') {
      this.hoveredItem = li;
    }
    this.place(li);
  }

  protected onNavScroll(): void {
    if (this.hoveredItem) {
      this.place(this.hoveredItem);
    }
  }

  protected clearHovered(): void {
    this.hoveredItem = null;
  }

  private place(li: HTMLElement): void {
    const flyout = li.querySelector<HTMLElement>(':scope > .side-menu__flyout');
    if (!flyout) {
      return;
    }
    const rect = li.getBoundingClientRect();
    const viewportHeight = li.ownerDocument.documentElement.clientHeight;
    const margin = 16;
    const top = Math.max(margin, Math.min(rect.top, viewportHeight - flyout.offsetHeight - margin));
    li.style.setProperty('--ml-flyout-top', `${top}px`);
    li.style.setProperty('--ml-flyout-left', `${rect.right}px`);
  }

  protected onItemClick(item: MenuItemModel | SubMenuItemModel, event: MouseEvent): void {
    // Anchors can't be disabled natively, so block the click here for every kind of entry.
    if (item.disabled) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    item.command?.(event);
    this.menuItemClick.emit({ item, event });
  }

  protected onButtonClick(item: MenuItemModel): void {
    // In mini mode the sub items live in the hover flyout; there is nothing to expand.
    if (!this.mini() && item.children?.length) {
      this.toggle(item);
    }
  }

  protected onFlyoutClick(item: MenuItemModel, event: MouseEvent): void {
    // Only links and sub item buttons close the flyout; a button item's title is plain text.
    const trigger = (event.target as Element).closest('a, button');
    if (trigger?.getAttribute('aria-disabled') === 'true') {
      return;
    }
    if (trigger && this.mini() && this.closeFlyoutOnClick()) {
      this.closedFlyout.set(item);
    }
  }

  protected resetFlyout(item: MenuItemModel, event: FocusEvent | MouseEvent): void {
    const target = event.relatedTarget as Node | null;
    // Hiding the flyout drops focus to <body> (focusout without a target); ignore that one.
    const ignore = event.type === 'focusout' && !target;
    const li = event.currentTarget as HTMLElement;
    if (this.closedFlyout() === item && !ignore && !li.contains(target)) {
      this.closedFlyout.set(null);
    }
  }

  private seenExpandedFlag(item: MenuItemModel): boolean | undefined {
    const id = item.id;
    return id === undefined ? this.seenExpanded.get(item) : this.seenExpandedById.get(id);
  }

  private markExpandedFlagSeen(item: MenuItemModel, expanded: boolean): void {
    const id = item.id;
    if (id === undefined) {
      this.seenExpanded.set(item, expanded);
    } else {
      this.seenExpandedById.set(id, expanded);
    }
  }

  protected isOpen(item: MenuItemModel): boolean {
    const id = item.id;
    return id === undefined
      ? this.expandedWithoutId().has(item)
      : this.expandedMenuItems().includes(id);
  }

  /** Expand/collapse arrow: toggles only, the click never reaches the item itself. */
  protected onToggleClick(item: MenuItemModel, event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();
    this.toggle(item);
  }

  protected toggle(item: MenuItemModel): void {
    const itemId = item.id;
    if (itemId === undefined) {
      this.expandedWithoutId.update((set) => {
        const next = new Set(set);
        if (!next.delete(item)) {
          next.add(item);
        }
        return next;
      });
      return;
    }
    this.expandedMenuItems.update((ids) =>
      ids.includes(itemId) ? ids.filter((id) => id !== itemId) : [...ids, itemId],
    );
  }

  /** DOM id of the item's inline submenu (for `aria-controls`). */
  protected submenuId(item: MenuItemModel): string {
    let id = this.submenuIds.get(item);
    if (!id) {
      id = `side-menu-sub-${item.id ?? nextSubmenuId++}`;
      this.submenuIds.set(item, id);
    }
    return id;
  }

  /** True when one of the item's sub items matches the current URL. */
  protected isChildActive(item: MenuItemModel): boolean {
    return (
      this.childActive()
        .get(item)
        ?.some((active) => active()) ?? false
    );
  }

  /** Default `routerLinkActiveOptions` for an anchor, unless the entry overrides them. */
  protected activeOptions(link: SubMenuItemModel, exact: boolean) {
    return link.routerLinkActiveOptions ?? { exact };
  }

  /** Rebuilt only when the menus (or options) change; the signals follow navigation. */
  private childMatchers(options: (child: SubMenuItemModel) => IsActiveMatchOptions) {
    const result = new Map<MenuItemModel, Signal<boolean>[]>();
    for (const item of [...this.headerItems(), ...this.items(), ...this.footerItems()]) {
      if (item.separator || !item.children) {
        continue;
      }
      const links = item.children.filter(
        (child): child is RouterLinkEntry => !child.separator && !!child.routerLink,
      );
      result.set(
        item,
        links.map((child) => isActive(this.urlTree(child), this.router, options(child))),
      );
    }
    return result;
  }

  private urlTree(link: RouterLinkEntry): UrlTree {
    if (link.routerLink instanceof UrlTree) {
      return link.routerLink;
    }
    const commands = typeof link.routerLink === 'string' ? [link.routerLink] : link.routerLink;
    return this.router.createUrlTree(commands, {
      relativeTo: link.relativeTo ?? this.route,
      queryParams: link.queryParams,
      fragment: link.fragment,
    });
  }

  /** Sub items count as active for their parent by default when the URL starts with their link. */
  private matchOptions(link: SubMenuItemModel): IsActiveMatchOptions {
    const options = link.routerLinkActiveOptions;
    if (!options) {
      return SUBSET_MATCH;
    }
    if ('exact' in options) {
      return options.exact ? EXACT_MATCH : SUBSET_MATCH;
    }
    return { ...SUBSET_MATCH, ...options };
  }
}
