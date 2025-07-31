import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/main.ts'],
  format: ['esm'],
  minify: true,
  outDir: 'dist',
  target: 'es2022',
  clean: true,
  sourcemap: false
});