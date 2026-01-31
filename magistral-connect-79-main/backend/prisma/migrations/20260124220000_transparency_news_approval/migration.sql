-- AlterTable TransparencyNews: aprovação antes de liberar para cooperados (sem perda de dados)
ALTER TABLE `TransparencyNews` ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'pending';
ALTER TABLE `TransparencyNews` ADD COLUMN `approvedAt` DATETIME(3) NULL;
ALTER TABLE `TransparencyNews` ADD COLUMN `approvedBy` VARCHAR(191) NULL;

-- Existentes (criados antes desta migração): marcar como aprovados.
UPDATE `TransparencyNews` SET `status` = 'approved', `approvedAt` = `createdAt`, `approvedBy` = `createdBy` WHERE `approvedAt` IS NULL;

CREATE INDEX `TransparencyNews_status_idx` ON `TransparencyNews`(`status`);
