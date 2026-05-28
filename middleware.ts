import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import psCatMap from '@/data/ps-cat-map.json';
import psProductMap from '@/data/ps-product-map.json';

const EXCLUDED_PATHS = ['/admin', '/api', '/_next', '/favicon', '/robots.txt', '/sitemap.xml'];
const STATIC_EXTENSIONS = ['.css', '.js', '.json', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.woff', '.woff2', '.ttf', '.eot'];

function isExcludedPath(pathname: string): boolean {
  if (EXCLUDED_PATHS.some(path => pathname.startsWith(path))) return true;
  if (STATIC_EXTENSIONS.some(ext => pathname.endsWith(ext))) return true;
  return false;
}

async function hashIP(ip: string): Promise<string> {
  const salt = 'visitor_salt_2026';
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 64);
}

function detectFuente(referrer: string | null): string {
  if (!referrer) return 'directo';

  const buscadores = ['google', 'bing', 'yahoo', 'yandex', 'baidu'];
  const redes = ['facebook', 'instagram', 'twitter', 'linkedin', 'tiktok', 'pinterest', 'reddit'];

  const ref = referrer.toLowerCase();

  if (buscadores.some(b => ref.includes(b))) return 'buscador';
  if (redes.some(r => ref.includes(r))) return 'social';

  return 'referral';
}

function detectDispositivo(userAgent: string | null): string {
  if (!userAgent) return 'desktop';

  const ua = userAgent.toLowerCase();

  if (/mobile|iphone|android|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
    return 'mobile';
  }
  if (/tablet|ipad|playbook|silk|android(?!.*mobile)/i.test(ua)) {
    return 'tablet';
  }

  return 'desktop';
}

const catMap = psCatMap as Record<string, string>;
const productMap = psProductMap as Record<string, string>;

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Redirigir URLs antiguas de PrestaShop (301 permanente)
  if (pathname.startsWith('/es/') || pathname === '/es') {
    // Categoría: /es/{id}-{slug} → /categorias/{new_id}
    const catMatch = pathname.match(/^\/es\/(\d+)-/);
    if (catMatch) {
      const newUrl = catMap[catMatch[1]];
      if (newUrl) return NextResponse.redirect(new URL(newUrl, req.url), 301);
    }

    // Producto: /es/{cualquier-cosa}/{id}-{slug}.html o /es/{id}-{slug}.html
    const prodMatch = pathname.match(/\/(\d+)-[^/]+\.html$/);
    if (prodMatch) {
      const newUrl = productMap[prodMatch[1]];
      if (newUrl) return NextResponse.redirect(new URL(newUrl, req.url), 301);
    }

    // Cualquier otra URL de PrestaShop sin mapeo → home
    return NextResponse.redirect(new URL('/', req.url), 301);
  }

  // No procesar rutas excluidas
  if (isExcludedPath(pathname) || req.method !== 'GET') {
    return NextResponse.next();
  }

  const response = NextResponse.next();

  // Generar o recuperar sessionId
  let sessionId = req.cookies.get('_sid')?.value;
  if (!sessionId) {
    sessionId = uuidv4();
    response.cookies.set('_sid', sessionId, {
      maxAge: 30 * 60, // 30 minutos
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
  }

  // Obtener IP (Edge Runtime compatible)
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
             req.headers.get('x-real-ip') ||
             req.headers.get('cf-connecting-ip') ||
             '0.0.0.0';

  const ipHash = await hashIP(ip);
  const url = pathname;
  const referrer = req.headers.get('referer');
  const userAgent = req.headers.get('user-agent');
  const fuente = detectFuente(referrer);
  const dispositivo = detectDispositivo(userAgent);

  // Llamada asíncrona al API para registrar (no esperar)
  if (typeof fetch !== 'undefined') {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    fetch(`${baseUrl}/api/trafico/registrar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        ipHash,
        url,
        referrer,
        fuente,
        dispositivo,
      }),
    }).catch(() => {}); // Ignorar errores
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};
