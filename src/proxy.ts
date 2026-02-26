import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import type { NextRequest } from "next/server";

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ❌ No proteger la página de login de admin
  if (pathname.startsWith("/admin/login")) {
    return NextResponse.next();
  }

  // ✅ Aplicar protección solo al panel y APIs internas
  // if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
  //   const header = req.headers.get("authorization");
  //   const token = header?.split(" ")[1];

  //   if (!token) {
  //     // Redirigir al login especial del admin, no al de cliente
  //     return NextResponse.redirect(new URL("/admin/login", req.url));
  //   }

  //   try {
  //     const decoded: any = jwt.verify(token, process.env.SECRETO_JWT_ADMIN!);

  //     if (!decoded || decoded.rol !== "admin") {
  //       return NextResponse.redirect(new URL("/admin/login", req.url));
  //     }
  //   } catch (e) {
  //     return NextResponse.redirect(new URL("/admin/login", req.url));
  //   }
  // }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
