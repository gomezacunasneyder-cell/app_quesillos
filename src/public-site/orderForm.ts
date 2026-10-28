import { getEl, queryEl } from '../utils/dom';
import { scrollToElement } from './nav';
import { currencyFormatter, formatFacturaDate } from '../utils/format';
import { FirestoreOrderRepository } from '../services/FirestoreOrderRepository';
import { TransferPaymentProvider } from '../payments/TransferPaymentProvider';
import type { Ubicacion } from '../types/pedido';

const PRECIO_QUESILLO = 28000;
const WHATSAPP_NUMERO = '573227068624';

// Único método de pago disponible hoy. El día que se sume una pasarela,
// esto se vuelve una elección del usuario (o una fábrica), sin tocar el
// resto del formulario ni el repositorio.
const orderRepository = new FirestoreOrderRepository();
const paymentProvider = new TransferPaymentProvider();

function calcularTotales(cantidad: number): { total: number; anticipo: number } {
  const total = cantidad * PRECIO_QUESILLO;
  const anticipo = paymentProvider.calcularAnticipo(total);
  return { total, anticipo };
}

export function initAddToCartButton(): void {
  const btnAddCart = queryEl<HTMLButtonElement>('btn-add-cart');
  const seccionPedido = queryEl<HTMLElement>('seccion-pedido');
  if (!btnAddCart || !seccionPedido) return;

  btnAddCart.addEventListener('click', () => {
    seccionPedido.classList.remove('hidden');
    scrollToElement(seccionPedido);

    setTimeout(() => {
      queryEl<HTMLInputElement>('nombre')?.focus();
    }, 300);
  });
}

