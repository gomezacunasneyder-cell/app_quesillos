import type { MetodoPago } from '../types/pedido';

/**
 * Abstracción del método de pago (patrón Strategy).
 *
 * Hoy la tienda solo acepta transferencia (ver TransferPaymentProvider),
 * pero cualquier pasarela de pago futura (tarjeta, PSE, etc.) se agrega
 * implementando esta misma interfaz — sin tocar OrderRepository, el
 * formulario de pedido, ni el panel admin. Principio abierto/cerrado:
 * el código que usa PaymentProvider no sabe ni le importa cuál
 * implementación recibe.
 */
export interface PaymentProvider {
  readonly metodoPago: MetodoPago;

  /** Calcula el anticipo requerido a partir del total del pedido. */
  calcularAnticipo(total: number): number;
}
