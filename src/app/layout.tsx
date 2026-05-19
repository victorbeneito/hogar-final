
import "./globals.css";
import type { Metadata } from "next";
import { ClienteAuthProvider } from "@/context/ClienteAuthContext";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "react-hot-toast";
import Script from "next/script";
import { PaypalProvider } from "@/components/PaypalProvider";

import Header from "@/components/Header";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CookieConsent from "@/components/CookieConsent";
import ChatWidgets from "@/components/ChatWidgets";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.elhogardetusuenos.com"),
  title: {
    default: "El Hogar de tus Sueños | Decoración y Estores Online",
    template: "%s | El Hogar de tus Sueños",
  },
  description:
    "Tienda online especializada en decoración del hogar. Amplia gama de estores digitales en oferta, fundas nórdicas y accesorios para tu hogar.",
  keywords: ["estores digitales", "decoración hogar", "estores online", "estores baratos", "El Hogar de tus Sueños"],
  authors: [{ name: "El Hogar de tus Sueños" }],
  openGraph: {
    siteName: "El Hogar de tus Sueños",
    locale: "es_ES",
    type: "website",
    url: "https://www.elhogardetusuenos.com",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  alternates: {
    canonical: "https://www.elhogardetusuenos.com",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning translate="no">
      <body suppressHydrationWarning className="bg-fondo dark:bg-darkBg text-secondary dark:text-darkNavText transition-colors duration-300 flex flex-col min-h-screen">
        
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

                {/* Banner de consentimiento de cookies (GDPR) */}
                <CookieConsent />

                {/* Chat de atención al cliente: tawk.to + WhatsApp */}
                <ChatWidgets />

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
