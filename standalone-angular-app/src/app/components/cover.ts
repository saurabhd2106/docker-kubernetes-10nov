import { Component, input } from '@angular/core';
import { Post } from '../posts';

/** Generated cover art: a gradient, a grid, and the post's code snippet. */
@Component({
  selector: 'app-cover',
  host: {
    class: 'cover',
    '[class.cover-large]': 'size() === "large"',
    '[style.--c1]': 'post().cover[0]',
    '[style.--c2]': 'post().cover[1]',
    'aria-hidden': 'true',
  },
  template: `
    <span class="cover-tag">{{ post().tag }}</span>
    <pre class="cover-code">{{ post().coverText }}</pre>
  `,
})
export class Cover {
  readonly post = input.required<Post>();
  readonly size = input<'card' | 'large'>('card');
}
