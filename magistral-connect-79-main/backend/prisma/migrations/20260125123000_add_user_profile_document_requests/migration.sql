-- Solicitações de documentos do perfil do cooperado (avaliadas pelo admin)
-- (nova tabela: não há risco de perda de dados)

CREATE TABLE IF NOT EXISTS `UserProfileDocumentRequest` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `userName` VARCHAR(191) NOT NULL,
  `type` ENUM('ae','afe','licenca_sanitaria','corpo_bombeiros') NOT NULL,
  `fileName` VARCHAR(191) NOT NULL,
  `fileUrl` LONGTEXT NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `validUntil` DATETIME(3) NULL,
  `validIndefinitely` BOOLEAN NOT NULL DEFAULT FALSE,

  `status` ENUM('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
  `reviewedAt` DATETIME(3) NULL,
  `reviewedBy` VARCHAR(191) NULL,
  `rejectionReason` VARCHAR(191) NULL,

  INDEX `UserProfileDocumentRequest_userId_idx` (`userId`),
  INDEX `UserProfileDocumentRequest_type_idx` (`type`),
  INDEX `UserProfileDocumentRequest_status_idx` (`status`),
  INDEX `UserProfileDocumentRequest_createdAt_idx` (`createdAt`),

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `UserProfileDocumentRequest`
  ADD CONSTRAINT `UserProfileDocumentRequest_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

