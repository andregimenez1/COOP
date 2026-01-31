import { Router } from 'express';
import { login, register, getCurrentUser, refreshToken } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

export const authRoutes = Router();

authRoutes.post('/register', register);
authRoutes.post('/login', login);
authRoutes.post('/refresh', refreshToken);
authRoutes.get('/me', authenticate, getCurrentUser);
