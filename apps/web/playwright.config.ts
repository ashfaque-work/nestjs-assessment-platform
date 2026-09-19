import { defineConfig, devices } from '@playwright/test';

// End-to-end tests of the web app against a running deployment: the live demo by default,
// or BASE_URL (for example http://localhost:5173 with `npm run dev`, which proxies to the API).
// They take a real test as the demo student, so they need the demo accounts and sample data.
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.BASE_URL ?? 'https://assess.ashfaqueahmad.com',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel: process.env.CI ? undefined : 'chrome' } },
    { name: 'phone', use: { ...devices['Pixel 7'], channel: process.env.CI ? undefined : 'chrome' }, grep: /@phone/ },
  ],
});
