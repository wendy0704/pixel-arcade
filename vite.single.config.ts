import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

function standaloneHead(): Plugin {
  const svg = readFileSync(new URL('./public/favicon.svg', import.meta.url));
  const favicon = `data:image/svg+xml;base64,${svg.toString('base64')}`;
  return {
    name: 'standalone-head',
    transformIndexHtml(html) {
      return html
        .replace(/\s*<link rel="icon"[^>]*>/, '')
        .replace(/\s*<link rel="apple-touch-icon"[^>]*>/, '')
        .replace(/\s*<link rel="manifest"[^>]*>/, '')
        .replace('<title>', `<link rel="icon" type="image/svg+xml" href="${favicon}" />\n    <title>`);
    },
  };
}

export default defineConfig({
  base: './',
  publicDir: false,
  plugins: [standaloneHead(), viteSingleFile()],
  build: {
    target: 'es2022',
    outDir: 'public/single',
    emptyOutDir: true,
    assetsInlineLimit: 100000000,
    cssCodeSplit: false,
    chunkSizeWarningLimit: 100000,
  },
});
