import { getAuth } from 'firebase/auth';
import { app } from './firebase';

/** Autenticación de Firebase. Solo la importan las páginas del panel admin. */
export const auth = getAuth(app);
