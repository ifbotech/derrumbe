import { defineConfig } from 'vite';

// Dos maneras de construir el cliente:
//   npm run build      → dist/client, lo sirve el servidor de salas (rutas absolutas, con /ws al lado)
//   npm run build:web  → dist/web, estático y con rutas relativas: GitHub Pages, itch.io o una
//                        envoltura de escritorio (Tauri). Juega en local; el cooperativo se conecta
//                        al servidor que se indique en Ajustes (o en VITE_SERVER al construir).
export default defineConfig(({ mode }) => ({
  root: '.',
  base: mode === 'web' ? './' : '/',
  build: { outDir: mode === 'web' ? 'dist/web' : 'dist/client', emptyOutDir: true },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/ws': { target: 'ws://127.0.0.1:3000', ws: true },
    },
  },
}));
