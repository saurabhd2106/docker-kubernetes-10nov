import path from 'node:path';
import { config as loadDotenv } from 'dotenv';

loadDotenv({ path: path.resolve(__dirname, '../../.env') });
loadDotenv({ path: path.resolve(__dirname, '../../.env.example') });

function required(name: string, fallback: string): string {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : fallback;
}

const browsersRaw = required('BROWSERS', 'chromium')
  .split(',')
  .map((b) => b.trim().toLowerCase())
  .filter(Boolean);

export const env = {
  baseUrl: required('BASE_URL', 'http://localhost:5173'),
  apiUrl: required('API_URL', 'http://localhost:8080/api'),
  demoUser: required('DEMO_USER', 'demo'),
  demoPassword: required('DEMO_PASSWORD', 'password1'),
  browsers: browsersRaw.length > 0 ? browsersRaw : ['chromium'],
  authDir: path.resolve(__dirname, '../../.auth'),
  reportsDir: path.resolve(__dirname, '../../reports'),
  isCi: !!process.env.CI,
} as const;

export type Env = typeof env;
