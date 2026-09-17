import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Blank demo page; `title` and `description` are bound from route data. */
@Component({
  selector: 'app-page',
  templateUrl: './page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Page {
  readonly title = input('');
  readonly description = input('');
}
