import "./globals.css";
import type { Metadata } from "next";
import { ClienteAuthProvider } from "@/context/ClienteAuthContext";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "react-hot-toast";
import Script from "next/script";
import { PaypalProvider } from "@/components/PaypalProvider";
import TrafficTracker from "@/components/TrafficTracker";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL("https://elhogardetusuenos.com"),
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
    url: "https://elhogardetusuenos.com",
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
    <html lang="es" suppressHydrationWarning>
      <body suppressHydrationWarning className="bg-fondo dark:bg-darkBg text-secondary dark:text-darkNavText transition-colors duration-300 flex flex-col min-h-screen">
        <PaypalProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <AuthProvider>
              <ClienteAuthProvider>
                <TrafficTracker />
                {children}
                <Toaster position="top-center" />
              </ClienteAuthProvider>
            </AuthProvider>
          </ThemeProvider>
        </PaypalProvider>

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
