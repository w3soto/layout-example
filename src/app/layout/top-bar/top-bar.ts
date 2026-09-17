import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  ViewEncapsulation,
} from '@angular/core';
import { LayoutService } from '../layout.service';

@Component({
  selector: 'app-top-bar',
  templateUrl: './top-bar.html',
  styleUrl: './top-bar.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'top-bar' },
})
export class TopBar {
  readonly title = input('');
  readonly userName = input('');

  protected readonly layout = inject(LayoutService);
}
