import "./globals.css";
import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { ClienteAuthProvider } from "@/context/ClienteAuthContext";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "react-hot-toast";
import Script from "next/script";
import TrafficTracker from "@/components/TrafficTracker";
import { CANONICAL_BASE_URL } from "@/lib/urls";
import { organizationJsonLd } from "@/lib/seo";

export const dynamic = "force-dynamic";

/**
 * Poppins, la fuente de toda la tienda.
 *
 * Antes se pedía a Google con un `@import` en la primera línea de globals.css.
 * Cargarla aquí con `next/font/google` cambia tres cosas, y las tres las medía
 * PageSpeed como problemas:
 *
 *  - **Se sirve desde elhogardetusuenos.com.** El fichero se descarga en tiempo de
 *    compilación y se guarda junto al resto de estáticos, así que desaparecen las
 *    conexiones a fonts.googleapis.com y fonts.gstatic.com. Eran las que bloqueaban
 *    el renderizado (1.760 ms) y salían en el informe como recurso externo.
 *  - **Se precarga.** Next añade el `<link rel="preload">` del .woff2 en el <head>,
 *    de modo que la fuente empieza a bajar a la vez que el CSS y no después.
 *  - **No da salto.** Next calcula una fuente de reserva (`adjustFontFallback`, que
 *    va activada por defecto) con el alto de línea y el ancho de letra ajustados a
 *    los de Poppins. Mientras llega la definitiva el texto ocupa ya el mismo hueco,
 *    así que no hay recolocación: eso eran 0,059 de los 0,130 de CLS.
 *
 * Los pesos son los cinco que ya se pedían antes. Añadir más engorda la descarga;
 * quitar alguno que se use en el CSS haría que el navegador lo simulara estirando
 * las letras. Si algún día se usa un peso nuevo (por ejemplo `font-black`), hay que
 * añadirlo a esta lista o se verá mal.
 */
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  variable: "--fuente-poppins",
});

export const metadata: Metadata = {
  metadataBase: new URL(CANONICAL_BASE_URL),
  verification: {
    google: "iqM5CjKYJULfQc5VPeGUCYGI1ziG7_F_0LYDk3Bh0dQ",
  },
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
    url: CANONICAL_BASE_URL,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  alternates: {
    // "./" lo resuelve Next contra la ruta actual, así cada página se
    // auto-referencia. Si se pone una URL fija aquí, TODA página que no
    // sobreescriba su canonical le dice a Google que es la home.
    canonical: "./",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning className={poppins.variable}>
      <body suppressHydrationWarning className="bg-fondo dark:bg-darkBg text-secondary dark:text-darkNavText transition-colors duration-300 flex flex-col min-h-screen">
        {/* Identidad de la tienda para buscadores y asistentes de IA. Va en el layout
            raíz para que esté en todas las páginas. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd(CANONICAL_BASE_URL)) }}
        />
        {/* Aquí había un <PaypalProvider> envolviéndolo todo. Se quitó: hacía que el
            SDK de PayPal (100 KiB) se descargara en TODAS las páginas —portada, blog,
            catálogo— y que cada carga pidiera además `/api/paypal/config`, cuando sólo
            hay botones de PayPal en la ficha de producto, el carrito y /test-paypal.
            Ahora cada botón trae su propio provider; ver src/components/PaypalExpressButton.tsx.
            El checkout normal no lo necesita: redirige a PayPal por servidor. */}
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthProvider>
            <ClienteAuthProvider>
              <TrafficTracker />
              {children}
              <Toaster position="top-center" />
            </ClienteAuthProvider>
          </AuthProvider>
        </ThemeProvider>

        {/* Google Tag Manager */}
        <Script id="gtm" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','GTM-58NXXRTJ');`}
        </Script>

        <Script
          src="https://widgets.revi.io/embed/widget.js"
          strategy="afterInteractive"
          async
        />

        {/* Google Analytics GA4 */}
        {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}');
              `}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
