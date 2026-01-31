-- Backup (segurança)
CREATE TABLE IF NOT EXISTS `TransparencyNews_backup_20260125_page` AS
SELECT * FROM `TransparencyNews`;

-- Adicionar coluna de "página" para organizar as novidades em acordeão
ALTER TABLE `TransparencyNews`
  ADD COLUMN `page` VARCHAR(64) NOT NULL DEFAULT 'dashboard';

-- Índice para agrupamento/contagem por página
CREATE INDEX `TransparencyNews_page_idx` ON `TransparencyNews`(`page`);

