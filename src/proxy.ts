import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Generados por: node scripts/import-ps-seo.cjs
import psCatMap from "./data/ps-cat-map.json";
import psProductMap from "./data/ps-product-map.json";

// /es/36-paisajes  →  /categorias/{nextjsId}
const CAT_REGEX = /^\/es\/(\d+)-[^/]+\/?$/;

// /es/inicio/1555-178343-product-slug.html  →  /productos/{slug}
const PROD_REGEX = /^\/es\/[^/]+\/(\d+)-\d+-[^/]+\.html/;

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── Redirecciones 301 desde URLs de PrestaShop ─────────────────────────────

  const catMatch = pathname.match(CAT_REGEX);
  if (catMatch) {
    const nextPath = (psCatMap as Record<string, string>)[catMatch[1]];
    return NextResponse.redirect(
      new URL(nextPath ?? "/productos", req.url),
      { status: 301 }
    );
  }

  const prodMatch = pathname.match(PROD_REGEX);
  if (prodMatch) {
    const nextPath = (psProductMap as Record<string, string>)[prodMatch[1]];
    return NextResponse.redirect(
      new URL(nextPath ?? "/productos", req.url),
      { status: 301 }
    );
  }

  // ── Protección panel admin (desactivada, solo login excluido) ──────────────

  if (pathname.startsWith("/admin/login")) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/es/:path*", "/admin/:path*", "/api/admin/:path*"],
};
