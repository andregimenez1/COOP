-- Backup (regra de proteção de dados)
CREATE TABLE IF NOT EXISTS `SupplierDocumentValidityPolicy_backup_20260125` AS
SELECT * FROM `SupplierDocumentValidityPolicy`;

-- Atualizar ENUM de tipo de documento (SupplierDocument)
ALTER TABLE `SupplierDocument`
  MODIFY `type` ENUM('afe','ae','licenca_sanitaria','crt','questionario','policia_federal') NOT NULL;

-- Atualizar ENUM de tipo de documento (SupplierDocumentValidityPolicy)
ALTER TABLE `SupplierDocumentValidityPolicy`
  MODIFY `type` ENUM('afe','ae','licenca_sanitaria','crt','questionario','policia_federal') NOT NULL;

