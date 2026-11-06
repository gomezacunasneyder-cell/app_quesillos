/**
 * Aparición suave de las secciones al hacer scroll.
 *
 * Es solo presentación: los elementos con `data-reveal` están visibles por
 * defecto y únicamente se ocultan (clase `reveal-ready` en <html>) cuando este
 * módulo confirma que puede mostrarlos después. Si el navegador no soporta
 * IntersectionObserver o la persona pidió "reducir movimiento", no se oculta
 * nada y el contenido se ve siempre.
 */
const SELECTOR = '[data-reveal]';

export function initReveal(): void {
  const elementos = Array.from(document.querySelectorAll<HTMLElement>(SELECTOR));
  if (elementos.length === 0) return;

  const reducirMovimiento = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  if (reducirMovimiento || typeof IntersectionObserver === 'undefined') return;

  const observador = new IntersectionObserver(
    (entradas) => {
      for (const entrada of entradas) {
        if (!entrada.isIntersecting) continue;
        entrada.target.classList.add('is-visible');
        observador.unobserve(entrada.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.1 },
  );

  document.documentElement.classList.add('reveal-ready');
  elementos.forEach((el) => observador.observe(el));
}
