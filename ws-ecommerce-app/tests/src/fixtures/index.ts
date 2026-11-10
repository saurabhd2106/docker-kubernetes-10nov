import { mergeTests, expect } from '@playwright/test';
import { apiTest } from './api.fixture';
import { uiTest } from './ui.fixture';

/** Merged fixtures for UI and API specs. Prefer importing `test`/`expect` from here. */
export const test = mergeTests(apiTest, uiTest);
export { expect };
