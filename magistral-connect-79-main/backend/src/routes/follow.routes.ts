import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  listFollowedSubstances,
  followSubstance,
  unfollowSubstance,
  listFollowedUsers,
  followUser,
  unfollowUser,
} from '../controllers/follow.controller.js';

export const followRoutes = Router();

followRoutes.use(authenticate);

// SUBSTANCES
followRoutes.get('/substances', listFollowedSubstances);
followRoutes.post('/substances', followSubstance);
followRoutes.delete('/substances/:name', unfollowSubstance);

// USERS
followRoutes.get('/users', listFollowedUsers);
followRoutes.post('/users', followUser);
followRoutes.delete('/users/:id', unfollowUser);
