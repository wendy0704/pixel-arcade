import { defineConfig } from 'vitest/config';

const buildTime = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false });

export default defineConfig({
  base: '/pixel-arcade/',
  define: {
    __BUILD_TIME__: JSON.stringify(buildTime),
  },
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
