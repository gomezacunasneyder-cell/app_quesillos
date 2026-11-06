/** Se lanza cuando una operación tarda más de lo permitido. */
export class TiempoAgotadoError extends Error {
  constructor(ms: number) {
    super(`La operación superó el tiempo límite de ${ms} ms`);
    this.name = 'TiempoAgotadoError';
  }
}

/**
 * Devuelve el resultado de `promesa`, o falla con TiempoAgotadoError si no
 * termina en `ms` milisegundos. Importante: NO cancela la operación original
 * (las promesas no se pueden cancelar); solo deja de esperarla. Quien llama
 * debe tenerlo en cuenta — por ejemplo, Firestore sigue intentando guardar un
 * pedido aunque la espera haya expirado.
 */
export function conTiempoLimite<T>(promesa: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const temporizador = setTimeout(() => reject(new TiempoAgotadoError(ms)), ms);
    promesa.then(
      (valor) => {
        clearTimeout(temporizador);
        resolve(valor);
      },
      (error: unknown) => {
        clearTimeout(temporizador);
        reject(error);
      },
    );
  });
}
