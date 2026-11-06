// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Prueba de integración del formulario de pedido con el repositorio simulado
 * (no hay Firebase real aquí). Usa el HTML real de index.html.
 */

const { crear } = vi.hoisted(() => ({ crear: vi.fn() }));

vi.mock('../services/FirestoreOrderRepository', () => ({
  FirestoreOrderRepository: class {
    crear = crear;
  },
}));

import { initOrderForm } from './orderForm';

const html = readFileSync(resolve(__dirname, '../../index.html'), 'utf-8');
const cuerpo = /<body[^>]*>([\s\S]*)<\/body>/.exec(html)?.[1]?.replace(/<script[\s\S]*?<\/script>/g, '')
  .replace(/<iframe[\s\S]*?<\/iframe>/g, '') ?? '';

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

function llenar(valores: Partial<Record<'nombre' | 'telefono' | 'cantidad' | 'direccionTexto', string>>): void {
  for (const [id, valor] of Object.entries(valores)) $<HTMLInputElement>(id).value = valor;
}

const enviar = (): void => {
  $<HTMLFormElement>('form-pedido').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
};

const pedidoCreado = (extra = {}) => ({ id: 'abc', numeroFactura: 'FAC-123', anticipo: 28000, ...extra });

beforeEach(() => {
  document.body.innerHTML = cuerpo;
  crear.mockReset();
  vi.spyOn(window, 'open').mockReturnValue(null);
  vi.spyOn(console, 'error').mockImplementation(() => undefined); // los errores de red son esperados aquí
  initOrderForm();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('formulario de pedido', () => {
  it('con datos válidos guarda el pedido, muestra la factura y deja el botón de WhatsApp listo', async () => {
    crear.mockResolvedValue(pedidoCreado());
    llenar({ nombre: '  María   Pérez ', telefono: '+57 300 123 4567', cantidad: '2', direccionTexto: 'Apto 301' });

    enviar();
    await vi.waitFor(() => expect($('factura-detalle').classList.contains('hidden')).toBe(false));

    // El repositorio recibe datos limpios y el total calculado con el precio real.
    expect(crear).toHaveBeenCalledTimes(1);
    expect(crear.mock.calls[0]?.[0]).toEqual({
      nombreCliente: 'María Pérez',
      telefono: '3001234567',
      cantidad: 2,
      total: 56000,
      tipoEntrega: 'domicilio',
      ubicacion: undefined,
      direccionTexto: 'Apto 301',
    });

    expect($('fac-numero').textContent).toBe('FAC-123');
    expect($('fac-cliente').textContent).toBe('María Pérez');
    expect($('fac-total').textContent).toContain('56.000');
    expect($('fac-anticipo').textContent).toContain('28.000');

    const enlace = $<HTMLAnchorElement>('btn-whatsapp').href;
    expect(enlace.startsWith('https://wa.me/573227068624?text=')).toBe(true);
    expect(decodeURIComponent(enlace)).toContain('FAC-123');
    expect(window.open).toHaveBeenCalledWith(enlace, '_blank', 'noopener');

    // Formulario limpio y listo para otro pedido.
    expect($<HTMLInputElement>('nombre').value).toBe('');
    expect($<HTMLButtonElement>('btn-comprar').disabled).toBe(false);
    expect($('form-error').hidden).toBe(true);
  });

  it('con datos inválidos no llama al repositorio y muestra los errores', async () => {
    llenar({ nombre: '', telefono: '123', cantidad: '-5' });
    enviar();

    expect(crear).not.toHaveBeenCalled();
    expect($('nombre-error').hidden).toBe(false);
    expect($('telefono-error').hidden).toBe(false);
    expect($('cantidad-error').hidden).toBe(false);
    expect($('modal-factura').classList.contains('hidden')).toBe(true);
  });

  it('si Firestore tarda más de 15 s avisa, y reintentar NO crea un pedido duplicado', async () => {
    vi.useFakeTimers();
    let confirmar: (valor: unknown) => void = () => undefined;
    crear.mockReturnValue(new Promise((resolve) => (confirmar = resolve))); // Firestore sin responder
    llenar({ nombre: 'Ana López', telefono: '3001234567', cantidad: '1', direccionTexto: 'Casa verde' });

    enviar();
    await vi.advanceTimersByTimeAsync(15000);

    expect($('form-error').hidden).toBe(false);
    expect($('form-error').textContent).toContain('No pudimos confirmar tu pedido');
    expect($<HTMLButtonElement>('btn-comprar').disabled).toBe(false);
    expect($('modal-factura').classList.contains('hidden')).toBe(true);

    // El cliente reintenta con los mismos datos: se reutiliza el guardado en curso.
    enviar();
    await vi.advanceTimersByTimeAsync(0);
    expect(crear).toHaveBeenCalledTimes(1);

    // Cuando por fin responde, el reintento termina bien.
    confirmar(pedidoCreado({ numeroFactura: 'FAC-999' }));
    await vi.advanceTimersByTimeAsync(0);
    expect($('fac-numero').textContent).toBe('FAC-999');
    expect($('factura-detalle').classList.contains('hidden')).toBe(false);
  });

  it('si el guardado falla de verdad, muestra el error y el reintento sí crea un envío nuevo', async () => {
    crear.mockRejectedValueOnce(new Error('permission-denied')).mockResolvedValueOnce(pedidoCreado());
    llenar({ nombre: 'Ana López', telefono: '3001234567', cantidad: '1', direccionTexto: 'Casa verde' });

    enviar();
    await vi.waitFor(() => expect($('form-error').hidden).toBe(false));
    expect($('form-error').textContent).toContain('Hubo un error');
    expect($<HTMLButtonElement>('btn-comprar').disabled).toBe(false);

    enviar();
    await vi.waitFor(() => expect($('factura-detalle').classList.contains('hidden')).toBe(false));
    expect(crear).toHaveBeenCalledTimes(2);
  });
});
