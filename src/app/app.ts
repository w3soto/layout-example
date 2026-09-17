import { Component } from '@angular/core';
import { MainLayout } from './layout';
import { FOOTER_MENU, HEADER_MENU, MENU } from './menu.config';

@Component({
  imports: [MainLayout],
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App {
  protected readonly headerMenu = HEADER_MENU;
  protected readonly menu = MENU;
  protected readonly footerMenu = FOOTER_MENU;
}
