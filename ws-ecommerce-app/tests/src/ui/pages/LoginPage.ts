import type { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  readonly username: Locator;
  readonly password: Locator;
  readonly submit: Locator;
  readonly formError: Locator;

  constructor(page: Page) {
    super(page);
    this.username = page.getByTestId('login-username');
    this.password = page.getByTestId('login-password');
    this.submit = page.getByTestId('login-submit');
    this.formError = page.getByTestId('form-error');
  }

  async open(): Promise<void> {
    await this.goto('/login');
    await this.waitForReady();
    await this.username.waitFor({ state: 'visible' });
  }

  async login(username: string, password: string): Promise<void> {
    await this.username.fill(username);
    await this.password.fill(password);
    await this.submit.click();
  }

  async isValueMissing(field: Locator): Promise<boolean> {
    return field.evaluate((el) => (el as HTMLInputElement).validity.valueMissing);
  }
}
