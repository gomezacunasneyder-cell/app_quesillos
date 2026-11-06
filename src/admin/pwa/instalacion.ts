import { crearAviso } from './avisos';

/** `beforeinstallprompt` aún no está en lib.dom (Chrome/Edge/Android). */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const CLAVE_DESCARTADO = 'quesillos-admin-instalar-descartado';

function yaInstalada(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches;
}

// El almacenamiento puede lanzar o estar vacío (ventana privada, datos
// bloqueados): es solo una comodidad, nunca debe romper la página.
function fueDescartado(): boolean {
  try {
    return localStorage.getItem(CLAVE_DESCARTADO) === '1';
  } catch {
    return false;
  }
}

function recordarDescarte(): void {
  try {
    localStorage.setItem(CLAVE_DESCARTADO, '1');
  } catch {
    /* sin almacenamiento: se volverá a ofrecer, no pasa nada */
  }
}

/**
 * Ofrece instalar el panel como app cuando el navegador lo permite.
 * En iPhone/Safari no existe este evento: allí se instala desde
 * Compartir → "Añadir a pantalla de inicio".
 */
export function ofrecerInstalacion(): void {
  if (yaInstalada() || fueDescartado()) return;

  let evento: BeforeInstallPromptEvent | null = null;

  const aviso = crearAviso({
    tono: 'info',
    texto: 'Instala el panel en tu celular para abrirlo como una app.',
    acciones: [
      {
        etiqueta: 'Instalar',
        alPulsar: () => {
          const pendiente = evento;
          if (!pendiente) return;
          evento = null;
          aviso.ocultar();
          void pendiente.prompt().then(() => pendiente.userChoice).catch(() => undefined);
        },
      },
    ],
    alCerrar: recordarDescarte,
  });

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    evento = e as BeforeInstallPromptEvent;
    aviso.mostrar();
  });

  window.addEventListener('appinstalled', () => {
    evento = null;
    aviso.ocultar();
  });
}
