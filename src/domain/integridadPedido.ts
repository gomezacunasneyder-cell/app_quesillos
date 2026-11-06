import type { Pedido } from '../types/pedido';
import { calcularTotal, MAX_CANTIDAD } from './precios';

/**
 * Revisa que un pedido leído de Firestore sea coherente.
 *
 * Por qué existe: las reglas de Firestore permiten que cualquiera cree
 * pedidos, y no validan su contenido; el total lo calcula el navegador del
 * cliente. Alguien podría escribir un pedido con un total distinto. Aquí el
 * panel recalcula con el precio real y avisa al vendedor, que decide.
 * (La solución completa es validar en las reglas de Firestore: docs/SEGURIDAD.md.)
 */
export function detectarInconsistencias(pedido: Pick<Pedido, 'cantidad' | 'total' | 'anticipo'>): string[] {
  const avisos: string[] = [];
  const cantidad = Number(pedido.cantidad);
  const total = Number(pedido.total);
  const anticipo = Number(pedido.anticipo);

  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > MAX_CANTIDAD) {
    avisos.push('La cantidad está fuera de lo normal.');
  } else if (total !== calcularTotal(cantidad)) {
    avisos.push('El total no coincide con la cantidad y el precio actual.');
  }

  if (!Number.isFinite(anticipo) || anticipo < 0 || anticipo > total) {
    avisos.push('El anticipo no es válido.');
  }

  return avisos;
}
