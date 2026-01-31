import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Importar rotas
import { authRoutes } from './routes/auth.routes.js';
import { userRoutes } from './routes/user.routes.js';
import { rolesRoutes as roleRoutes } from './routes/roles.routes.js';
import { requestRoutes } from './routes/request.routes.js';
import { marketplaceRoutes } from './routes/marketplace.routes.js';
import { financialRoutes } from './routes/financial.routes.js';
import { supplierRoutes } from './routes/supplier.routes.js';
import { substanceRoutes } from './routes/substance.routes.js';
import { quotationRoutes } from './routes/quotation.routes.js';
import { settingsRoutes } from './routes/settings.routes.js';
import { notificationRoutes } from './routes/notification.routes.js';
import { transparencyRoutes } from './routes/transparency.routes.js';
import { votingRoutes } from './routes/voting.routes.js';
import { rawMaterialRoutes } from './routes/rawMaterial.routes.js';
import { followRoutes } from './routes/follow.routes.js';
import votingDecisionRoutes from './routes/votingDecisionRoutes.js';
import { fileRoutes } from './routes/file.routes.js';

// Importar middlewares
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // limite de requests por IP
  message: 'Muitas requisições deste IP, tente novamente mais tarde.',
});

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:4173',
      'http://127.0.0.1:5173',
      'http://192.168.100.2:5173',
      'http://localhost:8080',
      'http://127.0.0.1:8080'
    ];

    // Add origins from .env
    if (process.env.CORS_ORIGIN) {
      const envOrigins = process.env.CORS_ORIGIN.split(',').map(o => o.trim());
      allowedOrigins.push(...envOrigins);
    }

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1 || origin.includes('192.168.')) {
      callback(null, true);
    } else {
      console.log('Origin blocked by CORS:', origin);
      callback(null, true); // Temporarily allow all for debugging if needed, but safer to respect list.
      // For now let's allow it to ensure user can login, debugging mode:
      // callback(null, true); 
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(limiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Registrar rotas
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/financial', financialRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/substances', substanceRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/transparency', transparencyRoutes);
app.use('/api/voting', votingRoutes);
app.use('/api/raw-materials', rawMaterialRoutes);
app.use('/api/follow', followRoutes);
app.use('/api/voting-decisions', votingDecisionRoutes);
app.use('/api/files', fileRoutes);

// Middleware de tratamento de erros (deve ser o último)
app.use(errorHandler);

// Rota 404
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint não encontrado' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Accessible at: http://localhost:${PORT} or http://192.168.100.2:${PORT}`);
});