# Hogar Final - Project Documentation

> **Status:** Active Development | **Last Updated:** 2026-06-02

## Project Overview

A complete e-commerce Next.js application for "Tu Hogar" (furniture/home decor store) with an advanced admin dashboard, blog system, real-time traffic analytics, and multi-payment support. Originally migrated from PrestaShop.

**Key URL Patterns:**
- Public store: `/`
- Admin panel: `/admin/*`
- Blog: `/blog` and `/blog/[slug]`

---

## Technology Stack

### Core
- **Framework:** Next.js 16.0.9 (App Router)
- **Language:** TypeScript
- **Database:** MySQL (Prisma ORM)
- **Styling:** Tailwind CSS + next-themes (dark mode support)
- **UI Components:** Lucide React icons

### Key Libraries
- **Admin Dashboard:** Recharts (area/bar charts), Lucide icons, Tailwind CSS
- **Rich Text Editing:** TipTap (blog editor with formatting tools)
- **Payment:** PayPal SDK, Redsys Easy (Spanish payment gateway)
- **State Management:** TanStack Query (React Query)
- **PDF Generation:** @react-pdf/renderer
- **File Uploads:** Multer
- **Auth:** JWT (jsonwebtoken, jwt-decode)
- **Email:** Nodemailer
- **Analytics:** Google Analytics GA4 (ID: G-B115FWF028)
- **Session Management:** UUID (browser sessions)

---

## Core Features Implemented

### 1. Admin Dashboard (Professional Stats & Analytics)
**Location:** `/admin` | **Created:** 2026-05-21

Comprehensive dashboard with real-time stats and multiple data visualizations:

**Components:**
- `StatCard.tsx` — Quick metrics (pedidos, clientes, productos, ventas)
- `VentasChart.tsx` — Area chart showing last 30 days of sales
- `UltimosPedidos.tsx` — Recent orders table with status, total, date, payment method
- `UltimosClientes.tsx` — Latest customers with avatar, email, active status
- `PedidosEstado.tsx` — Bar chart showing orders by status
- `MensajesPendientes.tsx` — Customer messages with order links
- `TraficoWidget.tsx` — Real-time traffic metrics and source breakdown

**API:**
- `GET /api/admin/stats` — Returns: totalSales, monthlySales, weeklySales, weeklyOrders, lastOrders, lastCustomers, lastMessages, ordersByStatus, last30daysSalesChart

**Layout:**
```
Row 1: 5 StatCards (orders, customers, products, total sales, monthly sales)
Row 2: Sales Chart (2/3 width) + Pending Messages (1/3 width)
Row 3: Latest Orders (3/5) + Orders by Status (2/5)
Row 4: Latest Customers (full width)
Row 5: Summary Cards (weekly orders, weekly sales, coupons)
```

### 2. Blog System (SEO-Optimized)
**Location:** `/blog` (public), `/admin/blog` (admin) | **Created:** 2026-05-22

Complete blog with markdown/rich text content, SEO optimization, and real-time view tracking.

**Database Model:** `articulo`
```
Fields: id, titulo, slug, extracto, contenidoHtml, imagenPortada, autor, 
        activo, destacado, metaTitulo, metaDescripcion, etiquetas, 
        vistas, fechaPublicacion, createdAt, updatedAt
```

**API Endpoints:**
- `GET /api/blog/articulos` — List all articles (public)
- `POST /api/blog/articulos` — Create article (admin only)
- `GET /api/blog/articulos/[id]` — Get single article (admin)
- `PUT /api/blog/articulos/[id]` — Update article (admin)
- `DELETE /api/blog/articulos/[id]` — Delete article (admin)
- `GET /api/blog/articulos/slug/[slug]` — Get by slug (increments views)

**Admin Features:**
- List view with inline actions at `/admin/blog`
- Create new article at `/admin/blog/nuevo`
- Edit article at `/admin/blog/[id]`
- Sidebar link under "PERSONALIZAR" → "Blog Tienda"

**Editor Component:** `BlogRichTextEditor.tsx`
- Built with TipTap
- Features: bold, italic, strikethrough, H1-H3, lists, blockquote, code, text colors (10 presets), font families, image by URL, links, undo/redo, clear formatting
- Loaded with `next/dynamic` (ssr: false) to prevent hydration errors

