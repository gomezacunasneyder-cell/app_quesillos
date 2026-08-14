# Quesillos Emmanuel — Página web + sistema de pedidos

Documento guía de arquitectura para desarrollo con **Antigravity**. Este README define el alcance, la estructura, el modelo de datos y el orden de implementación por fases. Cada fase debe completarse y probarse antes de pasar a la siguiente.

---

## 1. Descripción general del proyecto

Página web con dos partes:

1. **Sitio público**: landing publicitaria + formulario de toma de pedidos para clientes.
2. **Panel administrativo**: acceso privado y exclusivo para el vendedor (con login), donde gestiona pedidos, entregas, ventas y ganancias. Es una app separada del sitio público, no una sección más de la landing — el cliente nunca debe poder llegar a ella.

**Regla de negocio central**: los quesillos se venden **sobre pedido**, con un anticipo del **50%** pagado por transferencia. No hay pago en efectivo ni compra inmediata de stock.

**Producto**: Quesillo Quesillos Emmanuel — 1kg 200g, 8 porciones, $28.000 COP.

---

## 2. Stack técnico

| Capa | Tecnología |
|---|---|
| Frontend público | HTML, CSS, JavaScript (mobile-first, responsive) |
| Panel administrativo | HTML, CSS, JavaScript, empaquetado como **PWA** (instalable en el celular) |
| Backend / datos | Firebase (Firestore + Firebase Authentication) |
| Repositorio | GitHub (Antigravity trabaja directamente sobre el repo) |

---

## 3. Identidad visual

**Nombre de marca**: Quesillos Emmanuel

**Paleta "Menta Fresca & Lavanda"**

| Rol | Color | Hex |
|---|---|---|
| Principal / Botones (CTA) | Verde menta | `#5B9AA0` / `#A8D8C8` |
| Fondo principal | Blanco puro | `#FFFFFF` |
| Fondo testimonios / detalles | Lavanda pastel | `#EAE6F2` |
| Textos y footer | Azul pizarra oscuro | `#2C3A47` |
| Acento en etiquetas | Púrpura pastel | `#A288E3` |

**Tipografía y tono**: sentence case, cálido, cercano, sabor tradicional/casero.

---

## 4. Estructura del sitio público (landing)

Diseño **mobile-first**, con **menú hamburguesa** para navegación (anclas: Inicio, Nosotros, Producto, Testimonios, Contacto).

### 4.1 Hero (sección inicial)
- Carrusel de imágenes del quesillo (fotos ya proporcionadas)
- Frase principal: **"Tu antojo tiene nombre: quesillo."**
- Botón **"Hacer pedido"** → scroll a sección Producto

### 4.2 Nosotros
- Fotos del proceso/marca
- Texto:
  - 🍮 Nosotros — historia de Quesillos Emmanuel
  - ❤️ Nuestra misión
  - ✨ Nuestra visión

### 4.3 Producto
- Fotos del quesillo
- Ficha: 1kg 200g, 8 porciones, saludable, $28.000
- Botón **"Añadir al carrito"** → despliega formulario de pedido

### 4.4 Formulario de pedido (carrito)
Campos:
- Nombre del cliente
- Teléfono de contacto
- Cantidad
- Tipo de entrega: `Domicilio` / `Recoger en tienda`
  - Si es **Domicilio** → se activa captura de ubicación (coordenadas GPS/Google Maps), al final del formulario
  - Si es **Recoger en tienda** → no se solicita ubicación
- Método de pago: **Transferencia** (único método, por ser venta sobre pedido con anticipo)
- Texto visible y corto sobre política de anticipo (ej. "Se requiere un anticipo del 50% para confirmar el pedido. El anticipo no es reembolsable si el pedido se cancela.")
- Botón **"Comprar"**

**Al confirmar la compra ocurre lo siguiente:**
1. Se muestra al cliente un mensaje de confirmación visible en pantalla (ej. "¡Pedido recibido! Te redirigiremos a WhatsApp para confirmar.") — esto evita doble clic / pedidos duplicados.
2. Se genera una **factura** con fecha, hora (zona horaria Colombia, `America/Bogota`), datos del pedido y método de pago.
3. Se guarda el pedido en Firestore (dispara notificación en tiempo real al panel del vendedor).
4. Se redirige automáticamente a WhatsApp (`+57 3227068624`) con mensaje pre-escrito con el resumen del pedido, como doble confirmación.

### 4.5 Testimonios
- Botón **"Calificar"** dentro de esta misma sección
- Selector de estrellas (1 a 5)
- Campo de comentario (opcional)
- Al enviar, se guarda en Firestore y se muestra públicamente en esta sección

### 4.6 Footer
- Contacto, WhatsApp, redes sociales

---

## 5. Panel administrativo (vendedor) — app separada, con login

Acceso restringido mediante **Firebase Authentication** (correo/contraseña). Nadie sin credenciales puede ver esta información. Empaquetado como **PWA** para instalarse en el inicio del celular.

### 5.1 Login
- Pantalla de inicio de sesión (correo + contraseña) antes de mostrar cualquier dato.

### 5.2 Notificaciones en tiempo real
- Mediante `onSnapshot` de Firestore: cuando entra un pedido nuevo, se muestra un indicador visual (ej. "🔔 Tienes pedidos pendientes") sin necesidad de recargar la página.

### 5.3 Pedidos pendientes por entregar
Por cada pedido pendiente se muestra:
- Nombre del cliente, hora del pedido, tipo de entrega
- Si es domicilio → botón **"Cómo llegar"** (abre Google Maps con las coordenadas capturadas)
- Botón **"Pedido entregado"** → cambia el estado y mueve el pedido al historial correspondiente

