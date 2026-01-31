-- Adicionar coluna deletedUserSnapshot à tabela PendingPayment
-- Execute este script no phpMyAdmin na base de dados 'magistral_connect'

-- Verificar se a coluna já existe antes de adicionar
SET @col_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'PendingPayment'
    AND COLUMN_NAME = 'deletedUserSnapshot'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `PendingPayment` ADD COLUMN `deletedUserSnapshot` JSON NULL;',
  'SELECT "Coluna deletedUserSnapshot já existe" AS message;'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
