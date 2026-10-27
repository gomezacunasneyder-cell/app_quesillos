export interface NuevoTestimonioInput {
  nombreCliente: string;
  estrellas: number;
  comentario: string;
}

export interface Testimonio extends NuevoTestimonioInput {
  /** Firestore Timestamp. */
  fecha: unknown;
}

export interface TestimonioConId extends Testimonio {
  id: string;
}
