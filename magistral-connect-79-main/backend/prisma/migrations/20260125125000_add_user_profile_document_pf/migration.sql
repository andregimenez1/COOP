-- Adiciona PF (policia_federal) aos tipos de documento do perfil do cooperado
-- Regra: não destruir dados → criar backups antes de alterar ENUM

-- Backup tabelas (seed de segurança)
CREATE TABLE IF NOT EXISTS `UserProfileDocument_backup_20260125_pf` AS
SELECT * FROM `UserProfileDocument`;

CREATE TABLE IF NOT EXISTS `UserProfileDocumentRequest_backup_20260125_pf` AS
SELECT * FROM `UserProfileDocumentRequest`;

-- Atualizar ENUM para incluir policia_federal
ALTER TABLE `UserProfileDocument`
  MODIFY COLUMN `type` ENUM('ae','afe','licenca_sanitaria','corpo_bombeiros','policia_federal') NOT NULL;

ALTER TABLE `UserProfileDocumentRequest`
  MODIFY COLUMN `type` ENUM('ae','afe','licenca_sanitaria','corpo_bombeiros','policia_federal') NOT NULL;

