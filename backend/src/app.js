require('dotenv').config();
require('express-async-errors');

const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const morgan       = require('morgan');
const cookieParser = require('cookie-parser');
const { createServer } = require('http');
const { Server }   = require('socket.io');

const connectDB            = require('./config/db');
const { apiLimiter }       = require('./middlewares/rateLimiter');
const { globalErrorHandler } = require('./middlewares/errorHandler');


// ─── Route imports ───────────────────────────────────────────────────────────
const authRoutes      = require('./routes/auth.routes');       // Phase 1
const dashboardRoutes = require('./routes/dashboard.routes');  // Phase 1
const adminRoutes     = require('./routes/admin.routes');      // Phase 1
const caseRoutes      = require('./routes/case.routes');       // Phase 2
const notificationRoutes = require('./routes/notification.routes'); // Phase 5
const searchRoutes     = require('./routes/search.routes'); // Phase 6
const chatRoutes       = require('./routes/chat.routes');   // Phase 5
const departmentRoutes = require('./routes/department.routes'); // Phase 7
const reportRoutes     = require('./routes/report.routes');     // Phase 8



// ─── Institutional Telemetry ────────────────────────────────────────────────
const client = require('prom-client');
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ prefix: 'robomed_' });

const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'robomed_http_request_duration_ms',
  help: 'Duration of institutional HTTP requests in ms',
  labelNames: ['method', 'route', 'code'],
  buckets: [50, 100, 200, 500, 1000, 3000]
});

// Middleware to record request duration
const metricsMiddleware = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    httpRequestDurationMicroseconds
      .labels(req.method, req.route ? req.route.path : req.path, res.statusCode)
      .observe(duration);
  });
  next();
};

const app = express();
app.use(metricsMiddleware);

const httpServer = createServer(app);

// ─── Socket.IO ───────────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173', methods: ['GET', 'POST'] },
});
app.set('io', io); // make io accessible in controllers via req.app.get('io')

// ─── Core Middleware ──────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
if (process.env.NODE_ENV !== 'development') {
  app.use(apiLimiter);
}


// ─── Health & Telemetry ──────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({ success: true, status: 'ok', environment: process.env.NODE_ENV });
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);      // Phase 1
app.use('/api/dashboard', dashboardRoutes); // Phase 1
app.use('/api/admin',     adminRoutes);     // Phase 1
app.use('/api/cases',     caseRoutes);      // Phase 2
app.use('/api/notifications', notificationRoutes); // Phase 5
app.use('/api/search',        searchRoutes);       // Phase 6
app.use('/api/chat',          chatRoutes);         // Phase 5
app.use('/api/departments',   departmentRoutes);   // Phase 7 - Internal Units
app.use('/api/reports',       reportRoutes);       // Phase 8 - Governance



// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ─── Global Error Handler (must be last) ─────────────────────────────────────
app.use(globalErrorHandler);

// ─── Socket.IO Handlers ───────────────────────────────────────────────────────
// Loaded after routes so io is ready
require('./sockets/index')(io);
require('./events/socketListeners')(app);
// ─── DB + Export ──────────────────────────────────────────────────────────────
const startApp = async () => {
  await connectDB();
};

if (process.env.NODE_ENV !== 'test') {
  startApp();
}

module.exports = { app, httpServer };
