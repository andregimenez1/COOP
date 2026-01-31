-- Migração para corrigir encoding UTF-8
-- Garante que o banco de dados e todas as tabelas usem utf8mb4

-- Alterar charset do banco de dados
ALTER DATABASE magistral_connect CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Alterar charset das colunas de texto na tabela User
ALTER TABLE `User` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Alterar charset das colunas de texto na tabela PendingPayment
ALTER TABLE `PendingPayment` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Alterar charset das colunas de texto na tabela ExitRequest
ALTER TABLE `ExitRequest` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Alterar charset das colunas de texto na tabela ExtraUserRequest
ALTER TABLE `ExtraUserRequest` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Alterar charset das colunas de texto na tabela BankDataChangeRequest
ALTER TABLE `BankDataChangeRequest` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Alterar charset das colunas de texto na tabela SupplierRequest
ALTER TABLE `SupplierRequest` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Alterar charset das colunas de texto na tabela Supplier
ALTER TABLE `Supplier` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Alterar charset das colunas de texto na tabela Substance
ALTER TABLE `Substance` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Alterar charset das colunas de texto na tabela SubstanceSuggestion
ALTER TABLE `SubstanceSuggestion` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Alterar charset das colunas de texto na tabela Offer
ALTER TABLE `Offer` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Alterar charset das colunas de texto na tabela Proposal
ALTER TABLE `Proposal` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Alterar charset das colunas de texto na tabela Transaction
ALTER TABLE `Transaction` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Alterar charset das colunas de texto na tabela Quotation
ALTER TABLE `Quotation` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Alterar charset das colunas de texto na tabela Notification
ALTER TABLE `Notification` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Alterar charset das colunas de texto na tabela FinancialMovement
ALTER TABLE `FinancialMovement` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Alterar charset das colunas de texto na tabela Document
ALTER TABLE `Document` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Alterar charset das colunas de texto na tabela Qualification
ALTER TABLE `Qualification` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Alterar charset das colunas de texto na tabela PurchaseItem
ALTER TABLE `PurchaseItem` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Alterar charset das colunas de texto na tabela CollectivePurchase
ALTER TABLE `CollectivePurchase` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Alterar charset das colunas de texto na tabela FlashDeal
ALTER TABLE `FlashDeal` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Alterar charset das colunas de texto na tabela StrategicReserve
ALTER TABLE `StrategicReserve` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Alterar charset das colunas de texto na tabela Lot
ALTER TABLE `Lot` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Alterar charset das colunas de texto na tabela Product
ALTER TABLE `Product` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Alterar charset das colunas de texto na tabela TransparencyNews
ALTER TABLE `TransparencyNews` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Alterar charset das colunas de texto na tabela Decision
ALTER TABLE `Decision` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Alterar charset das colunas de texto na tabela Voting
ALTER TABLE `Voting` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Alterar charset das colunas de texto na tabela Vote
ALTER TABLE `Vote` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
