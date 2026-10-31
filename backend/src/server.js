import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import pg from 'pg';

const { Pool } = pg;
const app = express();
const port = Number(process.env.PORT || 3000);
const allowedOrigins = (process.env.FRONTEND_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    // Allow non-browser clients without an Origin header; browsers must match allowlist.
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin not allowed'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '32kb' }));

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    })
  : null;

app.get('/health', (_req, res) => {
  res.json({ service: 'racik-api', status: 'ok' });
});

app.get('/health/ready', async (_req, res) => {
  if (!pool) {
    return res.status(503).json({ status: 'not_ready', reason: 'database_not_configured' });
  }
  try {
    await pool.query('SELECT 1');
    return res.json({ status: 'ready', database: 'connected' });
  } catch {
    return res.status(503).json({ status: 'not_ready', database: 'unavailable' });
  }
});

app.use((err, _req, res, _next) => {
  if (err?.message === 'Origin not allowed') {
    return res.status(403).json({ error: 'origin_not_allowed' });
  }
  return res.status(500).json({ error: 'internal_server_error' });
});

const server = app.listen(port, () => {
  console.log(`Racik API listening on port ${port}`);
});

async function shutdown() {
  server.close(async () => {
    if (pool) await pool.end();
    process.exit(0);
  });
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
