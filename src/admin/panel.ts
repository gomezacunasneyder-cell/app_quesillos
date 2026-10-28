import { requerirSesion } from './guard';
import { getEl, queryEl } from '../utils/dom';
import { currencyFormatter, formatTimestamp } from '../utils/format';
import { urlComoLlegar } from '../utils/maps';
import { etiquetaEstado, esEntregado, obtenerTransicion } from '../domain/estadoPedido';
import { FirestoreOrderRepository } from '../services/FirestoreOrderRepository';
import type { EstadoPedido, PedidoConId } from '../types/pedido';

const orderRepository = new FirestoreOrderRepository();

const panel = getEl<HTMLElement>('admin-panel');
const ordersList = getEl<HTMLElement>('orders-list');
const pendingCount = getEl<HTMLElement>('pending-count');
const loadingMessage = getEl<HTMLElement>('orders-loading');
const emptyMessage = getEl<HTMLElement>('orders-empty');
const errorMessage = getEl<HTMLElement>('orders-error');
const notice = getEl<HTMLElement>('new-order-notice');

const historyDomicilioList = getEl<HTMLElement>('history-domicilio-list');
const historyDomicilioCount = getEl<HTMLElement>('history-domicilio-count');
const historyDomicilioEmpty = getEl<HTMLElement>('history-domicilio-empty');
const historyRecogeList = getEl<HTMLElement>('history-recoge-list');
const historyRecogeCount = getEl<HTMLElement>('history-recoge-count');
const historyRecogeEmpty = getEl<HTMLElement>('history-recoge-empty');

const MAX_HISTORIAL = 30;

let firstSnapshot = true;
let actualizandoId: string | null = null;

function addDetail(list: HTMLElement, label: string, value: string): void {
  const item = document.createElement('div');
  const term = document.createElement('dt');
  const description = document.createElement('dd');
  term.textContent = label;
  description.textContent = value;
  item.append(term, description);
  list.append(item);
}

function porFechaDesc(a: PedidoConId, b: PedidoConId): number {
  const aMillis = (a.fechaCreacion as { toMillis?: () => number } | undefined)?.toMillis?.() ?? 0;
  const bMillis = (b.fechaCreacion as { toMillis?: () => number } | undefined)?.toMillis?.() ?? 0;
  return bMillis - aMillis;
}

/** Tarjeta de un pedido activo: datos + badge de estado + acciones del admin. */
function createOrderCard(order: PedidoConId, isNew: boolean): HTMLElement {
  const card = document.createElement('article');
  card.className = `order-card${isNew ? ' is-new' : ''}`;
  card.dataset.orderId = order.id;

  const header = document.createElement('header');
  header.className = 'order-card__header';
  const title = document.createElement('h2');
  title.textContent = order.nombreCliente || 'Cliente sin nombre';
  const time = document.createElement('time');
  time.className = 'order-time';
  time.textContent = formatTimestamp(order.fechaCreacion);
  header.append(title, time);

  const badge = document.createElement('span');
  badge.className = `status-badge status-badge--${order.estado}`;
  badge.textContent = etiquetaEstado(order.estado);

  const details = document.createElement('dl');
  details.className = 'order-details';
  addDetail(details, 'Teléfono', order.telefono || 'No registrado');
  addDetail(details, 'Cantidad', `${Number(order.cantidad) || 0} quesillo(s)`);
  addDetail(details, 'Total', currencyFormatter.format(Number(order.total) || 0));
  addDetail(details, 'Anticipo', currencyFormatter.format(Number(order.anticipo) || 0));
  addDetail(details, 'Entrega', order.tipoEntrega === 'domicilio' ? 'Domicilio' : 'Recoger en tienda');
  addDetail(details, 'Método de pago', order.metodoPago || 'No registrado');

  const actions = document.createElement('div');
  actions.className = 'order-card__actions';

  if (order.tipoEntrega === 'domicilio' && order.ubicacion) {
    const linkLlegar = document.createElement('a');
    linkLlegar.className = 'button button--quiet';
    linkLlegar.href = urlComoLlegar(order.ubicacion);
    linkLlegar.target = '_blank';
    linkLlegar.rel = 'noopener noreferrer';
    linkLlegar.textContent = '📍 Cómo llegar';
    actions.append(linkLlegar);
  }

  const transicion = obtenerTransicion(order);
  if (transicion) {
    const btnAvanzar = document.createElement('button');
    btnAvanzar.type = 'button';
    btnAvanzar.className = 'button button--primary';
    btnAvanzar.textContent = transicion.etiquetaBoton;
    btnAvanzar.dataset.action = 'avanzar-estado';
    btnAvanzar.dataset.siguienteEstado = transicion.siguiente;
    btnAvanzar.disabled = actualizandoId === order.id;
    actions.append(btnAvanzar);
  }

  card.append(header, badge, details, actions);
  return card;
}

