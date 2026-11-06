import { crearAviso } from './avisos';

/**
 * Muestra un aviso mientras no haya conexión. Es deliberadamente honesto:
 * sin internet no se actualizan pedidos ni ventas, y no se promete lo contrario.
 *
 * `navigator.onLine === false` es fiable; `true` solo indica que hay una red
 * conectada (puede no tener internet), por eso el aviso se basa en "sin conexión".
 */
export function vigilarConexion(): void {
  const aviso = crearAviso({
    tono: 'alerta',
    rol: 'status',
    texto: 'Sin conexión. Los pedidos y las ventas no se actualizan hasta que vuelva el internet.',
  });

  const actualizar = (): void => {
    if (navigator.onLine) aviso.ocultar();
    else aviso.mostrar();
  };

  window.addEventListener('online', actualizar);
  window.addEventListener('offline', actualizar);
  actualizar();
}
