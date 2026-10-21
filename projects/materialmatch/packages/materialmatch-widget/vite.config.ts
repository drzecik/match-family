import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/standalone.ts',
      name: 'MaterialMatchWidget',
      formats: ['es', 'iife'],
      fileName: (format) =>
        format === 'iife' ? 'materialmatch-widget.iife.js' : 'materialmatch-widget.js',
    },
    sourcemap: true,
  },
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.ts'],
    setupFiles: [],
  },
});
