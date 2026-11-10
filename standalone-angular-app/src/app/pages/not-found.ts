import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  template: `
    <section class="empty-state">
      <p class="empty-code">404</p>
      <h1>This page is not in the image</h1>
      <p>Maybe it was never written, or this container is running an older build.</p>
      <a class="button" routerLink="/">Back to all articles</a>
    </section>
  `,
})
export class NotFound {}
