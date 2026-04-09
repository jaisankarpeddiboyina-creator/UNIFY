require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { extractors } = require('./apis/extractor');
const logger = require('./config/logger');

const app = express();
let isReady = false;

// ── Security headers (first) ──────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false,   // disabled to allow external image APIs
  crossOriginEmbedderPolicy: false
}));

// ── CORS ──────────────────────────────────────────────────────────────────────
const rawOrigin = process.env.ALLOWED_ORIGIN || '';
let corsOrigin;
if (!rawOrigin) {
  corsOrigin = ['http://localhost:3000', 'http://localhost:5000'];
} else if (rawOrigin === '*') {
  corsOrigin = '*';
} else {
  const list = rawOrigin.split(',').map(s => s.trim()).filter(Boolean);
  corsOrigin = list.length === 1 ? list[0] : list;
}
app.use(cors({ origin: corsOrigin, methods: ['GET'], optionsSuccessStatus: 200 }));
logger.info({ corsOrigin }, 'CORS configured');

// ── Request logging (use Winston instead of Morgan for consistency) ──────────
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

app.use(express.json());

// ── Rate limiting ─────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'rate_limited', message: 'Too many requests. Please wait a moment.' }
});
app.use('/api/search', limiter);

// ── Load API registry once at startup (app.locals, not global) ───────────────
const API_REGISTRY = require('../data/apis_production_ready.json').apis;
app.locals.API_REGISTRY = API_REGISTRY;
logger.info({ apiCount: API_REGISTRY.length }, 'API registry loaded');

// ── Startup validation: check for missing extractors ──────────────────────────
const activeAPIs = API_REGISTRY.filter(a => a.queryTemplate);
const missingExtractors = [...new Set(
  activeAPIs.map(a => a.extractorType).filter(t => t && !extractors[t])
)];
if (missingExtractors.length > 0) {
  logger.error({ missingExtractors }, 'STARTUP ERROR: Missing extractor functions');
  logger.error('Add these to extractor.js before these APIs will work.');
} else {
  logger.info({ activeAPIs: activeAPIs.length }, 'Startup validation: all extractors present ✓');
  isReady = true;
}

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api', require('./routes/search'));

// ── 404 for unknown /api/* routes — MUST come before the SPA catch-all ───────
app.use('/api/*', (req, res) => {
  logger.warn({ path: req.path }, 'API route not found');
  res.status(404).json({ error: 'api_not_found', message: 'API route not found' });
});

// ── Health checks ─────────────────────────────────────────────────────────────
// Liveness probe: Is the server process alive?
app.get('/health/live', (req, res) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString()
  });
});

// Readiness probe: Can the server handle requests?
app.get('/health/ready', (req, res) => {
  if (!isReady) {
    logger.warn('Readiness probe failed: extractors not initialized');
    return res.status(503).json({
      status: 'not_ready',
      reason: 'extractors_not_initialized',
      timestamp: new Date().toISOString()
    });
  }

  res.json({
    status: 'ready',
    apisLoaded: API_REGISTRY.length,
    timestamp: new Date().toISOString()
  });
});

// Legacy health endpoint (deprecated, but kept for backward compatibility)
app.get('/health', (req, res) => {
  res.json({
    status: isReady ? 'ok' : 'initializing',
    timestamp: new Date().toISOString(),
    apisLoaded: API_REGISTRY.length
  });
});

// ── robots.txt ────────────────────────────────────────────────────────────────
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send('User-agent: *\nDisallow: /api/\nAllow: /\n');
});

// ── security.txt ──────────────────────────────────────────────────────────────
app.get('/.well-known/security.txt', (req, res) => {
  res.type('text/plain');
  res.send('Contact: mailto:security@unify.app\nExpires: 2027-01-01T00:00:00.000Z\n');
});

// ── Serve frontend build in production ───────────────────────────────────────
app.use(express.static(path.join(__dirname, '../../frontend/build')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/build/index.html'));
});

// ── Start server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () =>
  logger.info({ port: PORT }, 'UNIFY backend server started')
);

// ── Graceful shutdown (Docker / Kubernetes safe) ──────────────────────────────
function shutdown(signal) {
  logger.info({ signal }, 'Shutdown signal received — graceful shutdown initiated');
  server.close(() => {
    logger.info('All connections closed. Exiting.');
    process.exit(0);
  });
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
