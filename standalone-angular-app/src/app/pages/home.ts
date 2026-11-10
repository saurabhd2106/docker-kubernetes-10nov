import { Component, computed, signal } from '@angular/core';
import { PostCard } from '../components/post-card';
import { POSTS, TOPICS } from '../posts';

@Component({
  selector: 'app-home',
  imports: [PostCard],
  template: `
    <section class="intro">
      <p class="eyebrow">Container Field Notes</p>
      <h1>Practical writing on shipping web apps in containers.</h1>
      <p class="intro-lead">
        Build pipelines, Docker images, and the small decisions that keep them fast, small, and boring in production.
        Written by engineers, for engineers.
      </p>
    </section>

    @if (!topic()) {
      <app-post-card class="featured-slot" [post]="featured" [featured]="true" />
    }

    <section class="listing" aria-labelledby="listing-title">
      <div class="listing-head">
        <h2 id="listing-title">{{ topic() ?? 'More articles' }}</h2>
        <div class="topics" role="group" aria-label="Filter by topic">
          <button type="button" class="chip" [attr.aria-pressed]="!topic()" (click)="topic.set(null)">All</button>
          @for (name of topics; track name) {
            <button type="button" class="chip" [attr.aria-pressed]="topic() === name" (click)="topic.set(name)">
              {{ name }}
            </button>
          }
        </div>
      </div>

      <div class="post-grid">
        @for (post of visible(); track post.slug) {
          <app-post-card [post]="post" />
        }
      </div>
    </section>

    <section class="newsletter">
      <div>
        <h2>Get the next field note</h2>
        <p>One practical article every week. No tracking, no spam, unsubscribe any time.</p>
      </div>
      @if (subscribed()) {
        <p class="newsletter-done" role="status">
          Thanks! This is a static demo, so nothing was sent, but the form works.
        </p>
      } @else {
        <form class="newsletter-form" (submit)="subscribe($event)">
          <label class="visually-hidden" for="email">Email address</label>
          <input id="email" type="email" name="email" placeholder="you@company.com" required autocomplete="email" />
          <button type="submit" class="button">Subscribe</button>
        </form>
      }
    </section>
  `,
})
export class Home {
  protected readonly topics = TOPICS;
  protected readonly featured = POSTS[0];
  protected readonly topic = signal<string | null>(null);
  protected readonly subscribed = signal(false);

  /** With no filter the newest post is featured above the grid, so the grid skips it. */
  protected readonly visible = computed(() => {
    const topic = this.topic();
    return topic ? POSTS.filter((post) => post.tag === topic) : POSTS.slice(1);
  });

  protected subscribe(event: Event): void {
    event.preventDefault();
    this.subscribed.set(true);
  }
}
