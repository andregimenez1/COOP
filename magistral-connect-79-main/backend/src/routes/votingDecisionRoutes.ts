import { Router } from 'express';
import { VotingDecisionController } from '../controllers/votingDecisionController.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();
const votingDecisionController = new VotingDecisionController();

// Rotas de decisões de votação (todas autenticadas)
router.get('/transparency/decisions', authenticate, votingDecisionController.listDecisions);
router.post('/transparency/decisions', authenticate, votingDecisionController.createDecision);
router.get('/transparency/decisions/:id', authenticate, votingDecisionController.getDecision);
router.patch('/transparency/decisions/:id', authenticate, votingDecisionController.updateDecision);
router.delete('/transparency/decisions/:id', authenticate, votingDecisionController.deleteDecision);

export default router;