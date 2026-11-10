import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Byline } from '../components/byline';
import { Cover } from '../components/cover';
import { PostCard } from '../components/post-card';
import { RichText } from '../components/rich-text';
import { authorOf, findPost, initials, POSTS } from '../posts';
import { NotFound } from './not-found';

@Component({
  selector: 'app-post',
  imports: [RouterLink, Byline, Cover, PostCard, RichText, NotFound],
  template: `
    @if (post(); as post) {
      <article class="article">
        <header class="article-head">
          <a class="eyebrow" routerLink="/">{{ post.tag }}</a>
          <h1>{{ post.title }}</h1>
          <p class="article-lead"><app-rich-text [text]="post.summary" /></p>
          <app-byline [post]="post" [showRole]="true" />
        </header>

        <app-cover class="article-cover" [post]="post" size="large" />

        <div class="prose">
          @for (block of post.body; track $index) {
            @switch (block.kind) {
              @case ('h2') {
                <h2>{{ block.text }}</h2>
              }
              @case ('code') {
                <figure class="code-block">
                  @if (block.label) {
                    <figcaption>{{ block.label }}</figcaption>
                  }
                  <pre><code>{{ block.text }}</code></pre>
                </figure>
              }
              @case ('list') {
                <ul>
                  @for (item of block.items; track $index) {
                    <li><app-rich-text [text]="item" /></li>
                  }
                </ul>
              }
              @case ('quote') {
                <blockquote>
                  <p>{{ block.text }}</p>
                  @if (block.cite) {
                    <cite>{{ block.cite }}</cite>
                  }
                </blockquote>
              }
              @case ('callout') {
                <aside class="callout"><app-rich-text [text]="block.text" /></aside>
              }
              @default {
                <p><app-rich-text [text]="block.text" /></p>
              }
            }
          }
        </div>

        @let writer = authorOf(post);
        <footer class="author-box">
          <span class="avatar avatar-large" [style.background]="writer.color" aria-hidden="true">
            {{ initials(writer.name) }}
          </span>
          <div>
            <p class="author-box-name">Written by {{ writer.name }}</p>
            <p class="author-box-role">{{ writer.role }} at Container Field Notes</p>
          </div>
        </footer>
      </article>

      <section class="related" aria-labelledby="related-title">
        <h2 id="related-title">Keep reading</h2>
        <div class="post-grid">
          @for (item of related(); track item.slug) {
            <app-post-card [post]="item" />
          }
        </div>
        <a class="back" routerLink="/">&larr; All articles</a>
      </section>
    } @else {
      <app-not-found />
    }
  `,
})
export class PostPage {
  readonly slug = input.required<string>();

  protected readonly authorOf = authorOf;
  protected readonly initials = initials;
  protected readonly post = computed(() => findPost(this.slug()));

  /** Same topic first, then the newest posts, never the current one. */
  protected readonly related = computed(() => {
    const post = this.post();
    if (!post) return [];
    const others = POSTS.filter((item) => item.slug !== post.slug);
    const sameTopic = others.filter((item) => item.tag === post.tag);
    return [...sameTopic, ...others.filter((item) => item.tag !== post.tag)].slice(0, 3);
  });
}
