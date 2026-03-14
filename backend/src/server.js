import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

import connectDB from './config/database.js';
import authRoutes from './routes/auth.routes.js';
import driveRoutes from './routes/drive.routes.js';
import candidateRoutes from './routes/candidate.routes.js';
import adminRoutes from './routes/admin.routes.js';
import atsRoutes from './routes/ats.routes.js';
import offerRoutes from './routes/offer.routes.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

const app = express();
const PORT = process.env.PORT || 5001;

await connectDB();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',').map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Render health checks)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500 });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });
app.use('/api/', limiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());
if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'));

app.get('/health', (req, res) => res.json({ success: true, timestamp: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/drives', driveRoutes);
app.use('/api/candidates', candidateRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ats', atsRoutes);
app.use('/api/offers', offerRoutes);

app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => console.log(`🚀 SmartHire API running on port ${PORT}`));
export default app;
