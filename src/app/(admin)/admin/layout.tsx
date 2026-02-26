"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { jwtDecode } from "jwt-decode";

interface TokenPayload {
  id: string;
  email: string;
  rol?: string; // Puede venir como "ADMIN" o "admin"
  exp?: number;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [autenticado, setAutenticado] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // 1. Verificar si existe el token
    const token = localStorage.getItem("adminToken");
    
    if (!token) {
      router.replace("/admin-login"); // ✅ CORREGIDO: Ruta sin barra intermedia
      return;
    }

    try {
      const decoded = jwtDecode<TokenPayload>(token);

      // 2. Comprobamos si el token expiró
      if (decoded.exp && decoded.exp * 1000 < Date.now()) {
        localStorage.removeItem("adminToken");
        router.replace("/admin-login"); // ✅ CORREGIDO
        return;
      }

      // 3. Verificamos que tenga rol admin (Ignorando mayúsculas/minúsculas)
      // Convertimos lo que venga a minúsculas para comparar
      const rolUsuario = decoded.rol?.toLowerCase() || "";
      
      if (rolUsuario !== "admin") {
        console.error("Acceso denegado: El usuario no es admin. Rol detectado:", decoded.rol);
        router.replace("/admin-login"); // ✅ CORREGIDO
        return;
      }

      // 4. Todo correcto
      setAdminEmail(decoded.email);
      setAutenticado(true);

    } catch (error) {
      console.error("Token inválido o corrupto", error);
      localStorage.removeItem("adminToken");
      router.replace("/admin-login"); // ✅ CORREGIDO
    }
  }, [router]);

  if (!autenticado) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-xl font-semibold text-gray-600 animate-pulse">
          Verificando acceso al panel...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow p-4 flex justify-between items-center sticky top-0 z-50">
        <h1 className="text-xl font-semibold text-gray-800">
          Panel de Administración
        </h1>
        {adminEmail && (
          <div className="flex items-center gap-4">
            <span className="text-gray-600 text-sm hidden sm:block">{adminEmail}</span>
            <button
              onClick={() => {
                localStorage.removeItem("adminToken");
                router.replace("/admin-login"); // ✅ CORREGIDO
              }}
              className="text-red-600 hover:text-red-800 font-bold text-sm border border-red-200 px-3 py-1 rounded hover:bg-red-50 transition"
            >
              Cerrar sesión
            </button>
          </div>
        )}
      </header>

      <main className="p-4 md:p-8">{children}</main>
    </div>
  );
}
