-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `role` ENUM('master', 'cooperado', 'padrao') NOT NULL DEFAULT 'padrao',
    `company` VARCHAR(191) NULL,
    `cnpj` VARCHAR(191) NULL,
    `razaoSocial` VARCHAR(191) NULL,
    `approved` BOOLEAN NOT NULL DEFAULT false,
    `status` ENUM('active', 'banned', 'inactive') NOT NULL DEFAULT 'active',
    `contribution` DOUBLE NOT NULL DEFAULT 0,
    `currentValue` DOUBLE NOT NULL DEFAULT 0,
    `proceeds` DOUBLE NULL,
    `balanceToReceive` DOUBLE NULL,
    `pixKey` VARCHAR(191) NULL,
    `pixBank` VARCHAR(191) NULL,
    `pixQrCode` VARCHAR(191) NULL,
    `profilePicture` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `bannedAt` DATETIME(3) NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    INDEX `User_email_idx`(`email`),
    INDEX `User_role_idx`(`role`),
    INDEX `User_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PendingPayment` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `userName` VARCHAR(191) NOT NULL,
    `company` VARCHAR(191) NULL,
    `cnpj` VARCHAR(191) NULL,
    `amount` DOUBLE NOT NULL,
    `reason` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `paidAt` DATETIME(3) NULL,

    INDEX `PendingPayment_userId_idx`(`userId`),
    INDEX `PendingPayment_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExitRequest` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `userName` VARCHAR(191) NOT NULL,
    `company` VARCHAR(191) NULL,
    `cnpj` VARCHAR(191) NULL,
    `currentValue` DOUBLE NOT NULL,
    `reason` VARCHAR(191) NULL,
    `status` ENUM('pending', 'approved', 'rejected', 'cancelled') NOT NULL DEFAULT 'pending',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reviewedAt` DATETIME(3) NULL,
    `reviewedBy` VARCHAR(191) NULL,
    `rejectionReason` VARCHAR(191) NULL,

    INDEX `ExitRequest_userId_idx`(`userId`),
    INDEX `ExitRequest_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExtraUserRequest` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `userName` VARCHAR(191) NOT NULL,
    `requestedUsers` JSON NOT NULL,
    `reason` VARCHAR(191) NULL,
    `status` ENUM('pending', 'approved', 'rejected', 'cancelled') NOT NULL DEFAULT 'pending',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reviewedAt` DATETIME(3) NULL,
    `reviewedBy` VARCHAR(191) NULL,
    `rejectionReason` VARCHAR(191) NULL,

    INDEX `ExtraUserRequest_userId_idx`(`userId`),
    INDEX `ExtraUserRequest_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BankDataChangeRequest` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `userName` VARCHAR(191) NOT NULL,
    `currentPixKey` VARCHAR(191) NULL,
    `newPixKey` VARCHAR(191) NULL,
    `pixBank` VARCHAR(191) NULL,
    `bankName` VARCHAR(191) NULL,
    `accountType` VARCHAR(191) NULL,
    `agency` VARCHAR(191) NULL,
    `account` VARCHAR(191) NULL,
    `accountHolder` VARCHAR(191) NULL,
    `currentCnpj` VARCHAR(191) NULL,
    `newCnpj` VARCHAR(191) NULL,
    `currentRazaoSocial` VARCHAR(191) NULL,
    `newRazaoSocial` VARCHAR(191) NULL,
    `reason` VARCHAR(191) NULL,
    `status` ENUM('pending', 'approved', 'rejected', 'cancelled') NOT NULL DEFAULT 'pending',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reviewedAt` DATETIME(3) NULL,
    `reviewedBy` VARCHAR(191) NULL,
    `rejectionReason` VARCHAR(191) NULL,

    INDEX `BankDataChangeRequest_userId_idx`(`userId`),
    INDEX `BankDataChangeRequest_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `financial_config` (
    `id` VARCHAR(191) NOT NULL,
    `totalApplied` DOUBLE NOT NULL DEFAULT 0,
    `cdiRate` DOUBLE NOT NULL DEFAULT 0,
    `lastUpdate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Substance` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `synonyms` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdBy` VARCHAR(191) NULL,

    UNIQUE INDEX `Substance_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RawMaterial` (
    `id` VARCHAR(191) NOT NULL,
    `substanceId` VARCHAR(191) NOT NULL,
    `substanceName` VARCHAR(191) NOT NULL,
    `batch` VARCHAR(191) NOT NULL,
    `supplier` VARCHAR(191) NOT NULL,
    `manufacturer` VARCHAR(191) NULL,
    `manufacturingDate` DATETIME(3) NOT NULL,
    `expiryDate` DATETIME(3) NOT NULL,
    `pdfUrl` VARCHAR(191) NULL,
    `pdfFileName` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `isExpired` BOOLEAN NOT NULL DEFAULT false,
    `purchaseDate` DATETIME(3) NULL,
    `purchaseQuantity` DOUBLE NULL,
    `purchaseUnit` VARCHAR(191) NULL,
    `purchasePrice` DOUBLE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `RawMaterial_substanceId_idx`(`substanceId`),
    INDEX `RawMaterial_createdBy_idx`(`createdBy`),
    INDEX `RawMaterial_isExpired_idx`(`isExpired`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SubstanceSuggestion` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `suggestedName` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NOT NULL,
    `userName` VARCHAR(191) NOT NULL,
    `status` ENUM('pending', 'approved', 'rejected', 'cancelled') NOT NULL DEFAULT 'pending',
    `rejectionReason` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NOT NULL,
    `approvedAt` DATETIME(3) NULL,
    `rejectedAt` DATETIME(3) NULL,

    INDEX `SubstanceSuggestion_userId_idx`(`userId`),
    INDEX `SubstanceSuggestion_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SupplierRequest` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `userName` VARCHAR(191) NOT NULL,
    `company` VARCHAR(191) NULL,
    `status` ENUM('pending', 'approved', 'rejected', 'cancelled') NOT NULL DEFAULT 'pending',
    `rejectionReason` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reviewedAt` DATETIME(3) NULL,
    `reviewedBy` VARCHAR(191) NULL,
    `supplierId` VARCHAR(191) NULL,

    INDEX `SupplierRequest_userId_idx`(`userId`),
    INDEX `SupplierRequest_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Supplier` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `contact` VARCHAR(191) NULL,
    `whatsapp` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Supplier_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SupplierDocument` (
    `id` VARCHAR(191) NOT NULL,
    `type` ENUM('afe', 'ae', 'licenca_sanitaria', 'crt', 'questionario') NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `fileUrl` VARCHAR(191) NOT NULL,
    `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `uploadedBy` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SupplierQualificationRequest` (
    `id` VARCHAR(191) NOT NULL,
    `supplierId` VARCHAR(191) NOT NULL,
    `supplierName` VARCHAR(191) NOT NULL,
    `requestedBy` VARCHAR(191) NOT NULL,
    `requestedByName` VARCHAR(191) NOT NULL,
    `status` ENUM('pending', 'in_progress', 'completed', 'expired') NOT NULL DEFAULT 'pending',
    `requestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completedAt` DATETIME(3) NULL,
    `completedBy` VARCHAR(191) NULL,
    `year` INTEGER NOT NULL,
    `pendingUsers` JSON NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SupplierQualification` (
    `id` VARCHAR(191) NOT NULL,
    `supplierId` VARCHAR(191) NOT NULL,
    `supplierName` VARCHAR(191) NOT NULL,
    `year` INTEGER NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'complete',
    `qualifiedBy` VARCHAR(191) NOT NULL,
    `qualifiedByName` VARCHAR(191) NOT NULL,
    `completedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MarketplaceOffer` (
    `id` VARCHAR(191) NOT NULL,
    `type` ENUM('sell', 'buy') NOT NULL,
    `rawMaterialId` VARCHAR(191) NOT NULL,
    `rawMaterialName` VARCHAR(191) NOT NULL,
    `quantity` DOUBLE NOT NULL,
    `unit` VARCHAR(191) NOT NULL,
    `pricePerUnit` DOUBLE NOT NULL,
    `expiryDate` DATETIME(3) NULL,
    `pdfUrl` VARCHAR(191) NULL,
    `maxPrice` DOUBLE NULL,
    `minExpiryDate` DATETIME(3) NULL,
    `acceptShortExpiry` BOOLEAN NULL,
    `userId` VARCHAR(191) NOT NULL,
    `userName` VARCHAR(191) NOT NULL,
    `companyName` VARCHAR(191) NULL,
    `status` ENUM('active', 'completed', 'cancelled', 'draft') NOT NULL DEFAULT 'active',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,

    INDEX `MarketplaceOffer_userId_idx`(`userId`),
    INDEX `MarketplaceOffer_status_idx`(`status`),
    INDEX `MarketplaceOffer_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OfferProposal` (
    `id` VARCHAR(191) NOT NULL,
    `offerId` VARCHAR(191) NOT NULL,
    `offerType` ENUM('sell', 'buy') NOT NULL,
    `proposerId` VARCHAR(191) NOT NULL,
    `proposerName` VARCHAR(191) NOT NULL,
    `proposerCompany` VARCHAR(191) NULL,
    `quantity` DOUBLE NOT NULL,
    `unit` VARCHAR(191) NOT NULL,
    `productExpiryDate` DATETIME(3) NULL,
    `status` ENUM('pending', 'accepted', 'rejected', 'counter_proposed') NOT NULL DEFAULT 'pending',
    `counterProposalQuantity` DOUBLE NULL,
    `counterProposalMessage` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `respondedAt` DATETIME(3) NULL,
    `completedByProposer` BOOLEAN NULL,
    `completedByOfferOwner` BOOLEAN NULL,
    `completedAt` DATETIME(3) NULL,
    `laudoId` VARCHAR(191) NULL,
    `substanceId` VARCHAR(191) NULL,
    `substanceName` VARCHAR(191) NULL,
    `isAgreement` BOOLEAN NULL,
    `cashAmount` DOUBLE NULL,
    `tradeSubstanceId` VARCHAR(191) NULL,
    `tradeSubstanceName` VARCHAR(191) NULL,
    `tradeQuantity` DOUBLE NULL,
    `tradeUnit` VARCHAR(191) NULL,
    `tradeLaudoId` VARCHAR(191) NULL,
    `rejectionReason` VARCHAR(191) NULL,

    INDEX `OfferProposal_offerId_idx`(`offerId`),
    INDEX `OfferProposal_proposerId_idx`(`proposerId`),
    INDEX `OfferProposal_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Transaction` (
    `id` VARCHAR(191) NOT NULL,
    `proposalId` VARCHAR(191) NOT NULL,
    `offerId` VARCHAR(191) NOT NULL,
    `offerType` ENUM('sell', 'buy') NOT NULL,
    `substanceId` VARCHAR(191) NOT NULL,
    `substanceName` VARCHAR(191) NOT NULL,
    `quantity` DOUBLE NOT NULL,
    `unit` VARCHAR(191) NOT NULL,
    `pricePerUnit` DOUBLE NULL,
    `totalPrice` DOUBLE NULL,
    `sellerId` VARCHAR(191) NOT NULL,
    `sellerName` VARCHAR(191) NOT NULL,
    `buyerId` VARCHAR(191) NOT NULL,
    `buyerName` VARCHAR(191) NOT NULL,
    `laudoId` VARCHAR(191) NULL,
    `laudoPdfUrl` VARCHAR(191) NULL,
    `laudoFileName` VARCHAR(191) NULL,
    `completedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Transaction_proposalId_key`(`proposalId`),
    INDEX `Transaction_sellerId_idx`(`sellerId`),
    INDEX `Transaction_buyerId_idx`(`buyerId`),
    INDEX `Transaction_completedAt_idx`(`completedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Quotation` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `userName` VARCHAR(191) NOT NULL,
    `substanceId` VARCHAR(191) NOT NULL,
    `substanceName` VARCHAR(191) NOT NULL,
    `supplierId` VARCHAR(191) NOT NULL,
    `supplierName` VARCHAR(191) NOT NULL,
    `validity` DATETIME(3) NOT NULL,
    `variations` JSON NOT NULL,
    `quotationDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `notes` VARCHAR(191) NULL,

    INDEX `Quotation_userId_idx`(`userId`),
    INDEX `Quotation_substanceId_idx`(`substanceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Notification` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `message` VARCHAR(191) NOT NULL,
    `relatedItemId` VARCHAR(191) NULL,
    `read` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Notification_userId_idx`(`userId`),
    INDEX `Notification_read_idx`(`read`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PurchaseItem` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `userName` VARCHAR(191) NOT NULL,
    `substanceId` VARCHAR(191) NOT NULL,
    `substanceName` VARCHAR(191) NOT NULL,
    `quantity` DOUBLE NOT NULL,
    `unit` VARCHAR(191) NOT NULL,
    `deadline` DATETIME(3) NOT NULL,
    `status` ENUM('pending', 'in_collective', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `collectivePurchaseId` VARCHAR(191) NULL,

    INDEX `PurchaseItem_userId_idx`(`userId`),
    INDEX `PurchaseItem_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CollectivePurchase` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `deadline` DATETIME(3) NOT NULL,
    `status` ENUM('planning', 'quotation', 'ordered', 'received', 'completed', 'cancelled') NOT NULL DEFAULT 'planning',
    `createdBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `totalQuantity` DOUBLE NULL,
    `quotationId` VARCHAR(191) NULL,

    INDEX `CollectivePurchase_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FinancialMovement` (
    `id` VARCHAR(191) NOT NULL,
    `type` ENUM('contribution', 'cdi_yield', 'proceeds', 'withdrawal', 'adjustment', 'refund') NOT NULL,
    `userId` VARCHAR(191) NULL,
    `userName` VARCHAR(191) NULL,
    `amount` DOUBLE NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `relatedItemId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdBy` VARCHAR(191) NOT NULL,

    INDEX `FinancialMovement_userId_idx`(`userId`),
    INDEX `FinancialMovement_type_idx`(`type`),
    INDEX `FinancialMovement_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TransparencyNews` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `category` ENUM('financial', 'decision', 'general', 'voting', 'update') NOT NULL,
    `relatedItemId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdBy` VARCHAR(191) NOT NULL,
    `isPinned` BOOLEAN NOT NULL DEFAULT false,

    INDEX `TransparencyNews_category_idx`(`category`),
    INDEX `TransparencyNews_isPinned_idx`(`isPinned`),
    INDEX `TransparencyNews_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Decision` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `category` ENUM('financial', 'operational', 'strategic', 'regulatory') NOT NULL,
    `status` ENUM('draft', 'published', 'approved', 'rejected', 'implemented') NOT NULL DEFAULT 'draft',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdBy` VARCHAR(191) NOT NULL,
    `publishedAt` DATETIME(3) NULL,
    `approvedAt` DATETIME(3) NULL,
    `implementedAt` DATETIME(3) NULL,
    `notes` TEXT NULL,

    INDEX `Decision_status_idx`(`status`),
    INDEX `Decision_category_idx`(`category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Voting` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `category` ENUM('financial', 'operational', 'strategic', 'regulatory') NOT NULL,
    `status` ENUM('draft', 'open', 'closed', 'approved', 'rejected') NOT NULL DEFAULT 'draft',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdBy` VARCHAR(191) NOT NULL,
    `openedAt` DATETIME(3) NULL,
    `closedAt` DATETIME(3) NULL,
    `deadline` DATETIME(3) NULL,
    `requiresQuorum` BOOLEAN NOT NULL DEFAULT false,
    `quorumPercentage` INTEGER NULL,
    `result` VARCHAR(191) NULL,
    `yesVotes` INTEGER NOT NULL DEFAULT 0,
    `noVotes` INTEGER NOT NULL DEFAULT 0,
    `abstentions` INTEGER NOT NULL DEFAULT 0,
    `totalEligibleVoters` INTEGER NOT NULL DEFAULT 0,

    INDEX `Voting_status_idx`(`status`),
    INDEX `Voting_category_idx`(`category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Vote` (
    `id` VARCHAR(191) NOT NULL,
    `votingId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `userName` VARCHAR(191) NOT NULL,
    `choice` ENUM('yes', 'no', 'abstain') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,

    INDEX `Vote_votingId_idx`(`votingId`),
    INDEX `Vote_userId_idx`(`userId`),
    UNIQUE INDEX `Vote_votingId_userId_key`(`votingId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_SupplierDocumentToSupplierQualificationRequest` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_SupplierDocumentToSupplierQualificationRequest_AB_unique`(`A`, `B`),
    INDEX `_SupplierDocumentToSupplierQualificationRequest_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_SupplierDocumentToSupplierQualification` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_SupplierDocumentToSupplierQualification_AB_unique`(`A`, `B`),
    INDEX `_SupplierDocumentToSupplierQualification_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ExitRequest` ADD CONSTRAINT `ExitRequest_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExtraUserRequest` ADD CONSTRAINT `ExtraUserRequest_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BankDataChangeRequest` ADD CONSTRAINT `BankDataChangeRequest_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RawMaterial` ADD CONSTRAINT `RawMaterial_substanceId_fkey` FOREIGN KEY (`substanceId`) REFERENCES `Substance`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RawMaterial` ADD CONSTRAINT `RawMaterial_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SubstanceSuggestion` ADD CONSTRAINT `SubstanceSuggestion_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SupplierRequest` ADD CONSTRAINT `SupplierRequest_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Supplier` ADD CONSTRAINT `Supplier_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MarketplaceOffer` ADD CONSTRAINT `MarketplaceOffer_rawMaterialId_fkey` FOREIGN KEY (`rawMaterialId`) REFERENCES `RawMaterial`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MarketplaceOffer` ADD CONSTRAINT `MarketplaceOffer_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OfferProposal` ADD CONSTRAINT `OfferProposal_offerId_fkey` FOREIGN KEY (`offerId`) REFERENCES `MarketplaceOffer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OfferProposal` ADD CONSTRAINT `OfferProposal_proposerId_fkey` FOREIGN KEY (`proposerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_proposalId_fkey` FOREIGN KEY (`proposalId`) REFERENCES `OfferProposal`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_buyerId_fkey` FOREIGN KEY (`buyerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Quotation` ADD CONSTRAINT `Quotation_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Quotation` ADD CONSTRAINT `Quotation_substanceId_fkey` FOREIGN KEY (`substanceId`) REFERENCES `Substance`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseItem` ADD CONSTRAINT `PurchaseItem_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseItem` ADD CONSTRAINT `PurchaseItem_substanceId_fkey` FOREIGN KEY (`substanceId`) REFERENCES `Substance`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FinancialMovement` ADD CONSTRAINT `FinancialMovement_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Vote` ADD CONSTRAINT `Vote_votingId_fkey` FOREIGN KEY (`votingId`) REFERENCES `Voting`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Vote` ADD CONSTRAINT `Vote_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_SupplierDocumentToSupplierQualificationRequest` ADD CONSTRAINT `_SupplierDocumentToSupplierQualificationRequest_A_fkey` FOREIGN KEY (`A`) REFERENCES `SupplierDocument`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_SupplierDocumentToSupplierQualificationRequest` ADD CONSTRAINT `_SupplierDocumentToSupplierQualificationRequest_B_fkey` FOREIGN KEY (`B`) REFERENCES `SupplierQualificationRequest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_SupplierDocumentToSupplierQualification` ADD CONSTRAINT `_SupplierDocumentToSupplierQualification_A_fkey` FOREIGN KEY (`A`) REFERENCES `SupplierDocument`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_SupplierDocumentToSupplierQualification` ADD CONSTRAINT `_SupplierDocumentToSupplierQualification_B_fkey` FOREIGN KEY (`B`) REFERENCES `SupplierQualification`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
