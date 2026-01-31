-- Índice composto (strategicQuotaId, userId) para otimizar buscas com distinct em userId
-- (ex.: findMany where strategicQuotaId + distinct ['userId'] em notificationTriggers)
CREATE INDEX `StrategicReserveClaim_strategicQuotaId_userId_idx` ON `StrategicReserveClaim`(`strategicQuotaId`, `userId`);
