import { db } from './firebase-config.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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
            
            // FASE 2: Foco en el primer campo
            setTimeout(() => {
                const nombreInput = document.getElementById('nombre');
                if(nombreInput) nombreInput.focus();
            }, 300);
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

    // 5. FASE 2: Lógica del Formulario de Pedido
    const formPedido = document.getElementById('form-pedido');
    const radioEntrega = document.getElementsByName('tipoEntrega');
    const camposDomicilio = document.getElementById('campos-domicilio');
    const cantidadInput = document.getElementById('cantidad');
    const resumenTotal = document.getElementById('resumen-total');
    const resumenAnticipo = document.getElementById('resumen-anticipo');
    const btnUbicacion = document.getElementById('btn-ubicacion');
    const ubicacionStatus = document.getElementById('ubicacion-status');
    const btnComprar = document.getElementById('btn-comprar');
    const modalFactura = document.getElementById('modal-factura');
    const facturaLoading = document.getElementById('factura-loading');
    const facturaDetalle = document.getElementById('factura-detalle');
    const btnCerrarFactura = document.getElementById('btn-cerrar-factura');

    const PRECIO_QUESILLO = 28000;
    let coordsGuardadas = null;

    if (formPedido) {
        // A. Cálculos dinámicos
        const calcularTotales = () => {
            const cantidad = parseInt(cantidadInput.value) || 0;
            const total = cantidad * PRECIO_QUESILLO;
            const anticipo = total * 0.5;

            // Formatear a moneda colombiana
            const formatter = new Intl.NumberFormat('es-CO', {
                style: 'currency',
                currency: 'COP',
                minimumFractionDigits: 0
            });

            resumenTotal.textContent = formatter.format(total);
            resumenAnticipo.textContent = formatter.format(anticipo);
            return { total, anticipo };
        };

        cantidadInput.addEventListener('input', calcularTotales);

        // B. Mostrar/Ocultar campos de domicilio
        radioEntrega.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.value === 'domicilio') {
                    camposDomicilio.classList.remove('hidden');
                } else {
                    camposDomicilio.classList.add('hidden');
                }
            });
        });

        // C. Capturar Ubicación
        btnUbicacion.addEventListener('click', () => {
            if (!navigator.geolocation) {
                ubicacionStatus.textContent = 'Tu navegador no soporta geolocalización.';
                ubicacionStatus.className = 'ubicacion-status error';
                return;
            }

            ubicacionStatus.textContent = 'Obteniendo ubicación...';
            ubicacionStatus.className = 'ubicacion-status';
            btnUbicacion.disabled = true;

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    coordsGuardadas = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    ubicacionStatus.textContent = '¡Ubicación capturada con éxito!';
                    ubicacionStatus.className = 'ubicacion-status success';
                    btnUbicacion.textContent = '📍 Ubicación capturada';
                    btnUbicacion.disabled = false;
                },
                (error) => {
                    console.error('Error obteniendo ubicación:', error);
                    let mensaje = 'No se pudo obtener la ubicación.';
                    if (error.code === error.PERMISSION_DENIED) {
                        mensaje = 'Permiso de ubicación denegado. Por favor, habilítalo en tu navegador.';
                    }
                    ubicacionStatus.textContent = mensaje;
                    ubicacionStatus.className = 'ubicacion-status error';
                    btnUbicacion.disabled = false;
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        });

        // D. Enviar formulario (Guardar en Firestore)
        formPedido.addEventListener('submit', async (e) => {
            e.preventDefault();

            // 1. Validaciones
            const nombre = document.getElementById('nombre').value.trim();
            const telefono = document.getElementById('telefono').value.trim();
            const cantidad = parseInt(cantidadInput.value);
            const tipoEntrega = document.querySelector('input[name="tipoEntrega"]:checked').value;
            const direccionTexto = document.getElementById('direccionTexto').value.trim();

            if (!nombre || !telefono || !cantidad) {
                alert('Por favor, completa todos los campos requeridos.');
                return;
            }

            // Validar teléfono (10 dígitos)
            const telRegex = /^[0-9]{10}$/;
            if (!telRegex.test(telefono)) {
                alert('El teléfono debe contener exactamente 10 números (formato celular Colombia).');
                return;
            }

            // Validar ubicación si es domicilio
            if (tipoEntrega === 'domicilio' && !coordsGuardadas) {
                const conf = confirm('No has capturado tu ubicación. ¿Deseas continuar solo con la referencia de dirección? (Te recomendamos capturarla para una entrega más precisa)');
                if (!conf) return;
            }

            // 2. Preparar UI (Loading)
            btnComprar.disabled = true;
            btnComprar.textContent = 'Procesando...';
            modalFactura.classList.remove('hidden');
            facturaLoading.classList.remove('hidden');
            facturaDetalle.classList.add('hidden');

            const { total, anticipo } = calcularTotales();
            const numeroFactura = `FAC-${Date.now()}`;

            // 3. Crear objeto pedido
            const pedido = {
                nombreCliente: nombre,
                telefono: telefono,
                cantidad: cantidad,
                total: total,
                anticipo: anticipo,
                tipoEntrega: tipoEntrega,
                metodoPago: 'transferencia',
                estado: 'pendiente',
                fechaCreacion: serverTimestamp(),
                numeroFactura: numeroFactura
            };

            if (tipoEntrega === 'domicilio') {
                if (coordsGuardadas) {
                    pedido.ubicacion = coordsGuardadas;
                }
                if (direccionTexto) {
                    pedido.direccionTexto = direccionTexto;
                }
            }

            // 4. Guardar en Firestore
            try {
                const pedidosRef = collection(db, 'pedidos');
                await addDoc(pedidosRef, pedido);

                // ÉXITO: Ocultar form, mostrar factura
                formPedido.reset();
                coordsGuardadas = null;
                ubicacionStatus.textContent = '';
                btnUbicacion.textContent = '📍 Capturar mi ubicación actual';
                calcularTotales(); // reset valores visuales
                
                // Formatear fecha para la factura visual
                const fechaActual = new Date();
                const opcionesFecha = { 
                    timeZone: 'America/Bogota',
                    year: 'numeric', month: '2-digit', day: '2-digit',
                    hour: '2-digit', minute: '2-digit', second: '2-digit'
                };
                const fechaFormateada = fechaActual.toLocaleString('es-CO', opcionesFecha);

                const formatter = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });

                // Llenar datos de factura
                document.getElementById('fac-numero').textContent = numeroFactura;
                document.getElementById('fac-fecha').textContent = fechaFormateada;
                document.getElementById('fac-cliente').textContent = nombre;
                document.getElementById('fac-cantidad').textContent = cantidad;
                document.getElementById('fac-entrega').textContent = tipoEntrega === 'domicilio' ? 'Domicilio' : 'Recoger en tienda';
                document.getElementById('fac-total').textContent = formatter.format(total);
                document.getElementById('fac-anticipo').textContent = formatter.format(anticipo);

                // Mostrar factura
                facturaLoading.classList.add('hidden');
                facturaDetalle.classList.remove('hidden');

                // En Fase 3 aquí irá la redirección a WhatsApp
                
            } catch (error) {
                console.error("Error guardando el pedido:", error);
                alert('Hubo un error al procesar tu pedido. Por favor verifica tu conexión a internet e intenta de nuevo.');
                
                // Rehabilitar UI
                btnComprar.disabled = false;
                btnComprar.textContent = 'Comprar';
                modalFactura.classList.add('hidden');
            }
        });

        // E. Botón cerrar factura (Fase 2)
        btnCerrarFactura.addEventListener('click', () => {
            modalFactura.classList.add('hidden');
            document.getElementById('seccion-pedido').classList.add('hidden');
        });
    }
});
