import { prisma } from './prisma';

// Pedidos anteriores a esta fecha proceden del archivo histórico de Prestashop
// y no deben contarse ni sincronizarse como pendientes de invitación en Revi.
export const REVI_SYNC_CUTOFF_DATE = new Date('2026-05-27T00:00:00Z');

interface ReviOrderProduct {
  product_id: string;
  product_name: string;
  product_url?: string;
}

interface ReviOrderPayload {
  order_id: string;
  order_date: string;
  customer_email: string;
  customer_name: string;
  products: ReviOrderProduct[];
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

  if (!config.apiKey || !config.shopId) {
    throw new Error('REVI configuration incomplete: apiKey or shopId missing');
  }

  return { apiKey: config.apiKey, shopId: config.shopId };
}

async function getProductPrestashopId(referencia: string): Promise<string | null> {
  const mapeo = await prisma.mapeo_producto_ps.findFirst({
    where: { referencia }
  });

  return mapeo ? String(mapeo.idPrestashop) : null;
}

async function buildReviPayload(pedidoData: any): Promise<ReviOrderPayload> {
  const products: ReviOrderProduct[] = [];

  for (const item of pedidoData.pedidoproducto || []) {
    const product = item.producto;
    if (!product) continue;

    const prestashopId = await getProductPrestashopId(product.referencia);

    if (prestashopId) {
      products.push({
        product_id: prestashopId,
        product_name: product.nombre,
        product_url: `${process.env.NEXT_PUBLIC_APP_URL}/productos/${product.id}`
      });
    }
  }

  return {
    order_id: pedidoData.numeroPedido,
    order_date: new Date(pedidoData.fechaPedido).toISOString(),
    customer_email: pedidoData.email,
    customer_name: `${pedidoData.nombre} ${pedidoData.apellidos || ''}`.trim(),
    products
  };
}

export async function sendReviOrder(pedidoData: any): Promise<void> {
  try {
    const { apiKey, shopId } = await getReviConfig();
    const payload = await buildReviPayload(pedidoData);

    if (payload.products.length === 0) {
      console.log('[REVI] No products with Prestashop mapping found for order', payload.order_id);
      return;
    }

    const response = await fetch('https://api.revi.io/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-Shop-ID': shopId
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`REVI API error ${response.status}: ${errorText}`);
    }

    console.log('[REVI] Order sent successfully:', payload.order_id);
  } catch (error: any) {
    console.error('[REVI] Error sending order:', error?.message || error);
    throw error;
  }
}
