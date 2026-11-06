# Seguridad y puesta en producción — Quesillos Emmanuel

Este documento resume qué se protegió en el código (Fase 9) y qué **no se puede
resolver desde el código** y requiere cambios en la consola de Firebase o en el
hosting. Esos cambios no se aplicaron: el proyecto de Firebase no se tocó.

## 1. Lo que ya está resuelto en el código

| Tema | Qué se hizo |
| --- | --- |
| XSS almacenado | Los testimonios (texto escrito por cualquiera) se pintan solo con `textContent`. Prueba automática en `testimonialCard.test.ts`. No queda ningún `innerHTML` con datos externos. |
| Validación del pedido | Celular colombiano, cantidad entera 1–20, nombre y dirección con largo máximo, domicilio con ubicación o referencia (`domain/validacionPedido.ts`). |
| Errores de red | Si Firestore no responde en 15 s se avisa con claridad y el reintento **no duplica** el pedido (`utils/async.ts`, `orderForm.ts`). |
| Pedidos manipulados | El panel recalcula con el precio real y marca con ⚠️ los pedidos cuyo total/cantidad/anticipo no cuadran (`domain/integridadPedido.ts`). |
| Pedidos cancelados | Estado `cancelado` con confirmación en dos pasos; no cuenta como venta. |
| Zona horaria | Todo en `America/Bogota`. |
| Admin fuera de buscadores | `noindex` en las páginas del panel y `Disallow: /admin/` en `robots.txt`. |
| Service worker | Nunca cachea Firestore, Auth ni otros orígenes; solo el cascarón estático del panel. |
| Claves | La configuración de Firebase está en `.env` (no se sube a git). Recuerda: las claves del cliente son públicas por diseño; **la seguridad real son las reglas de Firestore**. |

## 2. Lo más importante que falta (requiere la consola de Firebase)

### 2.1 Cualquier usuario autenticado puede leer todos los pedidos

Las reglas actuales dicen `read/update/delete: if request.auth != null`. Eso
significa **cualquier cuenta de Firebase Auth**, no solo la del vendedor. Como la
clave de la web es pública, cualquier persona puede crear una cuenta con la API
de Auth y luego leer nombres, teléfonos y direcciones de todos los clientes.

**Solución:** limitar la lectura/escritura al correo del vendedor (ver 2.3).

### 2.2 Cualquiera puede crear pedidos o testimonios con cualquier contenido

Las reglas actuales permiten `create: if true` sin validar el contenido. Alguien
podría llenar la base de datos de basura o crear pedidos con totales falsos. El
panel ya avisa de los totales raros (sección 1), pero lo correcto es rechazarlos
en el servidor.

### 2.3 Reglas recomendadas (SIN PROBAR — pruébalas antes de publicar)

> Estas reglas **no se han ejecutado** en ningún emulador ni en tu proyecto.
> Cópialas en Firebase Console → Firestore → Reglas, y usa el **Simulador de
> reglas** para comprobar: (a) crear un pedido válido como visitante, (b) crear
> un pedido con total falso (debe fallar), (c) leer pedidos sin sesión (debe
> fallar), (d) leer pedidos con tu cuenta (debe funcionar), (e) pasar un pedido a
> "entregado" con tu cuenta (debe funcionar). Cambia `CORREO_DEL_VENDEDOR`.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function esVendedor() {
      return request.auth != null
          && request.auth.token.email == 'CORREO_DEL_VENDEDOR'
          && request.auth.token.email_verified == true;
    }

    function pedidoValido(d) {
      return d.keys().hasOnly(['nombreCliente', 'telefono', 'cantidad', 'total', 'anticipo',
                               'tipoEntrega', 'metodoPago', 'estado', 'fechaCreacion',
                               'numeroFactura', 'ubicacion', 'direccionTexto'])
          && d.nombreCliente is string && d.nombreCliente.size() >= 2 && d.nombreCliente.size() <= 80
          && d.telefono is string && d.telefono.matches('^3[0-9]{9}$')
          && d.cantidad is int && d.cantidad >= 1 && d.cantidad <= 20
          && d.total == d.cantidad * 28000          // precio por quesillo
          && d.anticipo == d.total / 2
          && d.tipoEntrega in ['domicilio', 'recoge']
          && d.metodoPago == 'transferencia'
          && d.estado == 'pendiente'
          && d.fechaCreacion == request.time
          && d.numeroFactura is string && d.numeroFactura.size() <= 40
          && (!('direccionTexto' in d) || (d.direccionTexto is string && d.direccionTexto.size() <= 150))
          && (!('ubicacion' in d) || (d.ubicacion.keys().hasOnly(['lat', 'lng'])
                                      && d.ubicacion.lat is number && d.ubicacion.lng is number));
    }

    function testimonioValido(d) {
      return d.keys().hasOnly(['nombreCliente', 'estrellas', 'comentario', 'fecha'])
          && d.nombreCliente is string && d.nombreCliente.size() <= 60
          && d.estrellas is int && d.estrellas >= 1 && d.estrellas <= 5
          && d.comentario is string && d.comentario.size() <= 300
          && d.fecha == request.time;
    }

    match /pedidos/{id} {
      allow create: if pedidoValido(request.resource.data);
      allow read, update: if esVendedor();
      allow delete: if false;
    }

    match /testimonios/{id} {
      allow read: if true;
      allow create: if testimonioValido(request.resource.data);
      allow update, delete: if esVendedor();
    }
  }
}
```

Notas:
- Si cambias el precio en `src/domain/precios.ts`, cambia también `28000` aquí
  (y el máximo de 20). Son dos lugares que deben coincidir.
- `email_verified == true` exige que verifiques el correo del vendedor en
  Firebase Auth; si no lo has hecho, quita esa línea o verifícalo primero, de lo
  contrario te quedarás sin acceso al panel.
- Antes de publicar, **deja abierta otra pestaña con la consola de Firebase** para
  poder revertir las reglas si algo falla.

### 2.4 Otras mejoras recomendadas

- **Firebase App Check** (reCAPTCHA v3): reduce el spam de bots contra Firestore.
  Se activa en la consola y requiere unas pocas líneas de código; se puede
  añadir en una fase posterior.
- **Presupuesto y alertas** en Google Cloud para evitar sorpresas de facturación.
- **Contraseña fuerte y 2FA** en la cuenta de Google/Firebase del dueño del proyecto.
- **Cabeceras de seguridad** en el hosting (ejemplo para Firebase Hosting; va en
  `firebase.json`, que no se modificó):

```json
"headers": [{
  "source": "**",
  "headers": [
    { "key": "X-Content-Type-Options", "value": "nosniff" },
    { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
    { "key": "X-Frame-Options", "value": "DENY" },
    { "key": "Permissions-Policy", "value": "geolocation=(self), camera=(), microphone=()" }
  ]
}]
```
  (Se omite `Content-Security-Policy` a propósito: hay que ajustarla con cuidado
  por el mapa de Google, las fuentes y Firebase, y probarla en el sitio real.)

## 3. Variables de entorno

Ver `.env.example`. En el hosting de producción define también `VITE_SITE_URL`
con la URL real del sitio (sin `/` al final); se usa en Open Graph, `canonical`,
`robots.txt` y `sitemap.xml`. Si falta, se usa `https://quesillosemmanuel.com`.
