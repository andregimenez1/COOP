-- Criar tabela de decisões de votação
CREATE TABLE IF NOT EXISTS `votingdecision` (
  `id` VARCHAR(191) NOT NULL,
  `votingId` VARCHAR(191) NOT NULL,
  `decision` VARCHAR(191) NOT NULL,
  `reason` TEXT NULL,
  `createdBy` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `VotingDecision_votingId_idx` (`votingId`),
  INDEX `VotingDecision_createdBy_idx` (`createdBy`),
  CONSTRAINT `VotingDecision_votingId_fkey` FOREIGN KEY (`votingId`) REFERENCES `voting`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;