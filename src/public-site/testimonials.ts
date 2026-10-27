import { addDoc, collection, getDocs, limit, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { queryEl } from '../utils/dom';
import type { NuevoTestimonioInput, TestimonioConId } from '../types/testimonio';

const MAX_COMENTARIO = 300;
const MAX_TESTIMONIOS_MOSTRADOS = 6;

async function cargarTestimonios(grid: HTMLElement): Promise<void> {
  try {
    const testimoniosRef = collection(db, 'testimonios');
    const q = query(testimoniosRef, orderBy('fecha', 'desc'), limit(MAX_TESTIMONIOS_MOSTRADOS));
    const snapshot = await getDocs(q);

    grid.innerHTML = '';

    if (snapshot.empty) {
      grid.innerHTML = '<div class="testimonio-empty">Sé el primero en dejar tu opinión</div>';
      return;
    }

    snapshot.forEach((doc) => {
      const data = doc.data() as TestimonioConId;
      const nombre = data.nombreCliente || 'Cliente anónimo';
      const rating = data.estrellas || 5;
      const comentario = data.comentario || '';

      let starsHTML = '';
      for (let i = 1; i <= 5; i++) {
        starsHTML += i <= rating ? '⭐' : '☆';
      }

      const card = document.createElement('div');
      card.className = 'testimonio-card';
      card.innerHTML = `
        <div class="stars" aria-label="${rating} estrellas">${starsHTML}</div>
        ${comentario ? `<p class="comentario">"${comentario}"</p>` : ''}
        <p class="cliente">- ${nombre}</p>
      `;
      grid.appendChild(card);
    });
  } catch (error) {
    console.error('Error al cargar testimonios:', error);
    grid.innerHTML = '<p style="text-align: center; color: #d84315;">No se pudieron cargar los testimonios.</p>';
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
  const btnEnviarTestimonio = queryEl<HTMLButtonElement>('btn-enviar-testimonio');
  const inputNombre = queryEl<HTMLInputElement>('testimonio-nombre');
  const inputComentario = queryEl<HTMLTextAreaElement>('testimonio-comentario');
  const charCount = queryEl<HTMLElement>('char-count');

  let currentRating = 0;

  if (testimoniosGrid) {
    void cargarTestimonios(testimoniosGrid);
  }

  const updateStarsUI = (rating: number): void => {
    starsIcons.forEach((star) => {
      const val = Number(star.getAttribute('data-value'));
      if (val <= rating) {
        star.classList.add('selected');
        star.textContent = '★';
      } else {
        star.classList.remove('selected');
        star.textContent = '☆';
      }
    });
  };

  if (btnCalificar && modalTestimonio && btnCerrarTestimonio && formTestimonio && charCount && starError) {
    btnCalificar.addEventListener('click', () => {
      modalTestimonio.classList.remove('hidden');
    });

    btnCerrarTestimonio.addEventListener('click', () => {
      modalTestimonio.classList.add('hidden');
      formTestimonio.reset();
      currentRating = 0;
      updateStarsUI(0);
      charCount.textContent = String(MAX_COMENTARIO);
      starError.classList.add('hidden');
    });

    modalTestimonio.addEventListener('click', (e) => {
      if (e.target === modalTestimonio) btnCerrarTestimonio.click();
    });
  }

  if (inputComentario && charCount) {
    inputComentario.addEventListener('input', () => {
      charCount.textContent = String(MAX_COMENTARIO - inputComentario.value.length);
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

      if (currentRating === 0) {
        starError.classList.remove('hidden');
        return;
      }

      const nombreVal = inputNombre?.value.trim() || 'Cliente anónimo';
      const comentarioVal = inputComentario?.value.trim() || '';

      btnEnviarTestimonio.disabled = true;
      btnEnviarTestimonio.textContent = 'Enviando...';

      try {
        await guardarTestimonio({
          nombreCliente: nombreVal,
          estrellas: currentRating,
          comentario: comentarioVal,
        });

        btnEnviarTestimonio.textContent = '¡Gracias por tu opinión!';
        void cargarTestimonios(testimoniosGrid);

        setTimeout(() => {
          btnCerrarTestimonio?.click();
          btnEnviarTestimonio.disabled = false;
          btnEnviarTestimonio.textContent = 'Enviar calificación';
        }, 2000);
      } catch (error) {
        console.error('Error al guardar testimonio:', error);
        alert('Ocurrió un error al enviar tu calificación. Por favor intenta de nuevo.');
        btnEnviarTestimonio.disabled = false;
        btnEnviarTestimonio.textContent = 'Enviar calificación';
      }
    });
  }
}
