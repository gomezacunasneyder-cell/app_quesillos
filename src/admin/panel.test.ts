// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PedidoConId } from '../types/pedido';

/**
 * Integración del panel de pedidos con repositorio y sesión simulados
 * (no hay Firebase real aquí). Usa el HTML real de admin/panel.html.
 */

const mocks = vi.hoisted(() => ({
  alCambiar: { fn: null as null | ((pedidos: unknown[]) => void) },
  actualizarEstado: vi.fn(),
}));

vi.mock('../services/FirestoreOrderRepository', () => ({
  FirestoreOrderRepository: class {
    escucharTodos(onChange: (pedidos: unknown[]) => void): () => void {
      mocks.alCambiar.fn = onChange;
      return () => undefined;
    }
    actualizarEstado = mocks.actualizarEstado;
  },
}));
vi.mock('./guard', () => ({ requerirSesion: (_panel: HTMLElement, alAutenticar: () => void) => alAutenticar() }));

const html = readFileSync(resolve(__dirname, '../../admin/panel.html'), 'utf-8');
const cuerpo = /<body[^>]*>([\s\S]*)<\/body>/.exec(html)?.[1]?.replace(/<script[\s\S]*?<\/script>/g, '') ?? '';

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const ts = (iso: string) => ({ toDate: () => new Date(iso), toMillis: () => new Date(iso).getTime() });

function pedido(sobrescribir: Partial<PedidoConId> = {}): PedidoConId {
  return {
    id: 'p1',
    nombreCliente: 'Cliente',
    telefono: '3001234567',
    cantidad: 1,
    total: 28000,
    anticipo: 14000,
    tipoEntrega: 'recoge',
    metodoPago: 'transferencia',
    estado: 'pendiente',
    numeroFactura: 'FAC-1',
    fechaCreacion: ts('2026-10-27T15:00:00Z'),
    ...sobrescribir,
  };
}

function emitir(pedidos: PedidoConId[]): void {
  mocks.alCambiar.fn?.(pedidos);
}

const tarjeta = (id: string): HTMLElement => document.querySelector<HTMLElement>(`[data-order-id="${id}"]`) as HTMLElement;
const boton = (id: string, accion: string): HTMLButtonElement | null =>
  tarjeta(id).querySelector<HTMLButtonElement>(`[data-action="${accion}"]`);

beforeEach(async () => {
  document.body.innerHTML = cuerpo;
  mocks.alCambiar.fn = null;
  mocks.actualizarEstado.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  vi.resetModules();
  await import('./panel');
});

describe('panel de pedidos', () => {
  it('separa activos, entregados y cancelados; cancelados y entregados no cuentan como activos', () => {
    emitir([
      pedido({ id: 'a', estado: 'pendiente' }),
      pedido({ id: 'b', estado: 'en_preparacion' }),
      pedido({ id: 'c', estado: 'entregado', tipoEntrega: 'domicilio' }),
      pedido({ id: 'd', estado: 'entregado', tipoEntrega: 'recoge' }),
      pedido({ id: 'e', estado: 'cancelado' }),
    ]);

    expect($('pending-count').textContent).toBe('2');
    expect(document.querySelectorAll('#orders-list [data-order-id]')).toHaveLength(2);
    expect($('history-domicilio-count').textContent).toBe('1');
    expect($('history-recoge-count').textContent).toBe('1');
    expect($('history-cancelados-count').textContent).toBe('1');
  });

  it('solo los pedidos pendientes tienen el botón "Cancelar pedido"', () => {
    emitir([pedido({ id: 'a', estado: 'pendiente' }), pedido({ id: 'b', estado: 'en_preparacion' })]);
    expect(boton('a', 'cancelar-pedido')).not.toBeNull();
    expect(boton('b', 'cancelar-pedido')).toBeNull();
  });

  it('cancelar pide confirmación: la primera pulsación no cancela, la segunda sí', async () => {
    mocks.actualizarEstado.mockResolvedValue(undefined);
    emitir([pedido({ id: 'a' })]);

    boton('a', 'cancelar-pedido')?.click();
    expect(mocks.actualizarEstado).not.toHaveBeenCalled();
    expect(boton('a', 'cancelar-pedido')?.textContent).toContain('¿Seguro?');

    boton('a', 'cancelar-pedido')?.click();
    await vi.waitFor(() => expect(mocks.actualizarEstado).toHaveBeenCalledWith('a', 'cancelado'));
  });

  it('avanzar el estado llama al repositorio con el siguiente estado', async () => {
    mocks.actualizarEstado.mockResolvedValue(undefined);
    emitir([pedido({ id: 'a', estado: 'pendiente' })]);

    boton('a', 'avanzar-estado')?.click();
    await vi.waitFor(() => expect(mocks.actualizarEstado).toHaveBeenCalledWith('a', 'en_preparacion'));
  });

  it('si falla la actualización muestra el error y NO deja el botón trabado en "Actualizando..."', async () => {
    mocks.actualizarEstado.mockRejectedValue(new Error('sin red'));
    emitir([pedido({ id: 'a' })]);

    boton('a', 'avanzar-estado')?.click();
    await vi.waitFor(() => expect($('orders-error').hidden).toBe(false));

    expect($('orders-error').textContent).toContain('No se pudo actualizar');
    const avanzar = boton('a', 'avanzar-estado');
    expect(avanzar?.disabled).toBe(false);
    expect(avanzar?.textContent).toBe('Preparar pedido');
    expect(boton('a', 'cancelar-pedido')?.disabled).toBe(false);
  });

  it('avisa cuando el total de un pedido no coincide con la cantidad (posible manipulación)', () => {
    emitir([pedido({ id: 'ok' }), pedido({ id: 'raro', cantidad: 5, total: 1000, anticipo: 500 })]);

    expect(tarjeta('ok').querySelector<HTMLElement>('.order-card__warning')?.hidden).toBe(true);
    const aviso = tarjeta('raro').querySelector<HTMLElement>('.order-card__warning');
    expect(aviso?.hidden).toBe(false);
    expect(aviso?.textContent).toContain('total no coincide');
  });

  it('los datos del cliente se muestran como texto (sin ejecutar HTML)', () => {
    emitir([pedido({ id: 'x', nombreCliente: '<img src=x onerror="window.__xss=1">' })]);
    expect(tarjeta('x').querySelector('img')).toBeNull();
    expect(tarjeta('x').querySelector('h2')?.textContent).toBe('<img src=x onerror="window.__xss=1">');
  });
});
