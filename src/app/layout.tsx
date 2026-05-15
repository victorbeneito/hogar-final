
import "./globals.css";
import { ClienteAuthProvider } from "@/context/ClienteAuthContext";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "react-hot-toast";
import Script from "next/script";
import { PaypalProvider } from "@/components/PaypalProvider";

// 👇 IMPORTA TUS 3 COMPONENTES GLOBALES
import Header from "@/components/Header"; // ¡Añadido el Header!
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Mi aplicación",
  description: "Proyecto Next.js",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="bg-fondo dark:bg-darkBg text-secondary dark:text-darkNavText transition-colors duration-300 flex flex-col min-h-screen">
        
        <PaypalProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <AuthProvider>
              <ClienteAuthProvider>

                {/* === ZONA SUPERIOR FIJA === */}
                {/* Aquí cargamos Header y Navbar para TODA la web */}
                <Header />
                <Navbar />

                {/* === CONTENIDO VARIABLE === */}
                {/* flex-1 hace que esto ocupe todo el espacio sobrante, empujando el footer abajo */}
                <div className="flex-1 flex flex-col">
                  {children}
                </div>

                {/* === PIE DE PÁGINA FIJO === */}
                <Footer />

                {/* Notificaciones */}
                <Toaster position="top-center" />

              </ClienteAuthProvider>
            </AuthProvider>
          </ThemeProvider>
        </PaypalProvider>

        {/* REVI: Script de inicialización global */}
        <Script
          src="https://widgets.revi.io/embed/widget.js"
          strategy="afterInteractive"
          async
        />

      </body>
    </html>
  );
}
