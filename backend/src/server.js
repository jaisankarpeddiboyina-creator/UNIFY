require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { extractors } = require('./apis/extractor');

const app = express();

// ── Security headers (first) ──────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false,   // disabled to allow external image APIs
  crossOriginEmbedderPolicy: false
}));

// ── CORS ──────────────────────────────────────────────────────────────────────
// ALLOWED_ORIGIN supports three modes:
//   not set / empty  → allows localhost:3000 + localhost:5000 (dev default)
//   *                → allows all origins (open/public deployment)
//   https://x.com    → single origin (production lockdown)
//   https://a.com,https://b.com → comma-separated list
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
console.log(`CORS origin: ${JSON.stringify(corsOrigin)}`);

// ── Request logging ───────────────────────────────────────────────────────────
app.use(morgan('combined'));

app.use(express.json());

// ── Rate limiting ─────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please wait a moment.' }
});
app.use('/api/search', limiter);

// ── Load API registry once at startup (app.locals, not global) ───────────────
const API_REGISTRY = require('../data/apis_production_ready.json').apis;
app.locals.API_REGISTRY = API_REGISTRY;
console.log(`Loaded ${API_REGISTRY.length} APIs`);

// ── Startup validation: check for missing extractors ──────────────────────────
const activeAPIs = API_REGISTRY.filter(a => a.queryTemplate);
const missingExtractors = [...new Set(
  activeAPIs.map(a => a.extractorType).filter(t => t && !extractors[t])
)];
if (missingExtractors.length > 0) {
  console.error('[UNIFY] STARTUP ERROR: Missing extractor functions:', missingExtractors);
  console.error('[UNIFY] Add these to extractor.js before these APIs will work.');
}
console.log(`[UNIFY] Startup validation: ${activeAPIs.length} active APIs, all extractors present ✓`);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api', require('./routes/search'));

// ── 404 for unknown /api/* routes — MUST come before the SPA catch-all ───────
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
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
  console.log(`UNIFY backend running on port ${PORT}`)
);

// ── Graceful shutdown (Docker / Kubernetes safe) ──────────────────────────────
function shutdown(signal) {
  console.log(`\n${signal} received — shutting down gracefully`);
  server.close(() => {
    console.log('All connections closed. Exiting.');
    process.exit(0);
  });
  setTimeout(() => {
    console.error('Forcing exit after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
