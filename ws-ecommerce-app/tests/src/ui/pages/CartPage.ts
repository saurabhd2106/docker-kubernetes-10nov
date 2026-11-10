import type { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class CartPage extends BasePage {
  readonly lines: Locator;
  readonly subtotal: Locator;
  readonly discount: Locator;
  readonly total: Locator;
  readonly emptyMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.lines = page.getByTestId('cart-line');
    this.subtotal = page.getByTestId('cart-subtotal');
    this.discount = page.getByTestId('cart-discount');
    this.total = page.getByTestId('cart-total');
    this.emptyMessage = page.locator('.empty');
  }

  async open(): Promise<void> {
    await this.goto('/cart');
    await this.waitForReady();
  }
}
