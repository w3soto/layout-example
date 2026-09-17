import {
  ActivatedRoute,
  IsActiveMatchOptions,
  Params,
  QueryParamsHandling,
  UrlTree,
} from '@angular/router';

/**
 * Menu entry. How it renders:
 * - `separator: true` → separator (with `label` as optional caption),
 * - `routerLink` set → link (all `RouterLink` / `RouterLinkActive` options below are bound),
 * - otherwise → button (runs `command`; on the main level it also expands its `children`).
 */
export interface SubMenuItemModel {
  /**
   * Unique identifier of the entry. Needed to control the item's expanded state through
   * `expandedMenuItems`; entries without one are tracked by object identity.
   */
  id?: string;
  label?: string;
  /** Optimus UI icon classes, e.g. `pi pi-users`. */
  icon?: string;
  /** Called when the entry is clicked, before `menuItemClick` is emitted and before navigation. */
  command?: (event: Event) => void;
  /** Define this item as link */
  routerLink?: string | readonly any[] | UrlTree;
  queryParams?: Params | null;
  queryParamsHandling?: QueryParamsHandling | null;
  fragment?: string;
  preserveFragment?: boolean;
  state?: { [key: string]: any };
  info?: unknown;
  /** Base for relative `routerLink` commands; defaults to the root route. */
  relativeTo?: ActivatedRoute | null;
  skipLocationChange?: boolean;
  replaceUrl?: boolean;
  browserUrl?: string | UrlTree;
  target?: string;
  /** Overrides how the entry's active state is matched. */
  routerLinkActiveOptions?: { exact: boolean } | Partial<IsActiveMatchOptions>;
  /** Define this item as separator */
  separator?: boolean;
}

/** Main-level entry; may hold one level of sub items. */
export interface MenuItemModel extends SubMenuItemModel {
  children?: SubMenuItemModel[];
}

/**
 * Auto-expansion of items whose sub item matches the current URL:
 * - `none`: never,
 * - `prefix`: the URL starts with the sub item's link (e.g. `/users/editors/42` for `/users/editors`),
 * - `full`: the URL path equals the sub item's link.
 */
export type MenuAutoExpand = 'none' | 'prefix' | 'full';

/** Payload of the side menu's `menuItemClick` output. */
export interface MenuItemClickEvent {
  /** Clicked main item or sub item. */
  item: MenuItemModel | SubMenuItemModel;
  event: MouseEvent;
}
