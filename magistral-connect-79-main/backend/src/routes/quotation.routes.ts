import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { getLatestQuotations } from '../controllers/quotation.controller.js';

export const quotationRoutes = Router();

quotationRoutes.get('/latest', authenticate, getLatestQuotations);

// Placeholder (lista completa será implementada depois)
quotationRoutes.get('/', authenticate, (req, res) => {
  res.json({ quotations: [] });
});
