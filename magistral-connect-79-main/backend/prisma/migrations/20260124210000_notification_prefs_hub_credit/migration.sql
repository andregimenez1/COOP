-- AlterTable User: preferências de notificação por e-mail (sem perda de dados)
ALTER TABLE `User` ADD COLUMN `notifyEmailFlashDeals` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `User` ADD COLUMN `notifyEmailReservas` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `User` ADD COLUMN `notifyEmailHubCredit` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable FinancialMovement: adicionar hub_credit ao enum
ALTER TABLE `FinancialMovement` MODIFY COLUMN `type` ENUM('contribution', 'cdi_yield', 'proceeds', 'withdrawal', 'adjustment', 'refund', 'hub_credit') NOT NULL;
