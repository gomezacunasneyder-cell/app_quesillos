/**
 * Comportamiento accesible para los modales (factura y testimonio):
 *  - mueve el foco al abrir y lo devuelve a donde estaba al cerrar;
 *  - mantiene el foco dentro del modal con Tab / Shift+Tab;
 *  - Escape lo cierra (si `puedeCerrar` lo permite).
 *
 * El marcado debe llevar role="dialog", aria-modal="true" y un nombre
 * accesible (aria-label o aria-labelledby).
 */

const FOCUSABLES =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface OpcionesModal {
  /** Elemento que recibe el foco al abrir (por defecto, el primer enfocable). */
  enfocar?: HTMLElement | null;
  /** Si devuelve false, Escape no cierra el modal (por ejemplo, mientras carga). */
  puedeCerrar?: () => boolean;
  /** Se ejecuta después de cerrar. */
  alCerrar?: () => void;
}

function enfocables(modal: HTMLElement): HTMLElement[] {
  return Array.from(modal.querySelectorAll<HTMLElement>(FOCUSABLES)).filter(
    (el) => el.offsetParent !== null || el === document.activeElement,
  );
}

/** Abre el modal y devuelve la función para cerrarlo. */
export function abrirModal(modal: HTMLElement, opciones: OpcionesModal = {}): () => void {
  const previo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  modal.classList.remove('hidden');

  const alPulsarTecla = (evento: KeyboardEvent): void => {
    if (evento.key === 'Escape') {
      if (opciones.puedeCerrar?.() ?? true) {
        evento.preventDefault();
        cerrar();
      }
      return;
    }

    if (evento.key !== 'Tab') return;
    const lista = enfocables(modal);
    const primero = lista[0];
    const ultimo = lista[lista.length - 1];
    if (!primero || !ultimo) {
      evento.preventDefault();
      return;
    }
    const activo = document.activeElement;
    if (evento.shiftKey && (activo === primero || !modal.contains(activo))) {
      evento.preventDefault();
      ultimo.focus();
    } else if (!evento.shiftKey && (activo === ultimo || !modal.contains(activo))) {
      evento.preventDefault();
      primero.focus();
    }
  };

  let abierto = true;
  function cerrar(): void {
    if (!abierto) return;
    abierto = false;
    document.removeEventListener('keydown', alPulsarTecla);
    modal.classList.add('hidden');
    previo?.focus();
    opciones.alCerrar?.();
  }

  document.addEventListener('keydown', alPulsarTecla);
  (opciones.enfocar ?? enfocables(modal)[0])?.focus();

  return cerrar;
}
