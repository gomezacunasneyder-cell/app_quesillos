import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { conTiempoLimite, TiempoAgotadoError } from './async';

describe('conTiempoLimite', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('devuelve el valor si la promesa termina a tiempo', async () => {
    const rapida = new Promise<string>((resolve) => setTimeout(() => resolve('ok'), 100));
    const resultado = conTiempoLimite(rapida, 1000);
    await vi.advanceTimersByTimeAsync(100);
    await expect(resultado).resolves.toBe('ok');
  });

  it('falla con TiempoAgotadoError si la promesa no termina a tiempo (ej. Firestore sin red)', async () => {
    const colgada = new Promise<string>(() => undefined);
    const resultado = conTiempoLimite(colgada, 1000);
    const verificacion = expect(resultado).rejects.toBeInstanceOf(TiempoAgotadoError);
    await vi.advanceTimersByTimeAsync(1000);
    await verificacion;
  });

  it('propaga el error original si la promesa falla antes del límite', async () => {
    const fallida = Promise.reject(new Error('permission-denied'));
    await expect(conTiempoLimite(fallida, 1000)).rejects.toThrow('permission-denied');
  });

  it('limpia el temporizador cuando termina (no deja trabajo pendiente)', async () => {
    await conTiempoLimite(Promise.resolve(1), 1000);
    expect(vi.getTimerCount()).toBe(0);
  });
});
