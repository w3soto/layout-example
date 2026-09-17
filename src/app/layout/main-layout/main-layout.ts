import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  model,
  output,
  untracked,
  ViewEncapsulation,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LayoutService } from '../layout.service';
import { MenuAutoExpand, MenuItemClickEvent, MenuItemModel } from '../menu.model';
import { SideMenu } from '../side-menu/side-menu';
import { TopBar } from '../top-bar/top-bar';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, SideMenu, TopBar],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'main-layout',
    '[class.main-layout--mini]': 'layoutService.mini() && !layoutService.isMobile()',
    '[class.main-layout--mobile]': 'layoutService.isMobile()',
    '[class.main-layout--open]': 'layoutService.isMobile() && layoutService.mobileOpen()',
    '[class.main-layout--no-transition]': 'layoutService.breakpointChanging()',
    '(document:keydown.escape)': 'layoutService.closeMobile()',
  },
})
export class MainLayout {
  readonly items = input.required<MenuItemModel[]>();
  /** Menu items pinned to the top of the side menu. */
  readonly headerItems = input<MenuItemModel[]>([]);
  /** Menu items pinned to the bottom of the side menu. */
  readonly footerItems = input<MenuItemModel[]>([]);

  /** Ids of expanded side menu items. Supports `[(expandedMenuItems)]`. */
  readonly expandedMenuItems = model<string[]>([]);

  protected readonly layoutService = inject(LayoutService);
}
