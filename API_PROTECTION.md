# Protección de APIs por Rol

## Resumen

Todas las operaciones de **escritura** (POST, PUT, DELETE) están protegidas por rol. Solo `admin` y `superadmin` pueden modificar datos.

Los `auditors` (profesores) solo pueden **leer** (GET).

---

## APIs Protegidas (No pueden ser modificadas por Auditor)

### Pedidos
- ✅ GET `/api/pedidos/[id]` — Ver detalles
- ❌ PUT `/api/pedidos/[id]` — **PROTEGIDO** — Editar pedido
- ❌ DELETE `/api/pedidos/[id]` — **PROTEGIDO** — Eliminar pedido
- ❌ POST `/api/pedidos` — **PROTEGIDO** — Crear pedido (con header `x-admin-create`)

### Productos
- ✅ GET `/api/admin/productos/[id]` — Ver detalles
- ❌ PUT `/api/admin/productos/[id]` — **PROTEGIDO** — Editar producto
- ❌ DELETE `/api/admin/productos/[id]` — **PROTEGIDO** — Eliminar producto
- ❌ POST `/api/admin/productos` — **PROTEGIDO** — Crear producto

### Categorías
- ✅ GET `/api/categorias/[id]` — Ver detalles
- ❌ PUT `/api/categorias/[id]` — **PROTEGIDO** — Editar categoría
- ❌ DELETE `/api/categorias/[id]` — **PROTEGIDO** — Eliminar categoría

### Marcas
- ✅ GET `/api/marcas/[id]` — Ver detalles
- ❌ PUT `/api/marcas/[id]` — **PROTEGIDO** — Editar marca
- ❌ DELETE `/api/marcas/[id]` — **PROTEGIDO** — Eliminar marca

### Atributos
- ✅ GET `/api/atributos/[id]` — Ver detalles
- ❌ PUT `/api/atributos/[id]` — **PROTEGIDO** — Editar atributo
- ❌ DELETE `/api/atributos/[id]` — **PROTEGIDO** — Eliminar atributo

### Equipo (Usuarios Admin)
- ✅ GET `/api/admin/equipo` — Ver usuarios
- ❌ POST `/api/admin/equipo` — **SOLO SUPERADMIN** — Crear usuario
- ❌ PUT `/api/admin/equipo/[id]` — **SOLO SUPERADMIN** — Editar usuario
- ❌ DELETE `/api/admin/equipo/[id]` — **SOLO SUPERADMIN** — Eliminar usuario

---

## Código de Protección

La protección se implementa con la función `canEdit()` en cada API:

```typescript
import { canEdit } from "@/lib/adminAuth";

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  // Esta línea rechaza a auditors
  if (!canEdit(req)) {
    return NextResponse.json({ ok: false, error: "No tienes permiso" }, { status: 403 });
  }

  // ... resto del código
}
```

---

## Función canEdit()

```typescript
export function canEdit(req: NextRequest): boolean {
  const admin = getAdminFromRequest(req);
  return admin?.role === "superadmin" || admin?.role === "admin";
}
```

- ✅ Retorna `true` para: **superadmin**, **admin**
- ❌ Retorna `false` para: **auditor**

---

## Flujo de Seguridad

1. **Usuario intenta DELETE** → API recibe la solicitud
2. **API llama a `canEdit(req)`** → Verifica el token
3. **Token tiene rol: "auditor"** → `canEdit()` retorna `false`
4. **API retorna 403 (No autorizado)** → Operación rechazada
5. **Cliente recibe error 403** → No se ejecuta la acción

---

## Respuesta de Error

Cuando un `auditor` intenta modificar datos:

```json
{
  "ok": false,
  "error": "No tienes permiso para eliminar pedidos"
}
```

HTTP Status: **403 Forbidden**

---

## APIs NO Protegidas (Público)

Estas APIs no requieren autenticación y no están protegidas:

- `/api/productos` — GET público
- `/api/categorias` — GET público
- `/api/carritos` — GET/POST público (carrito del cliente)
- `/api/clientes/register` — POST registro público
- `/api/auth/login` — POST login cliente
- Etc.

Solo APIs **admin** y de **modificación** están protegidas.

---

## Prueba de Seguridad

Para verificar que un auditor NO puede eliminar:

```bash
# 1. Login como auditor
curl -X POST http://localhost:3000/api/auth/admin-login \
  -H "Content-Type: application/json" \
  -d '{"email":"profesor@ejemplo.es","password":"ProfesorPassword123!"}'

# 2. Intenta eliminar un producto (fallará)
curl -X DELETE http://localhost:3000/api/admin/productos/1 \
  -H "Authorization: Bearer TOKEN_DEL_AUDITOR"

# Respuesta esperada:
# {"error":"No tienes permiso para eliminar productos","ok":false}
# Status: 403
```

---

## Adición de Nuevas Protecciones

Si agregad una nueva API de modificación en `/api`, añade la protección:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { canEdit } from "@/lib/adminAuth";

export async function POST(req: NextRequest) {
  if (!canEdit(req)) {
    return NextResponse.json({ error: "No tienes permiso" }, { status: 403 });
  }
  
  // Tu código aquí
}
```

---

## Archivos Modificados

- `src/lib/adminAuth.ts` — Función `canEdit()`
- `src/app/api/pedidos/[id]/route.ts` — Protegido PUT/DELETE
- `src/app/api/pedidos/route.ts` — Protegido POST
- `src/app/api/admin/productos/[id]/route.ts` — Protegido PUT/DELETE
- `src/app/api/categorias/[id]/route.ts` — Protegido PUT/DELETE
- `src/app/api/marcas/[id]/route.ts` — Protegido PUT/DELETE
- `src/app/api/atributos/[id]/route.ts` — Protegido PUT/DELETE
- `src/app/api/admin/equipo/[id]/route.ts` — Protegido (solo superadmin)
- `src/app/api/admin/equipo/route.ts` — Protegido POST (solo superadmin)
