import type { Unsubscribe } from 'firebase/firestore';
import type { PaymentProvider } from '../payments/PaymentProvider';
import type { EstadoPedido, NuevoPedidoInput, Pedido, PedidoConId } from '../types/pedido';

/**
 * Abstrae el acceso a datos de pedidos. El resto del código (formulario de
 * pedido, panel admin) depende de esta interfaz, no de Firestore
 * directamente — así, cambiar de proveedor de datos o testear con un doble
 * no requiere tocar la lógica de negocio (inversión de dependencias).
 */
export interface OrderRepository {
  /** Crea un pedido nuevo. El PaymentProvider decide anticipo y método de pago. */
  crear(input: NuevoPedidoInput, payment: PaymentProvider): Promise<Pedido & { id: string }>;

  /** Suscripción en tiempo real a todos los pedidos. */
  escucharTodos(
    onChange: (pedidos: PedidoConId[]) => void,
    onError: (error: unknown) => void,
  ): Unsubscribe;

  /** Avanza un pedido a un nuevo estado (lo usa solo el panel admin). */
  actualizarEstado(id: string, nuevoEstado: EstadoPedido): Promise<void>;
}
