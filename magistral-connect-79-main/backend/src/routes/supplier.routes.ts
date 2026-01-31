import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from '../controllers/supplier.controller.js';
import {
  getSupplierQualificationRequests,
  createSupplierQualificationRequest,
  saveSupplierQualificationProgress,
  getSupplierQualifications,
  reviewSupplierQualificationDocument,
  approveSupplierQualificationRequest,
} from '../controllers/supplierQualification.controller.js';

export const supplierRoutes = Router();

// Supplier Qualification (compartilhado entre cooperados)
supplierRoutes.get('/qualification-requests', authenticate, getSupplierQualificationRequests);
supplierRoutes.post('/qualification-requests', authenticate, createSupplierQualificationRequest);
supplierRoutes.patch('/qualification-requests/:id/progress', authenticate, saveSupplierQualificationProgress);
// Admin: avaliar e concluir
supplierRoutes.patch(
  '/qualification-requests/:id/documents/:documentId/review',
  authenticate,
  requireRole('master'),
  reviewSupplierQualificationDocument
);
supplierRoutes.patch(
  '/qualification-requests/:id/approve',
  authenticate,
  requireRole('master'),
  approveSupplierQualificationRequest
);
supplierRoutes.get('/qualifications', authenticate, getSupplierQualifications);

supplierRoutes.get('/', authenticate, getSuppliers);
supplierRoutes.get('/:id', authenticate, getSupplierById);
supplierRoutes.post('/', authenticate, createSupplier);
supplierRoutes.patch('/:id', authenticate, updateSupplier);
supplierRoutes.delete('/:id', authenticate, deleteSupplier);
