import path from 'node:path';
import { defineConfig, devices, type Project } from '@playwright/test';
import { env } from './src/config/env';

const authFile = path.join(env.authDir, 'demo.json');

function uiProjects(): Project[] {
  const projects: Project[] = [
    {
      name: 'ui-chromium',
      testDir: './specs/ui',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        baseURL: env.baseUrl,
        storageState: undefined,
      },
    },
  ];

  if (env.browsers.includes('firefox')) {
    projects.push({
      name: 'ui-firefox',
      testDir: './specs/ui',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Firefox'],
        baseURL: env.baseUrl,
        storageState: undefined,
      },
    });
  }

  if (env.browsers.includes('webkit')) {
    projects.push({
      name: 'ui-webkit',
      testDir: './specs/ui',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Safari'],
        baseURL: env.baseUrl,
        storageState: undefined,
      },
    });
  }

  return projects;
}

export default defineConfig({
  testDir: './specs',
  fullyParallel: true,
  forbidOnly: env.isCi,
  retries: env.isCi ? 2 : 0,
  workers: process.env.WORKERS ? Number(process.env.WORKERS) : env.isCi ? 4 : undefined,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  outputDir: './test-results',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/html', open: 'never' }],
    ['json', { outputFile: 'reports/results.json' }],
    ['junit', { outputFile: 'reports/junit.xml' }],
    ['./reporters/summary-reporter.ts'],
  ],
  use: {
    testIdAttribute: 'data-testid',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'setup',
      testMatch: /global\.setup\.ts/,
      testDir: './setup',
    },
    {
      name: 'api',
      testDir: './specs/api',
      dependencies: ['setup'],
      use: {
        baseURL: env.apiUrl,
      },
    },
    ...uiProjects(),
  ],
  metadata: {
    baseUrl: env.baseUrl,
    apiUrl: env.apiUrl,
    authFile,
  },
});
