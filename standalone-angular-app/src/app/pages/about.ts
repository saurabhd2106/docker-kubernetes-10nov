import { Component } from '@angular/core';
import { AUTHORS, initials } from '../posts';

@Component({
  selector: 'app-about',
  template: `
    <article class="article">
      <header class="article-head">
        <p class="eyebrow">About</p>
        <h1>A real blog, built to be shipped in a container</h1>
        <p class="article-lead">
          Container Field Notes is the sample application for the Docker and Kubernetes training. It reads like a
          normal engineering blog, and it is small enough to understand in one sitting.
        </p>
      </header>

      <div class="prose">
        <h2>What is inside</h2>
        <p>
          A standalone Angular app with no backend and no database. Every article is compiled into the JavaScript
          bundle, and nginx serves the result as plain static files from an unprivileged Alpine image.
        </p>

        <h2>Useful endpoints</h2>
        <ul>
          <li><code>/</code>: the blog</li>
          <li><code>/health</code>: returns <code>ok</code>, used by the image health check</li>
          <li><code>/runtime.json</code>: the container hostname and port, read by the footer</li>
        </ul>

        <h2>Where the footer gets its hostname</h2>
        <p>
          The bundle is built once and is identical in every container, so it cannot know where it is running. When a
          page loads, Angular asks nginx for <code>/runtime.json</code>, and nginx fills in its own hostname and port
          at request time.
        </p>
        <aside class="callout">
          Start two containers on different host ports and each footer shows a different hostname, even though both
          serve exactly the same files.
        </aside>

        <h2>The authors</h2>
      </div>

      <ul class="team">
        @for (author of authors; track author.id) {
          <li class="team-card">
            <span class="avatar avatar-large" [style.background]="author.color" aria-hidden="true">
              {{ initials(author.name) }}
            </span>
            <span class="team-name">{{ author.name }}</span>
            <span class="team-role">{{ author.role }}</span>
          </li>
        }
      </ul>
    </article>
  `,
})
export class About {
  protected readonly authors = Object.values(AUTHORS);
  protected readonly initials = initials;
}
