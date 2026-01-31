import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  getSubstances,
  getSubstanceById,
  createSubstance,
  updateSubstance,
  deleteSubstance,
} from '../controllers/substance.controller.js';

export const substanceRoutes = Router();

substanceRoutes.get('/', authenticate, getSubstances);
substanceRoutes.get('/:id', authenticate, getSubstanceById);
substanceRoutes.post('/', authenticate, createSubstance);
substanceRoutes.patch('/:id', authenticate, updateSubstance);
substanceRoutes.delete('/:id', authenticate, deleteSubstance);
