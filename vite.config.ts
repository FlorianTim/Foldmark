import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import { defineConfig, type Plugin } from 'vitest/config';

/**
 * Lets the dev server show stylesheets without weakening the shipped policy.
 *
 * `index.html` carries a strict `style-src 'self'` with no `'unsafe-inline'`,
 * and the production build honours it: Vite emits a linked stylesheet. The dev
 * server, however, injects every stylesheet as an inline `<style>` element for
 * hot reloading — which that policy blocks, leaving the development app
 * completely unstyled.
 *
 * So the directive is relaxed **in the dev transform only**. The file on disk
 * and therefore the built `dist/index.html` keep the strict policy, which is
 * also what `npm run security:check` reads. The relaxation cannot reach a
 * deployed build, because nothing writes it to disk.
 */
function devStyleSrcPlugin(): Plugin {
  return {
    name: 'foldmark-dev-style-src',
    apply: 'serve',
    transformIndexHtml(html) {
      // No comment is appended to the replacement: a policy has no comment
      // syntax, so `/* … */` is read as a directive *name* and everything up to
      // the next `;` becomes its value — which silently drops the directive
      // that followed. Here that was `img-src`, and the symptom was every
      // inlined SVG being blocked in development.
      return html.replace("style-src 'self';", "style-src 'self' 'unsafe-inline';");
    },
  };
}

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? '/',
  plugins: [vue(), tailwindcss(), devStyleSrcPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    sourcemap: false,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.test.ts'],
  },
});
