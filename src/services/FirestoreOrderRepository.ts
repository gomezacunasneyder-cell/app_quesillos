import { addDoc, collection, doc, onSnapshot, serverTimestamp, updateDoc, type Unsubscribe } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { PaymentProvider } from '../payments/PaymentProvider';
import type { EstadoPedido, NuevoPedidoInput, Pedido, PedidoConId } from '../types/pedido';
import type { OrderRepository } from './OrderRepository';

const COLECCION = 'pedidos';

/** Implementación de OrderRepository sobre Cloud Firestore. */
export class FirestoreOrderRepository implements OrderRepository {
  async crear(input: NuevoPedidoInput, payment: PaymentProvider): Promise<Pedido & { id: string }> {
    const numeroFactura = `FAC-${Date.now()}`;

    const pedido: Pedido = {
      nombreCliente: input.nombreCliente,
      telefono: input.telefono,
      cantidad: input.cantidad,
      total: input.total,
      anticipo: payment.calcularAnticipo(input.total),
      tipoEntrega: input.tipoEntrega,
      metodoPago: payment.metodoPago,
      estado: 'pendiente',
      fechaCreacion: serverTimestamp(),
      numeroFactura,
    };

    if (input.tipoEntrega === 'domicilio') {
      if (input.ubicacion) pedido.ubicacion = input.ubicacion;
      if (input.direccionTexto) pedido.direccionTexto = input.direccionTexto;
    }

    const ref = await addDoc(collection(db, COLECCION), pedido);
    return { ...pedido, id: ref.id };
  }

  escucharTodos(
    onChange: (pedidos: PedidoConId[]) => void,
    onError: (error: unknown) => void,
  ): Unsubscribe {
    return onSnapshot(
      collection(db, COLECCION),
      (snapshot) => {
        const pedidos = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as PedidoConId);
        onChange(pedidos);
      },
      onError,
    );
  }

  async actualizarEstado(id: string, nuevoEstado: EstadoPedido): Promise<void> {
    const cambios: Record<string, unknown> = { estado: nuevoEstado };
    if (nuevoEstado === 'entregado') {
      cambios.fechaEntrega = serverTimestamp();
    }
    await updateDoc(doc(db, COLECCION, id), cambios);
  }
}
