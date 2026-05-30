/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // This repo's directory is named "package.json", so PostCSS/cosmiconfig's
  // upward search for a `package.json` file resolves to a directory (EISDIR).
  // Tailwind v4 is handled by its Vite plugin, so pin an inline (empty)
  // PostCSS config to disable the filesystem search entirely.
  css: {
    postcss: { plugins: [] },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    css: false,
  },
});