### 5.4 Historiales (dos, separados)
1. Historial de domicilios entregados
2. Historial de recogidas en tienda

### 5.5 Ventas y ganancias
- Resumen por día de la semana (lunes a domingo): nombre del cliente, hora del pedido, cantidad de pedidos ese día
- Totales de ganancias **semanales** y **mensuales**

---

## 6. Modelo de datos (Firestore)

### Colección: `pedidos`

| Campo | Tipo | Descripción |
|---|---|---|
| `nombreCliente` | string | Nombre del cliente |
| `telefono` | string | Teléfono de contacto |
| `cantidad` | number | Cantidad de quesillos |
| `total` | number | Valor total del pedido |
| `anticipo` | number | 50% del total |
| `tipoEntrega` | string | `"domicilio"` \| `"recoge"` |
| `ubicacion` | map | `{ lat, lng }` — solo si `tipoEntrega = "domicilio"` |
| `direccionTexto` | string | Referencia escrita (opcional) |
| `metodoPago` | string | `"transferencia"` (fijo) |
| `estado` | string | `"pendiente"` \| `"entregado"` \| `"cancelado"` |
| `fechaCreacion` | timestamp | Generado automáticamente por Firestore |
| `numeroFactura` | string | Consecutivo generado al confirmar |

### Colección: `testimonios`

| Campo | Tipo | Descripción |
|---|---|---|
| `nombreCliente` | string | Opcional/anónimo |
| `estrellas` | number | 1 a 5 |
| `comentario` | string | Opcional |
| `fecha` | timestamp | Fecha del testimonio |

### Colección: `ventas_resumen` *(opcional — decisión técnica a definir en Fase 7)*

| Campo | Tipo | Descripción |
|---|---|---|
| `fecha` | string | `"2026-08-13"` |
| `totalVentasDia` | number | Suma del día |
| `cantidadPedidosDia` | number | Conteo del día |

> Nota: puede calcularse "al vuelo" filtrando la colección `pedidos` por fecha, sin esta colección extra. Evaluar trade-off simplicidad vs. velocidad de carga al llegar a esta fase.

---

## 7. Seguridad y buenas prácticas (no negociable)

Estos puntos deben implementarse junto con las fases correspondientes, no dejarse para el final:

1. **Firestore Security Rules**: el público solo puede *crear* documentos en `pedidos` y `testimonios`, nunca leerlos, editarlos ni borrarlos. Solo un usuario autenticado (el vendedor) puede leer y actualizar `pedidos`.
2. **Firebase Authentication obligatoria** en el panel administrativo — ninguna vista de pedidos, direcciones o ventas debe ser accesible sin login.
3. **Validación de formulario**: teléfono con formato válido, cantidad mínima 1, ningún campo obligatorio vacío antes de permitir "Comprar".
4. **Zona horaria**: convertir los `timestamp` (UTC) a hora de Colombia (`America/Bogota`) en toda la interfaz y en la factura.
5. **Estado "cancelado"**: para pedidos que no completan el anticipo, evitando que queden como "pendiente" indefinidamente.
6. **Confirmación visual inmediata** al cliente tras dar clic en "Comprar", antes de redirigir a WhatsApp.
7. **Optimización de imágenes**: comprimir todas las fotos antes de subirlas al proyecto, para carga rápida en móvil.
8. **Política de anticipo visible** en el formulario, en una línea corta y clara.
9. **SEO básico**: título, meta descripción y Open Graph tags para que el link se vea bien al compartirse en WhatsApp/redes.
10. **Manejo de errores de red**: si falla el guardado en Firestore, mostrar aviso claro al cliente en vez de dejar la pantalla cargando indefinidamente.
11. **Configuración de Firebase**: mantener las claves en un archivo de configuración separado y ordenado dentro del repo (no mezcladas dentro de la lógica de la app), siguiendo buenas prácticas aunque las claves cliente de Firebase sean semi-públicas por diseño.
12. **Accesibilidad básica**: texto alternativo en imágenes del carrusel, contraste de texto legible (revisar especialmente texto sobre fondo lavanda claro).

---

## 8. Fases de desarrollo

Cada fase se implementa, se prueba y se confirma con Steven antes de avanzar a la siguiente. Los pasos que involucren conexión real a Firebase se coordinan aparte (Steven enviará capturas de su consola de Firebase cuando se llegue a esa fase).

- **Fase 1** — Landing estática: Hero, Nosotros, Producto, Testimonios (solo visual), Footer, menú hamburguesa, responsive. Sin conexión a Firebase todavía.
- **Fase 2** — Formulario de pedido + conexión a Firestore (guardar pedido real, incluyendo captura de ubicación condicional a "domicilio").
- **Fase 3** — Generación de factura + confirmación visual al cliente + redirección a WhatsApp con mensaje pre-escrito.
- **Fase 4** — Sistema de testimonios (guardar calificación + comentario, mostrarlos en la sección).
- **Fase 5** — Panel administrativo: login con Firebase Authentication, lista de pedidos, notificaciones en tiempo real.
- **Fase 6** — Panel de entregas: botón "Cómo llegar", botón "Pedido entregado", los dos historiales separados (domicilio / recoge).
- **Fase 7** — Panel de ventas y ganancias: resumen por día, totales semanales y mensuales.
- **Fase 8** — Conversión del panel administrativo a PWA (manifest, service worker, íconos).
- **Fase 9** — Seguridad y optimización: Firestore Security Rules, validaciones de formulario, zona horaria, compresión de imágenes, SEO, manejo de errores, accesibilidad (ver sección 7 completa).

---

## 9. Contacto de negocio

- WhatsApp para pedidos y confirmación: **+57 3227068624**
- Marca: Quesillos Emmanuel