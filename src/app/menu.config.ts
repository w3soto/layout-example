import { MenuItemModel, SubMenuItemModel } from './layout';

export const MENU: MenuItemModel[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'pi pi-home',
    routerLink: '/dashboard',
  },
  {
    id: 'separatorDashboard',
    separator: true,
  },
  {
    id: 'incomingInvoices',
    label: 'Incoming Invoices',
    icon: 'pi pi-file-import',
    routerLink: '/workspace/1/invoices/incoming',
  },
  {
    id: 'outgoingInvoices',
    label: 'Outgoing Invoices',
    icon: 'pi pi-file-export',
    routerLink: '/workspace/1/invoices/outgoing',
  },
  {
    id: 'separatorInvoices',
    separator: true,
  },
  {
    id: 'users',
    label: 'Users',
    icon: 'pi pi-users',
    routerLink: '/workspace/1/users',
  },
  {
    id: 'projects',
    label: 'Projects',
    icon: 'pi pi-briefcase',
    routerLink: '/workspace/1/projects',
  },
  {
    id: 'clients',
    label: 'Clients',
    icon: 'pi pi-building',
    routerLink: '/workspace/1/clients',
    disabled: true,
  },
  {
    id: 'wsInvoices',
    separator: true,
  },
  {
    id: 'workspaceSettings',
    label: 'Workspace',
    icon: 'pi pi-wrench',
    routerLink: '/workspace/1/settings',
  },
  {
    id: 'management',
    label: 'Administration',
    icon: 'pi pi-cog',
    //routerLink: '/management',
    expanded: true,
    children: [
      {
        id: 'workspaceManagement',
        label: 'Workspaces',
        routerLink: '/management/workspaces',
      },
      {
        id: 'administrators',
        label: 'Administrators',
        routerLink: '/management/administrators',
        disabled: true,
      },
    ],
  },
  // {
  //   id: 'management2',
  //   label: 'Administration2',
  //   icon: 'pi pi-cog',
  //   routerLink: '/management2',
  //   children: [
  //     {
  //       id: 'workspaceManagement2',
  //       label: 'Workspaces',
  //       routerLink: '/management/workspaces2',
  //     },
  //     {
  //       id: 'administrators2',
  //       label: 'Administrators',
  //       routerLink: '/management/administrators2',
  //     },
  //   ],
  // },

];

export const HEADER_MENU: MenuItemModel[] = [];

export const FOOTER_MENU: MenuItemModel[] = [
  {
    id: 'help',
    label: 'Help',
    icon: 'pi pi-question-circle',
    routerLink: '/help',
  },
];