**Public Pages:**
- `/blog` — Landing page with featured articles, search, pagination
- `/blog/[slug]` — Individual article with SEO metadata and related articles

### 3. Real-Time Traffic Tracking & Analytics
**Location:** `/admin/dashboard` (widget) | **Created:** 2026-05-21

Dual-layer traffic tracking system with real-time metrics and Google Analytics integration.

**Own System (Proprietary Tracking):**

**Middleware:** `middleware.ts` (root)
- Intercepts every visit to the store
- Generates or reads session cookie (UUID, 30min max-age)
- Hashes IP address with salt for privacy
- Detects traffic source, device type

**Database Model:** `visita`
```
Fields: sessionId (UUID), ipHash (SHA256), url, referrer, fuente, dispositivo, timestamp
```

**Traffic Source Detection:**
- Direct
- Search engines: Google, Bing, Yahoo
- Social: Facebook, Instagram, Twitter, TikTok, LinkedIn, Pinterest, Reddit, YouTube
- Referral (other websites)
- Email

**Device Detection:**
- Desktop
- Mobile
- Tablet

**API:**
- `POST /api/trafico/registrar` — Record visits from middleware
- `GET /api/admin/trafico` — Returns: online visitors (last 30min), visits today, visits yesterday, % change, 24h chart (hourly), top 10 pages, traffic sources (%), device breakdown (%)

**Dashboard Widget:** `TraficoWidget.tsx`
- 4 mini-cards: online visitors (green blinking dot), today's visits, yesterday's visits, % change
- Bar chart of last 24 hours visits (hourly)
- Traffic sources with percentage bars
- Top 10 most visited pages
- Auto-refreshes every 60 seconds

**Google Analytics GA4:**
- Script integrated in `src/app/layout.tsx`
- Environment variable: `NEXT_PUBLIC_GA_MEASUREMENT_ID=G-B115FWF028`

---

## Database Schema (Key Models)

**Admin Management:**
- `admin` — Admin users with JWT auth

**Products:**
- `producto` — Main product model
- `categoria` — Product categories (hierarchical with parentId)
- `productocategoria` — Product-category junction
- `atributo` — Attributes (colors, sizes, etc.)
- `atributovalor` — Attribute values
- `varianteatributo` — Product variant attributes
- `variante` — Product variants with pricing

**Orders & Cart:**
- `pedido` — Orders with status tracking
- `detallepedido` — Order line items
- `carritocompra` — Shopping cart
- `carritoitem` — Cart items

**Blog:**
- `articulo` — Blog articles with SEO fields

**Analytics:**
- `visita` — Traffic visits with session/IP tracking

**Customers:**
- `cliente` — Customer accounts
- `direccioncliente` — Customer addresses

**See full schema in:** `prisma/schema.prisma`

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout (GA4 script)
│   ├── admin/
│   │   ├── layout.tsx
│   │   ├── page.tsx            # Dashboard page
│   │   ├── blog/               # Blog admin
│   │   ├── productos/
│   │   ├── pedidos/
│   │   └── ...
│   ├── blog/                   # Blog public pages
│   ├── tienda/                 # Public store
│   └── api/
│       ├── admin/stats         # Dashboard stats
│       ├── admin/trafico       # Traffic analytics
│       ├── trafico/registrar   # Traffic logging
│       ├── blog/               # Blog CRUD
│       └── ...
├── components/
│   ├── admin/
│   │   ├── dashboard/          # Dashboard widgets
│   │   ├── BlogRichTextEditor.tsx
│   │   └── ...
│   └── ...
├── lib/
│   ├── auth.ts                 # JWT utilities
│   └── ...
├── middleware.ts               # Traffic tracking middleware
└── styles/
    └── globals.css

prisma/
├── schema.prisma               # Database models
└── seed.ts                     # Database seeding (if applicable)

public/
├── img/
└── ...

scripts/
└── importar-pedidos-prestashop.ts  # Migration from PrestaShop
```

---

## Environment Setup

**Required Environment Variables:**

```env
# Database
DATABASE_URL="mysql://user:password@localhost:3306/hogar_final"

# Google Analytics
NEXT_PUBLIC_GA_MEASUREMENT_ID="G-B115FWF028"

