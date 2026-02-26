\# El Hogar de tus Sueños 🏡

Tienda online especializada en la venta de ropa de hogar, ofreciendo una amplia gama de productos como estores, fundas de sofá, manteles y artículos de decoración para transformar y dar vida a cualquier espacio.

Este proyecto utiliza una arquitectura moderna basada en Next.js, con una base de datos MariaDB (gestionada localmente mediante Docker) y un flujo de despliegue continuo (CI/CD) hacia Azure Web App Services.

\## 🛠️ Stack Tecnológico

\* \*\*Framework:\*\* Next.js 16 (App Router)

\* \*\*Lenguaje:\*\* TypeScript

\* \*\*Base de Datos:\*\* MariaDB (Elegida por paridad con el entorno de prácticas empresariales)

\* \*\*ORM:\*\* Prisma

\* \*\*Estilos:\*\* Tailwind CSS

\* \*\*Autenticación y Seguridad:\*\* JSON Web Tokens (JWT) y bcryptjs

\* \*\*Infraestructura Local:\*\* Docker & Docker Compose (para DB y phpMyAdmin)

\* \*\*Despliegue:\*\* Azure Web App Service vía GitHub Actions

\## 📋 Requisitos Previos

Asegúrate de tener instalado en tu equipo:

\* [Node.js](https://nodejs.org/) (v18 o superior).

\* [Docker Desktop](https://www.docker.com/products/docker-desktop/).

\* [Git](https://git-scm.com/).

\---

\## 🚀 Instalación y Entorno Local

Para levantar el entorno de desarrollo en tu máquina, sigue estos pasos:

\### 1. Clonar el repositorio

El proyecto utiliza un flujo de trabajo basado en ramas. El desarrollo activo ocurre en la rama `develop`.

\```bash

git clone [https://github.com/victorbeneito/projecte\_nextjs\_mariadb.git](https://github.com/victorbeneito/projecte\_nextjs\_mariadb.git)

cd projecte\_nextjs\_mariadb

git checkout develop

**2. Configurar Variables de Entorno**

Crea un archivo .env en la raíz del proyecto basándote en el archivo de ejemplo (.env.example) o configurando tu conexión a la base de datos local:

Bash

\# Ejemplo de variable de entorno para Prisma y MariaDB local

DATABASE\_URL="mysql://root:root@localhost:3306/elhogardetussuenos"

**3. Levantar los Servicios de Base de Datos (Docker)**

La base de datos y el gestor phpMyAdmin se ejecutan en contenedores. Levántalos con:

Bash

docker compose up -d

**4. Instalar Dependencias y Preparar la Base de Datos**

Instala los paquetes de Node e inicializa Prisma para generar los clientes y sincronizar las tablas con MariaDB:

Bash

npm install

npx prisma generate

npx prisma db push

**5. Iniciar el Servidor de Desarrollo**

Una vez que la base de datos está lista, levanta la aplicación de Next.js en local:

Bash

npm run dev

La aplicación estará disponible en http://localhost:3000. Para acceder a la gestión de la base de datos, entra en phpMyAdmin a través del puerto configurado en tu Docker (generalmente http://localhost:8080).

-----
**🌿 Flujo de Trabajo y Despliegue (Git & Azure)**

El proyecto cuenta con integración y despliegue continuo (CI/CD) configurado mediante GitHub Actions.

- **Rama develop:** Utilizada para integrar nuevas funcionalidades, pruebas y desarrollo diario.
- **Rama main:** Representa el entorno de producción.

**¿Cómo desplegar?** Cualquier Merge o Push realizado sobre la rama main disparará automáticamente un workflow de GitHub Actions que construirá la aplicación y subirá los cambios directamente a la infraestructura de Azure.

-----
**🌐 Entorno de Producción**

La aplicación está desplegada en Azure y es accesible públicamente a través del dominio personalizado:

- **Web Pública:** [www.elhogardetusuenos.com](https://www.elhogardetusuenos.com)
- *(URL interna original de Azure: https://tenda-hogar-fwhfaxhee9ftche9.francecentral-01.azurewebsites.net/)*
-----
**🔧 Resolución de Problemas Frecuentes (Troubleshooting)**

Durante el desarrollo en local, podrías enfrentarte a algunos de estos escenarios comunes. Aquí tienes cómo solucionarlos rápidamente:

**1. Los estilos de Tailwind CSS no cargan en local:** Esto suele deberse a un problema de caché de Next.js.

- **Solución:** Detén el servidor (Ctrl + C), elimina la carpeta oculta .next ejecutando rm -rf .next (en Mac/Linux) o borrándola manualmente, y vuelve a ejecutar npm run dev.

**2. Problemas con la carpeta de Prisma o "Client no encontrado":** Si el cliente de Prisma falla o no reconoce los últimos cambios de tu esquema tras hacer un pull.

- **Solución:** Regenera los artefactos de Prisma forzando la creación en los módulos locales:

Bash

npx prisma generate

**3. Errores de permisos al ejecutar scripts o Docker (Linux/WSL):** Si obtienes un error de "Permission denied" al intentar levantar los contenedores o modificar archivos generados.

- **Solución Docker:** Asegúrate de ejecutar Docker con sudo o añade tu usuario al grupo de docker (sudo usermod -aG docker $USER).
- **Solución Archivos:** Corrige los permisos de la carpeta del proyecto con sudo chown -R $USER:$USER .

