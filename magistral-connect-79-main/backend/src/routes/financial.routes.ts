import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { depositHubCredit, listMovements, createMovement } from '../controllers/financial.controller.js';

export const financialRoutes = Router();

financialRoutes.use(authenticate);

financialRoutes.get('/movements', listMovements);
financialRoutes.post('/movements', createMovement);
financialRoutes.post('/hub-credit', depositHubCredit);
