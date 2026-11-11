import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  build: { outDir: 'dist/client', emptyOutDir: true },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/ws': { target: 'ws://127.0.0.1:3000', ws: true },
    },
  },
});
