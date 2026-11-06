/**
 * Errores de formulario accesibles: cada mensaje se asocia al campo con
 * aria-describedby y aria-invalid, y se anuncia a lectores de pantalla
 * (role="alert"). Se construye con DOM seguro (textContent).
 */

function idDelError(campo: HTMLElement): string {
  return `${campo.id}-error`;
}

export function mostrarErrorCampo(campo: HTMLElement, mensaje: string): void {
  let error = document.getElementById(idDelError(campo));
  if (!error) {
    error = document.createElement('p');
    error.id = idDelError(campo);
    error.className = 'field-error';
    error.setAttribute('role', 'alert');
    campo.insertAdjacentElement('afterend', error);
  }
  error.textContent = mensaje;
  error.hidden = false;
  campo.setAttribute('aria-invalid', 'true');
  campo.setAttribute('aria-describedby', error.id);
}

export function limpiarErrorCampo(campo: HTMLElement): void {
  const error = document.getElementById(idDelError(campo));
  if (error) {
    error.hidden = true;
    error.textContent = '';
  }
  campo.removeAttribute('aria-invalid');
  campo.removeAttribute('aria-describedby');
}
