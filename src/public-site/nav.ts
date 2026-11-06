import { queryEl } from '../utils/dom';

/** Mueve el foco al destino de un ancla (para teclado y lectores de pantalla). */
function enfocarDestino(destino: HTMLElement): void {
  if (!destino.hasAttribute('tabindex')) destino.setAttribute('tabindex', '-1');
  destino.focus({ preventScroll: true });
}

/** Menú hamburguesa (navegación móvil) y scroll suave a los enlaces internos. */
export function initNav(): void {
  const hamburgerBtn = queryEl<HTMLButtonElement>('hamburger-btn');
  const navMenu = queryEl<HTMLElement>('nav-menu');
  const navLinks = document.querySelectorAll<HTMLAnchorElement>('.nav-link');

  const estaAbierto = (): boolean => navMenu?.classList.contains('active') ?? false;

  const toggleMenu = (): void => {
    hamburgerBtn?.classList.toggle('active');
    navMenu?.classList.toggle('active');
    const abierto = estaAbierto();
    document.body.style.overflow = abierto ? 'hidden' : '';
    hamburgerBtn?.setAttribute('aria-expanded', String(abierto));
    hamburgerBtn?.setAttribute('aria-label', abierto ? 'Cerrar menú' : 'Abrir menú');
  };

  hamburgerBtn?.addEventListener('click', toggleMenu);

  navLinks.forEach((link) => {
    link.addEventListener('click', () => {
      if (estaAbierto()) toggleMenu();
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && estaAbierto()) {
      toggleMenu();
      hamburgerBtn?.focus();
    }
  });

  // Scroll suave para todos los enlaces internos (#ancla), con ajuste por
  // la altura del header fijo.
  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href');
      if (!targetId || targetId === '#') return;

      const targetElement = document.querySelector<HTMLElement>(targetId);
      if (!targetElement) return;

      e.preventDefault();
      scrollToElement(targetElement);
      enfocarDestino(targetElement);
    });
  });
}

/** Scroll suave a un elemento, descontando la altura del header fijo (y respetando "reducir movimiento"). */
export function scrollToElement(target: HTMLElement): void {
  const header = document.querySelector<HTMLElement>('.header');
  const headerHeight = header?.offsetHeight ?? 0;
  const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerHeight;
  const reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: targetPosition, behavior: reducir ? 'auto' : 'smooth' });
}
