import type { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class ProductPage extends BasePage {
  readonly productName: Locator;
  readonly productStock: Locator;
  readonly quantityInput: Locator;
  readonly addToCart: Locator;

  constructor(page: Page) {
    super(page);
    this.productName = page.getByTestId('product-name');
    this.productStock = page.getByTestId('product-stock');
    this.quantityInput = page.getByTestId('quantity-input');
    this.addToCart = page.getByTestId('add-to-cart');
  }

  async open(productId: number): Promise<void> {
    await this.goto(`/products/${productId}`);
    await this.waitForReady();
    await this.productName.waitFor({ state: 'visible' });
  }

  async setQuantity(quantity: number): Promise<void> {
    await this.quantityInput.fill(String(quantity));
  }

  async addToCartWithQuantity(quantity = 1): Promise<void> {
    await this.setQuantity(quantity);
    await this.addToCart.click();
  }
}
