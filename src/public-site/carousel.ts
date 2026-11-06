const SLIDE_INTERVAL_MS = 5000;

/**
 * Carrusel de imágenes del Hero: rota automáticamente cada 5 segundos.
 * No rota si la persona pidió "reducir movimiento" en su sistema ni mientras
 * la pestaña está oculta (ahorra batería).
 */
export function initCarousel(): void {
  const slides = document.querySelectorAll<HTMLElement>('.carousel-slide');
  if (slides.length === 0) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let currentSlide = 0;

  const nextSlide = (): void => {
    if (document.hidden) return;
    slides[currentSlide]?.classList.remove('active');
    currentSlide = (currentSlide + 1) % slides.length;
    slides[currentSlide]?.classList.add('active');
  };

  setInterval(nextSlide, SLIDE_INTERVAL_MS);
}
