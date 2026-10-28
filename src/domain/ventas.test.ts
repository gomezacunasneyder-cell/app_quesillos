import { describe, expect, it } from 'vitest';
import type { PedidoConId } from '../types/pedido';
import {
  claveDia,
  desplazarMeses,
  desplazarSemanas,
  fechaDeVenta,
  resumenMes,
  resumenSemana,
} from './ventas';

/** Simula un Timestamp de Firestore a partir de un instante ISO (UTC). */
const ts = (iso: string) => ({ toDate: () => new Date(iso) });

function pedido(sobrescribir: Partial<PedidoConId> = {}): PedidoConId {
  return {
    id: 'p1',
    nombreCliente: 'Cliente de prueba',
    telefono: '3001234567',
    cantidad: 1,
    total: 28000,
    anticipo: 14000,
    tipoEntrega: 'recoge',
    metodoPago: 'transferencia',
    estado: 'entregado',
    numeroFactura: 'FAC-1',
    fechaCreacion: ts('2026-10-20T15:00:00Z'),
    fechaEntrega: ts('2026-10-27T15:00:00Z'), // martes 27 oct, 10:00 Bogotá
    ...sobrescribir,
  };
}

// Martes 27 de octubre de 2026, 10:00 hora de Bogotá.
const REFERENCIA = new Date('2026-10-27T15:00:00Z');

describe('fechaDeVenta', () => {
  it('solo cuenta pedidos entregados', () => {
    for (const estado of ['pendiente', 'en_preparacion', 'en_camino', 'listo_para_recoger'] as const) {
      expect(fechaDeVenta(pedido({ estado }))).toBeNull();
    }
    expect(fechaDeVenta(pedido())).toBeInstanceOf(Date);
  });

  it('usa fechaEntrega y, si falta, cae a fechaCreacion', () => {
    expect(fechaDeVenta(pedido())?.toISOString()).toBe('2026-10-27T15:00:00.000Z');
    expect(fechaDeVenta(pedido({ fechaEntrega: undefined }))?.toISOString()).toBe('2026-10-20T15:00:00.000Z');
  });

  it('devuelve null si no hay ninguna fecha utilizable', () => {
    expect(fechaDeVenta(pedido({ fechaEntrega: undefined, fechaCreacion: null }))).toBeNull();
  });
});

describe('claveDia (zona America/Bogota)', () => {
  it('usa el día de Bogotá, no el de UTC', () => {
    // 03:00Z del 27 = 22:00 del lunes 26 en Bogotá
    expect(claveDia(new Date('2026-10-27T03:00:00Z'))).toBe('2026-10-26');
    // 04:59Z del 1 nov = 23:59 del 31 oct en Bogotá
    expect(claveDia(new Date('2026-11-01T04:59:00Z'))).toBe('2026-10-31');
    expect(claveDia(new Date('2026-11-01T05:00:00Z'))).toBe('2026-11-01');
  });
});

