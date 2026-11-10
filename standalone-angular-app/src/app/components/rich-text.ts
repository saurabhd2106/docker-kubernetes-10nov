import { Component, computed, input } from '@angular/core';

/** Renders text with `backtick` spans as <code>, without innerHTML. */
@Component({
  selector: 'app-rich-text',
  template: `@for (part of parts(); track $index) {@if (part.code) {<code>{{ part.text }}</code>} @else {<ng-container>{{ part.text }}</ng-container>}}`,
})
export class RichText {
  readonly text = input.required<string>();
  protected readonly parts = computed(() =>
    this.text()
      .split('`')
      .map((text, index) => ({ text, code: index % 2 === 1 })),
  );
}
