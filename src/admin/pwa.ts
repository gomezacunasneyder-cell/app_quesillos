import { vigilarConexion } from './pwa/conexion';
import { ofrecerInstalacion } from './pwa/instalacion';
import { registrarServiceWorker } from './pwa/registro';

// Punto de entrada de la PWA del panel (Fase 8). Cada página del panel lo
// carga con un <script type="module"> y no necesita conocer los detalles.
vigilarConexion();
ofrecerInstalacion();
void registrarServiceWorker();
