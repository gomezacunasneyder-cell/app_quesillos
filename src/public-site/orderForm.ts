import { getEl, queryEl } from '../utils/dom';
import { scrollToElement } from './nav';
import { currencyFormatter, formatFacturaDate } from '../utils/format';
import { conTiempoLimite, TiempoAgotadoError } from '../utils/async';
import { abrirModal } from '../utils/modal';
import { EnvioUnico } from '../utils/envioUnico';
import { limpiarErrorCampo, mostrarErrorCampo } from './formErrores';
import { FirestoreOrderRepository } from '../services/FirestoreOrderRepository';
import { TransferPaymentProvider } from '../payments/TransferPaymentProvider';
import { calcularTotal } from '../domain/precios';
import { validarPedido, type CampoPedido } from '../domain/validacionPedido';
import type { NuevoPedidoInput, Pedido, TipoEntrega, Ubicacion } from '../types/pedido';

const WHATSAPP_NUMERO = '573227068624';

/** Cuánto esperamos a que Firestore confirme el pedido antes de avisar al cliente. */
const TIEMPO_MAX_GUARDADO_MS = 15000;

// Único método de pago disponible hoy. El día que se sume una pasarela,
// esto se vuelve una elección del usuario (o una fábrica), sin tocar el
// resto del formulario ni el repositorio.
const orderRepository = new FirestoreOrderRepository();
const paymentProvider = new TransferPaymentProvider();

type PedidoCreado = Pedido & { id: string };

function calcularTotales(cantidad: number): { total: number; anticipo: number } {
  const total = calcularTotal(cantidad);
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
      queryEl<HTMLInputElement>('nombre')?.focus({ preventScroll: true });
    }, 300);
  });
}

