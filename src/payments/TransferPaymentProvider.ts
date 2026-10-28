import type { PaymentProvider } from './PaymentProvider';

const PORCENTAJE_ANTICIPO = 0.5;

/** Único método de pago disponible hoy: transferencia bancaria, con 50% de anticipo. */
export class TransferPaymentProvider implements PaymentProvider {
  readonly metodoPago = 'transferencia' as const;

  calcularAnticipo(total: number): number {
    return total * PORCENTAJE_ANTICIPO;
  }
}
