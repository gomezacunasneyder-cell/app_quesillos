/**
 * Política de caché del service worker del panel admin (Fase 8).
 *
 * Lógica pura, sin APIs del navegador, para poder probarla con Vitest.
 * Decide qué hacer con cada petición; el service worker solo la ejecuta.
 *
 * Regla de oro: nunca se cachean datos. Firestore y Auth viven en otros
 * orígenes (googleapis.com) y se ignoran por completo, así que los pedidos,
 * direcciones y ventas jamás se guardan en el almacenamiento del navegador
 * por culpa de la PWA. Solo se cachea el "cascarón" estático de la app.
 */

export type Estrategia =
  /** Intenta la red; si falla, usa la copia guardada (HTML, CSS). */
  | 'red-primero'
  /** Usa la copia guardada; solo va a la red si no existe (archivos con hash). */
  | 'cache-primero'
  /** El service worker no interviene: la petición sigue su curso normal. */
  | 'ignorar';

export interface PeticionBasica {
  method: string;
  url: string;
  /** `Request.mode` (por ejemplo 'navigate' para cambios de página). */
  mode: string;
}

/** Archivos generados por Vite: nombre-HASH8.js|css. El hash los hace inmutables. */
const ARCHIVO_CON_HASH = /\/assets\/[^/]+-[A-Za-z0-9_-]{8}\.(?:js|css)$/;

export function decidirEstrategia(peticion: PeticionBasica, origenPropio: string): Estrategia {
  if (peticion.method !== 'GET') return 'ignorar';

  let url: URL;
  try {
    url = new URL(peticion.url);
  } catch {
    return 'ignorar';
  }

  // Firestore, Auth, fuentes externas… nunca pasan por la caché.
  if (url.origin !== origenPropio) return 'ignorar';

  const ruta = url.pathname;

  // El propio service worker debe venir siempre de la red para poder actualizarse.
  if (ruta.endsWith('/sw.js')) return 'ignorar';

  if (peticion.mode === 'navigate') return 'red-primero';
  if (ARCHIVO_CON_HASH.test(ruta)) return 'cache-primero';
  if (ruta.includes('/admin/icons/')) return 'cache-primero';
  if (ruta.includes('/admin/css/') || ruta.endsWith('/manifest.webmanifest')) return 'red-primero';

  return 'ignorar';
}

/**
 * ¿Es seguro guardar esta respuesta? Solo respuestas correctas del propio
 * origen y sin redirecciones (una respuesta redirigida no puede usarse para
 * responder a una navegación).
 */
export function esRespuestaCacheable(respuesta: {
  ok: boolean;
  status: number;
  type: string;
  redirected: boolean;
}): boolean {
  return respuesta.ok && respuesta.status === 200 && respuesta.type === 'basic' && !respuesta.redirected;
}
