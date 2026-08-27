-- Tabla de enlaces de recuperación de contraseña (modelo `password_reset`).
--
-- Alternativa a `npm run db:push` cuando en producción se prefiere aplicar el
-- cambio a mano. Es equivalente a lo que genera Prisma para este modelo.
-- Sólo crea una tabla nueva: no toca ninguna existente.

CREATE TABLE IF NOT EXISTS `password_reset` (
  `id`        INT          NOT NULL AUTO_INCREMENT,
  `clienteId` INT          NOT NULL,
  `tokenHash` VARCHAR(64)  NOT NULL,
  `expiraEn`  DATETIME(3)  NOT NULL,
  `usadoEn`   DATETIME(3)  NULL,
  `ip`        VARCHAR(64)  NULL,
  `createdAt` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `password_reset_tokenHash_key` (`tokenHash`),
  INDEX `password_reset_clienteId_idx` (`clienteId`),
  INDEX `password_reset_expiraEn_idx` (`expiraEn`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
