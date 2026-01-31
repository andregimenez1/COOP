import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import {
  listRoles,
  createRole,
  updateRole,
  deleteRole,
  setRolePermission,
  addRoleMember,
  removeRoleMember,
} from '../controllers/roles.controller.js';

export const rolesRoutes = Router();

// Admin (master) gerencia cargos/permissões/atribuições
rolesRoutes.get('/', authenticate, requireRole('master'), listRoles);
rolesRoutes.post('/', authenticate, requireRole('master'), createRole);
rolesRoutes.patch('/:id', authenticate, requireRole('master'), updateRole);
rolesRoutes.delete('/:id', authenticate, requireRole('master'), deleteRole);

rolesRoutes.patch('/:id/permissions', authenticate, requireRole('master'), setRolePermission);

rolesRoutes.post('/:id/members', authenticate, requireRole('master'), addRoleMember);
rolesRoutes.delete('/:id/members/:userId', authenticate, requireRole('master'), removeRoleMember);

