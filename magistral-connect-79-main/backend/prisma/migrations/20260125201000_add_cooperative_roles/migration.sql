-- Criar tabela de cargos (funções) da cooperativa
CREATE TABLE IF NOT EXISTS `CooperativeRole` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `createdBy` VARCHAR(191) NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `CooperativeRole_name_key` (`name`),
  INDEX `CooperativeRole_createdAt_idx` (`createdAt`),
  INDEX `CooperativeRole_updatedAt_idx` (`updatedAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Associação usuário <-> cargo
CREATE TABLE IF NOT EXISTS `UserCooperativeRole` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `roleId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `createdBy` VARCHAR(191) NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `UserCooperativeRole_userId_roleId_key` (`userId`, `roleId`),
  INDEX `UserCooperativeRole_userId_idx` (`userId`),
  INDEX `UserCooperativeRole_roleId_idx` (`roleId`),
  INDEX `UserCooperativeRole_createdAt_idx` (`createdAt`),
  CONSTRAINT `UserCooperativeRole_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `UserCooperativeRole_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `CooperativeRole`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Permissões por cargo
CREATE TABLE IF NOT EXISTS `CooperativeRolePermission` (
  `id` VARCHAR(191) NOT NULL,
  `roleId` VARCHAR(191) NOT NULL,
  `key` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `createdBy` VARCHAR(191) NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `CooperativeRolePermission_roleId_key_key` (`roleId`, `key`),
  INDEX `CooperativeRolePermission_roleId_idx` (`roleId`),
  INDEX `CooperativeRolePermission_key_idx` (`key`),
  INDEX `CooperativeRolePermission_createdAt_idx` (`createdAt`),
  CONSTRAINT `CooperativeRolePermission_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `CooperativeRole`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

