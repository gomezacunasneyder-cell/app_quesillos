import type { EstadoPedido, Pedido } from '../types/pedido';

/**
 * Flujo de estados del pedido (Fase 6). Solo el administrador avanza el
 * estado desde el panel — el cliente nunca marca su propio pedido.
 *
 *   pendiente → en_preparacion → en_camino          (domicilio) → entregado
 *                               → listo_para_recoger (recoge)   → entregado
 */

export interface TransicionEstado {
  siguiente: EstadoPedido;
  etiquetaBoton: string;
}

const ETIQUETAS_ESTADO: Record<EstadoPedido, string> = {
  pendiente: 'Pendiente',
  en_preparacion: 'En preparación',
  en_camino: 'En camino',
  listo_para_recoger: 'Listo para recoger',
  entregado: 'Entregado',
};

export function etiquetaEstado(estado: EstadoPedido): string {
  return ETIQUETAS_ESTADO[estado];
}

/** Siguiente transición disponible para un pedido, o null si ya está en el estado final. */
export function obtenerTransicion(pedido: Pick<Pedido, 'estado' | 'tipoEntrega'>): TransicionEstado | null {
  switch (pedido.estado) {
    case 'pendiente':
      return { siguiente: 'en_preparacion', etiquetaBoton: 'Preparar pedido' };
    case 'en_preparacion':
      return pedido.tipoEntrega === 'domicilio'
        ? { siguiente: 'en_camino', etiquetaBoton: 'Salió a domicilio' }
        : { siguiente: 'listo_para_recoger', etiquetaBoton: 'Listo para recoger' };
    case 'en_camino':
    case 'listo_para_recoger':
      return { siguiente: 'entregado', etiquetaBoton: 'Marcar como entregado' };
    case 'entregado':
      return null;
  }
}

export function esEntregado(estado: EstadoPedido): boolean {
  return estado === 'entregado';
}
