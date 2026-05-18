"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Esta ruta ya no se usa. El pago con tarjeta va directamente al TPV de Redsys
// desde el componente PasarelaRedsys en /checkout/pago
export default function TarjetaRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/checkout/pago");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-10 h-10 border-4 border-[#f6b919] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