export function initOrderForm(): void {
  const formPedido = queryEl<HTMLFormElement>('form-pedido');
  if (!formPedido) return;

  const radioEntrega = document.getElementsByName('tipoEntrega') as NodeListOf<HTMLInputElement>;
  const camposDomicilio = queryEl<HTMLElement>('campos-domicilio');
  const cantidadInput = queryEl<HTMLInputElement>('cantidad');
  const resumenTotal = queryEl<HTMLElement>('resumen-total');
  const resumenAnticipo = queryEl<HTMLElement>('resumen-anticipo');
  const btnUbicacion = queryEl<HTMLButtonElement>('btn-ubicacion');
  const ubicacionStatus = queryEl<HTMLElement>('ubicacion-status');
  const btnComprar = queryEl<HTMLButtonElement>('btn-comprar');
  const modalFactura = queryEl<HTMLElement>('modal-factura');
  const facturaLoading = queryEl<HTMLElement>('factura-loading');
  const facturaDetalle = queryEl<HTMLElement>('factura-detalle');
  const btnCerrarFactura = queryEl<HTMLButtonElement>('btn-cerrar-factura');

  let coordsGuardadas: Ubicacion | null = null;

  const actualizarResumen = (): { total: number; anticipo: number } => {
    const cantidad = parseInt(cantidadInput?.value ?? '0', 10) || 0;
    const { total, anticipo } = calcularTotales(cantidad);
    if (resumenTotal) resumenTotal.textContent = currencyFormatter.format(total);
    if (resumenAnticipo) resumenAnticipo.textContent = currencyFormatter.format(anticipo);
    return { total, anticipo };
  };

  cantidadInput?.addEventListener('input', actualizarResumen);

  radioEntrega.forEach((radio) => {
    radio.addEventListener('change', (e) => {
      const value = (e.target as HTMLInputElement).value;
      camposDomicilio?.classList.toggle('hidden', value !== 'domicilio');
    });
  });

  btnUbicacion?.addEventListener('click', () => {
    if (!ubicacionStatus || !btnUbicacion) return;

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
          lng: position.coords.longitude,
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
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  });

  formPedido.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nombre = queryEl<HTMLInputElement>('nombre')?.value.trim() ?? '';
    const telefono = queryEl<HTMLInputElement>('telefono')?.value.trim() ?? '';
    const cantidad = parseInt(cantidadInput?.value ?? '0', 10);
    const tipoEntregaInput = document.querySelector<HTMLInputElement>('input[name="tipoEntrega"]:checked');
    const tipoEntrega = (tipoEntregaInput?.value ?? 'domicilio') as 'domicilio' | 'recoge';
    const direccionTexto = queryEl<HTMLInputElement>('direccionTexto')?.value.trim() ?? '';

    if (!nombre || !telefono || !cantidad) {
      alert('Por favor, completa todos los campos requeridos.');
      return;
    }

    const telRegex = /^[0-9]{10}$/;
    if (!telRegex.test(telefono)) {
      alert('El teléfono debe contener exactamente 10 números (formato celular Colombia).');
      return;
    }

    if (tipoEntrega === 'domicilio' && !coordsGuardadas) {
      const conf = confirm(
        'No has capturado tu ubicación. ¿Deseas continuar solo con la referencia de dirección? (Te recomendamos capturarla para una entrega más precisa)',
      );
      if (!conf) return;
    }

    if (!btnComprar || !modalFactura || !facturaLoading || !facturaDetalle) return;

    btnComprar.disabled = true;
    btnComprar.textContent = 'Procesando...';
    modalFactura.classList.remove('hidden');
    facturaLoading.classList.remove('hidden');
    facturaDetalle.classList.add('hidden');

    const { total } = actualizarResumen();

    try {
      const pedidoCreado = await orderRepository.crear(
        {
          nombreCliente: nombre,
          telefono,
          cantidad,
          total,
          tipoEntrega,
          ubicacion: tipoEntrega === 'domicilio' && coordsGuardadas ? coordsGuardadas : undefined,
          direccionTexto: tipoEntrega === 'domicilio' && direccionTexto ? direccionTexto : undefined,
        },
        paymentProvider,
      );
      const { numeroFactura, anticipo } = pedidoCreado;

      // Éxito: limpiar formulario y mostrar factura
      formPedido.reset();
      coordsGuardadas = null;
      if (ubicacionStatus) ubicacionStatus.textContent = '';
      if (btnUbicacion) btnUbicacion.textContent = '📍 Capturar mi ubicación actual';
      actualizarResumen();

      const fechaFormateada = formatFacturaDate(new Date());

      getEl<HTMLElement>('fac-numero').textContent = numeroFactura;
      getEl<HTMLElement>('fac-fecha').textContent = fechaFormateada;
      getEl<HTMLElement>('fac-cliente').textContent = nombre;
      getEl<HTMLElement>('fac-cantidad').textContent = String(cantidad);
      getEl<HTMLElement>('fac-entrega').textContent = tipoEntrega === 'domicilio' ? 'Domicilio' : 'Recoger en tienda';
      getEl<HTMLElement>('fac-total').textContent = currencyFormatter.format(total);
      getEl<HTMLElement>('fac-anticipo').textContent = currencyFormatter.format(anticipo);

      facturaLoading.classList.add('hidden');
      facturaDetalle.classList.remove('hidden');

      // Redirección a WhatsApp con el resumen del pedido
      const fTotal = currencyFormatter.format(total);
      const fAnticipo = currencyFormatter.format(anticipo);
      const entregaTexto = tipoEntrega === 'domicilio' ? 'Domicilio' : 'Recoger en tienda';
      const dirTexto = tipoEntrega === 'domicilio' && direccionTexto ? `\nDirección/Referencia: ${direccionTexto}` : '';

      const mensajeWhatsApp =
        `¡Hola! Acabo de realizar un pedido.\n\nDetalles:\nNombre: ${nombre}\nCantidad: ${cantidad} quesillos\n` +
        `Total: ${fTotal}\nAnticipo: ${fAnticipo}\nTipo de entrega: ${entregaTexto}${dirTexto}\n` +
        `Número de factura: ${numeroFactura}\n\nPor favor, adjunto mi comprobante de transferencia para confirmar el anticipo.`;

      const urlWhatsApp = `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensajeWhatsApp)}`;
      window.open(urlWhatsApp, '_blank');
    } catch (error) {
      console.error('Error guardando el pedido:', error);
      alert('Hubo un error al procesar tu pedido. Por favor verifica tu conexión a internet e intenta de nuevo.');

      btnComprar.disabled = false;
      btnComprar.textContent = 'Comprar';
      modalFactura.classList.add('hidden');
    }
  });

  btnCerrarFactura?.addEventListener('click', () => {
    modalFactura?.classList.add('hidden');
    queryEl<HTMLElement>('seccion-pedido')?.classList.add('hidden');
  });
}
