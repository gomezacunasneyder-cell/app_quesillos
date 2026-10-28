import type { Ubicacion } from '../types/pedido';

/** URL de Google Maps que abre direcciones turn-by-turn hacia una ubicación. */
export function urlComoLlegar(ubicacion: Ubicacion): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${ubicacion.lat},${ubicacion.lng}`;
}
