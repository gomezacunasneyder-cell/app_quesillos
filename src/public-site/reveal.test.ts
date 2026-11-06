// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initReveal } from './reveal';

type Callback = (entradas: Array<Pick<IntersectionObserverEntry, 'isIntersecting' | 'target'>>) => void;

let callback: Callback | null = null;
const observe = vi.fn();
const unobserve = vi.fn();

function simularNavegador(opciones: { reducirMovimiento: boolean; conObserver: boolean }): void {
  vi.stubGlobal(
    'matchMedia',
    (consulta: string) => ({ matches: opciones.reducirMovimiento && consulta.includes('reduce') }),
  );
  if (opciones.conObserver) {
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(cb: Callback) {
          callback = cb;
        }
        observe = observe;
        unobserve = unobserve;
      },
    );
  } else {
    vi.stubGlobal('IntersectionObserver', undefined);
  }
}

describe('initReveal', () => {
  beforeEach(() => {
    document.documentElement.className = '';
    document.body.innerHTML = '<section id="a" data-reveal></section><section id="b" data-reveal></section>';
    callback = null;
    observe.mockClear();
    unobserve.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('oculta y observa las secciones, y las muestra una sola vez al entrar en pantalla', () => {
    simularNavegador({ reducirMovimiento: false, conObserver: true });
    initReveal();

    expect(document.documentElement.classList.contains('reveal-ready')).toBe(true);
    expect(observe).toHaveBeenCalledTimes(2);

    const a = document.getElementById('a') as HTMLElement;
    callback?.([{ isIntersecting: false, target: a }]);
    expect(a.classList.contains('is-visible')).toBe(false);

    callback?.([{ isIntersecting: true, target: a }]);
    expect(a.classList.contains('is-visible')).toBe(true);
    expect(unobserve).toHaveBeenCalledWith(a);
  });

  it('no oculta nada si la persona pidió reducir el movimiento', () => {
    simularNavegador({ reducirMovimiento: true, conObserver: true });
    initReveal();

    expect(document.documentElement.classList.contains('reveal-ready')).toBe(false);
    expect(observe).not.toHaveBeenCalled();
  });

  it('no oculta nada si el navegador no soporta IntersectionObserver', () => {
    simularNavegador({ reducirMovimiento: false, conObserver: false });
    expect(() => initReveal()).not.toThrow();
    expect(document.documentElement.classList.contains('reveal-ready')).toBe(false);
  });
});
