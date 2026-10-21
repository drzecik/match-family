import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/auto-register.ts',
      formats: ['es'],
      fileName: () => 'filter-match-widget.js'
    },
    sourcemap: true,
    minify: 'esbuild'
  }
});
