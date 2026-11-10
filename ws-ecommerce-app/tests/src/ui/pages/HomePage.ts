import type { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class HomePage extends BasePage {
  readonly productGrid: Locator;
  readonly productCards: Locator;
  readonly emptyResults: Locator;
  readonly minPrice: Locator;
  readonly maxPrice: Locator;
  readonly priceFilterSubmit: Locator;
  readonly sortSelect: Locator;

  constructor(page: Page) {
    super(page);
    this.productGrid = page.getByTestId('product-grid');
    this.productCards = page.getByTestId('product-card');
    this.emptyResults = page.getByTestId('empty-results');
    this.minPrice = page.getByTestId('min-price');
    this.maxPrice = page.getByTestId('max-price');
    this.priceFilterSubmit = page.getByTestId('price-filter-submit');
    this.sortSelect = page.getByTestId('sort-select');
  }

  async open(): Promise<void> {
    await this.goto('/');
    await this.waitForReady();
    await this.productGrid.waitFor({ state: 'visible' });
  }

  async search(query: string): Promise<void> {
    await this.header.search(query);
    await this.productGrid.waitFor({ state: 'visible' });
  }

  async filterByMaxPrice(maxDollars: string): Promise<void> {
    await this.maxPrice.fill(maxDollars);
    await this.priceFilterSubmit.click();
    await this.page.waitForLoadState('networkidle');
  }

  async setSort(value: 'id' | 'price_asc' | 'price_desc' | 'name'): Promise<void> {
    await this.sortSelect.selectOption(value);
    await this.page.waitForLoadState('networkidle');
  }

  productCardByName(name: string | RegExp): Locator {
    return this.productCards.filter({
      has: this.page.getByTestId('product-name').filter({ hasText: name }),
    });
  }
}
