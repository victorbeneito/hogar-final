import { prisma } from './prisma';
import { buildUrl } from './urls';

// Pedidos anteriores a esta fecha proceden del archivo histórico de Prestashop
// y no deben contarse ni sincronizarse como pendientes de invitación en Revi.
export const REVI_SYNC_CUTOFF_DATE = new Date('2026-05-27T00:00:00Z');

// API pública de Revi, versionada por fecha (ver developers.revi.io).
const REVI_API_BASE = 'https://api.revi.io/api/2026-04';
const REVI_TIMEOUT_MS = 15000;

interface ReviOrderProductInput {
  id_product: string;
  name: string;
  url?: string;
}

async function getReviConfig() {
  const moduleConfig = await prisma.configuracion.findFirst({
    where: { clave: 'modulos_integraciones' }
  });

  let config: any = { activa: false, apiKey: '', shopId: '' };

  if (moduleConfig?.valor) {
    try {
      const parsed = JSON.parse(moduleConfig.valor);
      config = parsed.revi || config;
    } catch (e) {
      console.warn('[REVI] Could not parse module config');
    }
  }

  if (!config.activa) {
    throw new Error('REVI module is not enabled');
  }

  if (!config.apiKey) {
    throw new Error('REVI configuration incomplete: apiKey missing');
  }

  return { apiKey: config.apiKey };
}

async function getProductPrestashopId(referencia: string): Promise<string | null> {
  const mapeo = await prisma.mapeo_producto_ps.findFirst({
    where: { referencia }
  });

  return mapeo ? String(mapeo.idPrestashop) : null;
}

function formatReviDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

async function reviFetch(apiKey: string, path: string, method: string, body?: any) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REVI_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${REVI_API_BASE}${path}`, {
      method,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new Error(`No se pudo conectar con la API de REVI (timeout tras ${REVI_TIMEOUT_MS / 1000}s) en ${path}`);
    }
    throw new Error(`No se pudo conectar con la API de REVI en ${path}: ${err?.message || err}`);
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`REVI API error ${response.status} en ${path}: ${errorText.slice(0, 300)}`);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function buildOrderProducts(pedidoData: any): Promise<ReviOrderProductInput[]> {
  const products: ReviOrderProductInput[] = [];

  for (const item of pedidoData.pedidoproducto || []) {
    const product = item.producto;
    if (!product) continue;

    // Los productos con histórico en Prestashop usan su ID original para conservar
    // las reseñas ya existentes; los productos nuevos (sin mapeo) usan su referencia interna.
    const prestashopId = await getProductPrestashopId(product.referencia);

    products.push({
      id_product: prestashopId || product.referencia || String(product.id),
      name: product.nombre,
      // Ojo: aquí había `process.env.NEXT_PUBLIC_APP_URL`, una variable que no existe
      // en ningún .env, así que a Revi le llegaba la URL literal "undefined/productos/N".
      url: buildUrl(`/productos/${product.id}`)
    });
  }

  return products;
}

export async function sendReviOrder(pedidoData: any): Promise<void> {
  try {
    const { apiKey } = await getReviConfig();
    const products = await buildOrderProducts(pedidoData);

    if (products.length === 0) {
      throw new Error('Sin productos mapeados a Prestashop (revisar pestaña Mapeos)');
    }

    // 1. Registrar/actualizar los productos del pedido en Revi
    await reviFetch(apiKey, '/products', 'POST', {
      products: products.map((p) => ({
        id_product: p.id_product,
        locale: [{ lang: 'es', name: p.name, url: p.url }]
      }))
    });

    // 2. Crear/actualizar el pedido
    await reviFetch(apiKey, '/orders', 'POST', {
      orders: [{
        id_order: pedidoData.numeroPedido,
        customer_name: pedidoData.nombre,
        customer_lastname: pedidoData.apellidos || '',
        email: pedidoData.email,
        lang: 'es',
        currency: 'EUR',
        total_paid: Number(pedidoData.totalFinal ?? 0).toFixed(2),
        order_date: formatReviDate(new Date(pedidoData.fechaPedido)),
        status: 'pending'
      }]
    });

    // 3. Vincular los productos al pedido
    await reviFetch(apiKey, `/orders/${encodeURIComponent(pedidoData.numeroPedido)}/products`, 'POST', {
      products: products.map((p) => ({ id_product: p.id_product }))
    });

    // 4. Marcar el pedido como listo para disparar la invitación de reseña
    await reviFetch(apiKey, `/orders/${encodeURIComponent(pedidoData.numeroPedido)}/status`, 'PATCH', {
      status: 'ready',
      date_status_upd: formatReviDate(new Date())
    });

    console.log('[REVI] Order sent successfully:', pedidoData.numeroPedido);
  } catch (error: any) {
    console.error('[REVI] Error sending order:', error?.message || error);
    throw error;
  }
}
