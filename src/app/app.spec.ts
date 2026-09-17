import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { linkPath, routes } from './app.routes';
import { MenuItemModel, SubMenuItemModel } from './layout';
import { FOOTER_MENU, HEADER_MENU, MENU } from './menu.config';

/** All main and sub entries of the app menus. */
const entries = (): SubMenuItemModel[] =>
  [...HEADER_MENU, ...MENU, ...FOOTER_MENU].flatMap((item) => [item, ...(item.children ?? [])]);

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  it('should render the layout with the menu', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.top-bar__title')?.textContent).toContain('eVat Spectrum');
    const itemLabels = (menu: MenuItemModel[]) =>
      menu.filter((item) => !item.separator).map((item) => item.label);
    const labels = (selector: string) =>
      [...compiled.querySelectorAll(`${selector} .side-menu__label`)].map((el) => el.textContent);
    expect(labels('.side-menu__header')).toEqual(itemLabels(HEADER_MENU));
    expect(labels('.side-menu__nav')).toEqual(itemLabels(MENU));
    expect(labels('.side-menu__footer')).toEqual(itemLabels(FOOTER_MENU));
  });

  it('should define a route for every menu entry', () => {
    const paths = new Set(routes.map((route) => route.path));
    const menuRoutes = entries()
      .filter((entry) => !entry.separator && entry.routerLink)
      .map((entry) => linkPath(entry));
    expect(menuRoutes.filter((path) => path === null || !paths.has(path))).toEqual([]);
  });

  it('should use unique menu ids', () => {
    const ids = entries().map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
