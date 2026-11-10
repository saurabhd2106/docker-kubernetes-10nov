import { test, expect } from '../../src/fixtures';
import { products } from '../../src/data/testData';

test.describe('UI search and filter', () => {
  test('should show the AeroClick Wireless Mouse card when searching AeroClick', { tag: '@smoke' }, async ({ homePage }) => {
    const query = await test.step('Input Data: search term AeroClick', async () => products.aeroClick.search);

    await test.step('Action: open home page and search for the term', async () => {
      await homePage.open();
      await homePage.search(query);
    });

    await test.step('Validation: matching product card is visible', async () => {
      await expect(homePage.productCardByName(products.aeroClick.name)).toBeVisible();
    });
  });

  test('should show empty results when max price filter is 0.01', { tag: '@smoke' }, async ({ homePage }) => {
    const maxPrice = await test.step('Input Data: max price below every product price', async () => '0.01');

    await test.step('Action: open home page and apply max price filter', async () => {
      await homePage.open();
      await homePage.filterByMaxPrice(maxPrice);
    });

    await test.step('Validation: empty results message is shown and grid has no cards', async () => {
      await expect(homePage.emptyResults).toBeVisible();
      await expect(homePage.productCards).toHaveCount(0);
    });
  });
});
