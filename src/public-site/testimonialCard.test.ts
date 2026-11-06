// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import {
  crearTarjetaTestimonio,
  MAX_COMENTARIO_TESTIMONIO,
  MAX_NOMBRE_TESTIMONIO,
  normalizarTestimonio,
} from './testimonialCard';

describe('normalizarTestimonio', () => {
  it('usa valores por defecto con datos vacíos o de tipo incorrecto', () => {
    for (const basura of [null, undefined, 42, 'texto', [], {}]) {
      expect(normalizarTestimonio(basura)).toEqual({ nombre: 'Cliente anónimo', estrellas: 5, comentario: '' });
    }
  });

  it('limita las estrellas a 1–5 aunque el documento diga otra cosa', () => {
    expect(normalizarTestimonio({ estrellas: 999 }).estrellas).toBe(5);
    expect(normalizarTestimonio({ estrellas: -3 }).estrellas).toBe(1);
    expect(normalizarTestimonio({ estrellas: 3.6 }).estrellas).toBe(4);
    expect(normalizarTestimonio({ estrellas: 'abc' }).estrellas).toBe(5);
  });

  it('recorta nombres y comentarios gigantes (escritos directo a la API)', () => {
    const t = normalizarTestimonio({ nombreCliente: 'a'.repeat(5000), comentario: 'b'.repeat(5000) });
    expect(t.nombre).toHaveLength(MAX_NOMBRE_TESTIMONIO);
    expect(t.comentario).toHaveLength(MAX_COMENTARIO_TESTIMONIO);
  });
});

describe('crearTarjetaTestimonio — resistencia a XSS', () => {
  const ATAQUES = [
    '<img src=x onerror="window.__xss = 1">',
    '<script>window.__xss = 1</script>',
    '"><svg onload="window.__xss = 1">',
    '<a href="javascript:window.__xss=1">clic</a>',
  ];

  it.each(ATAQUES)('muestra como texto y no crea elementos: %s', (ataque) => {
    const tarjeta = crearTarjetaTestimonio(normalizarTestimonio({ nombreCliente: ataque, comentario: ataque, estrellas: 5 }));

    // No aparece ningún elemento peligroso dentro de la tarjeta…
    expect(tarjeta.querySelector('img, script, svg, a, iframe, object')).toBeNull();
    // …y el texto original sigue visible tal cual, sin interpretarse como HTML.
    expect(tarjeta.querySelector('.comentario')?.textContent).toContain(ataque);
    expect(tarjeta.querySelector('.cliente')?.textContent).toContain(ataque);
    expect((window as unknown as { __xss?: number }).__xss).toBeUndefined();
  });

  it('solo contiene los elementos esperados', () => {
    const tarjeta = crearTarjetaTestimonio(normalizarTestimonio({ nombreCliente: 'Ana', comentario: 'Rico', estrellas: 4 }));
    const etiquetas = [...tarjeta.querySelectorAll('*')].map((el) => el.tagName);
    expect(etiquetas).toEqual(['DIV', 'P', 'P']);
    expect(tarjeta.querySelector('.stars')?.getAttribute('aria-label')).toBe('4 de 5 estrellas');
  });

  it('omite el párrafo del comentario cuando está vacío', () => {
    const tarjeta = crearTarjetaTestimonio(normalizarTestimonio({ nombreCliente: 'Ana', estrellas: 5 }));
    expect(tarjeta.querySelector('.comentario')).toBeNull();
  });
});
