import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  listVotings,
  createVoting,
  updateVoting,
  castVote,
} from '../controllers/transparency.controller.js';

export const votingRoutes = Router();

votingRoutes.use(authenticate);

votingRoutes.get('/', listVotings);
votingRoutes.post('/', createVoting);
votingRoutes.patch('/:id', updateVoting);
votingRoutes.post('/:id/vote', castVote);
