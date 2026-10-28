import type { PedidoConId } from '../types/pedido';

/**
 * Resumen de ventas (Fase 7). Lógica pura: no toca Firestore ni el DOM, así
 * que se prueba con datos en memoria.
 *
 * Reglas de negocio:
 *  - Una "venta" es un pedido en estado 'entregado' (dinero ya realizado).
 *  - Se fecha por `fechaEntrega`; si el pedido es anterior a la Fase 6 y no
 *    la tiene, se usa `fechaCreacion`.
 *  - Los días, semanas (lunes a domingo) y meses se calculan en hora de
 *    Bogotá (UTC-5, Colombia no usa horario de verano).
 */

const OFFSET_BOGOTA_MS = -5 * 60 * 60 * 1000;
const MS_DIA = 24 * 60 * 60 * 1000;

export const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'] as const;
export const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
] as const;

export interface TotalesPeriodo {
  total: number;
  pedidos: number;
  quesillos: number;
}

export interface DiaVentas extends TotalesPeriodo {
  /** Clave de día en Bogotá: YYYY-MM-DD. */
  fecha: string;
  /** Nombre del día (Lunes … Domingo). */
  etiqueta: string;
}

export interface ResumenSemana {
  /** Lunes de la semana, YYYY-MM-DD. */
  inicio: string;
  /** Domingo de la semana, YYYY-MM-DD. */
  fin: string;
  dias: DiaVentas[];
  totales: TotalesPeriodo;
}

export interface ResumenMes {
  anio: number;
  /** 1 a 12. */
  mes: number;
  totales: TotalesPeriodo;
}

interface TimestampLike {
  toDate: () => Date;
}

function esTimestamp(valor: unknown): valor is TimestampLike {
  return typeof valor === 'object' && valor !== null && typeof (valor as TimestampLike).toDate === 'function';
}

function aFecha(valor: unknown): Date | null {
  if (valor instanceof Date) return valor;
  if (esTimestamp(valor)) return valor.toDate();
  return null;
}

/** Fecha en que se contabiliza la venta, o null si el pedido no es una venta. */
export function fechaDeVenta(pedido: PedidoConId): Date | null {
  if (pedido.estado !== 'entregado') return null;
  return aFecha(pedido.fechaEntrega) ?? aFecha(pedido.fechaCreacion);
}

/** Desplaza el instante para poder leer año/mes/día de Bogotá con getters UTC. */
function enBogota(fecha: Date): Date {
  return new Date(fecha.getTime() + OFFSET_BOGOTA_MS);
}

function dosDigitos(n: number): string {
  return String(n).padStart(2, '0');
}

function clave(anio: number, mes0: number, dia: number): string {
  return `${anio}-${dosDigitos(mes0 + 1)}-${dosDigitos(dia)}`;
}

/** Clave YYYY-MM-DD del día de Bogotá al que pertenece el instante. */
export function claveDia(fecha: Date): string {
  const d = enBogota(fecha);
  return clave(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** Lunes (00:00 Bogotá, como instante UTC) de la semana que contiene `referencia`. */
function inicioDeSemana(referencia: Date): Date {
  const d = enBogota(referencia);
  const indiceLunes0 = (d.getUTCDay() + 6) % 7; // lunes = 0 … domingo = 6
  const medianocheLocal = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return new Date(medianocheLocal - indiceLunes0 * MS_DIA - OFFSET_BOGOTA_MS);
}

function sumar(acum: TotalesPeriodo, pedido: PedidoConId): void {
  acum.total += Number(pedido.total) || 0;
  acum.pedidos += 1;
  acum.quesillos += Number(pedido.cantidad) || 0;
}

const vacio = (): TotalesPeriodo => ({ total: 0, pedidos: 0, quesillos: 0 });

export function resumenSemana(pedidos: PedidoConId[], referencia: Date): ResumenSemana {
  const lunes = inicioDeSemana(referencia);

  const dias: DiaVentas[] = DIAS_SEMANA.map((etiqueta, i) => ({
    fecha: claveDia(new Date(lunes.getTime() + i * MS_DIA)),
    etiqueta,
    ...vacio(),
  }));
  const porFecha = new Map(dias.map((dia) => [dia.fecha, dia]));
  const totales = vacio();

  for (const pedido of pedidos) {
    const fecha = fechaDeVenta(pedido);
    if (!fecha) continue;
    const dia = porFecha.get(claveDia(fecha));
    if (!dia) continue;
    sumar(dia, pedido);
    sumar(totales, pedido);
  }

  return {
    inicio: dias[0]?.fecha ?? '',
    fin: dias[6]?.fecha ?? '',
    dias,
    totales,
  };
}

export function resumenMes(pedidos: PedidoConId[], referencia: Date): ResumenMes {
  const ref = enBogota(referencia);
  const anio = ref.getUTCFullYear();
  const mes0 = ref.getUTCMonth();
  const totales = vacio();

  for (const pedido of pedidos) {
    const fecha = fechaDeVenta(pedido);
    if (!fecha) continue;
    const d = enBogota(fecha);
    if (d.getUTCFullYear() === anio && d.getUTCMonth() === mes0) sumar(totales, pedido);
  }

  return { anio, mes: mes0 + 1, totales };
}

/** Mueve la referencia `n` semanas (negativo = hacia atrás). */
export function desplazarSemanas(referencia: Date, n: number): Date {
  return new Date(referencia.getTime() + n * 7 * MS_DIA);
}

/** Mueve la referencia `n` meses, parando en el día 1 (00:00 Bogotá). */
export function desplazarMeses(referencia: Date, n: number): Date {
  const d = enBogota(referencia);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1) - OFFSET_BOGOTA_MS);
}
