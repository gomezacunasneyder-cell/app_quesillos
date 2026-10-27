import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, type QuerySnapshot, type DocumentData, type Unsubscribe } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { getEl, queryEl } from '../utils/dom';
import { currencyFormatter, formatTimestamp } from '../utils/format';
import type { PedidoConId } from '../types/pedido';

const panel = getEl<HTMLElement>('admin-panel');
const ordersList = getEl<HTMLElement>('orders-list');
const pendingCount = getEl<HTMLElement>('pending-count');
const loadingMessage = getEl<HTMLElement>('orders-loading');
const emptyMessage = getEl<HTMLElement>('orders-empty');
const errorMessage = getEl<HTMLElement>('orders-error');
const notice = getEl<HTMLElement>('new-order-notice');

let firstSnapshot = true;
let unsubscribeOrders: Unsubscribe | undefined;

function addDetail(list: HTMLElement, label: string, value: string): void {
  const item = document.createElement('div');
  const term = document.createElement('dt');
  const description = document.createElement('dd');
  term.textContent = label;
  description.textContent = value;
  item.append(term, description);
  list.append(item);
}

function createOrderCard(order: PedidoConId, isNew: boolean): HTMLElement {
  const card = document.createElement('article');
  card.className = `order-card${isNew ? ' is-new' : ''}`;

  const header = document.createElement('header');
  header.className = 'order-card__header';
  const title = document.createElement('h2');
  title.textContent = order.nombreCliente || 'Cliente sin nombre';
  const time = document.createElement('time');
  time.className = 'order-time';
  time.textContent = formatTimestamp(order.fechaCreacion);
  header.append(title, time);

  const details = document.createElement('dl');
  details.className = 'order-details';
  addDetail(details, 'Teléfono', order.telefono || 'No registrado');
  addDetail(details, 'Cantidad', `${Number(order.cantidad) || 0} quesillo(s)`);
  addDetail(details, 'Total', currencyFormatter.format(Number(order.total) || 0));
  addDetail(details, 'Anticipo', currencyFormatter.format(Number(order.anticipo) || 0));
  addDetail(details, 'Entrega', order.tipoEntrega === 'domicilio' ? 'Domicilio' : 'Recoger en tienda');
  addDetail(details, 'Método de pago', order.metodoPago || 'No registrado');

  card.dataset.orderId = order.id;
  card.append(header, details);
  return card;
}

function renderOrders(snapshot: QuerySnapshot<DocumentData>): void {
  const incomingIds = new Set<string>();
  if (!firstSnapshot) {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added' && change.doc.data().estado === 'pendiente') {
        incomingIds.add(change.doc.id);
      }
    });
  }

  const pendingOrders: PedidoConId[] = snapshot.docs
    .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as PedidoConId)
    .filter((order) => order.estado === 'pendiente')
    .sort((left, right) => {
      const leftMillis = (left.fechaCreacion as { toMillis?: () => number } | undefined)?.toMillis?.() ?? 0;
      const rightMillis = (right.fechaCreacion as { toMillis?: () => number } | undefined)?.toMillis?.() ?? 0;
      return rightMillis - leftMillis;
    });

  pendingCount.textContent = String(pendingOrders.length);
  ordersList.replaceChildren(...pendingOrders.map((order) => createOrderCard(order, incomingIds.has(order.id))));
  loadingMessage.hidden = true;
  errorMessage.hidden = true;
  emptyMessage.hidden = pendingOrders.length > 0;

  if (incomingIds.size > 0) notice.hidden = false;
  firstSnapshot = false;
}

onAuthStateChanged(auth, (user) => {
  if (!user) {
    panel.hidden = true;
    window.location.replace('./login.html');
    return;
  }

  panel.hidden = false;
  if (unsubscribeOrders) return;

  unsubscribeOrders = onSnapshot(collection(db, 'pedidos'), renderOrders, () => {
    loadingMessage.hidden = true;
    errorMessage.textContent = 'No se pudieron cargar los pedidos. Verifica tu conexión y los permisos de Firebase.';
    errorMessage.hidden = false;
  });
});

queryEl<HTMLButtonElement>('dismiss-notice')?.addEventListener('click', () => {
  notice.hidden = true;
});
