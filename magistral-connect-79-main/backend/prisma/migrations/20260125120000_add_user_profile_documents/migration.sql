-- Criar tabela de documentos do perfil do cooperado (exclusivo do usuário)
-- (nova tabela: não há risco de perda de dados)

CREATE TABLE IF NOT EXISTS `UserProfileDocument` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `type` ENUM('ae','afe','licenca_sanitaria','corpo_bombeiros') NOT NULL,
  `fileName` VARCHAR(191) NOT NULL,
  `fileUrl` LONGTEXT NOT NULL,
  `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `validUntil` DATETIME(3) NULL,
  `validIndefinitely` BOOLEAN NOT NULL DEFAULT FALSE,

  INDEX `UserProfileDocument_userId_idx` (`userId`),
  INDEX `UserProfileDocument_type_idx` (`type`),
  INDEX `UserProfileDocument_uploadedAt_idx` (`uploadedAt`),

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `UserProfileDocument`
  ADD CONSTRAINT `UserProfileDocument_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

