/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// In development the API calls go to the running gateway (the live one by default).
// In production the app and the API share one origin, so no proxy is involved.
const apiTarget = process.env.API_TARGET ?? 'https://assess.ashfaqueahmad.com';
const apiPrefixes = ['/auth', '/student', '/assessment', '/attempt', '/question', '/subjects', '/units', '/topics'];

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: Object.fromEntries(
      apiPrefixes.map((prefix) => [prefix, { target: apiTarget, changeOrigin: true, secure: true }]),
    ),
  },
  test: {
    environment: 'jsdom',
    // e2e/ holds the Playwright tests, run with `npm run e2e`
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: ['./src/test/setup.ts'],
  },
});
