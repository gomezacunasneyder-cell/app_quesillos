import { crearAviso } from './avisos';

/** Cada cuánto se busca una versión nueva mientras la app queda abierta. */
const REVISION_MS = 60 * 60 * 1000;

/**
 * Registra el service worker (solo en producción: en desarrollo la caché
 * estorba con el recarga en caliente) y avisa cuando hay una versión nueva.
 *
 * La versión nueva NO se activa sola: se espera a que la persona pulse
 * "Actualizar", y entonces se recarga una sola vez. Así nadie pierde lo que
 * está haciendo ni queda con código a medias de dos versiones.
 */
export async function registrarServiceWorker(): Promise<void> {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;

  let registro: ServiceWorkerRegistration;
  try {
    registro = await navigator.serviceWorker.register('./sw.js', { scope: './' });
  } catch (error) {
    console.error('No se pudo registrar el service worker:', error);
    return;
  }

  let recargando = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (recargando) return;
    recargando = true;
    window.location.reload();
  });

  const aviso = crearAviso({
    tono: 'info',
    texto: 'Hay una versión nueva del panel.',
    acciones: [
      {
        etiqueta: 'Actualizar',
        alPulsar: () => {
          registro.waiting?.postMessage({ type: 'SKIP_WAITING' });
        },
      },
    ],
  });

  // Solo es "actualización" si ya había una versión controlando la página;
  // en la primera visita el service worker simplemente se activa.
  const hayVersionNuevaEsperando = (): boolean => registro.waiting !== null && navigator.serviceWorker.controller !== null;

  if (hayVersionNuevaEsperando()) aviso.mostrar();

  registro.addEventListener('updatefound', () => {
    const instalando = registro.installing;
    instalando?.addEventListener('statechange', () => {
      if (instalando.state === 'installed' && hayVersionNuevaEsperando()) aviso.mostrar();
    });
  });

  const buscarActualizacion = (): void => {
    void registro.update().catch(() => undefined);
  };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') buscarActualizacion();
  });
  window.setInterval(buscarActualizacion, REVISION_MS);
}
