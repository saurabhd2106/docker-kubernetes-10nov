import type { Locator, Page } from '@playwright/test';

export class Header {
  readonly root: Locator;
  readonly searchInput: Locator;
  readonly searchCategory: Locator;
  readonly searchSubmit: Locator;
  readonly cartLink: Locator;
  readonly cartCount: Locator;
  readonly accountGreeting: Locator;

  constructor(private readonly page: Page) {
    this.root = page.locator('header.site-header');
    this.searchInput = page.getByTestId('search-input');
    this.searchCategory = page.getByTestId('search-category');
    this.searchSubmit = page.getByTestId('search-submit');
    this.cartLink = page.getByTestId('cart-link');
    this.cartCount = page.getByTestId('cart-count');
    this.accountGreeting = page.locator('.header-action span').first();
  }

  async search(query: string, category?: string): Promise<void> {
    if (category !== undefined) {
      await this.searchCategory.selectOption(category);
    }
    await this.searchInput.fill(query);
    await this.searchSubmit.click();
  }

  async cartItemCount(): Promise<number> {
    const text = (await this.cartCount.textContent())?.trim() ?? '0';
    return Number(text);
  }
}
