import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LayoutService } from '../layout.service';
import { MenuItemModel } from '../menu.model';
import { MainLayout } from './main-layout';

const menu: MenuItemModel[] = [
  { id: 'a', label: 'A', icon: 'pi pi-home', routerLink: '/a' },
  {
    id: 'g',
    label: 'G',
    icon: 'pi pi-folder',
    children: [{ id: 'g1', label: 'G1', routerLink: '/g1' }],
  },
];

@Component({
  imports: [MainLayout],
  template: `<app-main-layout [items]="menu" [(expandedMenuItems)]="expanded" />`,
})
class Host {
  readonly menu = menu;
  readonly expanded = signal<string[]>([]);
}

describe('MainLayout', () => {
  async function setup() {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const layout = TestBed.inject(LayoutService);
    layout.isMobile.set(false);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    return { fixture, host: fixture.componentInstance, layout, el };
  }

  it('passes expandedMenuItems through in both directions', async () => {
    const { fixture, host, layout, el } = await setup();
    layout.mini.set(false);
    await fixture.whenStable();
    const group = el.querySelectorAll<HTMLElement>('.side-menu__list-item')[1];

    host.expanded.set(['g']);
    await fixture.whenStable();
    expect(group.classList).toContain('side-menu__list-item--open');

    group.querySelector<HTMLElement>('.side-menu__caret')!.click();
    await fixture.whenStable();
    expect(host.expanded()).toEqual([]);
    expect(group.classList).not.toContain('side-menu__list-item--open');
    expect(layout.mini()).toBe(false);
  });
});
