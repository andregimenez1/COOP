-- Criar tabela de política de validade (não destrutivo)
CREATE TABLE IF NOT EXISTS `SupplierDocumentValidityPolicy` (
  `id` VARCHAR(191) NOT NULL,
  `type` ENUM('afe','ae','licenca_sanitaria','crt','questionario') NOT NULL,
  `mode` ENUM('indefinite','months') NOT NULL DEFAULT 'indefinite',
  `months` INTEGER NULL,
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `updatedBy` VARCHAR(191) NULL,
  UNIQUE INDEX `SupplierDocumentValidityPolicy_type_key`(`type`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Defaults: AE/AFE indeterminadas (admin pode mudar para 6/12/24 meses)
INSERT INTO `SupplierDocumentValidityPolicy` (`id`, `type`, `mode`, `months`, `updatedBy`)
SELECT UUID(), 'afe', 'indefinite', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM `SupplierDocumentValidityPolicy` WHERE `type` = 'afe');

INSERT INTO `SupplierDocumentValidityPolicy` (`id`, `type`, `mode`, `months`, `updatedBy`)
SELECT UUID(), 'ae', 'indefinite', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM `SupplierDocumentValidityPolicy` WHERE `type` = 'ae');

