import { initNav } from './nav';
import { initCarousel } from './carousel';
import { initAddToCartButton, initOrderForm } from './orderForm';
import { initTestimonials } from './testimonials';

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initCarousel();
  initAddToCartButton();
  initOrderForm();
  initTestimonials();
});
