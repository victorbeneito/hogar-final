# Recuperar contraseña de los clientes que vienen de Prestashop

**Fecha:** 27 de agosto de 2026
**Rama:** `develop`
**Estado:** implementado, pendiente de `db:push` y de probar el envío real

---

## El síntoma

Clientes antiguos entran en `/auth`, escriben la contraseña que usaban en la tienda
de Prestashop y la web responde **«Contraseña incorrecta»**. Como el formulario de login
no tenía ningún enlace de recuperación, se quedaban fuera de su cuenta y sin poder comprar.

---

## Por qué falla (esto es lo importante)

La importación (`scripts/importar-pedidos-prestashop.ts`, `ensureCustomer`) hace esto con
el campo `passwd` del CSV de clientes:

```ts
const passwordValue = normalizeText(customerRow.passwd) || "123456";
const hashedPassword = isBcryptHash(passwordValue) ? passwordValue : await bcrypt.hash(passwordValue, 10);
```

Hay tres casos y sólo uno funciona:

| Origen del hash en Prestashop | Qué se guardó | ¿Puede entrar el cliente? |
|---|---|---|
| Bcrypt `$2y$...` (PS 1.7) | el mismo hash, tal cual | **Sí.** `bcryptjs` valida `$2y$` sin problema (verificado) |
| md5 legacy de PS 1.6, 32 hex | `bcrypt(md5hex)` | **No, nunca.** El hash resultante no valida la contraseña original ni la md5 |
| Sin `passwd` en el CSV | `bcrypt("123456")` | Sólo si prueba `123456` |

Es decir: **no es un fallo del login, es una pérdida irreversible del hash** para los
clientes del segundo y tercer grupo. No hay forma de recuperar sus contraseñas: la única
salida correcta es que puedan poner una nueva verificando su correo.

> **Trampa:** no «arreglar» esto tocando el login para aceptar md5. El md5 de Prestashop es
> `md5(COOKIE_KEY . password)` y ya no tenemos ni la `COOKIE_KEY` ni el md5 original: lo que
> hay en la base de datos es un bcrypt hecho *encima* del md5.

---

## Lo que se ha añadido

### Base de datos

Modelo nuevo `password_reset` en [`prisma/schema.prisma`](../prisma/schema.prisma). Guarda el
**SHA256** del token, nunca el token en claro, con caducidad y marca de uso.

```bash
npm run db:push
```

Si en producción se prefiere aplicarlo a mano, está el equivalente en
[`scripts/crear-tabla-password-reset.sql`](../scripts/crear-tabla-password-reset.sql).
Sólo crea una tabla nueva, no toca ninguna existente.

### Lógica

[`src/lib/passwordReset.ts`](../src/lib/passwordReset.ts) concentra las reglas:

- token de 32 bytes aleatorios, se guarda hasheado;
- válido **60 minutos** y de **un solo uso**;
- pedir un enlace nuevo invalida los anteriores del mismo cliente;
- máximo **3 solicitudes cada 15 minutos** por cliente, para que el formulario no se
  convierta en una máquina de mandar correos a un tercero.

### API

| Ruta | Qué hace |
|---|---|
| `POST /api/auth/recuperar` | Recibe `{ email }`, crea el token y manda el correo. **Responde siempre lo mismo**, exista la cuenta o no, para no revelar qué correos están registrados. |
| `GET /api/auth/restablecer?token=` | Comprueba el enlace al abrir la página y devuelve el email ofuscado. |
| `POST /api/auth/restablecer` | Recibe `{ token, password }`, guarda el bcrypt nuevo, gasta el token y devuelve un JWT para dejar al cliente ya dentro de su cuenta. |

Al restablecer se pone `esInvitado: false`: quien demuestra controlar el correo y elige
contraseña deja de ser un invitado, y así `/api/auth/register` no puede sobrescribir su ficha.

### Páginas

- [`/auth/recuperar`](../src/app/(public)/auth/recuperar/page.tsx) — pide el correo.
- [`/auth/restablecer`](../src/app/(public)/auth/restablecer/page.tsx) — contraseña nueva y entra directo.
- En [`/auth`](<../src/app/(public)/auth/page.tsx>) aparece **«He olvidado mi contraseña»** debajo del campo de contraseña, sólo en modo login.

### Correo

Plantilla nueva `password-reset` en [`src/lib/emailConfig.ts`](../src/lib/emailConfig.ts), con la
misma cabecera y colores que las demás. Es editable desde
**Admin → Personalizar → Correos → Recuperar contraseña**, y desde ahí se puede mandar una
prueba antes de anunciar nada a los clientes.

Variables: `{{nombre}}`, `{{email}}`, `{{resetUrl}}`, `{{minutosValidez}}`, `{{brandName}}`, `{{appUrl}}`.

---

## Cómo comprobar que funciona

1. `npm run db:push` (o el `.sql`) con la base de datos accesible.
2. Admin → Personalizar → Correos: enviar la prueba de **Recuperar contraseña**. Si no llega,
   el problema es el SMTP, no este flujo (`isEmailTransportReady` en `src/lib/emailTransport.ts`).
3. En `/auth` pulsar «He olvidado mi contraseña» con un correo real de cliente.
4. Abrir el enlace del correo: debe pedir la contraseña nueva y entrar directo en `/account`.
5. Volver a abrir **el mismo enlace**: debe decir que no es válido (un solo uso).
6. `SELECT id, clienteId, expiraEn, usadoEn FROM password_reset ORDER BY id DESC LIMIT 5;`
   El token en claro no aparece en ningún sitio, sólo su SHA256.

---

## Lo que queda por decidir

- **Avisar a los clientes migrados.** Un correo del tipo «hemos renovado la tienda, crea tu
  contraseña aquí» ahorra soporte. Se puede mandar con la plantilla actual generando un enlace
  por cliente, pero con caducidad de 60 minutos conviene enviar el aviso apuntando a
  `/auth/recuperar` en lugar de un token concreto.
- **Botón en el admin** («enviar enlace de recuperación» en la ficha del cliente) para atender
  por teléfono a quien dice que no le llega el correo. No está hecho.
- Limpieza periódica de `password_reset` (borrar filas caducadas de hace más de X días).
  Hoy la tabla sólo crece, aunque las filas son mínimas.
