import fs from 'node:fs';
import path from 'node:path';
import { test as setup, expect, request as playwrightRequest } from '@playwright/test';
import { ApiClients } from '../src/api/clients';
import { env } from '../src/config/env';

setup('wait for API health, reset demo data, and save demo auth state', async ({ browser }) => {
  fs.mkdirSync(env.authDir, { recursive: true });

  const apiRequest = await playwrightRequest.newContext({
    baseURL: env.apiUrl,
    extraHTTPHeaders: { Accept: 'application/json' },
  });
  const api = new ApiClients(apiRequest);

  await expect
    .poll(async () => {
      try {
        const health = await api.demo.health();
        return health.status;
      } catch {
        return 'DOWN';
      }
    }, {
      message: `API health did not become UP at ${env.apiUrl}/health`,
      timeout: 60_000,
      intervals: [1_000, 2_000, 3_000],
    })
    .toBe('UP');

  const reset = await api.demo.reset();
  expect(reset.ok).toBe(true);

  const auth = await api.auth.login({
    username: env.demoUser,
    password: env.demoPassword,
  });
  expect(auth.token).toBeTruthy();

  const context = await browser.newContext({ baseURL: env.baseUrl });
  const page = await context.newPage();
  await page.goto('/');
  await page.evaluate(
    ({ token, username, displayName }) => {
      localStorage.setItem('ecommerce_token', token);
      localStorage.setItem('ecommerce_user', JSON.stringify({ username, displayName }));
    },
    {
      token: auth.token,
      username: auth.username,
      displayName: auth.displayName,
    },
  );

  const authFile = path.join(env.authDir, 'demo.json');
  await context.storageState({ path: authFile });
  await context.close();
  await apiRequest.dispose();
});
