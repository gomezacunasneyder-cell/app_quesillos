import type { TipoEntrega } from '../types/pedido';
import { MAX_CANTIDAD } from './precios';

/**
 * Validación del formulario de pedido. Lógica pura (sin DOM) para probarla.
 *
 * Ojo: esto mejora la experiencia y evita errores honestos, pero NO es una
 * barrera de seguridad — cualquiera puede escribir en Firestore sin pasar por
 * el formulario. Por eso el panel admin vuelve a comprobar los pedidos
 * (ver integridadPedido.ts) y se recomiendan reglas de Firestore (docs/SEGURIDAD.md).
 */

export const MAX_NOMBRE = 80;
export const MIN_NOMBRE = 2;
export const MAX_DIRECCION = 150;

export type CampoPedido = 'nombre' | 'telefono' | 'cantidad' | 'direccion' | 'ubicacion';
export type ErroresPedido = Partial<Record<CampoPedido, string>>;

export interface DatosFormularioPedido {
  nombre: string;
  telefono: string;
  /** Texto tal como lo escribió la persona (un <input type="number"> entrega string). */
  cantidad: string;
  tipoEntrega: TipoEntrega;
  direccionTexto: string;
  tieneUbicacion: boolean;
}

export interface PedidoValidado {
  nombre: string;
  telefono: string;
  cantidad: number;
  direccionTexto: string;
}

export type ResultadoValidacion =
  | { ok: true; valor: PedidoValidado }
  | { ok: false; errores: ErroresPedido };

/** Quita caracteres de control y espacios repetidos de textos de una sola línea. */
export function limpiarTexto(texto: string): string {
  return texto
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normaliza un celular colombiano: acepta espacios, guiones, paréntesis y el
 * prefijo +57 / 57. Devuelve 10 dígitos que empiecen por 3, o null.
 */
export function normalizarCelular(entrada: string): string | null {
  let digitos = entrada.replace(/[\s\-().]/g, '');
  if (digitos.startsWith('+')) digitos = digitos.slice(1);
  if (!/^\d+$/.test(digitos)) return null;
  if (digitos.length === 12 && digitos.startsWith('57')) digitos = digitos.slice(2);
  return /^3\d{9}$/.test(digitos) ? digitos : null;
}

export function validarPedido(datos: DatosFormularioPedido): ResultadoValidacion {
  const errores: ErroresPedido = {};

  const nombre = limpiarTexto(datos.nombre);
  if (nombre.length < MIN_NOMBRE) {
    errores.nombre = 'Escribe tu nombre completo.';
  } else if (nombre.length > MAX_NOMBRE) {
    errores.nombre = `El nombre es demasiado largo (máximo ${MAX_NOMBRE} caracteres).`;
  }

  const telefono = normalizarCelular(datos.telefono);
  if (telefono === null) {
    errores.telefono = 'Ingresa un celular colombiano de 10 dígitos que empiece por 3 (ej. 3001234567).';
  }

  const textoCantidad = datos.cantidad.trim();
  const cantidad = /^\d+$/.test(textoCantidad) ? Number(textoCantidad) : NaN;
  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > MAX_CANTIDAD) {
    errores.cantidad = `La cantidad debe ser un número entero entre 1 y ${MAX_CANTIDAD}. Para pedidos más grandes escríbenos por WhatsApp.`;
  }

  const direccionTexto = limpiarTexto(datos.direccionTexto);
  if (direccionTexto.length > MAX_DIRECCION) {
    errores.direccion = `La referencia es demasiado larga (máximo ${MAX_DIRECCION} caracteres).`;
  }

  if (datos.tipoEntrega === 'domicilio' && !datos.tieneUbicacion && direccionTexto.length === 0) {
    errores.ubicacion = 'Captura tu ubicación o escribe una referencia de la dirección para poder llegar.';
  }

  if (Object.keys(errores).length > 0 || telefono === null) {
    return { ok: false, errores };
  }

  return { ok: true, valor: { nombre, telefono, cantidad, direccionTexto } };
}
