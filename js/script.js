document.addEventListener('DOMContentLoaded', () => {
    // 1. Menú hamburguesa (Mobile Nav)
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const navMenu = document.getElementById('nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');

    const toggleMenu = () => {
        hamburgerBtn.classList.toggle('active');
        navMenu.classList.toggle('active');
        
        // Bloquear scroll si el menú está abierto
        if (navMenu.classList.contains('active')) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    };

    if (hamburgerBtn) {
        hamburgerBtn.addEventListener('click', toggleMenu);
    }

    // Cerrar menú al hacer clic en un enlace
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (navMenu.classList.contains('active')) {
                toggleMenu();
            }
        });
    });

    // 2. Carrusel de imágenes Hero
    const slides = document.querySelectorAll('.carousel-slide');
    let currentSlide = 0;
    const slideInterval = 5000; // 5 segundos

    const nextSlide = () => {
        if (slides.length === 0) return;
        slides[currentSlide].classList.remove('active');
        currentSlide = (currentSlide + 1) % slides.length;
        slides[currentSlide].classList.add('active');
    };

    if (slides.length > 0) {
        setInterval(nextSlide, slideInterval);
    }

    // 3. Lógica para "Añadir al carrito" (Fase 1: Mostrar placeholder Fase 2 y hacer scroll)
    const btnAddCart = document.getElementById('btn-add-cart');
    const seccionPedido = document.getElementById('seccion-pedido');

    if (btnAddCart && seccionPedido) {
        btnAddCart.addEventListener('click', () => {
            // Mostrar la sección (quitar clase hidden)
            seccionPedido.classList.remove('hidden');
            
            // Ajuste por la altura del header fijo
            const headerHeight = document.querySelector('.header').offsetHeight;
            const targetPosition = seccionPedido.getBoundingClientRect().top + window.pageYOffset - headerHeight;
            
            // Hacer scroll suave hacia la sección
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
            
            // Aquí en fases futuras se integrará la lógica del formulario/carrito
        });
    }

    // 4. Smooth scrolling para todos los enlaces internos
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            
            if(targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                e.preventDefault();
                // Ajuste por la altura del header fijo
                const headerHeight = document.querySelector('.header').offsetHeight;
                const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - headerHeight;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
});
