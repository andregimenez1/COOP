-- Coluna para snapshot do usuário removido (permite "Desfazer remoção")
ALTER TABLE `PendingPayment` ADD COLUMN `deletedUserSnapshot` JSON NULL;
