import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

// Sitio multi-página: landing pública + panel administrativo.
// Cada entrada conserva su ruta relativa en `dist/` para que el hosting
// estático (Firebase Hosting, Netlify, etc.) funcione sin configuración
// adicional de rutas.
//
// El service worker del panel (Fase 8) es una entrada más, pero se emite SIN
// hash en /admin/sw.js: así su alcance es /admin/ y el navegador puede
// comprobar si cambió. Se le inyecta una versión por compilación para renovar
// la caché en cada despliegue.
const SW_ENTRY = 'adminSw';

export default defineConfig({
  root: '.',
  define: {
    __SW_VERSION__: JSON.stringify(Date.now().toString(36)),
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        adminLogin: resolve(__dirname, 'admin/login.html'),
        adminPanel: resolve(__dirname, 'admin/panel.html'),
        adminVentas: resolve(__dirname, 'admin/ventas.html'),
        [SW_ENTRY]: resolve(__dirname, 'src/admin/sw.ts'),
      },
      output: {
        entryFileNames: (chunk) => (chunk.name === SW_ENTRY ? 'admin/sw.js' : 'assets/[name]-[hash].js'),
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
