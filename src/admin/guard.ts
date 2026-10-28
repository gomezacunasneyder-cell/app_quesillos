import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';

/**
 * Protege una página del panel: sin sesión redirige al login; con sesión
 * muestra el contenedor y ejecuta `alAutenticar` una sola vez.
 *
 * Importante: esto solo evita mostrar la interfaz a quien no ha iniciado
 * sesión. La protección real de los datos está en las reglas de Firestore.
 */
export function requerirSesion(panel: HTMLElement, alAutenticar: () => void): void {
  let iniciado = false;

  onAuthStateChanged(auth, (user) => {
    if (!user) {
      panel.hidden = true;
      window.location.replace('./login.html');
      return;
    }

    panel.hidden = false;
    if (iniciado) return;
    iniciado = true;
    alAutenticar();
  });
}