# JWT Secret (for admin auth)
JWT_SECRET="your-secret-key"

# Email (Nodemailer)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# PayPal & Redsys (if needed)
PAYPAL_CLIENT_ID="..."
PAYPAL_SECRET="..."
```

---

## Getting Started

### Development
```bash
npm run dev
# App runs on http://localhost:3000
```

### Build & Production
```bash
npm run build
npm start
```

### Database
```bash
# Sync schema changes
npm run db:push

# Seed data (if seeding script exists)
npx prisma db seed
```

### Import from PrestaShop
```bash
npm run import:prestashop
```

---

## Git Workflow

⚠️ **CRITICAL:** Always work on the `develop` branch. Main is production-only.

**Rules:**
- Never commit to `main` branch
- All work happens on `develop`
- Main is strictly for production releases
- Create feature branches from develop if needed, but merge back to develop
- Always verify you're on `develop` before committing

**Current Status:**
- Branch: `develop`
- Main branch: `main`
- User: Victor Beneito
- Email: liberiogasss@gmail.com

---

## Key Learnings & Important Notes

### 1. Blog Editor Hydration
- `BlogRichTextEditor.tsx` must be loaded with `next/dynamic` with `ssr: false`
- Prevents TipTap hydration errors in Next.js

### 2. Traffic Middleware
- `middleware.ts` runs on every request (even API routes, static files)
- The `visita` table is created automatically when first visit is logged
- Session cookie is 30 minutes with UUID
- IP hashing uses SHA256 + salt for privacy

### 3. Dashboard Stats API
- Requires JWT authentication (admin only)
- Returns aggregated data for display on dashboard
- LastMessages includes links to related orders

### 4. PayPal Integration
- Uses both `@paypal/checkout-server-sdk` and `@paypal/react-paypal-js`
- Check existing payment logic for integration patterns

### 5. Admin Authentication
- Uses JWT tokens stored in localStorage
- Token validation in middleware/API routes
- Check `lib/auth.ts` for helper functions

### 6. Responsive Dashboard
- Built with Tailwind CSS grid system
- Supports dark mode via next-themes
- Charts (Recharts) are responsive out-of-the-box

---

## Common Development Tasks

### Add Blog Article
1. Go to `/admin/blog/nuevo`
2. Fill in title, content (with rich editor), cover image, SEO fields
3. Publish (set `activo: true`)
4. View on `/blog/[slug]`

### Add Product
1. Navigate to `/admin/productos`
2. Fill product details, variants, attributes
3. Assign to categories
4. Set pricing

### View Analytics
- Dashboard stats: `/admin` (auto-loads from `/api/admin/stats`)
- Traffic widget: included on dashboard (auto-refreshes)
- Google Analytics: external platform at analytics.google.com

### Add Admin User
- Direct database insert into `admin` table, or
- Create admin form in `/admin` (check if exists)
- Password must be hashed with bcryptjs

---

## Recent Work (Last 5 Commits)

```
5705a13 añadir botón Personalizar - Blog
680fe73 Restaurar enlace Blog Tienda en sidebar
88ce2e1 Limpieza sidebar admin y reorganización navbar
420e6d4 solucion error BlogRichTextEditor
59d737c blog, millores pedido card cliente, card transporte
```

---

## Useful Commands

```bash
# Development
npm run dev          # Start dev server

# Database
npm run db:push      # Push schema changes
prisma studio       # Open Prisma Studio (DB GUI)

# Import legacy data
npm run import:prestashop

# Linting
npm run lint

# Build
npm run build
npm start
```

---

## Files to Review for Future Features

- **Payment Logic:** Look for existing PayPal/Redsys integration patterns
- **Admin Auth:** Check `lib/auth.ts` and API middleware for JWT patterns
- **Rich Text:** Review `BlogRichTextEditor.tsx` for TipTap customization
- **Charts:** Check dashboard components for Recharts patterns
- **Traffic:** See `middleware.ts` for session/device detection logic

---

## Contact & Support

- **Developer:** Victor Beneito
- **Email:** liberiogasss@gmail.com
- **Repository:** Current working directory
- **Environment:** Windows 11, Next.js 16, MySQL, TypeScript

