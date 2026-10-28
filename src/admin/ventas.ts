import { requerirSesion } from './guard';
import { renderMes, renderSemana, type ElementosVentas } from './ventasView';
import { getEl } from '../utils/dom';
import { desplazarMeses, desplazarSemanas, resumenMes, resumenSemana } from '../domain/ventas';
import { FirestoreOrderRepository } from '../services/FirestoreOrderRepository';
import type { PedidoConId } from '../types/pedido';

const orderRepository = new FirestoreOrderRepository();

const panel = getEl<HTMLElement>('admin-panel');
const loading = getEl<HTMLElement>('ventas-loading');
const error = getEl<HTMLElement>('ventas-error');
const contenido = getEl<HTMLElement>('ventas-contenido');

const elementos: ElementosVentas = {
  semanaEtiqueta: getEl('semana-etiqueta'),
  semanaTotal: getEl('semana-total'),
  semanaDetalle: getEl('semana-detalle'),
  semanaBarras: getEl('semana-barras'),
  mesEtiqueta: getEl('mes-etiqueta'),
  mesTotal: getEl('mes-total'),
  mesDetalle: getEl('mes-detalle'),
};

let pedidos: PedidoConId[] = [];
let referenciaSemana = new Date();
let referenciaMes = new Date();

function pintar(): void {
  renderSemana(elementos, resumenSemana(pedidos, referenciaSemana));
  renderMes(elementos, resumenMes(pedidos, referenciaMes));
}

function alClic(id: string, accion: () => void): void {
  getEl<HTMLButtonElement>(id).addEventListener('click', () => {
    accion();
    pintar();
  });
}

alClic('semana-anterior', () => { referenciaSemana = desplazarSemanas(referenciaSemana, -1); });
alClic('semana-siguiente', () => { referenciaSemana = desplazarSemanas(referenciaSemana, 1); });
alClic('semana-actual', () => { referenciaSemana = new Date(); });
alClic('mes-anterior', () => { referenciaMes = desplazarMeses(referenciaMes, -1); });
alClic('mes-siguiente', () => { referenciaMes = desplazarMeses(referenciaMes, 1); });
alClic('mes-actual', () => { referenciaMes = new Date(); });

requerirSesion(panel, () => {
  orderRepository.escucharTodos(
    (recibidos) => {
      pedidos = recibidos;
      loading.hidden = true;
      error.hidden = true;
      contenido.hidden = false;
      pintar();
    },
    () => {
      loading.hidden = true;
      contenido.hidden = true;
      error.textContent = 'No se pudieron cargar las ventas. Verifica tu conexión y los permisos de Firebase.';
      error.hidden = false;
    },
  );
});
