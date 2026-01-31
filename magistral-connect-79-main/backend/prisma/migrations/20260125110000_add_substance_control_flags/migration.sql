-- Backup (regra de proteção de dados)
CREATE TABLE IF NOT EXISTS `Substance_backup_20260125` AS
SELECT * FROM `Substance`;

-- Flags regulatórias (não destrutivo)
ALTER TABLE `Substance`
  ADD COLUMN `requiresAe` BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN `requiresPf` BOOLEAN NOT NULL DEFAULT FALSE;

