import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import {
  createUser,
  getUsers,
  getPendingPayments,
  markPaymentAsPaid,
  revertPaymentAsPaid,
  undoRemoval,
  getUserById,
  updateUser,
  deleteUser,
  deleteUserByEmail,
  banUser,
  unbanUser,
  getMyPermissions,
  getUserPermissions,
  getAllUserPermissions,
  updateUserPermission,
} from '../controllers/user.controller.js';
import {
  getMyProfileDocuments,
} from '../controllers/userProfileDocuments.controller.js';
import {
  getMyTradingEligibility,
  getUserTradingEligibility,
} from '../controllers/userEligibility.controller.js';

export const userRoutes = Router();

userRoutes.get('/', authenticate, requireRole('master'), getUsers);
userRoutes.post('/', authenticate, requireRole('master'), createUser);
userRoutes.get('/pending-payments', authenticate, requireRole('master'), getPendingPayments);
userRoutes.patch('/pending-payments/:id', authenticate, requireRole('master'), markPaymentAsPaid);
userRoutes.patch('/pending-payments/:id/revert', authenticate, requireRole('master'), revertPaymentAsPaid);
userRoutes.post('/pending-payments/:id/undo', authenticate, requireRole('master'), undoRemoval);
userRoutes.delete('/by-email/:email', authenticate, requireRole('master'), deleteUserByEmail);

// Perfil do usuário (exclusivo do cooperado/usuário logado)
userRoutes.get('/me/profile-documents', authenticate, getMyProfileDocuments);
userRoutes.get('/me/trading-eligibility', authenticate, getMyTradingEligibility);
userRoutes.get('/:id/trading-eligibility', authenticate, getUserTradingEligibility);

// Permissões (hierarquia por função)
userRoutes.get('/me/permissions', authenticate, getMyPermissions);
userRoutes.get('/permissions', authenticate, requireRole('master'), getAllUserPermissions);
userRoutes.get('/:id/permissions', authenticate, requireRole('master'), getUserPermissions);
userRoutes.patch('/:id/permissions', authenticate, requireRole('master'), updateUserPermission);

userRoutes.get('/:id', authenticate, getUserById);
userRoutes.patch('/:id', authenticate, updateUser);
userRoutes.delete('/:id', authenticate, requireRole('master'), deleteUser);
userRoutes.patch('/:id/ban', authenticate, requireRole('master'), banUser);
userRoutes.patch('/:id/unban', authenticate, requireRole('master'), unbanUser);
