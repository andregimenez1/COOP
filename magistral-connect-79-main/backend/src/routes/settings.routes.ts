import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import {
  getSupplierDocumentValidityPolicies,
  updateSupplierDocumentValidityPolicy,
  getMarketplaceConfig,
  updateMarketplaceConfig,
} from '../controllers/settings.controller.js';

export const settingsRoutes = Router();

// Todos autenticados podem ler (para aplicar defaults no popup)
settingsRoutes.get('/supplier-document-validity', authenticate, getSupplierDocumentValidityPolicies);

// Apenas master altera
settingsRoutes.patch(
  '/supplier-document-validity',
  authenticate,
  requireRole('master'),
  updateSupplierDocumentValidityPolicy
);

// Marketplace config (todos leem, master altera)
settingsRoutes.get('/marketplace', authenticate, getMarketplaceConfig);
settingsRoutes.patch('/marketplace', authenticate, requireRole('master'), updateMarketplaceConfig);

