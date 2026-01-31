-- Criar tabela de configuração do Marketplace (singleton)
CREATE TABLE IF NOT EXISTS `MarketplaceConfig` (
  `id` VARCHAR(191) NOT NULL DEFAULT 'singleton',
  `minSellValidityDays` INT NOT NULL DEFAULT 30,
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `updatedBy` VARCHAR(191) NULL,
  PRIMARY KEY (`id`),
  INDEX `MarketplaceConfig_updatedAt_idx` (`updatedAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

