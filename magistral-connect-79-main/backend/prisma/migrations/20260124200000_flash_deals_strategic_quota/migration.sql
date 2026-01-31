-- CreateTable FlashDeal
CREATE TABLE `FlashDeal` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `startTime` DATETIME(3) NOT NULL,
    `endTime` DATETIME(3) NOT NULL,
    `specialPrice` DOUBLE NOT NULL,
    `stockLimit` DOUBLE NOT NULL,
    `limitPerUser` DOUBLE NULL,
    `unit` VARCHAR(191) NOT NULL DEFAULT 'g',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `FlashDeal_productId_idx`(`productId`),
    INDEX `FlashDeal_startTime_endTime_idx`(`startTime`, `endTime`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable FlashDealClaim
CREATE TABLE `FlashDealClaim` (
    `id` VARCHAR(191) NOT NULL,
    `flashDealId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `quantity` DOUBLE NOT NULL,
    `deliveryType` ENUM('HUB', 'COOPERATIVA') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `FlashDealClaim_flashDealId_idx`(`flashDealId`),
    INDEX `FlashDealClaim_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable StrategicQuota
CREATE TABLE `StrategicQuota` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `totalReserved` DOUBLE NOT NULL,
    `resetDate` DATETIME(3) NOT NULL,
    `periodDays` INTEGER NOT NULL DEFAULT 30,
    `unit` VARCHAR(191) NOT NULL DEFAULT 'g',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `StrategicQuota_productId_idx`(`productId`),
    INDEX `StrategicQuota_resetDate_idx`(`resetDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable StrategicReserveClaim
CREATE TABLE `StrategicReserveClaim` (
    `id` VARCHAR(191) NOT NULL,
    `strategicQuotaId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `quantity` DOUBLE NOT NULL,
    `deliveryType` ENUM('HUB', 'COOPERATIVA') NOT NULL,
    `claimedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `StrategicReserveClaim_strategicQuotaId_idx`(`strategicQuotaId`),
    INDEX `StrategicReserveClaim_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- FKs
ALTER TABLE `FlashDeal` ADD CONSTRAINT `FlashDeal_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `FlashDealClaim` ADD CONSTRAINT `FlashDealClaim_flashDealId_fkey` FOREIGN KEY (`flashDealId`) REFERENCES `FlashDeal`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `FlashDealClaim` ADD CONSTRAINT `FlashDealClaim_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `StrategicQuota` ADD CONSTRAINT `StrategicQuota_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `StrategicReserveClaim` ADD CONSTRAINT `StrategicReserveClaim_strategicQuotaId_fkey` FOREIGN KEY (`strategicQuotaId`) REFERENCES `StrategicQuota`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `StrategicReserveClaim` ADD CONSTRAINT `StrategicReserveClaim_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
