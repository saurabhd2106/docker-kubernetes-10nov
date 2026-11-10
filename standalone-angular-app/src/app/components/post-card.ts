import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Post } from '../posts';
import { Byline } from './byline';
import { Cover } from './cover';
import { RichText } from './rich-text';

@Component({
  selector: 'app-post-card',
  imports: [RouterLink, Byline, Cover, RichText],
  host: { class: 'post-card', '[class.post-card-featured]': 'featured()' },
  template: `
    <a class="post-card-cover" [routerLink]="['/posts', post().slug]" tabindex="-1">
      <app-cover [post]="post()" [size]="featured() ? 'large' : 'card'" />
    </a>
    <div class="post-card-body">
      @if (featured()) {
        <span class="eyebrow">Latest article</span>
      }
      <h2 class="post-card-title">
        <a [routerLink]="['/posts', post().slug]">{{ post().title }}</a>
      </h2>
      <p class="post-card-summary"><app-rich-text [text]="post().summary" /></p>
      <app-byline [post]="post()" />
    </div>
  `,
})
export class PostCard {
  readonly post = input.required<Post>();
  readonly featured = input(false);
}