/** Tarjeta de solo lectura para el historial de entregados. */
function createHistoryCard(order: PedidoConId): HTMLElement {
  const card = document.createElement('article');
  card.className = 'order-card order-card--history';

  const header = document.createElement('header');
  header.className = 'order-card__header';
  const title = document.createElement('h2');
  title.textContent = order.nombreCliente || 'Cliente sin nombre';
  const time = document.createElement('time');
  time.className = 'order-time';
  time.textContent = formatTimestamp(order.fechaEntrega ?? order.fechaCreacion);
  header.append(title, time);

  const details = document.createElement('dl');
  details.className = 'order-details';
  addDetail(details, 'Cantidad', `${Number(order.cantidad) || 0} quesillo(s)`);
  addDetail(details, 'Total', currencyFormatter.format(Number(order.total) || 0));
  addDetail(details, 'Factura', order.numeroFactura || '—');

  card.append(header, details);
  return card;
}

function renderHistorySection(
  pedidos: PedidoConId[],
  list: HTMLElement,
  countEl: HTMLElement,
  emptyEl: HTMLElement,
): void {
  const ordenados = [...pedidos].sort(porFechaDesc).slice(0, MAX_HISTORIAL);
  countEl.textContent = String(pedidos.length);
  list.replaceChildren(...ordenados.map(createHistoryCard));
  emptyEl.hidden = pedidos.length > 0;
}

function renderOrders(snapshot: PedidoConId[], nuevosIds: Set<string>): void {
  const activos = snapshot.filter((order) => !esEntregado(order.estado)).sort(porFechaDesc);
  const entregadosDomicilio = snapshot.filter(
    (order) => esEntregado(order.estado) && order.tipoEntrega === 'domicilio',
  );
  const entregadosRecoge = snapshot.filter(
    (order) => esEntregado(order.estado) && order.tipoEntrega === 'recoge',
  );

  pendingCount.textContent = String(activos.length);
  ordersList.replaceChildren(...activos.map((order) => createOrderCard(order, nuevosIds.has(order.id))));
  loadingMessage.hidden = true;
  errorMessage.hidden = true;
  emptyMessage.hidden = activos.length > 0;

  renderHistorySection(entregadosDomicilio, historyDomicilioList, historyDomicilioCount, historyDomicilioEmpty);
  renderHistorySection(entregadosRecoge, historyRecogeList, historyRecogeCount, historyRecogeEmpty);

  if (nuevosIds.size > 0) notice.hidden = false;
}

let pedidosAnteriores = new Map<string, PedidoConId>();

function manejarSnapshot(pedidos: PedidoConId[]): void {
  const nuevosIds = new Set<string>();
  if (!firstSnapshot) {
    pedidos.forEach((pedido) => {
      if (!pedidosAnteriores.has(pedido.id) && pedido.estado === 'pendiente') {
        nuevosIds.add(pedido.id);
      }
    });
  }

  pedidosAnteriores = new Map(pedidos.map((p) => [p.id, p]));
  renderOrders(pedidos, nuevosIds);
  firstSnapshot = false;
}

requerirSesion(panel, () => {
  orderRepository.escucharTodos(manejarSnapshot, () => {
    loadingMessage.hidden = true;
    errorMessage.textContent = 'No se pudieron cargar los pedidos. Verifica tu conexión y los permisos de Firebase.';
    errorMessage.hidden = false;
  });
});

queryEl<HTMLButtonElement>('dismiss-notice')?.addEventListener('click', () => {
  notice.hidden = true;
});

// Delegación de eventos: los botones "avanzar estado" se recrean en cada
// snapshot, así que el listener vive en el contenedor, no en cada botón.
ordersList.addEventListener('click', (e) => {
  const boton = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-action="avanzar-estado"]');
  if (!boton) return;

  const card = boton.closest<HTMLElement>('[data-order-id]');
  const siguienteEstado = boton.dataset.siguienteEstado;
  const orderId = card?.dataset.orderId;
  if (!orderId || !siguienteEstado) return;

  actualizandoId = orderId;
  boton.disabled = true;
  boton.textContent = 'Actualizando...';

  orderRepository
    .actualizarEstado(orderId, siguienteEstado as EstadoPedido)
    .catch((error) => {
      console.error('Error actualizando el estado del pedido:', error);
      alert('No se pudo actualizar el estado del pedido. Verifica tu conexión e intenta de nuevo.');
    })
    .finally(() => {
      actualizandoId = null;
    });
});
