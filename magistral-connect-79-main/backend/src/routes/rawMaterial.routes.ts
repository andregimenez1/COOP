import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  listRawMaterials,
  createRawMaterial,
  updateRawMaterial,
  deleteRawMaterial,
} from '../controllers/rawMaterial.controller.js';

export const rawMaterialRoutes = Router();

rawMaterialRoutes.use(authenticate);

rawMaterialRoutes.get('/', listRawMaterials);
rawMaterialRoutes.post('/', createRawMaterial);
rawMaterialRoutes.patch('/:id', updateRawMaterial);
rawMaterialRoutes.delete('/:id', deleteRawMaterial);
