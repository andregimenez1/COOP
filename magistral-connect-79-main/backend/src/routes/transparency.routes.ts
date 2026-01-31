import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  listNews,
  createNews,
  updateNews,
  approveNews,
  deleteNews,
  listDecisions,
  createDecision,
  updateDecision,
  deleteDecision,
} from '../controllers/transparency.controller.js';

export const transparencyRoutes = Router();

transparencyRoutes.use(authenticate);

// NEWS
transparencyRoutes.get('/news', listNews);
transparencyRoutes.post('/news', createNews);
transparencyRoutes.patch('/news/:id', updateNews);
transparencyRoutes.post('/news/:id/approve', approveNews);
transparencyRoutes.delete('/news/:id', deleteNews);// DECISIONS
transparencyRoutes.get('/decisions', listDecisions);
transparencyRoutes.post('/decisions', createDecision);
transparencyRoutes.patch('/decisions/:id', updateDecision);
transparencyRoutes.delete('/decisions/:id', deleteDecision);
