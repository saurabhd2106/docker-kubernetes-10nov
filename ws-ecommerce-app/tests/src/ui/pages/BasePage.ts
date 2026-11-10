import type { Page } from '@playwright/test';
import { Header } from '../components/Header';

export abstract class BasePage {
  readonly header: Header;
  readonly footer;

  constructor(protected readonly page: Page) {
    this.header = new Header(page);
    this.footer = page.getByTestId('site-footer');
  }

  async goto(path = '/'): Promise<void> {
    await this.page.goto(path);
  }

  async waitForReady(): Promise<void> {
    await this.header.root.waitFor({ state: 'visible' });
  }
}
