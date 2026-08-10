import Header from "@/components/Header";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CookieConsent from "@/components/CookieConsent";
import ChatWidgets from "@/components/ChatWidgets";
import PopupManager from "@/components/PopupManager";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* === ZONA SUPERIOR FIJA === */}
      <Header />
      <Navbar />

      {/* === CONTENIDO VARIABLE === */}
      {/* flex-1 hace que esto ocupe todo el espacio sobrante, empujando el footer abajo */}
      <div className="flex-1 flex flex-col">
        {children}
      </div>

      {/* === PIE DE PÁGINA FIJO === */}
      <Footer />

      {/* Banner de consentimiento de cookies (GDPR) */}
      <CookieConsent />

      {/* Chat de atención al cliente: tawk.to + WhatsApp */}
      <ChatWidgets />

      {/* Ventanas emergentes configurables (módulo Pop-ups) */}
      <PopupManager />
    </>
  );
}
