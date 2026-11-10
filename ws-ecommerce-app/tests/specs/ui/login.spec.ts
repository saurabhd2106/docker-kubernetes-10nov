import { test, expect } from '../../src/fixtures';
import { env } from '../../src/config/env';

test.describe('UI login', () => {
  test('should show the user greeting when logging in with valid credentials', { tag: '@smoke' }, async ({ loginPage, page }) => {
    const credentials = await test.step('Input Data: demo username and password', async () => ({
      username: env.demoUser,
      password: env.demoPassword,
    }));

    await test.step('Action: open login page and submit valid credentials', async () => {
      await loginPage.open();
      await loginPage.login(credentials.username, credentials.password);
    });

    await test.step('Validation: header greets the logged-in user and URL leaves /login', async () => {
      await expect(page).not.toHaveURL(/\/login/);
      await expect(loginPage.header.accountGreeting).toContainText(/Hello,/);
      await expect(loginPage.header.accountGreeting).not.toHaveText('Hello, Guest');
    });
  });

  test('should show a form error when logging in with invalid credentials', { tag: '@smoke' }, async ({ loginPage, page }) => {
    const credentials = await test.step('Input Data: demo username with an invalid password', async () => ({
      username: env.demoUser,
      password: 'wrong-password',
    }));

    await test.step('Action: open login page and submit invalid credentials', async () => {
      await loginPage.open();
      await loginPage.login(credentials.username, credentials.password);
    });

    await test.step('Validation: form-error shows Invalid username or password and URL stays on /login', async () => {
      await expect(loginPage.formError).toBeVisible();
      await expect(loginPage.formError).toHaveText('Invalid username or password');
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test('should mark both fields as required and mask the password when the login page loads', { tag: '@regression' }, async ({ loginPage }) => {
    await test.step('Action: open login page', async () => {
      await loginPage.open();
    });

    await test.step('Validation: username and password are required and password is masked', async () => {
      await expect(loginPage.username).toHaveAttribute('required', '');
      await expect(loginPage.password).toHaveAttribute('required', '');
      await expect(loginPage.password).toHaveAttribute('type', 'password');
    });
  });

  test('should block submission and flag both fields when username and password are empty', { tag: '@regression' }, async ({ loginPage, page }) => {
    await test.step('Action: open login page and submit empty credentials', async () => {
      await loginPage.open();
      await loginPage.login('', '');
    });

    await test.step('Validation: both fields are valueMissing, form-error is hidden, and guest greeting remains', async () => {
      await expect(page).toHaveURL(/\/login/);
      expect(await loginPage.isValueMissing(loginPage.username)).toBe(true);
      expect(await loginPage.isValueMissing(loginPage.password)).toBe(true);
      await expect(loginPage.formError).toBeHidden();
      await expect(loginPage.header.accountGreeting).toHaveText('Hello, Guest');
    });
  });

  test('should block submission and flag the password field when only password is empty', { tag: '@regression' }, async ({ loginPage, page }) => {
    const credentials = await test.step('Input Data: demo username with empty password', async () => ({
      username: env.demoUser,
      password: '',
    }));

    await test.step('Action: open login page and submit with empty password', async () => {
      await loginPage.open();
      await loginPage.login(credentials.username, credentials.password);
    });

    await test.step('Validation: password is valueMissing, username is not, and form-error is hidden', async () => {
      await expect(page).toHaveURL(/\/login/);
      expect(await loginPage.isValueMissing(loginPage.username)).toBe(false);
      expect(await loginPage.isValueMissing(loginPage.password)).toBe(true);
      await expect(loginPage.formError).toBeHidden();
    });
  });

  test('should block submission and flag the username field when only username is empty', { tag: '@regression' }, async ({ loginPage, page }) => {
    const credentials = await test.step('Input Data: empty username with a password', async () => ({
      username: '',
      password: env.demoPassword,
    }));

    await test.step('Action: open login page and submit with empty username', async () => {
      await loginPage.open();
      await loginPage.login(credentials.username, credentials.password);
    });

    await test.step('Validation: username is valueMissing, password is not, and form-error is hidden', async () => {
      await expect(page).toHaveURL(/\/login/);
      expect(await loginPage.isValueMissing(loginPage.username)).toBe(true);
      expect(await loginPage.isValueMissing(loginPage.password)).toBe(false);
      await expect(loginPage.formError).toBeHidden();
    });
  });

  test('should show a form error when logging in with an unknown username', { tag: '@regression' }, async ({ loginPage, page }) => {
    const credentials = await test.step('Input Data: unknown username with any password', async () => ({
      username: `unknown_${Date.now()}`,
      password: 'some-password',
    }));

    await test.step('Action: open login page and submit unknown username', async () => {
      await loginPage.open();
      await loginPage.login(credentials.username, credentials.password);
    });

    await test.step('Validation: form-error shows Invalid username or password and URL stays on /login', async () => {
      await expect(loginPage.formError).toBeVisible();
      await expect(loginPage.formError).toHaveText('Invalid username or password');
      await expect(page).toHaveURL(/\/login/);
    });
  });
});
