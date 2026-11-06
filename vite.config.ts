import { loadEnv, type Plugin } from 'vite';
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

/** Dominio por defecto si no se define VITE_SITE_URL (ver .env.example). */
const SITE_URL_POR_DEFECTO = 'https://quesillosemmanuel.com';

/**
 * SEO (Fase 9): completa las URLs absolutas que exigen Open Graph y los
 * buscadores (`__SITE_URL__` en el HTML) y genera robots.txt y sitemap.xml.
 * El panel admin queda fuera de los buscadores (Disallow + noindex).
 */
function seo(siteUrl: string): Plugin {
  return {
    name: 'quesillos-seo',
    transformIndexHtml: (html) => html.replaceAll('__SITE_URL__', siteUrl),
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: `User-agent: *\nDisallow: /admin/\n\nSitemap: ${siteUrl}/sitemap.xml\n`,
      });
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source:
          '<?xml version="1.0" encoding="UTF-8"?>\n' +
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
          `  <url><loc>${siteUrl}/</loc></url>\n` +
          '</urlset>\n',
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const siteUrl = (env.VITE_SITE_URL || SITE_URL_POR_DEFECTO).replace(/\/+$/, '');

  return {
    root: '.',
    plugins: [seo(siteUrl)],
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
  };
});
