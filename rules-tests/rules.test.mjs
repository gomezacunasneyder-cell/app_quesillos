// Pruebas de las reglas de Firestore (docs/firestore.rules) contra el EMULADOR.
// No usan tu proyecto real de Firebase: el proyecto es "demo-quesillos".
import { readFileSync } from 'node:fs';
import { after, before, beforeEach, describe, it } from 'node:test';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';

const UID_VENDEDOR = 'uid-vendedor';
const reglas = readFileSync(new URL('../docs/firestore.rules', import.meta.url), 'utf8').replace(
  'PEGAR_UID_DEL_VENDEDOR',
  UID_VENDEDOR,
);

let env;

const pedidoValido = (extra = {}) => ({
  nombreCliente: 'María Pérez',
  telefono: '3001234567',
  cantidad: 2,
  total: 56000,
  anticipo: 28000,
  tipoEntrega: 'domicilio',
  metodoPago: 'transferencia',
  estado: 'pendiente',
  fechaCreacion: serverTimestamp(),
  numeroFactura: 'FAC-1',
  ubicacion: { lat: 7.8391, lng: -72.5051 },
  direccionTexto: 'Apto 101',
  ...extra,
});

const testimonioValido = (extra = {}) => ({
  nombreCliente: 'Ana',
  estrellas: 5,
  comentario: 'Muy rico',
  fecha: serverTimestamp(),
  ...extra,
});

const visitante = () => env.unauthenticatedContext().firestore();
const cliente = () => env.authenticatedContext('uid-cliente-cualquiera', { email: 'cliente@example.com' }).firestore();
const vendedor = () => env.authenticatedContext(UID_VENDEDOR).firestore();

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-quesillos',
    firestore: { rules: reglas, host: '127.0.0.1', port: 8080 },
  });
});

after(async () => env.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  // Un pedido ya existente para probar lectura/actualización.
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'pedidos/p1'), {
      ...pedidoValido(),
      fechaCreacion: new Date(),
    });
  });
});

describe('pedidos: crear', () => {
  it('un visitante sin cuenta puede crear un pedido válido (domicilio)', async () => {
    await assertSucceeds(addDoc(collection(visitante(), 'pedidos'), pedidoValido()));
  });

  it('un visitante puede crear un pedido para recoger (sin ubicación)', async () => {
    const p = pedidoValido({ tipoEntrega: 'recoge' });
    delete p.ubicacion;
    delete p.direccionTexto;
    await assertSucceeds(addDoc(collection(visitante(), 'pedidos'), p));
  });

  it('rechaza un total manipulado', async () => {
    await assertFails(addDoc(collection(visitante(), 'pedidos'), pedidoValido({ total: 1000, anticipo: 500 })));
  });

  it('rechaza un anticipo manipulado', async () => {
    await assertFails(addDoc(collection(visitante(), 'pedidos'), pedidoValido({ anticipo: 1 })));
  });

  it('rechaza cantidad negativa, cero o mayor a 20', async () => {
    for (const cantidad of [-5, 0, 21]) {
      await assertFails(addDoc(collection(visitante(), 'pedidos'), pedidoValido({ cantidad, total: cantidad * 28000, anticipo: (cantidad * 28000) / 2 })));
    }
  });

  it('rechaza crear un pedido ya en estado "entregado"', async () => {
    await assertFails(addDoc(collection(visitante(), 'pedidos'), pedidoValido({ estado: 'entregado' })));
  });

  it('rechaza teléfonos inválidos', async () => {
    await assertFails(addDoc(collection(visitante(), 'pedidos'), pedidoValido({ telefono: '123' })));
  });

  it('rechaza campos extra no previstos', async () => {
    await assertFails(addDoc(collection(visitante(), 'pedidos'), pedidoValido({ esAdmin: true })));
  });

  it('rechaza una fecha de creación falsificada', async () => {
    await assertFails(addDoc(collection(visitante(), 'pedidos'), pedidoValido({ fechaCreacion: new Date('2020-01-01') })));
  });
});