describe('resumenSemana', () => {
  it('devuelve siete días de lunes a domingo, aun sin ventas', () => {
    const r = resumenSemana([], REFERENCIA);
    expect(r.dias.map((d) => d.etiqueta)).toEqual([
      'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo',
    ]);
    expect(r.inicio).toBe('2026-10-26');
    expect(r.fin).toBe('2026-11-01');
    expect(r.totales).toEqual({ total: 0, pedidos: 0, quesillos: 0 });
  });

  it('suma por día y en el total de la semana', () => {
    const r = resumenSemana(
      [
        pedido({ id: 'a', total: 56000, cantidad: 2 }), // martes
        pedido({ id: 'b', total: 28000, cantidad: 1 }), // martes
        pedido({ id: 'c', total: 84000, cantidad: 3, fechaEntrega: ts('2026-10-30T20:00:00Z') }), // viernes
      ],
      REFERENCIA,
    );
    const martes = r.dias[1];
    const viernes = r.dias[4];
    expect(martes).toMatchObject({ etiqueta: 'Martes', total: 84000, pedidos: 2, quesillos: 3 });
    expect(viernes).toMatchObject({ etiqueta: 'Viernes', total: 84000, pedidos: 1, quesillos: 3 });
    expect(r.totales).toEqual({ total: 168000, pedidos: 3, quesillos: 6 });
  });

  it('ignora pedidos no entregados y ventas de otras semanas', () => {
    const r = resumenSemana(
      [
        pedido({ id: 'activo', estado: 'en_camino' }),
        pedido({ id: 'semana-pasada', fechaEntrega: ts('2026-10-25T20:00:00Z') }), // domingo 25
        pedido({ id: 'semana-siguiente', fechaEntrega: ts('2026-11-02T20:00:00Z') }), // lunes 2 nov
      ],
      REFERENCIA,
    );
    expect(r.totales.pedidos).toBe(0);
  });

  it('respeta los bordes de día en hora de Bogotá', () => {
    const r = resumenSemana(
      [
        pedido({ id: 'lunes-noche', fechaEntrega: ts('2026-10-27T03:00:00Z') }), // lunes 22:00 Bogotá
        pedido({ id: 'domingo-noche', fechaEntrega: ts('2026-11-02T04:30:00Z') }), // domingo 23:30 Bogotá
      ],
      REFERENCIA,
    );
    expect(r.dias[0]?.pedidos).toBe(1); // lunes
    expect(r.dias[6]?.pedidos).toBe(1); // domingo
  });

  it('da la misma semana desde cualquier día de la semana', () => {
    const lunes = resumenSemana([], new Date('2026-10-26T05:00:00Z'));
    const domingo = resumenSemana([], new Date('2026-11-02T04:30:00Z'));
    expect(lunes.inicio).toBe('2026-10-26');
    expect(domingo.inicio).toBe('2026-10-26');
  });

  it('desplazarSemanas navega a la semana anterior y siguiente', () => {
    expect(resumenSemana([], desplazarSemanas(REFERENCIA, -1)).inicio).toBe('2026-10-19');
    expect(resumenSemana([], desplazarSemanas(REFERENCIA, 1)).inicio).toBe('2026-11-02');
  });
});

describe('resumenMes', () => {
  it('suma solo el mes de la referencia', () => {
    const r = resumenMes(
      [
        pedido({ id: 'a', total: 28000, cantidad: 1 }),
        pedido({ id: 'b', total: 56000, cantidad: 2, fechaEntrega: ts('2026-10-02T15:00:00Z') }),
        pedido({ id: 'otro-mes', total: 99000, fechaEntrega: ts('2026-09-30T15:00:00Z') }),
        pedido({ id: 'activo', estado: 'pendiente' }),
      ],
      REFERENCIA,
    );
    expect(r).toEqual({ anio: 2026, mes: 10, totales: { total: 84000, pedidos: 2, quesillos: 3 } });
  });

  it('el cambio de mes se decide en hora de Bogotá', () => {
    const pedidos = [
      pedido({ id: 'fin-octubre', fechaEntrega: ts('2026-11-01T04:30:00Z') }), // 31 oct 23:30 Bogotá
      pedido({ id: 'inicio-noviembre', fechaEntrega: ts('2026-11-01T05:30:00Z') }), // 1 nov 00:30 Bogotá
    ];
    expect(resumenMes(pedidos, REFERENCIA).totales.pedidos).toBe(1);
    expect(resumenMes(pedidos, desplazarMeses(REFERENCIA, 1))).toMatchObject({ mes: 11, totales: { pedidos: 1 } });
  });

  it('desplazarMeses cruza el cambio de año', () => {
    const enero = desplazarMeses(new Date('2026-12-15T15:00:00Z'), 1);
    expect(resumenMes([], enero)).toMatchObject({ anio: 2027, mes: 1 });
    const diciembre = desplazarMeses(new Date('2026-01-15T15:00:00Z'), -1);
    expect(resumenMes([], diciembre)).toMatchObject({ anio: 2025, mes: 12 });
  });
});
