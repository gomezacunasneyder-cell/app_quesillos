/**
 * Garantiza que un mismo envío (por ejemplo, guardar un pedido) se ejecute UNA
 * sola vez mientras siga en curso.
 *
 * Caso real: el cliente pulsa "Comprar" con internet muy lento, la espera se
 * agota y ve un aviso; Firestore, mientras tanto, sigue intentando guardar. Si
 * al reintentar se lanzara otro guardado, el pedido quedaría duplicado. Con
 * esta clase, reintentar con los mismos datos reutiliza el envío original.
 */
export class EnvioUnico<T> {
  private actual: { clave: string; promesa: Promise<T> } | null = null;

  /** Devuelve el envío en curso para `clave`, o crea uno nuevo si no existe o los datos cambiaron. */
  obtener(clave: string, crear: () => Promise<T>): Promise<T> {
    if (this.actual?.clave !== clave) {
      this.actual = { clave, promesa: crear() };
    }
    return this.actual.promesa;
  }

  /** Olvida el envío en curso (tras un éxito, o un fallo real que sí debe reintentarse desde cero). */
  liberar(): void {
    this.actual = null;
  }
}
