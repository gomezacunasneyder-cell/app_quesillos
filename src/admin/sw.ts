/**
 * Service worker del panel administrativo (Fase 8).
 *
 * - Alcance: solo /admin/ (vive en /admin/sw.js). El sitio público no se toca.
 * - Cachea únicamente el cascarón estático (HTML, CSS, JS con hash, íconos).
 * - NO cachea datos: Firestore y Auth quedan fuera (ver cachePolicy.ts).
 * - Las compras, pagos o cambios de estado NO funcionan sin conexión; sin red
 *   solo se muestra el cascarón o la página "Sin conexión".
 * - Una versión nueva espera a que la persona pulse "Actualizar" (mensaje
 *   SKIP_WAITING) para no cambiar el código a mitad de una sesión de trabajo.
 *
 * Se compila aparte (tsconfig.sw.json, lib WebWorker) como /admin/sw.js.
 */
import { decidirEstrategia, esRespuestaCacheable } from './pwa/cachePolicy';

declare const self: ServiceWorkerGlobalScope;
/** Se reemplaza en cada compilación (vite.config.ts) para renovar la caché al desplegar. */
declare const __SW_VERSION__: string;

const PREFIJO_CACHE = 'quesillos-admin-';
const CACHE_ACTUAL = `${PREFIJO_CACHE}${__SW_VERSION__}`;
const URL_SIN_CONEXION = new URL('./offline.html', self.location.href).href;
const PRECARGA = [URL_SIN_CONEXION, new URL('./css/admin.css', self.location.href).href];
/** Con copia guardada, no esperamos más que esto a una red lenta. */
const ESPERA_MAX_RED_MS = 4000;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_ACTUAL).then((cache) => cache.addAll(PRECARGA)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const nombres = await caches.keys();
      await Promise.all(
        nombres
          .filter((nombre) => nombre.startsWith(PREFIJO_CACHE) && nombre !== CACHE_ACTUAL)
          .map((nombre) => caches.delete(nombre)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  const datos: unknown = event.data;
  if (typeof datos === 'object' && datos !== null && (datos as { type?: unknown }).type === 'SKIP_WAITING') {
    void self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const estrategia = decidirEstrategia(
    { method: request.method, url: request.url, mode: request.mode },
    self.location.origin,
  );
  if (estrategia === 'ignorar') return;

  event.respondWith(estrategia === 'cache-primero' ? cachePrimero(request) : redPrimero(request));
});

async function guardar(cache: Cache, request: Request, respuesta: Response): Promise<void> {
  if (esRespuestaCacheable(respuesta)) {
    await cache.put(request, respuesta.clone());
  }
}

async function cachePrimero(request: Request): Promise<Response> {
  const cache = await caches.open(CACHE_ACTUAL);
  const guardada = await cache.match(request);
  if (guardada) return guardada;

  const respuesta = await fetch(request);
  await guardar(cache, request, respuesta);
  return respuesta;
}

async function redPrimero(request: Request): Promise<Response> {
  const cache = await caches.open(CACHE_ACTUAL);
  const esNavegacion = request.mode === 'navigate';

  const enRed = fetch(request).then(async (respuesta) => {
    await guardar(cache, request, respuesta);
    return respuesta;
  });

  try {
    const guardada = await cache.match(request);
    if (!esNavegacion || !guardada) return await enRed;

    // Hay copia: si la red tarda demasiado (datos móviles flojos), usamos la copia.
    const limite = new Promise<Response>((resolve) => {
      setTimeout(() => resolve(guardada), ESPERA_MAX_RED_MS);
    });
    return await Promise.race([enRed, limite]);
  } catch {
    const guardada = await cache.match(request);
    if (guardada) return guardada;

    if (esNavegacion) {
      const sinConexion = await cache.match(URL_SIN_CONEXION);
      if (sinConexion) return sinConexion;
    }
    return Response.error();
  }
}
