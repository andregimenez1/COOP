-- Backup (regra de proteção de dados)
CREATE TABLE IF NOT EXISTS `SupplierDocument_backup_20260125` AS
SELECT * FROM `SupplierDocument`;

-- Adicionar validade por documento (não destrutivo)
ALTER TABLE `SupplierDocument`
  ADD COLUMN `validUntil` DATETIME(3) NULL;

-- Validade indeterminada (ex.: AE/AFE/CRT)
ALTER TABLE `SupplierDocument`
  ADD COLUMN `validIndefinitely` BOOLEAN NOT NULL DEFAULT FALSE;

