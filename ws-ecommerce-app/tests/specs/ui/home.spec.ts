import { test, expect } from '../../src/fixtures';

test.describe('UI home', () => {

  test('should show a product grid and footer when the home page loads', { tag: '@smoke' }, async ({ homePage }) => {
    await test.step('Action: open the home page', async () => {
      await homePage.open();
    });

    await test.step('Validation: product grid has cards and footer is visible', async () => {
      await expect(homePage.productGrid).toBeVisible();
      await expect(homePage.productCards.first()).toBeVisible();
      await expect(homePage.footer).toBeVisible();
    });
  });

  
});
