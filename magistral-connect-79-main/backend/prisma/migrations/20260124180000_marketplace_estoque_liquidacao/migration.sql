-- AlterTable User: adicionar isCooperativaAdmin (sem perda de dados)
ALTER TABLE `User` ADD COLUMN `isCooperativaAdmin` BOOLEAN NOT NULL DEFAULT false;
UPDATE `User` SET `isCooperativaAdmin` = true WHERE `email` = 'usuario@magistral.com';

-- CreateTable Product (estoque-alvo e atual da Cooperativa por insumo)
CREATE TABLE `Product` (
    `id` VARCHAR(191) NOT NULL,
    `substanceId` VARCHAR(191) NOT NULL,
    `targetStock` DOUBLE NOT NULL DEFAULT 0,
    `currentStock` DOUBLE NOT NULL DEFAULT 0,
    `unit` VARCHAR(191) NOT NULL DEFAULT 'g',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Product_substanceId_key`(`substanceId`),
    INDEX `Product_substanceId_idx`(`substanceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable InventoryItem (posse vs propriedade: ownerId = dono legal, holderId = quem guarda)
CREATE TABLE `InventoryItem` (
    `id` VARCHAR(191) NOT NULL,
    `substanceId` VARCHAR(191) NOT NULL,
    `rawMaterialId` VARCHAR(191) NULL,
    `batch` VARCHAR(191) NULL,
    `ownerId` VARCHAR(191) NOT NULL,
    `holderId` VARCHAR(191) NOT NULL,
    `quantity` DOUBLE NOT NULL,
    `unit` VARCHAR(191) NOT NULL,
    `expirationDate` DATETIME(3) NOT NULL,
    `isExcess` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `InventoryItem_substanceId_idx`(`substanceId`),
    INDEX `InventoryItem_ownerId_idx`(`ownerId`),
    INDEX `InventoryItem_holderId_idx`(`holderId`),
    INDEX `InventoryItem_isExcess_idx`(`isExcess`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable Transaction: tipo MARKETPLACE | LIQUIDACAO; proposalId/offerId/offerType opcionais
ALTER TABLE `Transaction` ADD COLUMN `type` ENUM('MARKETPLACE', 'LIQUIDACAO') NOT NULL DEFAULT 'MARKETPLACE';

ALTER TABLE `Transaction` DROP FOREIGN KEY `Transaction_proposalId_fkey`;
ALTER TABLE `Transaction` MODIFY `proposalId` VARCHAR(191) NULL;
ALTER TABLE `Transaction` MODIFY `offerId` VARCHAR(191) NULL;
ALTER TABLE `Transaction` MODIFY `offerType` ENUM('sell', 'buy') NULL;
ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_proposalId_fkey` FOREIGN KEY (`proposalId`) REFERENCES `OfferProposal`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX `Transaction_type_idx` ON `Transaction`(`type`);

-- FKs Product e InventoryItem
ALTER TABLE `Product` ADD CONSTRAINT `Product_substanceId_fkey` FOREIGN KEY (`substanceId`) REFERENCES `Substance`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `InventoryItem` ADD CONSTRAINT `InventoryItem_substanceId_fkey` FOREIGN KEY (`substanceId`) REFERENCES `Substance`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `InventoryItem` ADD CONSTRAINT `InventoryItem_rawMaterialId_fkey` FOREIGN KEY (`rawMaterialId`) REFERENCES `RawMaterial`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `InventoryItem` ADD CONSTRAINT `InventoryItem_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `InventoryItem` ADD CONSTRAINT `InventoryItem_holderId_fkey` FOREIGN KEY (`holderId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
