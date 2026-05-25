# El Hogar de tus Sueños

Tienda online especializada en ropa de hogar: estores, fundas de sofá, manteles, artículos de decoración y medidas personalizadas. Arquitectura full-stack moderna con Next.js App Router, panel de administración completo y pasarelas de pago reales integradas.

**Producción:** [www.elhogardetusuenos.com](https://www.elhogardetusuenos.com)

---

## Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router) |
| Lenguaje | TypeScript 5 |
| Base de datos | MariaDB (Docker local) / Azure en producción |
| ORM | Prisma 6 |
| Estilos | Tailwind CSS 3 |
| Componentes UI | Heroicons, Lucide React, React Icons |
| Gráficas | Recharts |
| Editor de texto | Tiptap (con extensiones: color, fuentes, imágenes, links) |
| PDFs | @react-pdf/renderer |
| Estado / Caché | TanStack React Query v5 |
| Autenticación | JWT + bcryptjs + OAuth Google |
| Email | Nodemailer |
| Pasarelas de pago | Redsys (TPV virtual), PayPal SDK |
| Infraestructura local | Docker & Docker Compose |
| Despliegue | Servidor Plesk+ GitHub Actions (CI/CD) |
| Analítica | Google Analytics 4 (GA4) + tracking de tráfico propio |

---

## Funcionalidades Principales

### Tienda pública
- Catálogo de productos con filtros, ordenación y búsqueda en tiempo real
- Ficha de producto con galería de imágenes, combinaciones (tallas, colores, etc.) y vista rápida (quick view modal)
- Categorías jerárquicas con páginas SEO optimizadas
- Carrito de compra persistente con modal lateral
- Proceso de checkout multipaso: direcciones → envío → pago → confirmación
- Página de medidas personalizadas
- Sistema de cupones de descuento con validación en tiempo real
- Páginas CMS dinámicas (aviso legal, política de cookies, etc.)
- Formulario de suscripción a newsletter
- Widget de chat integrado
- Banner de cookies con gestión de consentimiento (CookieConsent)
- Traductor Google integrado (multiidioma)
- Modo oscuro / claro (next-themes)

### Pasarelas de pago integradas
- **Redsys (TPV Virtual):** tarjeta bancaria con notificación segura (redsys-easy)
- **PayPal:** flujo completo con SDK oficial (@paypal/react-paypal-js)
- **Transferencia bancaria**
- **Bizum**
- **Contrareembolso**

### Cuenta de cliente
- Registro, login y autenticación con Google OAuth
- Gestión de datos personales, email y contraseña
- Libro de direcciones múltiples
- Historial de pedidos con seguimiento de estado
- Cupones disponibles
- Preferencias de alertas y cookies

### Panel de administración (`/admin`)
- **Dashboard** con estadísticas en tiempo real: ventas, pedidos, clientes, visitas
- Gráfica de ventas por período (Recharts) con selector de rango
- Widget de tráfico propio + integración Google Analytics GA4
- Tabla de últimos pedidos y clientes
- Gestión completa de **productos**: creación, edición por tabs (básicos, precio, combinaciones, opciones, SEO, transporte), duplicar, activar/desactivar
- Gestión de **categorías** con árbol jerárquico
- Gestión de **marcas**
- Gestión de **atributos** y valores (tallas, colores, materiales...)
- Gestión de **pedidos**: estados configurables, mensajes internos, referencia automática
- Creación manual de pedidos desde admin
- **Facturas** en PDF: generación individual y batch, configuración de datos fiscales
- Gestión de **clientes**: creación, edición, direcciones
- Gestión de **carritos** activos
- **Cupones de descuento**: creación y control de uso
- **Formas de pago**: configuración y activación/desactivación por canal
- **Transportes**: reglas de precio y configuración
- **Correos transaccionales**: plantillas editables con editor Tiptap, previsualización y configuración SMTP
- **Módulos**: activación de integraciones (Revi.io, widgets externos)
- **Integración Revi.io**: sincronización de valoraciones, mapeo de estados, widget en frontend
- **Sistema CMS**: gestión de páginas estáticas con editor rico
- **Importación desde PrestaShop**: migración de clientes, pedidos y facturas desde CSV
- Gestión de equipo (usuarios admin)
- Configuración global de clientes, pedidos y productos

---

## Arquitectura del Proyecto

```
src/
├── app/
│   ├── (admin)/          # Panel de administración (route group)
│   │   ├── admin-login/
│   │   └── admin/        # Todas las secciones del backoffice
│   ├── (public)/         # Tienda pública (route group)
│   │   ├── productos/
│   │   ├── categorias/
│   │   ├── carrito/
│   │   ├── checkout/     # Multipaso con pasarelas
│   │   └── cms/
│   ├── account/          # Área privada del cliente
│   ├── api/              # API Routes (Next.js Route Handlers)
│   └── Providers.tsx     # Context providers globales
├── components/
│   ├── admin/            # Componentes exclusivos del backoffice
│   │   └── dashboard/    # Widgets del dashboard (charts, stats, tráfico)
│   └── *.tsx             # Componentes de la tienda pública
└── lib/                  # Utilidades, helpers, configuración Prisma
```

---

## Requisitos Previos

- [Node.js](https://nodejs.org/) v18 o superior
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Git](https://github.com/)

---

## Instalación y Entorno Local

### 1. Clonar el repositorio

```bash
git clone https://github.com/victorbeneito/projecte_nextjs_mariadb.git
cd projecte_nextjs_mariadb
git checkout develop
```

### 2. Configurar variables de entorno

Crea un archivo `.env.local` en la raíz con al menos estas variables:

```env
DATABASE_URL="mysql://root:root@localhost:3306/elhogardetussuenos"
JWT_SECRET="tu_secreto_jwt"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# PayPal
PAYPAL_CLIENT_ID="..."
PAYPAL_CLIENT_SECRET="..."

# Redsys
REDSYS_MERCHANT_CODE="..."
REDSYS_TERMINAL="001"
REDSYS_SECRET_KEY="..."

# Email (SMTP)
SMTP_HOST="..."
SMTP_PORT="587"
SMTP_USER="..."
SMTP_PASS="..."

# Google Analytics
NEXT_PUBLIC_GA_ID="G-XXXXXXXXXX"
```

### 3. Levantar la base de datos con Docker

```bash
docker compose up -d
```

Accede a phpMyAdmin en `http://localhost:8080`.

### 4. Instalar dependencias y preparar Prisma

```bash
npm install
npx prisma generate
npx prisma db push
```

### 5. Iniciar el servidor de desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`.

---

## Flujo de Trabajo y Despliegue

```
develop  →  (PR / merge)  →  main  →  GitHub Actions  →  Azure Web App
```

- **`develop`**: desarrollo activo, integración de features y correcciones
- **`main`**: producción — cualquier push o merge dispara el workflow de CI/CD

El pipeline de GitHub Actions construye la aplicación con `next build` (modo standalone), copia los assets estáticos y el engine de Prisma, y despliega en Azure Web App Service (France Central).

---

## Entorno de Producción

| | |
|---|---|
| Dominio | [www.elhogardetusuenos.com](https://www.elhogardetusuenos.com) |
| Plataforma | Servidor Plesk www.ev22.com |
| Base de datos | MariaDB  |
| CI/CD | GitHub Actions |

---

## Importación histórica desde PrestaShop

Para migrar clientes, direcciones, pedidos y facturas desde CSVs exportados de PrestaShop/DBeaver:

```bash
npm run import:prestashop -- --inputDir "importacion/Archivos prestashop/pedidos" --since 2021-01-01
```

Archivos esperados en la carpeta de entrada:

| Archivo | Descripción |
|---|---|
| `ps_customer*.csv` | Datos de clientes |
| `ps_address*.csv` | Direcciones |
| `ps_orders*.csv` | Cabeceras de pedidos |
| `ps_order_detail*.csv` | Líneas de pedido (opcional) |
| `ps_order_state*.csv` + `ps_order_state_lang*.csv` | Estados originales (opcional) |

> No uses `--skip-project` con este importador; genera una incompatibilidad de opciones con `ts-node` (error TS5109).

---

## Resolución de Problemas

**Tailwind CSS no carga en local**
Elimina la caché de Next.js y reinicia:
```bash
rm -rf .next && npm run dev
```

**"Prisma Client no encontrado" tras un pull**
Regenera los artefactos:
```bash
npx prisma generate
```

**Errores de permisos con Docker (Linux/WSL)**
```bash
# Añadir usuario al grupo docker
sudo usermod -aG docker $USER
# Corregir permisos del proyecto
sudo chown -R $USER:$USER .
```
