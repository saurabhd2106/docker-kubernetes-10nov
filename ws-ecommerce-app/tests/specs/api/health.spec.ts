import { test, expect } from '../../src/fixtures';

test.describe('API health', () => {
  test('should return UP status when health endpoint is called', { tag: '@smoke' }, async ({ api }) => {
    const health = await test.step('Action: call GET /health', async () => {
      return api.demo.health();
    });

    await test.step('Validation: response status is UP', async () => {
      expect(health).toEqual({ status: 'UP' });
    });
  });
});
