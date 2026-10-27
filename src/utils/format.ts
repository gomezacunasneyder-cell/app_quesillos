/** Formato de moneda colombiana, usado en el formulario, la factura y el panel admin. */
export const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

/** Formato de fecha/hora en zona horaria de Bogotá, usado en el panel admin. */
export const bogotaDateTimeFormatter = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'America/Bogota',
});

/** Igual al anterior, pero con el formato de texto plano usado en la factura visual. */
export function formatFacturaDate(date: Date): string {
  return date.toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/** Firestore Timestamp mínimo (evita depender del SDK solo para el tipo). */
interface FirestoreTimestampLike {
  toDate: () => Date;
}

function isFirestoreTimestamp(value: unknown): value is FirestoreTimestampLike {
  return (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as FirestoreTimestampLike).toDate === 'function'
  );
}

export function formatTimestamp(value: unknown): string {
  if (!isFirestoreTimestamp(value)) return 'Fecha no disponible';
  return bogotaDateTimeFormatter.format(value.toDate());
}
