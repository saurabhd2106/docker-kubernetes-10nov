import { Component, computed, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { authorOf, initials, Post, readingMinutes } from '../posts';

@Component({
  selector: 'app-byline',
  imports: [DatePipe],
  host: { class: 'byline' },
  template: `
    <span class="avatar" [style.background]="author().color" aria-hidden="true">{{ initials() }}</span>
    <span class="byline-text">
      <span class="byline-name">{{ author().name }}</span>
      @if (showRole()) {
        <span class="byline-role">{{ author().role }}</span>
      }
      <span class="byline-meta">
        <time [attr.datetime]="post().date">{{ post().date | date: 'mediumDate' }}</time>
        &middot; {{ minutes() }} min read
      </span>
    </span>
  `,
})
export class Byline {
  readonly post = input.required<Post>();
  readonly showRole = input(false);

  protected readonly author = computed(() => authorOf(this.post()));
  protected readonly minutes = computed(() => readingMinutes(this.post()));
  protected readonly initials = computed(() => initials(this.author().name));
}
