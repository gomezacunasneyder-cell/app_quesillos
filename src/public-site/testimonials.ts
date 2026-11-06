import { addDoc, collection, getDocs, limit, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { queryEl } from '../utils/dom';
import { conTiempoLimite } from '../utils/async';
import { abrirModal } from '../utils/modal';
import type { NuevoTestimonioInput } from '../types/testimonio';
import {
  crearMensajeTestimonios,
  crearTarjetaTestimonio,
  MAX_COMENTARIO_TESTIMONIO,
  MAX_NOMBRE_TESTIMONIO,
  normalizarTestimonio,
} from './testimonialCard';

const MAX_TESTIMONIOS_MOSTRADOS = 6;
const TIEMPO_MAX_GUARDADO_MS = 15000;

async function cargarTestimonios(grid: HTMLElement): Promise<void> {
  try {
    const testimoniosRef = collection(db, 'testimonios');
    const q = query(testimoniosRef, orderBy('fecha', 'desc'), limit(MAX_TESTIMONIOS_MOSTRADOS));
    const snapshot = await conTiempoLimite(getDocs(q), TIEMPO_MAX_GUARDADO_MS);

    if (snapshot.empty) {
      grid.replaceChildren(crearMensajeTestimonios('testimonio-empty', 'Sé el primero en dejar tu opinión'));
      return;
    }

    // Los datos vienen de Firestore y cualquiera puede escribirlos: se
    // normalizan y se pintan solo como texto (ver testimonialCard.ts).
    grid.replaceChildren(...snapshot.docs.map((doc) => crearTarjetaTestimonio(normalizarTestimonio(doc.data()))));
  } catch (error) {
    console.error('Error al cargar testimonios:', error);
    grid.replaceChildren(crearMensajeTestimonios('testimonio-error', 'No se pudieron cargar los testimonios.'));
  }
}

async function guardarTestimonio(input: NuevoTestimonioInput): Promise<void> {
  await addDoc(collection(db, 'testimonios'), {
    ...input,
    fecha: serverTimestamp(),
  });
}

export function initTestimonials(): void {
  const testimoniosGrid = queryEl<HTMLElement>('testimonios-grid');
  const btnCalificar = queryEl<HTMLButtonElement>('btn-calificar');
  const modalTestimonio = queryEl<HTMLElement>('modal-testimonio');
  const formTestimonio = queryEl<HTMLFormElement>('form-testimonio');
  const btnCerrarTestimonio = queryEl<HTMLButtonElement>('btn-cerrar-testimonio');
  const starSelector = queryEl<HTMLElement>('star-selector');
  const starsIcons = starSelector ? Array.from(starSelector.querySelectorAll<HTMLElement>('.star-icon')) : [];
  const starError = queryEl<HTMLElement>('star-error');
  const errorEnvio = queryEl<HTMLElement>('testimonio-error');
  const btnEnviarTestimonio = queryEl<HTMLButtonElement>('btn-enviar-testimonio');
  const inputNombre = queryEl<HTMLInputElement>('testimonio-nombre');
  const inputComentario = queryEl<HTMLTextAreaElement>('testimonio-comentario');
  const charCount = queryEl<HTMLElement>('char-count');

  let currentRating = 0;
  let cerrarModal: (() => void) | null = null;
  let enviando = false;

  if (testimoniosGrid) {
    void cargarTestimonios(testimoniosGrid);
  }

  const updateStarsUI = (rating: number): void => {
    starsIcons.forEach((star) => {
      const val = Number(star.getAttribute('data-value'));
      const seleccionada = val <= rating;
      star.classList.toggle('selected', seleccionada);
      star.textContent = seleccionada ? '★' : '☆';
      star.setAttribute('aria-pressed', String(val === rating));
    });
  };

  const reiniciarFormulario = (): void => {
    formTestimonio?.reset();
    currentRating = 0;
    updateStarsUI(0);
    if (charCount) charCount.textContent = String(MAX_COMENTARIO_TESTIMONIO);
    starError?.classList.add('hidden');
    if (errorEnvio) errorEnvio.hidden = true;
  };

  if (btnCalificar && modalTestimonio && btnCerrarTestimonio && formTestimonio && charCount && starError) {
    btnCalificar.addEventListener('click', () => {
      cerrarModal = abrirModal(modalTestimonio, {
        enfocar: starsIcons[0] ?? null,
        puedeCerrar: () => !enviando,
        alCerrar: reiniciarFormulario,
      });
    });

    btnCerrarTestimonio.addEventListener('click', () => {
      if (!enviando) cerrarModal?.();
    });

    modalTestimonio.addEventListener('click', (e) => {
      if (e.target === modalTestimonio && !enviando) cerrarModal?.();
    });
  }

  if (inputNombre) inputNombre.maxLength = MAX_NOMBRE_TESTIMONIO;

  if (inputComentario && charCount) {
    inputComentario.addEventListener('input', () => {
      charCount.textContent = String(MAX_COMENTARIO_TESTIMONIO - inputComentario.value.length);
    });
  }

  if (starsIcons.length > 0) {
    starsIcons.forEach((star) => {
      star.addEventListener('mouseover', () => {
        const hoverVal = Number(star.getAttribute('data-value'));
        starsIcons.forEach((s) => {
          const val = Number(s.getAttribute('data-value'));
          s.classList.toggle('active', val <= hoverVal);
        });
      });

      star.addEventListener('mouseout', () => {
        starsIcons.forEach((s) => s.classList.remove('active'));
      });

      star.addEventListener('click', () => {
        currentRating = Number(star.getAttribute('data-value'));
        updateStarsUI(currentRating);
        starError?.classList.add('hidden');
      });
    });
  }

  if (formTestimonio && starError && btnEnviarTestimonio && testimoniosGrid) {
    formTestimonio.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (enviando) return;
      if (errorEnvio) errorEnvio.hidden = true;

      if (currentRating === 0) {
        starError.classList.remove('hidden');
        starsIcons[0]?.focus();
        return;
      }

      const nombreVal = (inputNombre?.value ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_NOMBRE_TESTIMONIO) || 'Cliente anónimo';
      const comentarioVal = (inputComentario?.value ?? '').trim().slice(0, MAX_COMENTARIO_TESTIMONIO);

      enviando = true;
      btnEnviarTestimonio.disabled = true;
      btnEnviarTestimonio.textContent = 'Enviando...';

      try {
        await conTiempoLimite(
          guardarTestimonio({
            nombreCliente: nombreVal,
            estrellas: currentRating,
            comentario: comentarioVal,
          }),
          TIEMPO_MAX_GUARDADO_MS,
        );

        btnEnviarTestimonio.textContent = '¡Gracias por tu opinión!';
        void cargarTestimonios(testimoniosGrid);

        setTimeout(() => {
          enviando = false;
          cerrarModal?.();
          btnEnviarTestimonio.disabled = false;
          btnEnviarTestimonio.textContent = 'Enviar calificación';
        }, 2000);
      } catch (error) {
        console.error('Error al guardar testimonio:', error);
        enviando = false;
        if (errorEnvio) {
          errorEnvio.textContent = 'No pudimos enviar tu calificación. Revisa tu conexión e inténtalo de nuevo.';
          errorEnvio.hidden = false;
        }
        btnEnviarTestimonio.disabled = false;
        btnEnviarTestimonio.textContent = 'Enviar calificación';
      }
    });
  }
}
