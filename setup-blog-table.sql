-- Crear tabla articulo si no existe
CREATE TABLE IF NOT EXISTS `articulo` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `titulo` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `extracto` LONGTEXT,
    `contenidoHtml` LONGTEXT NOT NULL,
    `imagenPortada` VARCHAR(191),
    `autor` VARCHAR(191) NOT NULL DEFAULT 'El equipo de tu Hogar',
    `activo` BOOLEAN NOT NULL DEFAULT false,
    `destacado` BOOLEAN NOT NULL DEFAULT false,
    `metaTitulo` VARCHAR(191),
    `metaDescripcion` LONGTEXT,
    `etiquetas` VARCHAR(191),
    `vistas` INT NOT NULL DEFAULT 0,
    `fechaPublicacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY `articulo_slug_key`(`slug`),
    INDEX `articulo_slug_idx`(`slug`),
    INDEX `articulo_activo_idx`(`activo`),
    INDEX `articulo_fechaPublicacion_idx`(`fechaPublicacion`),
    PRIMARY KEY (`id`)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
