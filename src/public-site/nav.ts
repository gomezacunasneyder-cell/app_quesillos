import { queryEl } from '../utils/dom';

/** Menú hamburguesa (navegación móvil) y scroll suave a los enlaces internos. */
export function initNav(): void {
  const hamburgerBtn = queryEl<HTMLButtonElement>('hamburger-btn');
  const navMenu = queryEl<HTMLElement>('nav-menu');
  const navLinks = document.querySelectorAll<HTMLAnchorElement>('.nav-link');

  const toggleMenu = (): void => {
    hamburgerBtn?.classList.toggle('active');
    navMenu?.classList.toggle('active');
    document.body.style.overflow = navMenu?.classList.contains('active') ? 'hidden' : '';
  };

  hamburgerBtn?.addEventListener('click', toggleMenu);

  navLinks.forEach((link) => {
    link.addEventListener('click', () => {
      if (navMenu?.classList.contains('active')) toggleMenu();
    });
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
      const header = document.querySelector<HTMLElement>('.header');
      const headerHeight = header?.offsetHeight ?? 0;
      const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - headerHeight;

      window.scrollTo({ top: targetPosition, behavior: 'smooth' });
    });
  });
}

/** Igual al scroll de initNav, reutilizable para disparar un scroll puntual
 * (por ejemplo, al mostrar la sección de pedido tras "Añadir al carrito"). */
export function scrollToElement(target: HTMLElement): void {
  const header = document.querySelector<HTMLElement>('.header');
  const headerHeight = header?.offsetHeight ?? 0;
  const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerHeight;
  window.scrollTo({ top: targetPosition, behavior: 'smooth' });
}
