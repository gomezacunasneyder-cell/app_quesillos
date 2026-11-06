import { describe, expect, it } from 'vitest';
import { detectarInconsistencias } from './integridadPedido';
import { MAX_CANTIDAD, PRECIO_QUESILLO } from './precios';

const ok = (cantidad: number) => ({ cantidad, total: cantidad * PRECIO_QUESILLO, anticipo: (cantidad * PRECIO_QUESILLO) / 2 });

describe('detectarInconsistencias', () => {
  it('un pedido normal no genera avisos', () => {
    for (const cantidad of [1, 2, 7, MAX_CANTIDAD]) {
      expect(detectarInconsistencias(ok(cantidad)), `cantidad ${cantidad}`).toEqual([]);
    }
  });

  it('detecta un total manipulado (ej. 5 quesillos por $1.000)', () => {
    const avisos = detectarInconsistencias({ cantidad: 5, total: 1000, anticipo: 500 });
    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toMatch(/total no coincide/);
  });

  it('detecta cantidades imposibles', () => {
    for (const cantidad of [0, -3, 1.5, MAX_CANTIDAD + 1, NaN]) {
      expect(detectarInconsistencias({ cantidad, total: 28000, anticipo: 14000 }).join(' '), `cantidad ${cantidad}`).toMatch(/cantidad/);
    }
  });

  it('detecta anticipos inválidos (negativo, mayor al total, no numérico)', () => {
    expect(detectarInconsistencias({ ...ok(1), anticipo: -1 }).join(' ')).toMatch(/anticipo/);
    expect(detectarInconsistencias({ ...ok(1), anticipo: 99999 }).join(' ')).toMatch(/anticipo/);
    expect(detectarInconsistencias({ ...ok(1), anticipo: Number('x') }).join(' ')).toMatch(/anticipo/);
  });

  it('tolera datos con tipos incorrectos sin lanzar errores', () => {
    const raro = { cantidad: '2' as unknown as number, total: '56000' as unknown as number, anticipo: '28000' as unknown as number };
    expect(() => detectarInconsistencias(raro)).not.toThrow();
  });
});
