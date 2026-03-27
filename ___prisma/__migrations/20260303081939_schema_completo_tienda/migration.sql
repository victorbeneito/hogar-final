/*
  Warnings:

  - You are about to drop the column `clienteId` on the `cupon` table. All the data in the column will be lost.
  - You are about to drop the column `descuento` on the `cupon` table. All the data in the column will be lost.
  - You are about to drop the column `fechaExpiracion` on the `cupon` table. All the data in the column will be lost.
  - You are about to drop the column `usado` on the `cupon` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `pedido` table. All the data in the column will be lost.
  - You are about to drop the column `productoIdMongo` on the `pedidoproducto` table. All the data in the column will be lost.
  - You are about to drop the column `categoriaId` on the `producto` table. All the data in the column will be lost.
  - You are about to drop the column `imagenes` on the `producto` table. All the data in the column will be lost.
  - You are about to drop the column `color` on the `variante` table. All the data in the column will be lost.
  - You are about to drop the column `precio_extra` on the `variante` table. All the data in the column will be lost.
  - You are about to drop the column `tamaño` on the `variante` table. All the data in the column will be lost.
  - You are about to drop the column `tirador` on the `variante` table. All the data in the column will be lost.
  - You are about to drop the `_cuponclientesusados` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `usuario` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[nombre]` on the table `Categoria` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[slug]` on the table `Categoria` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[nif]` on the table `Cliente` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[nombre]` on the table `Marca` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[referencia]` on the table `Variante` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `slug` to the `Categoria` table without a default value. This is not possible if the table is not empty.
  - Made the column `telefono` on table `cliente` required. This step will fail if there are existing NULL values in that column.
  - Made the column `direccion` on table `cliente` required. This step will fail if there are existing NULL values in that column.
  - Made the column `codigoPostal` on table `cliente` required. This step will fail if there are existing NULL values in that column.
  - Made the column `ciudad` on table `cliente` required. This step will fail if there are existing NULL values in that column.
  - Made the column `provincia` on table `cliente` required. This step will fail if there are existing NULL values in that column.
  - Made the column `pais` on table `cliente` required. This step will fail if there are existing NULL values in that column.
  - Made the column `nif` on table `cliente` required. This step will fail if there are existing NULL values in that column.
  - Made the column `role` on table `cliente` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `fechaFin` to the `Cupon` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fechaInicio` to the `Cupon` table without a default value. This is not possible if the table is not empty.
  - Added the required column `valorDescuento` to the `Cupon` table without a default value. This is not possible if the table is not empty.
  - Made the column `envioCoste` on table `pedido` required. This step will fail if there are existing NULL values in that column.
  - Made the column `pagoRecargo` on table `pedido` required. This step will fail if there are existing NULL values in that column.
  - Made the column `subtotal` on table `pedido` required. This step will fail if there are existing NULL values in that column.
  - Made the column `descuento` on table `pedido` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `updatedAt` to the `Producto` table without a default value. This is not possible if the table is not empty.
  - Made the column `stock` on table `producto` required. This step will fail if there are existing NULL values in that column.
  - Made the column `destacado` on table `producto` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `updatedAt` to the `Variante` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `_cuponclientesusados` DROP FOREIGN KEY `_CuponClientesUsados_A_fkey`;

-- DropForeignKey
ALTER TABLE `_cuponclientesusados` DROP FOREIGN KEY `_CuponClientesUsados_B_fkey`;

-- DropForeignKey
ALTER TABLE `cupon` DROP FOREIGN KEY `Cupon_clienteId_fkey`;

-- DropForeignKey
ALTER TABLE `pedidoproducto` DROP FOREIGN KEY `PedidoProducto_pedidoId_fkey`;

-- DropForeignKey
ALTER TABLE `producto` DROP FOREIGN KEY `Producto_categoriaId_fkey`;

-- DropForeignKey
ALTER TABLE `variante` DROP FOREIGN KEY `Variante_productoId_fkey`;

-- DropIndex
DROP INDEX `Cupon_clienteId_fkey` ON `cupon`;

-- DropIndex
DROP INDEX `Producto_categoriaId_fkey` ON `producto`;

-- AlterTable
ALTER TABLE `admin` ADD COLUMN `activo` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `avatar` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `categoria` ADD COLUMN `activa` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `descripcion` TEXT NULL,
    ADD COLUMN `imagen` VARCHAR(191) NULL,
    ADD COLUMN `orden` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `parentId` INTEGER NULL,
    ADD COLUMN `slug` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `cliente` ADD COLUMN `aceptaMarketing` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `activo` BOOLEAN NOT NULL DEFAULT true,
    MODIFY `telefono` VARCHAR(191) NOT NULL,
    MODIFY `direccion` VARCHAR(191) NOT NULL,
    MODIFY `codigoPostal` VARCHAR(191) NOT NULL,
    MODIFY `ciudad` VARCHAR(191) NOT NULL,
    MODIFY `provincia` VARCHAR(191) NOT NULL,
    MODIFY `pais` VARCHAR(191) NOT NULL DEFAULT 'España',
    MODIFY `nif` VARCHAR(191) NOT NULL,
    MODIFY `role` VARCHAR(191) NOT NULL DEFAULT 'cliente';

-- AlterTable
ALTER TABLE `cupon` DROP COLUMN `clienteId`,
    DROP COLUMN `descuento`,
    DROP COLUMN `fechaExpiracion`,
    DROP COLUMN `usado`,
    ADD COLUMN `activo` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `cantidadTotal` INTEGER NOT NULL DEFAULT 100,
    ADD COLUMN `cantidadUsada` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `fechaFin` DATETIME(3) NOT NULL,
    ADD COLUMN `fechaInicio` DATETIME(3) NOT NULL,
    ADD COLUMN `limitePorUsuario` INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN `pedidoMinimo` DOUBLE NULL DEFAULT 0,
    ADD COLUMN `tipoDescuento` ENUM('PORCENTAJE', 'FIJO') NOT NULL DEFAULT 'PORCENTAJE',
    ADD COLUMN `valorDescuento` DOUBLE NOT NULL;

-- AlterTable
ALTER TABLE `marca` ADD COLUMN `activa` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `imagen` VARCHAR(191) NULL,
    MODIFY `descripcion` TEXT NULL;

-- AlterTable
ALTER TABLE `pedido` DROP COLUMN `createdAt`,
    ADD COLUMN `apellidos` VARCHAR(191) NULL,
    ADD COLUMN `nif` VARCHAR(191) NULL,
    ADD COLUMN `notas` TEXT NULL,
    ADD COLUMN `pais` VARCHAR(191) NULL DEFAULT 'España',
    ADD COLUMN `provincia` VARCHAR(191) NULL,
    MODIFY `envioCoste` DOUBLE NOT NULL DEFAULT 0,
    MODIFY `pagoRecargo` DOUBLE NOT NULL DEFAULT 0,
    MODIFY `estadoPago` ENUM('PENDIENTE', 'PAGADO', 'FALLIDO', 'REEMBOLSADO') NOT NULL DEFAULT 'PENDIENTE',
    MODIFY `subtotal` DOUBLE NOT NULL,
    MODIFY `descuento` DOUBLE NOT NULL DEFAULT 0,
    MODIFY `estado` ENUM('PENDIENTE', 'PROCESANDO', 'ENVIADO', 'ENTREGADO', 'CANCELADO', 'DEVUELTO') NOT NULL DEFAULT 'PENDIENTE';

-- AlterTable
ALTER TABLE `pedidoproducto` DROP COLUMN `productoIdMongo`,
    ADD COLUMN `productoIdRef` INTEGER NULL,
    ADD COLUMN `varianteIdRef` INTEGER NULL,
    ADD COLUMN `varianteInfo` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `producto` DROP COLUMN `categoriaId`,
    DROP COLUMN `imagenes`,
    ADD COLUMN `activo` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `altura` DOUBLE NULL,
    ADD COLUMN `anchura` DOUBLE NULL,
    ADD COLUMN `condicion` VARCHAR(191) NOT NULL DEFAULT 'nuevo',
    ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `disponiblePedidos` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `ean13` VARCHAR(191) NULL,
    ADD COLUMN `enOferta` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `etiquetas` JSON NULL,
    ADD COLUMN `gastosEnvioExtra` DOUBLE NULL DEFAULT 0,
    ADD COLUMN `isbn` VARCHAR(191) NULL,
    ADD COLUMN `metaDescripcion` TEXT NULL,
    ADD COLUMN `metaTitulo` VARCHAR(191) NULL,
    ADD COLUMN `mostrarCondicion` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `peso` DOUBLE NULL,
    ADD COLUMN `plazoEntregaSinStock` VARCHAR(191) NULL,
    ADD COLUMN `plazoEntregaStock` VARCHAR(191) NULL,
    ADD COLUMN `precioCoste` DOUBLE NULL,
    ADD COLUMN `precioOferta` DOUBLE NULL,
    ADD COLUMN `profundidad` DOUBLE NULL,
    ADD COLUMN `reglaImpuestoId` INTEGER NULL,
    ADD COLUMN `resumen` TEXT NULL,
    ADD COLUMN `soloWeb` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `stockMinimo` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `tieneVariantes` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `upc` VARCHAR(191) NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL,
    ADD COLUMN `visibilidad` VARCHAR(191) NOT NULL DEFAULT 'tienda',
    MODIFY `descripcion` TEXT NULL,
    MODIFY `descripcion_html` TEXT NULL,
    MODIFY `stock` INTEGER NOT NULL DEFAULT 0,
    MODIFY `destacado` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `variante` DROP COLUMN `color`,
    DROP COLUMN `precio_extra`,
    DROP COLUMN `tamaño`,
    DROP COLUMN `tirador`,
    ADD COLUMN `activa` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `esDefault` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `precioExtra` DOUBLE NOT NULL DEFAULT 0,
    ADD COLUMN `referencia` VARCHAR(191) NULL,
    ADD COLUMN `stock` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL;

-- DropTable
DROP TABLE `_cuponclientesusados`;

-- DropTable
DROP TABLE `usuario`;

-- CreateTable
CREATE TABLE `Atributo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `orden` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `Atributo_nombre_key`(`nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AtributoValor` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `valor` VARCHAR(191) NOT NULL,
    `colorHex` VARCHAR(191) NULL,
    `imagen` VARCHAR(191) NULL,
    `orden` INTEGER NOT NULL DEFAULT 0,
    `atributoId` INTEGER NOT NULL,

    INDEX `AtributoValor_atributoId_idx`(`atributoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Proveedor` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `descripcion` TEXT NULL,
    `imagen` VARCHAR(191) NULL,
    `contacto` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `telefono` VARCHAR(191) NULL,
    `direccion` VARCHAR(191) NULL,
    `nif` VARCHAR(191) NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `marcaId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Proveedor_nombre_key`(`nombre`),
    INDEX `Proveedor_marcaId_idx`(`marcaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReglaImpuesto` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `porcentaje` DOUBLE NOT NULL,
    `activa` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `ReglaImpuesto_nombre_key`(`nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductoImagen` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `url` VARCHAR(191) NOT NULL,
    `orden` INTEGER NOT NULL DEFAULT 0,
    `esPortada` BOOLEAN NOT NULL DEFAULT false,
    `productoId` INTEGER NOT NULL,

    INDEX `ProductoImagen_productoId_idx`(`productoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductoCategoria` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `productoId` INTEGER NOT NULL,
    `categoriaId` INTEGER NOT NULL,
    `esPrincipal` BOOLEAN NOT NULL DEFAULT false,

    INDEX `ProductoCategoria_productoId_idx`(`productoId`),
    INDEX `ProductoCategoria_categoriaId_idx`(`categoriaId`),
    UNIQUE INDEX `ProductoCategoria_productoId_categoriaId_key`(`productoId`, `categoriaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Caracteristica` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `clave` VARCHAR(191) NOT NULL,
    `valor` VARCHAR(191) NOT NULL,
    `orden` INTEGER NOT NULL DEFAULT 0,
    `productoId` INTEGER NOT NULL,

    INDEX `Caracteristica_productoId_idx`(`productoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PrecioEspecifico` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `productoId` INTEGER NOT NULL,
    `clienteId` INTEGER NULL,
    `pais` VARCHAR(191) NULL,
    `desde` DATETIME(3) NULL,
    `hasta` DATETIME(3) NULL,
    `cantidadMin` INTEGER NOT NULL DEFAULT 1,
    `tipoImpacto` VARCHAR(191) NOT NULL DEFAULT 'porcentaje',
    `impacto` DOUBLE NOT NULL,
    `precioFinal` DOUBLE NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,

    INDEX `PrecioEspecifico_productoId_idx`(`productoId`),
    INDEX `PrecioEspecifico_clienteId_idx`(`clienteId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VarianteAtributo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `varianteId` INTEGER NOT NULL,
    `atributoValorId` INTEGER NOT NULL,
    `atributoId` INTEGER NULL,

    INDEX `VarianteAtributo_varianteId_idx`(`varianteId`),
    INDEX `VarianteAtributo_atributoValorId_idx`(`atributoValorId`),
    INDEX `VarianteAtributo_atributoId_idx`(`atributoId`),
    UNIQUE INDEX `VarianteAtributo_varianteId_atributoValorId_key`(`varianteId`, `atributoValorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Direccion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `clienteId` INTEGER NOT NULL,
    `alias` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `apellidos` VARCHAR(191) NOT NULL,
    `empresa` VARCHAR(191) NULL,
    `nif` VARCHAR(191) NULL,
    `telefono` VARCHAR(191) NULL,
    `direccion` VARCHAR(191) NOT NULL,
    `complemento` VARCHAR(191) NULL,
    `codigoPostal` VARCHAR(191) NOT NULL,
    `ciudad` VARCHAR(191) NOT NULL,
    `provincia` VARCHAR(191) NOT NULL,
    `pais` VARCHAR(191) NOT NULL DEFAULT 'España',
    `predeterminada` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Direccion_clienteId_idx`(`clienteId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Factura` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numeroFactura` VARCHAR(191) NOT NULL,
    `pedidoId` INTEGER NOT NULL,
    `fechaFactura` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `baseImponible` DOUBLE NOT NULL,
    `porcentajeIva` DOUBLE NOT NULL DEFAULT 21,
    `totalIva` DOUBLE NOT NULL,
    `total` DOUBLE NOT NULL,
    `pdf_url` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Factura_numeroFactura_key`(`numeroFactura`),
    UNIQUE INDEX `Factura_pedidoId_key`(`pedidoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CarritoCompra` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sessionId` VARCHAR(191) NULL,
    `clienteId` INTEGER NULL,
    `total` DOUBLE NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CarritoCompra_clienteId_idx`(`clienteId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CarritoItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `carritoId` INTEGER NOT NULL,
    `productoId` INTEGER NOT NULL,
    `varianteId` INTEGER NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `precio` DOUBLE NOT NULL,
    `cantidad` INTEGER NOT NULL,
    `imagen` VARCHAR(191) NULL,

    INDEX `CarritoItem_carritoId_idx`(`carritoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cupon_uso` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cuponId` INTEGER NOT NULL,
    `clienteId` INTEGER NOT NULL,
    `veces` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `cupon_uso_clienteId_idx`(`clienteId`),
    UNIQUE INDEX `cupon_uso_cuponId_clienteId_key`(`cuponId`, `clienteId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Transporte` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `descripcion` VARCHAR(191) NULL,
    `precio` DOUBLE NOT NULL DEFAULT 0,
    `precioGratis` DOUBLE NULL,
    `tiempoEntrega` VARCHAR(191) NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `orden` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Transporte_nombre_key`(`nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FormaPago` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `descripcion` VARCHAR(191) NULL,
    `recargo` DOUBLE NOT NULL DEFAULT 0,
    `activa` BOOLEAN NOT NULL DEFAULT true,
    `orden` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `FormaPago_nombre_key`(`nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Configuracion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `clave` VARCHAR(191) NOT NULL,
    `valor` TEXT NULL,
    `grupo` VARCHAR(191) NOT NULL DEFAULT 'general',
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Configuracion_clave_key`(`clave`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Categoria_nombre_key` ON `Categoria`(`nombre`);

-- CreateIndex
CREATE UNIQUE INDEX `Categoria_slug_key` ON `Categoria`(`slug`);

-- CreateIndex
CREATE INDEX `Categoria_parentId_idx` ON `Categoria`(`parentId`);

-- CreateIndex
CREATE UNIQUE INDEX `Cliente_nif_key` ON `Cliente`(`nif`);

-- CreateIndex
CREATE UNIQUE INDEX `Marca_nombre_key` ON `Marca`(`nombre`);

-- CreateIndex
CREATE INDEX `PedidoProducto_productoIdRef_idx` ON `PedidoProducto`(`productoIdRef`);

-- CreateIndex
CREATE INDEX `PedidoProducto_varianteIdRef_idx` ON `PedidoProducto`(`varianteIdRef`);

-- CreateIndex
CREATE INDEX `Producto_reglaImpuestoId_idx` ON `Producto`(`reglaImpuestoId`);

-- CreateIndex
CREATE UNIQUE INDEX `Variante_referencia_key` ON `Variante`(`referencia`);

-- AddForeignKey
ALTER TABLE `Categoria` ADD CONSTRAINT `Categoria_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `Categoria`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AtributoValor` ADD CONSTRAINT `AtributoValor_atributoId_fkey` FOREIGN KEY (`atributoId`) REFERENCES `Atributo`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Proveedor` ADD CONSTRAINT `Proveedor_marcaId_fkey` FOREIGN KEY (`marcaId`) REFERENCES `Marca`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Producto` ADD CONSTRAINT `Producto_reglaImpuestoId_fkey` FOREIGN KEY (`reglaImpuestoId`) REFERENCES `ReglaImpuesto`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductoImagen` ADD CONSTRAINT `ProductoImagen_productoId_fkey` FOREIGN KEY (`productoId`) REFERENCES `Producto`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductoCategoria` ADD CONSTRAINT `ProductoCategoria_productoId_fkey` FOREIGN KEY (`productoId`) REFERENCES `Producto`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductoCategoria` ADD CONSTRAINT `ProductoCategoria_categoriaId_fkey` FOREIGN KEY (`categoriaId`) REFERENCES `Categoria`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Caracteristica` ADD CONSTRAINT `Caracteristica_productoId_fkey` FOREIGN KEY (`productoId`) REFERENCES `Producto`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PrecioEspecifico` ADD CONSTRAINT `PrecioEspecifico_productoId_fkey` FOREIGN KEY (`productoId`) REFERENCES `Producto`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PrecioEspecifico` ADD CONSTRAINT `PrecioEspecifico_clienteId_fkey` FOREIGN KEY (`clienteId`) REFERENCES `Cliente`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Variante` ADD CONSTRAINT `Variante_productoId_fkey` FOREIGN KEY (`productoId`) REFERENCES `Producto`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VarianteAtributo` ADD CONSTRAINT `VarianteAtributo_varianteId_fkey` FOREIGN KEY (`varianteId`) REFERENCES `Variante`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VarianteAtributo` ADD CONSTRAINT `VarianteAtributo_atributoValorId_fkey` FOREIGN KEY (`atributoValorId`) REFERENCES `AtributoValor`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VarianteAtributo` ADD CONSTRAINT `VarianteAtributo_atributoId_fkey` FOREIGN KEY (`atributoId`) REFERENCES `Atributo`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Direccion` ADD CONSTRAINT `Direccion_clienteId_fkey` FOREIGN KEY (`clienteId`) REFERENCES `Cliente`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PedidoProducto` ADD CONSTRAINT `PedidoProducto_pedidoId_fkey` FOREIGN KEY (`pedidoId`) REFERENCES `Pedido`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PedidoProducto` ADD CONSTRAINT `PedidoProducto_productoIdRef_fkey` FOREIGN KEY (`productoIdRef`) REFERENCES `Producto`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PedidoProducto` ADD CONSTRAINT `PedidoProducto_varianteIdRef_fkey` FOREIGN KEY (`varianteIdRef`) REFERENCES `Variante`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Factura` ADD CONSTRAINT `Factura_pedidoId_fkey` FOREIGN KEY (`pedidoId`) REFERENCES `Pedido`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CarritoItem` ADD CONSTRAINT `CarritoItem_carritoId_fkey` FOREIGN KEY (`carritoId`) REFERENCES `CarritoCompra`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cupon_uso` ADD CONSTRAINT `cupon_uso_clienteId_fkey` FOREIGN KEY (`clienteId`) REFERENCES `Cliente`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cupon_uso` ADD CONSTRAINT `cupon_uso_cuponId_fkey` FOREIGN KEY (`cuponId`) REFERENCES `Cupon`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- RedefineIndex
CREATE INDEX `Pedido_clienteId_idx` ON `Pedido`(`clienteId`);
DROP INDEX `Pedido_clienteId_fkey` ON `pedido`;

-- RedefineIndex
CREATE INDEX `PedidoProducto_pedidoId_idx` ON `PedidoProducto`(`pedidoId`);
DROP INDEX `PedidoProducto_pedidoId_fkey` ON `pedidoproducto`;

-- RedefineIndex
CREATE INDEX `Producto_marcaId_idx` ON `Producto`(`marcaId`);
DROP INDEX `Producto_marcaId_fkey` ON `producto`;

-- RedefineIndex
CREATE INDEX `Variante_productoId_idx` ON `Variante`(`productoId`);
DROP INDEX `Variante_productoId_fkey` ON `variante`;
