/**
 * Tarjeta de testimonio.
 *
 * SEGURIDAD: cualquier visitante puede escribir en la colección `testimonios`
 * (así lo exigen las reglas del negocio), por lo que `nombreCliente` y
 * `comentario` son texto NO confiable. Aquí se pintan SOLO con `textContent`
 * — nunca con `innerHTML` — para que un comentario como `<img onerror=…>` se
 * vea como texto y no se ejecute en el navegador de los demás visitantes.
 */

export const MAX_NOMBRE_TESTIMONIO = 60;
export const MAX_COMENTARIO_TESTIMONIO = 300;

export interface TestimonioVisible {
  nombre: string;
  estrellas: number;
  comentario: string;
}

function texto(valor: unknown, maximo: number): string {
  return typeof valor === 'string' ? valor.trim().slice(0, maximo) : '';
}

/** Convierte un documento de Firestore (no confiable) en datos seguros para mostrar. */
export function normalizarTestimonio(datos: unknown): TestimonioVisible {
  const origen = (typeof datos === 'object' && datos !== null ? datos : {}) as Record<string, unknown>;
  const estrellasCrudas = Number(origen.estrellas);
  const estrellas = Number.isFinite(estrellasCrudas) ? Math.min(5, Math.max(1, Math.round(estrellasCrudas))) : 5;

  return {
    nombre: texto(origen.nombreCliente, MAX_NOMBRE_TESTIMONIO) || 'Cliente anónimo',
    estrellas,
    comentario: texto(origen.comentario, MAX_COMENTARIO_TESTIMONIO),
  };
}

export function crearTarjetaTestimonio(testimonio: TestimonioVisible): HTMLElement {
  const tarjeta = document.createElement('div');
  tarjeta.className = 'testimonio-card';

  const estrellas = document.createElement('div');
  estrellas.className = 'stars';
  estrellas.setAttribute('role', 'img');
  estrellas.setAttribute('aria-label', `${testimonio.estrellas} de 5 estrellas`);
  estrellas.textContent = '⭐'.repeat(testimonio.estrellas) + '☆'.repeat(5 - testimonio.estrellas);
  tarjeta.append(estrellas);

  if (testimonio.comentario) {
    const comentario = document.createElement('p');
    comentario.className = 'comentario';
    comentario.textContent = `"${testimonio.comentario}"`;
    tarjeta.append(comentario);
  }

  const cliente = document.createElement('p');
  cliente.className = 'cliente';
  cliente.textContent = `- ${testimonio.nombre}`;
  tarjeta.append(cliente);

  return tarjeta;
}

export function crearMensajeTestimonios(clase: 'testimonio-empty' | 'testimonio-error', mensaje: string): HTMLElement {
  const aviso = document.createElement('p');
  aviso.className = clase;
  aviso.textContent = mensaje;
  return aviso;
}
