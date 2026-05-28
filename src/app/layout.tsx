import "./globals.css";
import type { Metadata } from "next";
import { ClienteAuthProvider } from "@/context/ClienteAuthContext";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "react-hot-toast";
import Script from "next/script";
import { PaypalProvider } from "@/components/PaypalProvider";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL("https://elhogardetusuenos.com"),
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
    canonical: "https://elhogardetusuenos.com",
  },
  verification: {
    google: "VpCz7A2JTYMy7fkK6wleNSh95ZPH8pImauHx-tKlXmU",
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
                {children}
                <Toaster position="top-center" />
              </ClienteAuthProvider>
            </AuthProvider>
          </ThemeProvider>
        </PaypalProvider>

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
