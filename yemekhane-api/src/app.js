const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const logger = require('./utils/logger');
const { migrate } = require('./db/migrate');
const { errorHandler } = require('./middleware/errorHandler');
const { setupMonthlyReset } = require('./jobs/monthlyReset');

// Import routers
const authRouter = require('./modules/auth/auth.router');
const departmentsRouter = require('./modules/departments/departments.router');
const staffRouter = require('./modules/staff/staff.router');
const mealTypesRouter = require('./modules/meal-types/meal-types.router');
const scanRouter = require('./modules/scan/scan.router');
const reportsRouter = require('./modules/reports/reports.router');
const settingsRouter = require('./modules/settings/settings.router');
const holidaysRouter = require('./modules/holidays/holidays.router');

// Run migrations on startup
migrate();

// Create Express app
const app = express();

// Middleware
app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    query: req.query,
    ip: req.ip,
  });
  next();
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/departments', departmentsRouter);
app.use('/api/staff', staffRouter);
app.use('/api/meal-types', mealTypesRouter);
app.use('/api/scan', scanRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/holidays', holidaysRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
    message: 'Sunucu çalışıyor',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route bulunamadı: ${req.method} ${req.path}`,
  });
});

// Global error handler
app.use(errorHandler);

// Setup cron jobs
setupMonthlyReset();

// Start server
app.listen(env.PORT, () => {
  logger.info(`Yemekhane API sunucusu ${env.PORT} portunda çalışıyor`);
  logger.info(`Ortam: ${env.NODE_ENV}`);
});

module.exports = app;
