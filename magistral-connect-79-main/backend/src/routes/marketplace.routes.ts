import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  getStockDashboard,
  listProducts,
  createProduct,
  updateProductTarget,
  listMyInventory,
  createInventoryItem,
  updateInventoryItem,
  purchase,
  liquidation,
  liquidationSavings,
  transactionHistory,
  listOffers,
  createOffer,
  placeBid,
  updateOffer,
  deleteOffer,
  listProposals,
  createProposal,
  updateProposal,
  listTransactions,
  createTransaction,
} from '../controllers/marketplace.controller.js';
import {
  createFlashDealHandler,
  listFlashDealsHandler,
  claimFlashDealHandler,
  createStrategicQuotaHandler,
  listStrategicQuotasHandler,
  claimStrategicReserveHandler,
} from '../controllers/vantagens.controller.js';

export const marketplaceRoutes = Router();

marketplaceRoutes.use(authenticate);

marketplaceRoutes.get('/stock', getStockDashboard);
marketplaceRoutes.get('/liquidation-savings', liquidationSavings);
marketplaceRoutes.get('/transactions/history', transactionHistory);

marketplaceRoutes.get('/offers', listOffers);
marketplaceRoutes.post('/offers', createOffer);
marketplaceRoutes.post('/offers/:id/bid', placeBid);
marketplaceRoutes.patch('/offers/:id', updateOffer);
marketplaceRoutes.delete('/offers/:id', deleteOffer);

marketplaceRoutes.get('/proposals', listProposals);
marketplaceRoutes.post('/proposals', createProposal);
marketplaceRoutes.patch('/proposals/:id', updateProposal);

marketplaceRoutes.get('/transactions', listTransactions);
marketplaceRoutes.post('/transactions', createTransaction);

marketplaceRoutes.get('/products', listProducts);
marketplaceRoutes.post('/products', createProduct);
marketplaceRoutes.patch('/products/:id', updateProductTarget);
marketplaceRoutes.get('/inventory', listMyInventory);
marketplaceRoutes.post('/inventory', createInventoryItem);
marketplaceRoutes.patch('/inventory/:id', updateInventoryItem);
marketplaceRoutes.post('/purchase', purchase);
marketplaceRoutes.post('/liquidation', liquidation);

marketplaceRoutes.get('/flash-deals', listFlashDealsHandler);
marketplaceRoutes.post('/flash-deals', createFlashDealHandler);
marketplaceRoutes.post('/flash-deals/:id/claim', claimFlashDealHandler);
marketplaceRoutes.get('/strategic-quotas', listStrategicQuotasHandler);
marketplaceRoutes.post('/strategic-quotas', createStrategicQuotaHandler);
marketplaceRoutes.post('/strategic-quotas/:id/claim', claimStrategicReserveHandler);
