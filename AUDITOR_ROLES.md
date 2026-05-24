# Sistema de Roles - Administración

El panel de administración tiene **3 roles diferentes**:

## 1️⃣ SuperAdmin
- **Acceso completo** a todo el sistema
- Crear, editar y eliminar usuarios
- Acceder a Configuración Avanzada y Equipo
- Gestionar todo tipo de datos

## 2️⃣ Admin
- **Acceso casi completo**
- Crear, editar y eliminar: pedidos, productos, clientes, etc.
- ❌ No puede crear/editar/eliminar usuarios
- ❌ No puede acceder a Equipo (gestión de usuarios)
- ❌ No puede acceder a Configuración Avanzada

## 3️⃣ Auditor (Profesor)
- **Solo lectura** - puede ver todo pero no editar
- Ver pedidos, productos, clientes, etc.
- ❌ No puede crear, editar ni eliminar nada
- ❌ No ve el menú "PERSONALIZAR"
- ❌ No ve el menú "PARÁMETROS AVANZADOS"
- ❌ No puede acceder a Equipo

---

## Crear usuario Auditor para profesores

### Opción 1: Desde el panel (SuperAdmin)
1. Ve a **Parámetros Avanzados → Equipo**
2. Haz clic en **"Nuevo usuario"**
3. Rellena los datos:
   - **Nombre**: Nombre del profesor
   - **Email**: correo@profesor.es
   - **Contraseña**: Una contraseña segura
   - **Perfil**: Selecciona **Auditor**
4. Haz clic en **"Crear usuario"**

### Opción 2: Desde terminal (Script)
```bash
cd proyecto-nextjs
$env:DATABASE_URL="mysql://admin:password123@localhost:3306/mi_tienda"
npx tsx scripts/create-auditor.ts "profesor@universidad.es" "Prof. García" "MiPassword123!"
```

**Uso del script:**
```
npx tsx scripts/create-auditor.ts <email> <nombre> <password>
```

**Ejemplo:**
```
npx tsx scripts/create-auditor.ts "juan.garcia@uni.es" "Juan García" "Prof@2026!"
```

---

## Qué ve un Auditor

✅ Dashboard (estadísticas solo lectura)
✅ Pedidos (ver detalles, pero NO editar)
✅ Productos (ver catálogo, pero NO editar)
✅ Clientes (ver datos, pero NO editar)
✅ Facturas (descargar, pero NO editar)
✅ Carritos (ver, pero NO editar)

❌ No ve: PERSONALIZAR
❌ No ve: PARÁMETROS AVANZADOS
❌ No ve: Equipo (gestión de usuarios)

---

## Cambiar rol de un usuario existente

Si necesitas cambiar el rol de un usuario que ya existe:

1. **SuperAdmin accede a**: Equipo → edita el usuario
2. Cambia el **Perfil** a: Admin, SuperAdmin o Auditor
3. Guarda los cambios

---

## Seguridad en Producción

✅ Los Auditors NO pueden:
- Eliminar datos
- Modificar configuración
- Crear nuevos usuarios
- Cambiar precios
- Modificar pedidos

✅ Los datos están protegidos:
- Solo lectura en todas las páginas
- Las APIs rechazarán intentos de edición
- Los botones de edición/eliminar no se muestran

---

## Contraseñas

Asegúrate de:
1. ✅ Usar contraseñas **robustas** (mínimo 8 caracteres)
2. ✅ Compartir vía **canal seguro** (no por email claro)
3. ✅ Los usuarios pueden cambiarla en su perfil si lo necesitan
4. ✅ Cambiar la contraseña después del primer acceso
