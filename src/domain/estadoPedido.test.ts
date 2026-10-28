import { describe, expect, it } from 'vitest';
import type { EstadoPedido, TipoEntrega } from '../types/pedido';
import { esEntregado, etiquetaEstado, obtenerTransicion } from './estadoPedido';

function recorrer(tipoEntrega: TipoEntrega): EstadoPedido[] {
  const recorrido: EstadoPedido[] = ['pendiente'];
  let estado: EstadoPedido = 'pendiente';
  for (let i = 0; i < 10; i++) {
    const t = obtenerTransicion({ estado, tipoEntrega });
    if (!t) break;
    estado = t.siguiente;
    recorrido.push(estado);
  }
  return recorrido;
}

describe('flujo de estados del pedido', () => {
  it('domicilio: pendiente → en preparación → en camino → entregado', () => {
    expect(recorrer('domicilio')).toEqual(['pendiente', 'en_preparacion', 'en_camino', 'entregado']);
  });

  it('recoge en tienda: pendiente → en preparación → listo para recoger → entregado', () => {
    expect(recorrer('recoge')).toEqual(['pendiente', 'en_preparacion', 'listo_para_recoger', 'entregado']);
  });

  it('entregado es el estado final', () => {
    expect(obtenerTransicion({ estado: 'entregado', tipoEntrega: 'domicilio' })).toBeNull();
    expect(esEntregado('entregado')).toBe(true);
    expect(esEntregado('en_camino')).toBe(false);
  });

  it('un pedido a domicilio nunca pasa por "listo para recoger" y viceversa', () => {
    expect(recorrer('domicilio')).not.toContain('listo_para_recoger');
    expect(recorrer('recoge')).not.toContain('en_camino');
  });

  it('los botones usan el texto esperado en cada paso', () => {
    expect(obtenerTransicion({ estado: 'pendiente', tipoEntrega: 'recoge' })?.etiquetaBoton).toBe('Preparar pedido');
    expect(obtenerTransicion({ estado: 'en_preparacion', tipoEntrega: 'domicilio' })?.etiquetaBoton).toBe('Salió a domicilio');
    expect(obtenerTransicion({ estado: 'en_preparacion', tipoEntrega: 'recoge' })?.etiquetaBoton).toBe('Listo para recoger');
    expect(obtenerTransicion({ estado: 'en_camino', tipoEntrega: 'domicilio' })?.etiquetaBoton).toBe('Marcar como entregado');
  });

  it('todos los estados tienen etiqueta legible', () => {
    const estados: EstadoPedido[] = ['pendiente', 'en_preparacion', 'en_camino', 'listo_para_recoger', 'entregado'];
    for (const estado of estados) expect(etiquetaEstado(estado)).toMatch(/\S/);
  });
});
