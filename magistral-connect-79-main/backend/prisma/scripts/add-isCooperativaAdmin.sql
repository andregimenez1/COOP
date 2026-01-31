-- Desbloquear login: adicionar coluna isCooperativaAdmin (execute no MySQL se a migration ainda não foi aplicada).
-- Se a coluna já existir, ignore o erro "Duplicate column name".

ALTER TABLE `User` ADD COLUMN `isCooperativaAdmin` BOOLEAN NOT NULL DEFAULT false;
UPDATE `User` SET `isCooperativaAdmin` = true WHERE `email` = 'usuario@magistral.com';
