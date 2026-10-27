import { defineConfig } from 'vite';
import { resolve } from 'path';

// Sitio multi-página: landing pública + panel administrativo.
// Cada entrada conserva su ruta relativa en `dist/` para que el hosting
// estático (Firebase Hosting, Netlify, etc.) funcione sin configuración
// adicional de rutas.
export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        adminLogin: resolve(__dirname, 'admin/login.html'),
        adminPanel: resolve(__dirname, 'admin/panel.html'),
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
