import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import {
  getBankDataRequests,
  approveBankDataRequest,
  rejectBankDataRequest,
  getUserProfileDocumentRequests,
  createUserProfileDocumentRequest,
  approveUserProfileDocumentRequest,
  rejectUserProfileDocumentRequest,
  getExtraUserRequests,
  approveExtraUserRequest,
  rejectExtraUserRequest,
  getExitRequests,
  approveExitRequest,
  rejectExitRequest,
  getSupplierRequests,
  approveSupplierRequest,
  rejectSupplierRequest,
  getSubstanceSuggestions,
  approveSubstanceSuggestion,
  rejectSubstanceSuggestion,
  createBankDataRequest,
  createExtraUserRequest,
  createExitRequest,
  createSupplierRequest,
  createSubstanceSuggestion,
} from '../controllers/request.controller.js';

export const requestRoutes = Router();

// Bank Data Requests
requestRoutes.get('/bank-data', authenticate, getBankDataRequests);
requestRoutes.post('/bank-data', authenticate, createBankDataRequest);
requestRoutes.patch('/bank-data/:id/approve', authenticate, requireRole('master'), approveBankDataRequest);
requestRoutes.patch('/bank-data/:id/reject', authenticate, requireRole('master'), rejectBankDataRequest);

// User Profile Documents (avaliado pelo admin)
requestRoutes.get('/profile-documents', authenticate, getUserProfileDocumentRequests);
requestRoutes.post('/profile-documents', authenticate, createUserProfileDocumentRequest);
requestRoutes.patch('/profile-documents/:id/approve', authenticate, requireRole('master'), approveUserProfileDocumentRequest);
requestRoutes.patch('/profile-documents/:id/reject', authenticate, requireRole('master'), rejectUserProfileDocumentRequest);

// Extra User Requests
requestRoutes.get('/extra-users', authenticate, getExtraUserRequests);
requestRoutes.post('/extra-users', authenticate, createExtraUserRequest);
requestRoutes.patch('/extra-users/:id/approve', authenticate, requireRole('master'), approveExtraUserRequest);
requestRoutes.patch('/extra-users/:id/reject', authenticate, requireRole('master'), rejectExtraUserRequest);

// Exit Requests
requestRoutes.get('/exit', authenticate, getExitRequests);
requestRoutes.post('/exit', authenticate, createExitRequest);
requestRoutes.patch('/exit/:id/approve', authenticate, requireRole('master'), approveExitRequest);
requestRoutes.patch('/exit/:id/reject', authenticate, requireRole('master'), rejectExitRequest);

// Supplier Requests
requestRoutes.get('/suppliers', authenticate, getSupplierRequests);
requestRoutes.post('/suppliers', authenticate, createSupplierRequest);
requestRoutes.patch('/suppliers/:id/approve', authenticate, requireRole('master'), approveSupplierRequest);
requestRoutes.patch('/suppliers/:id/reject', authenticate, requireRole('master'), rejectSupplierRequest);

// Substance Suggestions
requestRoutes.get('/substances', authenticate, getSubstanceSuggestions);
requestRoutes.post('/substances', authenticate, createSubstanceSuggestion);
requestRoutes.patch('/substances/:id/approve', authenticate, requireRole('master'), approveSubstanceSuggestion);
requestRoutes.patch('/substances/:id/reject', authenticate, requireRole('master'), rejectSubstanceSuggestion);
