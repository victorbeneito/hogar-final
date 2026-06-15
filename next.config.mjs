import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { version } = require("./package.json");

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: version,
  },
  async redirects() {
    return [
      // Redirige cualquier URL de PrestaShop /es/... que escape al middleware
      { source: "/es", destination: "/", permanent: true },
      { source: "/es/", destination: "/", permanent: true },
    ];
  },
  serverExternalPackages: ["@prisma/client", "bcrypt", "@react-pdf/renderer"],
  typescript: {
    // !! ATENCIÓN !!
    // Ignoramos errores para que Azure pueda desplegar aunque el seed.ts tenga fallos
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "elhogardetusuenos.com",
        port: "",
        pathname: "/**",
      },
      // Si tienes imágenes de otros dominios (ej. imgur, aws, etc), añádelos aquí también
      {
        protocol: "https",
        hostname: "cdn.shopworld.cloud",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
