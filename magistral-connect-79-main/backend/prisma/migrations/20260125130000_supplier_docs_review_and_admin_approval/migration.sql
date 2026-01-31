-- Avaliação do admin para qualificação de fornecedores
-- Regra: não destruir dados → criar backups antes de alterar tabela existente

-- Backup
CREATE TABLE IF NOT EXISTS `SupplierDocument_backup_20260125_review` AS
SELECT * FROM `SupplierDocument`;

CREATE TABLE IF NOT EXISTS `SupplierQualificationRequest_backup_20260125_review` AS
SELECT * FROM `SupplierQualificationRequest`;

-- Campos de avaliação no SupplierDocument
ALTER TABLE `SupplierDocument`
  ADD COLUMN `reviewStatus` ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  ADD COLUMN `reviewedAt` DATETIME(3) NULL,
  ADD COLUMN `reviewedBy` VARCHAR(191) NULL,
  ADD COLUMN `rejectionReason` VARCHAR(191) NULL;

-- Flag "aguardando avaliação" na request
ALTER TABLE `SupplierQualificationRequest`
  ADD COLUMN `awaitingAdminReview` BOOLEAN NOT NULL DEFAULT FALSE;

