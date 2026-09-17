import { Routes, UrlTree } from '@angular/router';
import { MenuItemModel, SubMenuItemModel } from './layout';
import { FOOTER_MENU, HEADER_MENU, MENU } from './menu.config';
import { Page } from './pages/page/page';

/** Route path of an absolute menu link (`'/a/b'` or `['/a', 'b']`); query params are ignored. */
export const linkPath = ({ routerLink }: SubMenuItemModel): string | null =>
  !routerLink || routerLink instanceof UrlTree
    ? null
    : [routerLink].flat().join('/').replace(/^\/+/, '');

const page = (path: string, title: string, description: string) => ({
  path: path,
  component: Page,
  title,
  data: { title, description },
});

/** One blank page per menu link, e.g. "This is editors users page." (first entry wins a path). */
const pageRoutes = (items: MenuItemModel[]) => {
  const pages = new Map<string, ReturnType<typeof page>>();
  const add = (link: SubMenuItemModel, title: string, description: string) => {
    const path = linkPath(link);
    if (path !== null && !pages.has(path)) {
      pages.set(path, page(path, title, description));
    }
  };
  for (const item of items) {
    if (item.separator) {
      continue;
    }
    const parent = (item.label ?? '').toLowerCase();
    if (item.routerLink) {
      add(item, item.label ?? '', `This is ${parent} page.`);
    }
    for (const child of item.children ?? []) {
      if (!child.separator) {
        const label = child.label ?? '';
        add(child, label, `This is ${label.toLowerCase()} ${parent} page.`);
      }
    }
  }
  return [...pages.values()];
};

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  ...pageRoutes([...HEADER_MENU, ...MENU, ...FOOTER_MENU]),
  {
    path: 'management/workspaces/1/hello',
    component: Page,
    data: {
      title: 'test',
      description: 'test'
    }
  },
  { path: '**', redirectTo: 'dashboard' },
];

console.log(routes)