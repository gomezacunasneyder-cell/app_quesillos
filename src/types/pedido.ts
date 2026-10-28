/**
 * Tipos del dominio "pedido". Reflejan exactamente los campos que ya se
 * guardan hoy en la colección `pedidos` de Firestore — no se modifica el
 * esquema, solo se tipa lo existente.
 */

export type TipoEntrega = 'domicilio' | 'recoge';

export type MetodoPago = 'transferencia';

/**
 * Estado del pedido. 'pendiente' es el único estado usado hasta la Fase 5.
 * Los demás se incorporan en la Fase 6 (flujo de estados en el panel admin).
 * Definirlos ya en el tipo no cambia ningún comportamiento actual.
 */
export type EstadoPedido =
  | 'pendiente'
  | 'en_preparacion'
  | 'en_camino' // solo tipoEntrega === 'domicilio'
  | 'listo_para_recoger' // solo tipoEntrega === 'recoge'
  | 'entregado';

export interface Ubicacion {
  lat: number;
  lng: number;
}

export interface Pedido {
  nombreCliente: string;
  telefono: string;
  cantidad: number;
  total: number;
  anticipo: number;
  tipoEntrega: TipoEntrega;
  metodoPago: MetodoPago;
  estado: EstadoPedido;
  numeroFactura: string;
  /** Firestore Timestamp (serverTimestamp() al crear, Timestamp al leer). */
  fechaCreacion: unknown;
  /** Se asigna (Fase 6) cuando el admin marca el pedido como 'entregado'. */
  fechaEntrega?: unknown;
  ubicacion?: Ubicacion;
  direccionTexto?: string;
}

/** Pedido ya leído de Firestore, con su id de documento. */
export interface PedidoConId extends Pedido {
  id: string;
}

/** Datos necesarios para crear un pedido nuevo. El anticipo, el método de
 * pago, el estado inicial y el número de factura los asigna la capa de
 * dominio (OrderRepository + PaymentProvider), no quien llama. */
export interface NuevoPedidoInput {
  nombreCliente: string;
  telefono: string;
  cantidad: number;
  total: number;
  tipoEntrega: TipoEntrega;
  ubicacion?: Ubicacion;
  direccionTexto?: string;
}
