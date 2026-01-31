import { Router } from 'express';
import { authenticate, authenticateSSE } from '../middleware/auth.middleware.js';
import { sseEvents, getPreferences, updatePreferences } from '../controllers/notification.controller.js';

export const notificationRoutes = Router();

notificationRoutes.get('/events', authenticateSSE, sseEvents);
notificationRoutes.get('/preferences', authenticate, getPreferences);
notificationRoutes.patch('/preferences', authenticate, updatePreferences);
