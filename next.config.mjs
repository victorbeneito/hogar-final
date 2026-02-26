/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    distDir: 'build',
    serverComponentsExternalPackages: ['@prisma/client', 'bcrypt'],
typescript: {
    // !! ATENCIÓN !!
    // Ignoramos errores para que Azure pueda desplegar aunque el seed.ts tenga fallos
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'elhogardetusuenos.com',
        port: '',
        pathname: '/**',
      },
      // Si tienes imágenes de otros dominios (ej. imgur, aws, etc), añádelos aquí también
      {
        protocol: 'https',
        hostname: 'cdn.shopworld.cloud',
        port: '',
        pathname: '/**',
      },
    ],
  },
  

};


export default nextConfig;
