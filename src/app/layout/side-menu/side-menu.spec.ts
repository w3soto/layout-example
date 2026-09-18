import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { MenuItemClickEvent, MenuItemModel } from '../menu.model';
import { SideMenu } from './side-menu';

const items: MenuItemModel[] = [
  {
    id: 'a',
    label: 'A',
    icon: 'pi pi-users',
    children: [{ id: 'a1', label: 'A1', routerLink: '/a1' }],
  },
  {
    id: 'b',
    label: 'B',
    icon: 'pi pi-folder',
    routerLink: '/b',
    children: [{ id: 'b1', label: 'B1', routerLink: '/b1' }],
  },
  { id: 'c', label: 'C', icon: 'pi pi-briefcase', routerLink: '/c' },
];

describe('SideMenu', () => {
  async function setup(mini = false, menu = items) {
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: '**', children: [] }])],
    });
    const fixture = TestBed.createComponent(SideMenu);
    fixture.componentRef.setInput('items', menu);
    fixture.componentRef.setInput('mini', mini);
    await fixture.whenStable();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  it('allows several groups to be open at once', async () => {
    const { fixture, el } = await setup();
    const toggles = el.querySelectorAll<HTMLButtonElement>(
      '.side-menu__toggle, button.side-menu__button',
    );
    expect(toggles.length).toBe(2);

    toggles[0].click();
    toggles[1].click();
    await fixture.whenStable();
    expect(el.querySelectorAll('.side-menu__list-item--open').length).toBe(2);

    toggles[0].click();
    await fixture.whenStable();
    expect(el.querySelectorAll('.side-menu__list-item--open').length).toBe(1);
  });

  it('toggles a container item from its row, without a separate toggle button', async () => {
    const { fixture, el } = await setup();
    const group = el.querySelectorAll<HTMLElement>('.side-menu__list-item')[0];
    expect(group.querySelector('a.side-menu__button')).toBeNull();
    expect(group.querySelector('.side-menu__toggle')).toBeNull();

    const row = group.querySelector<HTMLButtonElement>('button.side-menu__button')!;
    row.click();
    await fixture.whenStable();
    expect(group.classList).toContain('side-menu__list-item--open');
    expect(row.getAttribute('aria-expanded')).toBe('true');
  });

  it('shows no toggle arrow for items without sub items', async () => {
    const calls: string[] = [];
    const menu: MenuItemModel[] = [
      { id: 'btn', label: 'Button', command: () => calls.push('btn') },
      { id: 'lnk', label: 'Link', routerLink: '/l' },
      { id: 'empty', label: 'Empty', routerLink: '/e', children: [] },
      { id: 'grp', label: 'Group', children: [{ id: 'g1', label: 'G1', routerLink: '/g1' }] },
    ];
    const { fixture, el } = await setup(false, menu);
    const [button, link, empty, group] = el.querySelectorAll<HTMLElement>('.side-menu__list-item');

    for (const item of [button, link, empty]) {
      expect(item.querySelector('.side-menu__chevron')).toBeNull();
      expect(item.querySelector('.side-menu__toggle')).toBeNull();
      expect(item.querySelector('.side-menu__submenu')).toBeNull();
    }
    expect(group.querySelector('.side-menu__chevron')).not.toBeNull();

    const trigger = button.querySelector<HTMLButtonElement>('button.side-menu__button')!;
    expect(trigger.hasAttribute('aria-expanded')).toBe(false);
    expect(trigger.hasAttribute('aria-controls')).toBe(false);
    trigger.click();
    await fixture.whenStable();
    expect(calls).toEqual(['btn']);
    expect(button.classList).not.toContain('side-menu__list-item--open');
  });

  it('renders sub items without routerLink as buttons', async () => {
    const calls: string[] = [];
    const menu: MenuItemModel[] = [
      {
        id: 'g',
        label: 'G',
        children: [
          { id: 'g1', label: 'G1', routerLink: '/g1' },
          { id: 'act', label: 'Act', command: () => calls.push('act') },
        ],
      },
    ];
    const { fixture, el } = await setup(true, menu);
    fixture.componentInstance.menuItemClick.subscribe(({ item }) => calls.push(`emit:${item.id}`));
    const [link, button] = el.querySelectorAll<HTMLElement>(
      '.side-menu__flyout .side-menu__subbutton',
    );
    expect(link.tagName).toBe('A');
    expect(button.tagName).toBe('BUTTON');
    expect(button.getAttribute('type')).toBe('button');
    expect(button.hasAttribute('href')).toBe(false);

    button.click();
    await fixture.whenStable();
    expect(calls).toEqual(['act', 'emit:act']);
    // Like links, a sub button closes the mini flyout.
    expect(el.querySelector('.side-menu__list-item')!.classList).toContain(
      'side-menu__list-item--flyout-closed',
    );
  });

  it('does not close a flyout when a container title is clicked', async () => {
    const { fixture, el } = await setup(true);
    const group = el.querySelectorAll<HTMLElement>('.side-menu__list-item')[0];
    group.querySelector<HTMLElement>('span.side-menu__submenu-title')!.click();
    await fixture.whenStable();
    expect(group.classList).not.toContain('side-menu__list-item--flyout-closed');
  });

  it('emits menuItemClick with the item and the click event', async () => {
    const { fixture, el } = await setup();
    const clicks: MenuItemClickEvent[] = [];
    fixture.componentInstance.menuItemClick.subscribe((click) => clicks.push(click));

    el.querySelector<HTMLElement>('button.side-menu__button')!.click(); // container A
    el.querySelector<HTMLElement>('.side-menu__subbutton')!.click(); // A1
    el.querySelector<HTMLElement>('a.side-menu__button[href="/c"]')!.click(); // C
    fixture.componentRef.setInput('mini', true);
    await fixture.whenStable();
    el.querySelector<HTMLElement>('a.side-menu__submenu-title')!.click(); // B flyout title

    expect(clicks.map((click) => click.item.label)).toEqual(['A', 'A1', 'C', 'B']);
    expect(clicks[1].item).toBe(items[0].children![0]);
    expect(clicks.every((click) => click.event instanceof MouseEvent)).toBe(true);
  });

  it('calls the command of the clicked entry before emitting menuItemClick', async () => {
    const calls: string[] = [];
    const command = (id: string) => (event: Event) => calls.push(`${id}:${event.type}`);
    const withCommands: MenuItemModel[] = [
      {
        id: 'g',
        label: 'G',
        command: command('g'),
        children: [{ id: 'g1', label: 'G1', routerLink: '/g1', command: command('g1') }],
      },
      { id: 'l', label: 'L', routerLink: '/l', command: command('l') },
    ];
    const { fixture, el } = await setup(false, withCommands);
    fixture.componentInstance.menuItemClick.subscribe(({ item }) => calls.push(`emit:${item.id}`));

    el.querySelector<HTMLElement>('button.side-menu__button')!.click();
    el.querySelector<HTMLElement>('.side-menu__submenu .side-menu__subbutton')!.click();
    fixture.componentRef.setInput('mini', true);
    await fixture.whenStable();
    el.querySelector<HTMLElement>('.side-menu__flyout--label a')!.click();

    expect(calls).toEqual(['g:click', 'emit:g', 'g1:click', 'emit:g1', 'l:click', 'emit:l']);
  });

  it('only toggles when the arrow is clicked (no command, navigation or menuItemClick)', async () => {
    const calls: string[] = [];
    const menu: MenuItemModel[] = [
      {
        id: 'btn',
        label: 'Button',
        command: () => calls.push('btn'),
        children: [{ id: 'b1', label: 'B1', routerLink: '/b1' }],
      },
      {
        id: 'lnk',
        label: 'Link',
        routerLink: '/lnk',
        command: () => calls.push('lnk'),
        children: [{ id: 'l1', label: 'L1', routerLink: '/l1' }],
      },
    ];
    const { fixture, el } = await setup(false, menu);
    fixture.componentInstance.menuItemClick.subscribe(({ item }) => calls.push(`emit:${item.id}`));
    const router = TestBed.inject(Router);
    const [button, link] = el.querySelectorAll<HTMLElement>('.side-menu__list-item');

    const arrows = [
      button.querySelector<HTMLElement>('.side-menu__caret')!,
      link.querySelector<HTMLElement>('.side-menu__toggle')!,
    ];
    for (const [index, item] of [button, link].entries()) {
      arrows[index].click();
      await fixture.whenStable();
      expect(item.classList).toContain('side-menu__list-item--open');
      arrows[index].click();
      await fixture.whenStable();
      expect(item.classList).not.toContain('side-menu__list-item--open');
    }

    expect(calls).toEqual([]);
    expect(router.url).toBe('/');
  });

  it('renders header items in a separate, non-scrolling header before the list', async () => {
    const { fixture, el } = await setup();
    expect(el.querySelector('.side-menu__header')).toBeNull();

    fixture.componentRef.setInput('headerItems', [
      { id: 'h', label: 'H', icon: 'pi pi-home', routerLink: '/h' },
    ] satisfies MenuItemModel[]);
    await fixture.whenStable();

    const header = el.querySelector<HTMLElement>('.side-menu__header')!;
    expect(header.nextElementSibling?.classList).toContain('side-menu__nav');
    expect(header.querySelector('a.side-menu__button')?.getAttribute('href')).toBe('/h');
  });

  it('renders footer items in a separate, non-scrolling footer', async () => {
    const { fixture, el } = await setup();
    expect(el.querySelector('.side-menu__footer')).toBeNull();

    const footer: MenuItemModel[] = [
      {
        id: 'f',
        label: 'F',
        icon: 'pi pi-cog',
        children: [{ id: 'f1', label: 'F1', routerLink: '/f1' }],
      },
    ];
    fixture.componentRef.setInput('footerItems', footer);
    await fixture.whenStable();

    const footerEl = el.querySelector<HTMLElement>('.side-menu__footer')!;
    expect(footerEl.closest('.side-menu__nav')).toBeNull();
    expect(
      el.querySelectorAll('.side-menu__nav > .side-menu__list > .side-menu__list-item').length,
    ).toBe(3);
    footerEl.querySelector<HTMLButtonElement>('button.side-menu__button')!.click();
    await fixture.whenStable();
    expect(footerEl.querySelector('.side-menu__list-item--open')).not.toBeNull();
  });

  it('renders separators on both levels without making them clickable', async () => {
    const menu: MenuItemModel[] = [
      { id: 's1', separator: true },
      {
        id: 'g',
        label: 'G',
        children: [
          { id: 'g1', label: 'G1', routerLink: '/g1' },
          { id: 's2', separator: true },
          { id: 'g2', label: 'G2', routerLink: '/g2' },
        ],
      },
      { id: 's3', separator: true, label: 'Section' },
      { id: 'l', label: 'L', routerLink: '/l' },
    ];
    const { fixture, el } = await setup(false, menu);
    const clicks: MenuItemClickEvent[] = [];
    fixture.componentInstance.menuItemClick.subscribe((click) => clicks.push(click));

    const separators = [...el.querySelectorAll<HTMLElement>('.side-menu__separator')];
    expect(separators.map((s) => s.getAttribute('role'))).toEqual([
      'separator',
      'separator',
      'separator',
    ]);
    expect(separators[1].classList).toContain('side-menu__separator--sub');
    expect(separators[2].classList).toContain('side-menu__separator--labeled');
    expect(separators[2].textContent?.trim()).toBe('Section');
    expect(el.querySelectorAll('.side-menu__list-item').length).toBe(2);
    expect(el.querySelectorAll('.side-menu__subbutton').length).toBe(2);

    separators.forEach((s) => s.click());
    expect(clicks).toEqual([]);
  });

  it('binds all router link options and matches active sub items with them', async () => {
    const menu: MenuItemModel[] = [
      {
        id: 'r',
        label: 'R',
        children: [
          {
            id: 'plain',
            label: 'Plain',
            routerLink: ['/reports', 'sales'],
            routerLinkActiveOptions: { paths: 'exact', queryParams: 'exact' },
          },
          {
            id: 'month',
            label: 'Month',
            routerLink: ['/reports', 'sales'],
            queryParams: { period: 'month' },
            fragment: 'summary',
            routerLinkActiveOptions: { paths: 'exact', queryParams: 'exact' },
          },
        ],
      },
    ];
    const { fixture, el } = await setup(false, menu);
    const [plain, month] = el.querySelectorAll<HTMLAnchorElement>('.side-menu__subbutton');
    expect(plain.getAttribute('href')).toBe('/reports/sales');
    expect(month.getAttribute('href')).toBe('/reports/sales?period=month#summary');

    month.click();
    await fixture.whenStable();
    const group = el.querySelector('.side-menu__list-item')!;
    expect(group.classList).toContain('side-menu__list-item--active');
    expect(group.classList).toContain('side-menu__list-item--open');
    expect(month.classList).toContain('side-menu__subbutton--active');
    expect(plain.classList).not.toContain('side-menu__subbutton--active');
  });

  it('shows flyout titles instead of toggles in mini mode', async () => {
    const { el } = await setup(true);
    expect(el.classList).toContain('side-menu--mini');
    // Arrows stay in the DOM (hidden via CSS) so they can animate away.
    expect(el.querySelectorAll('.side-menu__flyout').length).toBe(3);
    expect(el.querySelectorAll('.side-menu__submenu-title').length).toBe(3);
    const label = el.querySelector<HTMLAnchorElement>('.side-menu__flyout--label a');
    expect(label?.getAttribute('href')).toBe('/c');
  });

  it('hides a mini flyout after a click until the pointer leaves', async () => {
    const { fixture, el } = await setup(true);
    const item = el.querySelectorAll<HTMLElement>('.side-menu__list-item')[0];
    el.querySelector<HTMLElement>('.side-menu__flyout .side-menu__subbutton')!.click();
    await fixture.whenStable();
    expect(item.classList).toContain('side-menu__list-item--flyout-closed');

    item.dispatchEvent(new MouseEvent('mouseleave'));
    await fixture.whenStable();
    expect(item.classList).not.toContain('side-menu__list-item--flyout-closed');
  });

  it('opens the flyout on a mini icon click for items with sub items', async () => {
    const calls: string[] = [];
    const menu = items.map((item) => ({
      ...item,
      command: () => calls.push(item.id!),
    }));
    const { fixture, el } = await setup(true, menu);
    fixture.componentInstance.menuItemClick.subscribe(({ item }) => calls.push(`emit:${item.id}`));
    const router = TestBed.inject(Router);
    const [group, link] = el.querySelectorAll<HTMLElement>('.side-menu__list-item');

    for (const item of [group, link]) {
      const trigger = item.querySelector<HTMLElement>('.side-menu__button')!;
      expect(trigger.getAttribute('href')).toBeNull();
      trigger.click();
      await fixture.whenStable();
      expect(item.classList).toContain('side-menu__list-item--flyout-open');
      expect(trigger.getAttribute('aria-expanded')).toBe('true');
      // Only one flyout is open at a time.
      expect(el.querySelectorAll('.side-menu__list-item--flyout-open').length).toBe(1);
    }

    expect(calls).toEqual([]);
    expect(router.url).toBe('/');
    expect(el.querySelector('.side-menu__list-item--open')).toBeNull();

    link.dispatchEvent(new MouseEvent('mouseleave'));
    await fixture.whenStable();
    expect(el.querySelector('.side-menu__list-item--flyout-open')).toBeNull();
  });

  it('keeps a mini icon without sub items clickable', async () => {
    const calls: string[] = [];
    const menu: MenuItemModel[] = [
      { id: 'c', label: 'C', routerLink: '/c', command: () => calls.push('c') },
    ];
    const { fixture, el } = await setup(true, menu);
    fixture.componentInstance.menuItemClick.subscribe(({ item }) => calls.push(`emit:${item.id}`));
    const item = el.querySelector<HTMLElement>('.side-menu__list-item')!;
    const trigger = item.querySelector<HTMLElement>('.side-menu__button')!;
    expect(trigger.getAttribute('href')).toBe('/c');
    expect(trigger.getAttribute('role')).toBeNull();

    trigger.click();
    await fixture.whenStable();

    expect(calls).toEqual(['c', 'emit:c']);
    expect(TestBed.inject(Router).url).toBe('/c');
    expect(item.classList).not.toContain('side-menu__list-item--flyout-open');
    expect(item.classList).toContain('side-menu__list-item--flyout-closed');
  });

  it('opens a mini flyout with the keyboard and closes it on outside click or Escape', async () => {
    const { fixture, el } = await setup(true);
    const [, link] = el.querySelectorAll<HTMLElement>('.side-menu__list-item');
    const trigger = link.querySelector<HTMLElement>('.side-menu__button')!;

    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await fixture.whenStable();
    expect(link.classList).toContain('side-menu__list-item--flyout-open');

    document.body.click();
    await fixture.whenStable();
    expect(link.classList).not.toContain('side-menu__list-item--flyout-open');

    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    await fixture.whenStable();
    expect(link.classList).toContain('side-menu__list-item--flyout-open');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await fixture.whenStable();
    expect(link.classList).not.toContain('side-menu__list-item--flyout-open');
  });

  it('keeps the flyout open on click when closeFlyoutOnClick is false', async () => {
    const { fixture, el } = await setup(true);
    fixture.componentRef.setInput('closeFlyoutOnClick', false);
    el.querySelector<HTMLElement>('.side-menu__flyout .side-menu__subbutton')!.click();
    await fixture.whenStable();
    expect(el.querySelector('.side-menu__list-item--flyout-closed')).toBeNull();
  });

  it('supports two-way binding for mini', async () => {
    const { fixture } = await setup();
    const changes: boolean[] = [];
    fixture.componentInstance.mini.subscribe((mini) => changes.push(mini));
    fixture.componentInstance.mini.set(true);
    await fixture.whenStable();
    expect(changes).toEqual([true]);
    expect((fixture.nativeElement as HTMLElement).classList).toContain('side-menu--mini');
  });

  describe('expandedMenuItems', () => {
    const menu: MenuItemModel[] = [
      { id: 'x', label: 'X', children: [{ id: 'x1', label: 'X1', routerLink: '/x1' }] },
      {
        id: 'y',
        label: 'Y',
        routerLink: '/y',
        children: [{ id: 'y1', label: 'Y1', routerLink: '/y1' }],
      },
    ];
    const openIds = (el: HTMLElement) =>
      [...el.querySelectorAll('.side-menu__list-item--open')].map((li) =>
        li.querySelector('.side-menu__label')!.textContent!.trim(),
      );

    it('expands the items whose ids are bound', async () => {
      const { fixture, el } = await setup(false, menu);
      fixture.componentRef.setInput('expandedMenuItems', ['y']);
      await fixture.whenStable();
      expect(openIds(el)).toEqual(['Y']);

      fixture.componentRef.setInput('expandedMenuItems', ['x', 'y']);
      await fixture.whenStable();
      expect(openIds(el)).toEqual(['X', 'Y']);
    });

    it('emits the new ids when the user expands or collapses an item', async () => {
      const { fixture, el } = await setup(false, menu);
      const changes: string[][] = [];
      fixture.componentInstance.expandedMenuItems.subscribe((ids) => changes.push(ids));

      el.querySelector<HTMLElement>('button.side-menu__button')!.click(); // X
      el.querySelector<HTMLElement>('.side-menu__toggle')!.click(); // Y
      el.querySelector<HTMLElement>('.side-menu__caret')!.click(); // X again
      await fixture.whenStable();

      expect(changes).toEqual([['x'], ['x', 'y'], ['y']]);
      expect(openIds(el)).toEqual(['Y']);
    });

    it('adds the item containing the active route', async () => {
      const { fixture } = await setup(false, menu);
      const changes: string[][] = [];
      fixture.componentInstance.expandedMenuItems.subscribe((ids) => changes.push(ids));
      await TestBed.inject(Router).navigateByUrl('/x1');
      await fixture.whenStable();
      expect(fixture.componentInstance.expandedMenuItems()).toEqual(['x']);
      expect(changes).toEqual([['x']]);
    });
  });

  describe('autoExpand', () => {
    const menu: MenuItemModel[] = [
      { id: 'u', label: 'U', children: [{ id: 'u1', label: 'U1', routerLink: '/u/editors' }] },
    ];
    const routes = [{ path: '**', children: [] }];

    async function expandedAfter(url: string, mode?: 'none' | 'prefix' | 'full') {
      TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
      const fixture = TestBed.createComponent(SideMenu);
      fixture.componentRef.setInput('items', menu);
      if (mode) {
        fixture.componentRef.setInput('autoExpand', mode);
      }
      await TestBed.inject(Router).navigateByUrl(url);
      await fixture.whenStable();
      return fixture;
    }

    it('defaults to full: expands on an exact path match only', async () => {
      expect((await expandedAfter('/u/editors')).componentInstance.expandedMenuItems()).toEqual([
        'u',
      ]);
      TestBed.resetTestingModule();
      expect((await expandedAfter('/u/editors/42')).componentInstance.expandedMenuItems()).toEqual(
        [],
      );
    });

    it('prefix: also expands for URLs below the sub item link', async () => {
      const fixture = await expandedAfter('/u/editors/42?tab=a', 'prefix');
      expect(fixture.componentInstance.expandedMenuItems()).toEqual(['u']);
    });

    it('none: never expands automatically, but keeps the parent highlighted', async () => {
      const fixture = await expandedAfter('/u/editors', 'none');
      expect(fixture.componentInstance.expandedMenuItems()).toEqual([]);
      const item = (fixture.nativeElement as HTMLElement).querySelector('.side-menu__list-item')!;
      expect(item.classList).toContain('side-menu__list-item--active');
    });

    it('expands once the mode is switched on', async () => {
      const fixture = await expandedAfter('/u/editors/42', 'none');
      fixture.componentRef.setInput('autoExpand', 'prefix');
      await fixture.whenStable();
      expect(fixture.componentInstance.expandedMenuItems()).toEqual(['u']);
    });
  });

  it('keeps inline sub items in place (collapsed and inert) in mini mode', async () => {
    const { fixture, el } = await setup(false);
    fixture.componentRef.setInput('expandedMenuItems', ['a']);
    await fixture.whenStable();
    const submenu = el.querySelector<HTMLElement>('.side-menu__submenu')!;
    expect(submenu.inert).toBe(false);

    fixture.componentRef.setInput('mini', true);
    await fixture.whenStable();
    // Same element: the collapse is a CSS transition, not a DOM swap.
    expect(el.querySelector('.side-menu__submenu')).toBe(submenu);
    expect(submenu.inert).toBe(true);
    expect(submenu.closest('.side-menu__list-item')!.querySelector('.side-menu__flyout')).not.toBeNull();

    fixture.componentRef.setInput('mini', false);
    await fixture.whenStable();
    expect(el.querySelector('.side-menu__submenu')).toBe(submenu);
    expect(submenu.inert).toBe(false);
    expect(el.querySelector('.side-menu__flyout')).toBeNull();
  });

  describe('expanded flag', () => {
    const group = (expanded?: boolean): MenuItemModel[] => [
      {
        id: 'x',
        label: 'X',
        expanded,
        children: [{ id: 'x1', label: 'X1', routerLink: '/x1' }],
      },
      { id: 'y', label: 'Y', children: [{ id: 'y1', label: 'Y1', routerLink: '/y1' }] },
    ];

    it('starts expanded and seeds expandedMenuItems', async () => {
      const { fixture, el } = await setup(false, group(true));
      expect(fixture.componentInstance.expandedMenuItems()).toEqual(['x']);
      expect(el.querySelectorAll('.side-menu__list-item--open').length).toBe(1);
    });

    it('lets the user collapse it again without writing the flag back', async () => {
      const menu = group(true);
      const { fixture, el } = await setup(false, menu);
      const item = el.querySelector<HTMLElement>('.side-menu__list-item')!;

      item.querySelector<HTMLElement>('.side-menu__caret')!.click();
      await fixture.whenStable();
      expect(item.classList).not.toContain('side-menu__list-item--open');
      expect(fixture.componentInstance.expandedMenuItems()).toEqual([]);
      // The flag is read-only: the state lives in expandedMenuItems.
      expect(menu[0].expanded).toBe(true);
    });

    it('applies the flag again when it changes', async () => {
      const { fixture, el } = await setup(false, group(false));
      const openIds = () => fixture.componentInstance.expandedMenuItems();
      expect(openIds()).toEqual([]);

      fixture.componentRef.setInput('items', group(true));
      await fixture.whenStable();
      expect(openIds()).toEqual(['x']);
      expect(el.querySelectorAll('.side-menu__list-item--open').length).toBe(1);

      fixture.componentRef.setInput('items', group(false));
      await fixture.whenStable();
      expect(openIds()).toEqual([]);
    });

    it('leaves items without the flag to autoExpand', async () => {
      const { fixture } = await setup(false, group());
      await TestBed.inject(Router).navigateByUrl('/y1');
      await fixture.whenStable();
      expect(fixture.componentInstance.expandedMenuItems()).toEqual(['y']);
    });

    it('expands header and footer items too', async () => {
      const { fixture, el } = await setup(false, []);
      fixture.componentRef.setInput('headerItems', group(true));
      fixture.componentRef.setInput('footerItems', [
        { id: 'f', label: 'F', expanded: true, children: [{ id: 'f1', label: 'F1' }] },
      ] satisfies MenuItemModel[]);
      await fixture.whenStable();

      expect(fixture.componentInstance.expandedMenuItems()).toEqual(['x', 'f']);
      expect(el.querySelectorAll('.side-menu__list-item--open').length).toBe(2);
    });
  });

  describe('disabled entries', () => {
    const calls: string[] = [];
    const command = (id: string) => () => calls.push(id);
    const disabledMenu = (): MenuItemModel[] => [
      { id: 'lnk', label: 'Link', routerLink: '/lnk', command: command('lnk'), disabled: true },
      { id: 'btn', label: 'Button', command: command('btn'), disabled: true },
      {
        id: 'grp',
        label: 'Group',
        command: command('grp'),
        disabled: true,
        children: [
          { id: 'g1', label: 'G1', routerLink: '/g1', command: command('g1'), disabled: true },
          { id: 'g2', label: 'G2', command: command('g2'), disabled: true },
          { id: 'g3', label: 'G3', routerLink: '/g3' },
        ],
      },
      {
        id: 'lgrp',
        label: 'Link group',
        routerLink: '/lgrp',
        command: command('lgrp'),
        disabled: true,
        children: [{ id: 'l1', label: 'L1', routerLink: '/l1' }],
      },
    ];

    beforeEach(() => (calls.length = 0));

    it('renders a disabled link without href and marks it aria-disabled', async () => {
      const { fixture, el } = await setup(false, disabledMenu());
      fixture.componentInstance.menuItemClick.subscribe(({ item }) => calls.push(`emit:${item.id}`));
      const router = TestBed.inject(Router);
      const link = el.querySelector<HTMLElement>('a.side-menu__button')!;

      expect(link.hasAttribute('href')).toBe(false);
      expect(link.getAttribute('aria-disabled')).toBe('true');
      expect(link.getAttribute('tabindex')).toBe('-1');
      expect(link.classList).toContain('side-menu__button--disabled');

      link.click();
      await fixture.whenStable();
      expect(calls).toEqual([]);
      expect(router.url).toBe('/');
    });

    it('disables a childless button natively and runs no command', async () => {
      const { fixture, el } = await setup(false, disabledMenu());
      fixture.componentInstance.menuItemClick.subscribe(({ item }) => calls.push(`emit:${item.id}`));
      const button = el.querySelectorAll<HTMLButtonElement>('button.side-menu__button')[0];

      expect(button.disabled).toBe(true);
      expect(button.getAttribute('aria-disabled')).toBe('true');

      button.click();
      await fixture.whenStable();
      expect(calls).toEqual([]);
    });

    it('keeps a disabled container expandable from its row and its arrow', async () => {
      const { fixture, el } = await setup(false, disabledMenu());
      fixture.componentInstance.menuItemClick.subscribe(({ item }) => calls.push(`emit:${item.id}`));
      const group = el.querySelectorAll<HTMLElement>('.side-menu__list-item')[2];
      const row = group.querySelector<HTMLButtonElement>('button.side-menu__button')!;

      // Not natively disabled, otherwise the nested arrow would stop receiving clicks.
      expect(row.disabled).toBe(false);
      expect(row.getAttribute('aria-disabled')).toBe('true');

      row.click();
      await fixture.whenStable();
      expect(group.classList).toContain('side-menu__list-item--open');

      group.querySelector<HTMLElement>('.side-menu__caret')!.click();
      await fixture.whenStable();
      expect(group.classList).not.toContain('side-menu__list-item--open');
      // Expanding is the only effect: no command, no menuItemClick.
      expect(calls).toEqual([]);
    });

    it('makes disabled sub items inert while their siblings keep working', async () => {
      const { fixture, el } = await setup(false, disabledMenu());
      fixture.componentInstance.menuItemClick.subscribe(({ item }) => calls.push(`emit:${item.id}`));
      fixture.componentRef.setInput('expandedMenuItems', ['grp']);
      await fixture.whenStable();
      const [subLink, subButton, enabled] = el.querySelectorAll<HTMLElement>(
        '.side-menu__submenu .side-menu__subbutton',
      );

      expect(subLink.hasAttribute('href')).toBe(false);
      expect(subLink.getAttribute('aria-disabled')).toBe('true');
      expect(subLink.getAttribute('tabindex')).toBe('-1');
      expect((subButton as HTMLButtonElement).disabled).toBe(true);
      expect(subLink.classList).toContain('side-menu__subbutton--disabled');

      subLink.click();
      subButton.click();
      await fixture.whenStable();
      expect(calls).toEqual([]);

      expect(enabled.getAttribute('href')).toBe('/g3');
      enabled.click();
      await fixture.whenStable();
      expect(calls).toEqual(['emit:g3']);
    });

    it('shows no hover flyout for a disabled item without sub items', async () => {
      const { el } = await setup(true, disabledMenu());
      const [link, button, group] = el.querySelectorAll<HTMLElement>('.side-menu__list-item');

      expect(link.querySelector('.side-menu__flyout')).toBeNull();
      expect(button.querySelector('.side-menu__flyout')).toBeNull();
      // A container keeps its flyout: that is how its enabled sub items stay reachable.
      expect(group.querySelector('.side-menu__flyout')).not.toBeNull();
    });

    it('keeps the flyout of a disabled container open and its title inert', async () => {
      const { fixture, el } = await setup(true, disabledMenu());
      fixture.componentInstance.menuItemClick.subscribe(({ item }) => calls.push(`emit:${item.id}`));
      const group = el.querySelectorAll<HTMLElement>('.side-menu__list-item')[3];
      const title = group.querySelector<HTMLElement>('a.side-menu__submenu-title')!;

      expect(title.hasAttribute('href')).toBe(false);
      expect(title.getAttribute('aria-disabled')).toBe('true');
      expect(title.getAttribute('tabindex')).toBe('-1');

      title.click();
      await fixture.whenStable();
      expect(calls).toEqual([]);
      // A click that does nothing must not hide the flyout either.
      expect(group.classList).not.toContain('side-menu__list-item--flyout-closed');

      group.querySelector<HTMLElement>('.side-menu__flyout a[href="/l1"]')!.click();
      await fixture.whenStable();
      expect(calls).toEqual(['emit:l1']);
      expect(group.classList).toContain('side-menu__list-item--flyout-closed');
    });
  });
});
