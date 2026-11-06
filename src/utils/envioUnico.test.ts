import { describe, expect, it, vi } from 'vitest';
import { EnvioUnico } from './envioUnico';

describe('EnvioUnico', () => {
  it('reintentar con los mismos datos reutiliza el envío en curso (no duplica el pedido)', async () => {
    const envio = new EnvioUnico<string>();
    const guardar = vi.fn(() => new Promise<string>(() => undefined)); // Firestore sin respuesta

    const primero = envio.obtener('pedido-A', guardar);
    const reintento = envio.obtener('pedido-A', guardar);

    expect(guardar).toHaveBeenCalledTimes(1);
    expect(reintento).toBe(primero);
  });

  it('si cambian los datos, se crea un envío nuevo', () => {
    const envio = new EnvioUnico<string>();
    const guardar = vi.fn(() => Promise.resolve('ok'));

    envio.obtener('pedido-A', guardar);
    envio.obtener('pedido-B', guardar);

    expect(guardar).toHaveBeenCalledTimes(2);
  });

  it('tras liberar, el mismo pedido puede enviarse otra vez (ej. después de un error real)', () => {
    const envio = new EnvioUnico<string>();
    const guardar = vi.fn(() => Promise.resolve('ok'));

    envio.obtener('pedido-A', guardar);
    envio.liberar();
    envio.obtener('pedido-A', guardar);

    expect(guardar).toHaveBeenCalledTimes(2);
  });
});