export function initOrderForm(): void {
  const formPedido = queryEl<HTMLFormElement>('form-pedido');
  if (!formPedido) return;

  const radioEntrega = document.getElementsByName('tipoEntrega') as NodeListOf<HTMLInputElement>;
  const camposDomicilio = queryEl<HTMLElement>('campos-domicilio');
  const nombreInput = queryEl<HTMLInputElement>('nombre');
  const telefonoInput = queryEl<HTMLInputElement>('telefono');
  const cantidadInput = queryEl<HTMLInputElement>('cantidad');
  const direccionInput = queryEl<HTMLInputElement>('direccionTexto');
  const resumenTotal = queryEl<HTMLElement>('resumen-total');
  const resumenAnticipo = queryEl<HTMLElement>('resumen-anticipo');
  const btnUbicacion = queryEl<HTMLButtonElement>('btn-ubicacion');
  const ubicacionStatus = queryEl<HTMLElement>('ubicacion-status');
  const btnComprar = queryEl<HTMLButtonElement>('btn-comprar');
  const errorEnvio = queryEl<HTMLElement>('form-error');
  const modalFactura = queryEl<HTMLElement>('modal-factura');
  const facturaLoading = queryEl<HTMLElement>('factura-loading');
  const facturaDetalle = queryEl<HTMLElement>('factura-detalle');
  const btnCerrarFactura = queryEl<HTMLButtonElement>('btn-cerrar-factura');
  const btnWhatsapp = queryEl<HTMLAnchorElement>('btn-whatsapp');

  let coordsGuardadas: Ubicacion | null = null;
  // Si se agota la espera, el envío sigue en curso: reintentar NO debe crear otro pedido.
  const envioPedido = new EnvioUnico<PedidoCreado>();
  let cerrarModalFactura: (() => void) | null = null;

  const campos: Partial<Record<CampoPedido, HTMLElement | null>> = {
    nombre: nombreInput,
    telefono: telefonoInput,
    cantidad: cantidadInput,
    direccion: direccionInput,
  };

  const cantidadActual = (): number => (/^\d+$/.test(cantidadInput?.value.trim() ?? '') ? Number(cantidadInput?.value) : 0);

  const actualizarResumen = (): { total: number; anticipo: number } => {
    const { total, anticipo } = calcularTotales(cantidadActual());
    if (resumenTotal) resumenTotal.textContent = currencyFormatter.format(total);
    if (resumenAnticipo) resumenAnticipo.textContent = currencyFormatter.format(anticipo);
    return { total, anticipo };
  };

  const ocultarErrorEnvio = (): void => {
    if (errorEnvio) errorEnvio.hidden = true;
  };

  const limpiarTodosLosErrores = (): void => {
    Object.values(campos).forEach((campo) => campo && limpiarErrorCampo(campo));
    if (ubicacionStatus && ubicacionStatus.classList.contains('error')) {
      ubicacionStatus.textContent = '';
      ubicacionStatus.className = 'ubicacion-status';
    }
    ocultarErrorEnvio();
  };

  const mostrarErrorEnvio = (mensaje: string): void => {
    const texto = errorEnvio?.querySelector<HTMLElement>('.form-error__texto');
    if (!errorEnvio || !texto) return;
    texto.textContent = mensaje;
    errorEnvio.hidden = false;
  };

  const rehabilitarBoton = (): void => {
    if (!btnComprar) return;
    btnComprar.disabled = false;
    btnComprar.textContent = 'Comprar';
  };

  // Un campo corregido deja de mostrar su error de inmediato.
  Object.values(campos).forEach((campo) => {
    if (!campo) return;
    campo.addEventListener('input', () => limpiarErrorCampo(campo));
  });
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
      ubicacionStatus.textContent = 'Tu navegador no soporta geolocalización. Escribe una referencia de tu dirección.';
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
        let mensaje = 'No se pudo obtener la ubicación. Escribe una referencia de tu dirección.';
        if (error.code === error.PERMISSION_DENIED) {
          mensaje = 'Permiso de ubicación denegado. Habilítalo en tu navegador o escribe una referencia de tu dirección.';
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
    limpiarTodosLosErrores();

    const tipoEntregaInput = document.querySelector<HTMLInputElement>('input[name="tipoEntrega"]:checked');
    const tipoEntrega: TipoEntrega = tipoEntregaInput?.value === 'recoge' ? 'recoge' : 'domicilio';

    const resultado = validarPedido({
      nombre: nombreInput?.value ?? '',
      telefono: telefonoInput?.value ?? '',
      cantidad: cantidadInput?.value ?? '',
      tipoEntrega,
      direccionTexto: direccionInput?.value ?? '',
      tieneUbicacion: coordsGuardadas !== null,
    });

    if (!resultado.ok) {
      let primerError: HTMLElement | null = null;
      for (const [campo, mensaje] of Object.entries(resultado.errores) as [CampoPedido, string][]) {
        if (campo === 'ubicacion') {
          if (ubicacionStatus) {
            ubicacionStatus.textContent = mensaje;
            ubicacionStatus.className = 'ubicacion-status error';
          }
          primerError ??= btnUbicacion;
          continue;
        }
        const elemento = campos[campo];
        if (!elemento) continue;
        mostrarErrorCampo(elemento, mensaje);
        primerError ??= elemento;
      }
      primerError?.focus();
      return;
    }

    if (!btnComprar || !modalFactura || !facturaLoading || !facturaDetalle) return;

    const { nombre, telefono, cantidad, direccionTexto } = resultado.valor;
    const { total } = calcularTotales(cantidad);

    const input: NuevoPedidoInput = {
      nombreCliente: nombre,
      telefono,
      cantidad,
      total,
      tipoEntrega,
      ubicacion: tipoEntrega === 'domicilio' && coordsGuardadas ? coordsGuardadas : undefined,
      direccionTexto: tipoEntrega === 'domicilio' && direccionTexto ? direccionTexto : undefined,
    };

    btnComprar.disabled = true;
    btnComprar.textContent = 'Procesando...';
    facturaLoading.classList.remove('hidden');
    facturaDetalle.classList.add('hidden');
    cerrarModalFactura = abrirModal(modalFactura, {
      puedeCerrar: () => !facturaDetalle.classList.contains('hidden'),
      enfocar: facturaLoading,
    });

    // Si el cliente reintenta con los mismos datos tras un tiempo agotado, se
    // espera el MISMO envío que sigue en curso en vez de crear otro pedido.
    const envio = envioPedido.obtener(JSON.stringify(input), () => orderRepository.crear(input, paymentProvider));

    try {
      const pedidoCreado = await conTiempoLimite(envio, TIEMPO_MAX_GUARDADO_MS);
      envioPedido.liberar();
      const { numeroFactura, anticipo } = pedidoCreado;

      // Éxito: limpiar formulario y mostrar factura
      formPedido.reset();
      coordsGuardadas = null;
      if (ubicacionStatus) {
        ubicacionStatus.textContent = '';
        ubicacionStatus.className = 'ubicacion-status';
      }
      if (btnUbicacion) btnUbicacion.textContent = '📍 Capturar mi ubicación actual';
      camposDomicilio?.classList.remove('hidden');
      actualizarResumen();
      rehabilitarBoton();

      getEl<HTMLElement>('fac-numero').textContent = numeroFactura;
      getEl<HTMLElement>('fac-fecha').textContent = formatFacturaDate(new Date());
      getEl<HTMLElement>('fac-cliente').textContent = nombre;
      getEl<HTMLElement>('fac-cantidad').textContent = String(cantidad);
      getEl<HTMLElement>('fac-entrega').textContent = tipoEntrega === 'domicilio' ? 'Domicilio' : 'Recoger en tienda';
      getEl<HTMLElement>('fac-total').textContent = currencyFormatter.format(total);
      getEl<HTMLElement>('fac-anticipo').textContent = currencyFormatter.format(anticipo);

      facturaLoading.classList.add('hidden');
      facturaDetalle.classList.remove('hidden');

      // Mensaje de WhatsApp con el resumen del pedido
      const fTotal = currencyFormatter.format(total);
      const fAnticipo = currencyFormatter.format(anticipo);
      const entregaTexto = tipoEntrega === 'domicilio' ? 'Domicilio' : 'Recoger en tienda';
      const dirTexto = tipoEntrega === 'domicilio' && direccionTexto ? `\nDirección/Referencia: ${direccionTexto}` : '';

      const mensajeWhatsApp =
        `¡Hola! Acabo de realizar un pedido.\n\nDetalles:\nNombre: ${nombre}\nCantidad: ${cantidad} quesillos\n` +
        `Total: ${fTotal}\nAnticipo: ${fAnticipo}\nTipo de entrega: ${entregaTexto}${dirTexto}\n` +
        `Número de factura: ${numeroFactura}\n\nPor favor, adjunto mi comprobante de transferencia para confirmar el anticipo.`;

      const urlWhatsApp = `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensajeWhatsApp)}`;

      // El botón siempre funciona; la apertura automática puede ser bloqueada
      // por el navegador (ocurre después de una espera de red, fuera del clic).
      if (btnWhatsapp) btnWhatsapp.href = urlWhatsApp;
      window.open(urlWhatsApp, '_blank', 'noopener');

      btnWhatsapp?.focus();
    } catch (error) {
      console.error('Error guardando el pedido:', error);

      cerrarModalFactura?.();
      cerrarModalFactura = null;
      rehabilitarBoton();

      if (error instanceof TiempoAgotadoError) {
        mostrarErrorEnvio(
          'No pudimos confirmar tu pedido: la conexión está muy lenta o sin internet. Revisa tu conexión y vuelve a pulsar "Comprar" (no se duplicará). Si ya te llegó una confirmación, no lo repitas.',
        );
      } else {
        // Falló de verdad (no solo tardó): el reintento debe crear un envío nuevo.
        envioPedido.liberar();
        mostrarErrorEnvio('Hubo un error al procesar tu pedido. Inténtalo de nuevo en unos minutos.');
      }
      errorEnvio?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });

  btnCerrarFactura?.addEventListener('click', () => {
    cerrarModalFactura?.();
    cerrarModalFactura = null;
    queryEl<HTMLElement>('seccion-pedido')?.classList.add('hidden');
  });
}
