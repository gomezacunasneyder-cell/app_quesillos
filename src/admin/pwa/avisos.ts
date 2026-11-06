/**
 * Avisos de la PWA (sin conexión, nueva versión, instalar). Se construyen con
 * DOM seguro (textContent, sin innerHTML) y comparten un contenedor fijo
 * arriba de la página, para no tener que repetir marcado en cada HTML.
 */

export type TonoAviso = 'alerta' | 'info';

export interface AccionAviso {
  etiqueta: string;
  alPulsar: () => void;
}

export interface OpcionesAviso {
  texto: string;
  tono: TonoAviso;
  /** 'alert' para problemas, 'status' para información. */
  rol?: 'alert' | 'status';
  acciones?: AccionAviso[];
  /** Si se indica, muestra una "×" que oculta el aviso y llama a esta función. */
  alCerrar?: () => void;
}

export interface Aviso {
  mostrar: () => void;
  ocultar: () => void;
}

let contenedor: HTMLElement | null = null;

function obtenerContenedor(): HTMLElement {
  if (contenedor && contenedor.isConnected) return contenedor;
  contenedor = document.createElement('div');
  contenedor.className = 'pwa-avisos';
  document.body.prepend(contenedor);
  return contenedor;
}

export function crearAviso(opciones: OpcionesAviso): Aviso {
  const elemento = document.createElement('div');
  elemento.className = `pwa-aviso pwa-aviso--${opciones.tono}`;
  elemento.setAttribute('role', opciones.rol ?? 'status');
  elemento.hidden = true;

  const texto = document.createElement('span');
  texto.className = 'pwa-aviso__texto';
  texto.textContent = opciones.texto;
  elemento.append(texto);

  const botones = document.createElement('span');
  botones.className = 'pwa-aviso__acciones';

  for (const accion of opciones.acciones ?? []) {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'pwa-aviso__boton';
    boton.textContent = accion.etiqueta;
    boton.addEventListener('click', accion.alPulsar);
    botones.append(boton);
  }

  const { alCerrar } = opciones;
  if (alCerrar) {
    const cerrar = document.createElement('button');
    cerrar.type = 'button';
    cerrar.className = 'pwa-aviso__cerrar';
    cerrar.setAttribute('aria-label', 'Cerrar aviso');
    cerrar.textContent = '×';
    cerrar.addEventListener('click', () => {
      elemento.hidden = true;
      alCerrar();
    });
    botones.append(cerrar);
  }

  elemento.append(botones);
  obtenerContenedor().append(elemento);

  return {
    mostrar: () => {
      elemento.hidden = false;
    },
    ocultar: () => {
      elemento.hidden = true;
    },
  };
}