describe('pedidos: leer, actualizar y borrar', () => {
  it('un visitante NO puede leer pedidos', async () => {
    await assertFails(getDocs(collection(visitante(), 'pedidos')));
    await assertFails(getDoc(doc(visitante(), 'pedidos/p1')));
  });

  it('una cuenta de cliente cualquiera NO puede leer pedidos', async () => {
    await assertFails(getDocs(collection(cliente(), 'pedidos')));
    await assertFails(getDoc(doc(cliente(), 'pedidos/p1')));
  });

  it('el vendedor SÍ puede leer pedidos', async () => {
    await assertSucceeds(getDocs(collection(vendedor(), 'pedidos')));
    await assertSucceeds(getDoc(doc(vendedor(), 'pedidos/p1')));
  });

  it('el vendedor puede cambiar el estado y poner fechaEntrega', async () => {
    await assertSucceeds(updateDoc(doc(vendedor(), 'pedidos/p1'), { estado: 'en_preparacion' }));
    await assertSucceeds(updateDoc(doc(vendedor(), 'pedidos/p1'), { estado: 'entregado', fechaEntrega: serverTimestamp() }));
  });

  it('el vendedor NO puede cambiar el total ni otros campos', async () => {
    await assertFails(updateDoc(doc(vendedor(), 'pedidos/p1'), { total: 1 }));
    await assertFails(updateDoc(doc(vendedor(), 'pedidos/p1'), { estado: 'entregado', nombreCliente: 'Otro' }));
  });

  it('el vendedor NO puede poner un estado inventado', async () => {
    await assertFails(updateDoc(doc(vendedor(), 'pedidos/p1'), { estado: 'gratis' }));
  });

  it('visitantes y clientes NO pueden actualizar pedidos', async () => {
    await assertFails(updateDoc(doc(visitante(), 'pedidos/p1'), { estado: 'entregado' }));
    await assertFails(updateDoc(doc(cliente(), 'pedidos/p1'), { estado: 'entregado' }));
  });

  it('nadie puede borrar pedidos (ni el vendedor)', async () => {
    await assertFails(deleteDoc(doc(visitante(), 'pedidos/p1')));
    await assertFails(deleteDoc(doc(cliente(), 'pedidos/p1')));
    await assertFails(deleteDoc(doc(vendedor(), 'pedidos/p1')));
  });
});

describe('testimonios', () => {
  it('cualquiera puede leer testimonios', async () => {
    await assertSucceeds(getDocs(collection(visitante(), 'testimonios')));
  });

  it('un visitante puede crear un testimonio válido (con y sin comentario)', async () => {
    await assertSucceeds(addDoc(collection(visitante(), 'testimonios'), testimonioValido()));
    await assertSucceeds(addDoc(collection(visitante(), 'testimonios'), testimonioValido({ comentario: '' })));
  });

  it('rechaza estrellas fuera de 1 a 5', async () => {
    for (const estrellas of [0, 6, -1, 4.5]) {
      await assertFails(addDoc(collection(visitante(), 'testimonios'), testimonioValido({ estrellas })));
    }
  });

  it('rechaza comentarios o nombres demasiado largos', async () => {
    await assertFails(addDoc(collection(visitante(), 'testimonios'), testimonioValido({ comentario: 'x'.repeat(301) })));
    await assertFails(addDoc(collection(visitante(), 'testimonios'), testimonioValido({ nombreCliente: 'x'.repeat(61) })));
  });

  it('visitantes y clientes NO pueden editar ni borrar testimonios; el vendedor sí', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'testimonios/t1'), { nombreCliente: 'Ana', estrellas: 5, comentario: 'ok', fecha: new Date() });
    });
    await assertFails(updateDoc(doc(visitante(), 'testimonios/t1'), { estrellas: 1 }));
    await assertFails(deleteDoc(doc(cliente(), 'testimonios/t1')));
    await assertSucceeds(deleteDoc(doc(vendedor(), 'testimonios/t1')));
  });
});

describe('otras colecciones', () => {
  it('cualquier otra colección está denegada, incluso para el vendedor', async () => {
    await assertFails(getDocs(collection(visitante(), 'usuarios')));
    await assertFails(setDoc(doc(vendedor(), 'otra/x'), { a: 1 }));
  });
});
