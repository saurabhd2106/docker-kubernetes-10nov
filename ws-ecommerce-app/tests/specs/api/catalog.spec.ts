import { test, expect } from '../../src/fixtures';
import { products } from '../../src/data/testData';
import { dollarsToCents } from '../../src/utils/money';

test.describe('API catalog', () => {
  test('should return a paginated product list when products endpoint is called', { tag: '@smoke' }, async ({ api }) => {
    const page = await test.step('Action: GET /products with default pagination', async () => {
      return api.catalog.getProducts({ page: 0, size: 20 });
    });

    await test.step('Validation: response has items, page, size, and total fields', async () => {
      expect(Array.isArray(page.items)).toBe(true);
      expect(page.items.length).toBeGreaterThan(0);
      expect(page.page).toBe(0);
      expect(page.size).toBe(20);
      expect(page.total).toBeGreaterThan(0);
    });
  });

  test('should return GardenPasta Penne first when max price is $10 and sort is price ascending', { tag: '@smoke' }, async ({ api }) => {
    const query = await test.step('Input Data: maxPrice $10 (cents) and sort price_asc', async () => ({
      maxPrice: dollarsToCents(10),
      sort: 'price_asc',
      page: 0,
      size: 20,
    }));

    const page = await test.step('Action: GET /products with price filter and sort', async () => {
      return api.catalog.getProducts(query);
    });

    await test.step('Validation: first item is GardenPasta Penne at 349 cents', async () => {
      expect(page.items.length).toBeGreaterThan(0);
      expect(page.items[0].name).toBe(products.gardenPasta.name);
      expect(page.items[0].priceCents).toBe(products.gardenPasta.priceCents);
    });
  });
});
