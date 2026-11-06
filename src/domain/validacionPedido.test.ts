import { describe, expect, it } from 'vitest';
import { MAX_CANTIDAD } from './precios';
import { limpiarTexto, normalizarCelular, validarPedido, type DatosFormularioPedido } from './validacionPedido';

const valido: DatosFormularioPedido = {
  nombre: 'María Pérez',
  telefono: '3001234567',
  cantidad: '2',
  tipoEntrega: 'recoge',
  direccionTexto: '',
  tieneUbicacion: false,
};

const conErrores = (cambios: Partial<DatosFormularioPedido>) => {
  const r = validarPedido({ ...valido, ...cambios });
  return r.ok ? {} : r.errores;
};

describe('normalizarCelular', () => {
  it('acepta 10 dígitos que empiezan por 3', () => {
    expect(normalizarCelular('3001234567')).toBe('3001234567');
  });

  it('tolera espacios, guiones y prefijo +57 / 57', () => {
    expect(normalizarCelular('300 123 4567')).toBe('3001234567');
    expect(normalizarCelular('300-123-4567')).toBe('3001234567');
    expect(normalizarCelular('+57 300 123 4567')).toBe('3001234567');
    expect(normalizarCelular('573001234567')).toBe('3001234567');
  });

  it('rechaza lo que no es un celular colombiano', () => {
    for (const malo of ['', '123', '2001234567', '30012345678', '300123456', 'abc1234567', '3001234567x', '+1 300 123 4567']) {
      expect(normalizarCelular(malo)).toBeNull();
    }
  });
});

describe('limpiarTexto', () => {
  it('quita caracteres de control y espacios repetidos', () => {
    expect(limpiarTexto('  Ana \n\t  María\u0000 ')).toBe('Ana María');
  });
});

describe('validarPedido', () => {
  it('acepta un pedido correcto y devuelve valores limpios', () => {
    const r = validarPedido({ ...valido, nombre: '  María   Pérez ', telefono: '300 123 4567' });
    expect(r).toEqual({
      ok: true,
      valor: { nombre: 'María Pérez', telefono: '3001234567', cantidad: 2, direccionTexto: '' },
    });
  });

  it('exige nombre y teléfono', () => {
    expect(conErrores({ nombre: '   ' }).nombre).toBeDefined();
    expect(conErrores({ nombre: 'A' }).nombre).toBeDefined();
    expect(conErrores({ telefono: '' }).telefono).toBeDefined();
  });

  it('limita el largo del nombre', () => {
    expect(conErrores({ nombre: 'a'.repeat(81) }).nombre).toMatch(/demasiado largo/);
    expect(conErrores({ nombre: 'a'.repeat(80) }).nombre).toBeUndefined();
  });

  it('rechaza cantidades inválidas (negativas, cero, decimales, notación científica, vacías)', () => {
    for (const mala of ['0', '-5', '1.5', '1e3', '', 'abc', ' ', '21', '999999']) {
      expect(conErrores({ cantidad: mala }).cantidad, `cantidad "${mala}"`).toBeDefined();
    }
  });

  it('acepta cantidades entre 1 y el máximo', () => {
    for (const buena of ['1', '10', String(MAX_CANTIDAD), ' 3 ']) {
      expect(conErrores({ cantidad: buena }).cantidad, `cantidad "${buena}"`).toBeUndefined();
    }
  });

  it('domicilio sin ubicación ni referencia es inválido; con cualquiera de las dos es válido', () => {
    expect(conErrores({ tipoEntrega: 'domicilio' }).ubicacion).toBeDefined();
    expect(conErrores({ tipoEntrega: 'domicilio', tieneUbicacion: true }).ubicacion).toBeUndefined();
    expect(conErrores({ tipoEntrega: 'domicilio', direccionTexto: 'Apto 301' }).ubicacion).toBeUndefined();
  });

  it('recoger en tienda no pide ubicación', () => {
    expect(conErrores({ tipoEntrega: 'recoge' }).ubicacion).toBeUndefined();
  });

  it('limita el largo de la referencia de dirección', () => {
    expect(conErrores({ tipoEntrega: 'recoge', direccionTexto: 'x'.repeat(151) }).direccion).toBeDefined();
  });

  it('reporta todos los errores a la vez', () => {
    const errores = conErrores({ nombre: '', telefono: '1', cantidad: '0', tipoEntrega: 'domicilio' });
    expect(Object.keys(errores).sort()).toEqual(['cantidad', 'nombre', 'telefono', 'ubicacion']);
  });
});
