/**
 * Obtiene un elemento del DOM por id, con el tipo esperado. Lanza un error
 * descriptivo si no existe, en vez de propagar `null` silenciosamente por
 * el resto del código (preferible en modo estricto a usar `!` en cada uso).
 */
export function getEl<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) {
    throw new Error(`Elemento #${id} no encontrado en el DOM.`);
  }
  return el as T;
}

/** Igual a getEl, pero retorna null si no existe (para elementos opcionales). */
export function queryEl<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}
