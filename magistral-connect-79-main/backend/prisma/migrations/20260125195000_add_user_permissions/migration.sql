-- Criar tabela de permissões por usuário (hierarquia por função)
CREATE TABLE IF NOT EXISTS `UserPermission` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `key` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `createdBy` VARCHAR(191) NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `UserPermission_userId_key_key` (`userId`, `key`),
  INDEX `UserPermission_userId_idx` (`userId`),
  INDEX `UserPermission_key_idx` (`key`),
  INDEX `UserPermission_createdAt_idx` (`createdAt`),
  CONSTRAINT `UserPermission_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

