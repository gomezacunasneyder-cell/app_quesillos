import { describe, expect, it } from 'vitest';
import type { PaymentProvider } from './PaymentProvider';
import { TransferPaymentProvider } from './TransferPaymentProvider';

describe('TransferPaymentProvider', () => {
  const provider: PaymentProvider = new TransferPaymentProvider();

  it('cobra la transferencia como único método de pago', () => {
    expect(provider.metodoPago).toBe('transferencia');
  });

  it('el anticipo es el 50% del total', () => {
    expect(provider.calcularAnticipo(28000)).toBe(14000);
    expect(provider.calcularAnticipo(56000)).toBe(28000);
    expect(provider.calcularAnticipo(0)).toBe(0);
  });
});
