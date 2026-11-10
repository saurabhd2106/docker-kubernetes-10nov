import fs from 'node:fs';
import path from 'node:path';
import { test as base, type Browser, type Page } from '@playwright/test';
import { ApiClients } from '../api/clients';
import { env } from '../config/env';
import { uniqueUser } from '../data/factories';
import { CartPage } from '../ui/pages/CartPage';
import { HomePage } from '../ui/pages/HomePage';
import { LoginPage } from '../ui/pages/LoginPage';
import { ProductPage } from '../ui/pages/ProductPage';

type UiFixtures = {
  homePage: HomePage;
  loginPage: LoginPage;
  productPage: ProductPage;
  cartPage: CartPage;
  /** Page pre-authenticated as the demo user via storageState. */
  authedPage: Page;
  /** Fresh registered user injected into localStorage (isolated cart). */
  freshUserPage: Page;
};

async function buildStorageState(browser: Browser, token: string, username: string, displayName: string): Promise<string> {
  const dir = env.authDir;
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `user_${username}.json`);

  const context = await browser.newContext({ baseURL: env.baseUrl });
  const page = await context.newPage();
  await page.goto('/');
  await page.evaluate(
    ({ token: t, username: u, displayName: d }) => {
      localStorage.setItem('ecommerce_token', t);
      localStorage.setItem('ecommerce_user', JSON.stringify({ username: u, displayName: d }));
    },
    { token, username, displayName },
  );
  await context.storageState({ path: file });
  await context.close();
  return file;
}

export const uiTest = base.extend<UiFixtures>({
  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  productPage: async ({ page }, use) => {
    await use(new ProductPage(page));
  },
  cartPage: async ({ page }, use) => {
    await use(new CartPage(page));
  },

  authedPage: async ({ browser }, use) => {
    const authFile = path.join(env.authDir, 'demo.json');
    const context = await browser.newContext({
      baseURL: env.baseUrl,
      storageState: authFile,
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  freshUserPage: async ({ browser, request }, use, testInfo) => {
    const credentials = uniqueUser();
    const api = new ApiClients(request, null, testInfo);
    const user = await api.auth.register(credentials);
    const stateFile = await buildStorageState(browser, user.token, user.username, user.displayName);
    const context = await browser.newContext({
      baseURL: env.baseUrl,
      storageState: stateFile,
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});
