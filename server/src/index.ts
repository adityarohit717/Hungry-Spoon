import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { config } from './config';

import authRoutes from './routes/auth';
import usersRoutes from './routes/users';
import settingsRoutes from './routes/settings';
import menuRoutes from './routes/menu';
import ordersRoutes from './routes/orders';
import kotRoutes from './routes/kot';
import billingRoutes from './routes/billing';
import inventoryRoutes from './routes/inventory';
import reportsRoutes from './routes/reports';
import auditRoutes from './routes/audit';

const app = express();

// Middlewares
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Hungry Spoon API',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/kot', kotRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/audit', auditRoutes);

// In production, serve the built frontend assets
const clientDistPath = path.resolve(__dirname, '../../dist');
app.use(express.static(clientDistPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
    if (err) {
      // If client build not found, return API status
      res.json({ message: 'Hungry Spoon API is operational.' });
    }
  });
});

if (process.env.NODE_ENV !== 'test' && !process.env.VITEST && require.main === module) {
  app.listen(config.port, () => {
    console.log(`🚀 Hungry Spoon server running at http://localhost:${config.port}`);
  });
}

export default app;
