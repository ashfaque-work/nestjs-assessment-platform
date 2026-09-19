/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// In development the API calls go to the running gateway (the live one by default).
// In production the app and the API share one origin, so no proxy is involved.
const apiTarget = process.env.API_TARGET ?? 'https://assess.ashfaqueahmad.com';
const apiPrefixes = ['/auth', '/student', '/assessment', '/attempt', '/question'];

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: Object.fromEntries(
      apiPrefixes.map((prefix) => [prefix, { target: apiTarget, changeOrigin: true, secure: true }]),
    ),
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
