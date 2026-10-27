import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { queryEl } from '../utils/dom';

const loginForm = queryEl<HTMLFormElement>('login-form');
const loginError = queryEl<HTMLElement>('login-error');

if (loginForm && loginError) {
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const submitButton = loginForm.querySelector<HTMLButtonElement>('button[type="submit"]');
    const emailInput = loginForm.elements.namedItem('email') as HTMLInputElement | null;
    const passwordInput = loginForm.elements.namedItem('password') as HTMLInputElement | null;
    const email = emailInput?.value.trim() ?? '';
    const password = passwordInput?.value ?? '';

    loginError.hidden = true;
    if (submitButton) submitButton.disabled = true;

    try {
      await signInWithEmailAndPassword(auth, email, password);
      window.location.replace('./panel.html');
    } catch {
      loginError.textContent = 'Correo o contraseña incorrectos. Inténtalo de nuevo.';
      loginError.hidden = false;
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
}

const logoutButton = queryEl<HTMLButtonElement>('logout-button');
if (logoutButton) {
  logoutButton.addEventListener('click', async () => {
    logoutButton.disabled = true;
    const panel = queryEl<HTMLElement>('admin-panel');
    if (panel) panel.hidden = true;

    try {
      await signOut(auth);
      window.location.replace('./login.html');
    } catch {
      logoutButton.disabled = false;
      if (panel) panel.hidden = false;
    }
  });
}
