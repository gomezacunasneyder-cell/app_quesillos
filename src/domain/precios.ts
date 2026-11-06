/** Precio de un quesillo (COP). Única fuente de verdad: formulario público y panel admin. */
export const PRECIO_QUESILLO = 28000;

/**
 * Máximo de quesillos por pedido desde la web. Evita pedidos absurdos
 * (por error o por abuso); para cantidades mayores se atiende por WhatsApp.
 */
export const MAX_CANTIDAD = 20;

export function calcularTotal(cantidad: number): number {
  return cantidad * PRECIO_QUESILLO;
}
