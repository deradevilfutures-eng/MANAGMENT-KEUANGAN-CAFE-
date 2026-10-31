import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import pg from 'pg';
import { registerAuthRoutes } from './auth.js';
import { registerBusinessRoutes } from './business.js';
import { registerSetupRoutes } from './setup.js';

const { Pool } = pg;
const app = express();
const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
app.disable('x-powered-by');
app.set('trust proxy', isProduction ? 1 : false);
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'same-site' } }));
app.use(express.json({ limit: '32kb' }));
app.use(cookieParser());

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: isProduction ? { rejectUnauthorized: true } : false,
      max: isProduction ? 3 : 10,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 8_000,
      allowExitOnIdle: true,
    })
  : null;

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 10,
  standardHeaders: 'draft-7', legacyHeaders: false,
  message: { error: 'too_many_login_attempts' },
});
const setupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, limit: 5,
  standardHeaders: 'draft-7', legacyHeaders: false,
  message: { error: 'too_many_setup_attempts' },
});

app.get('/api/health', (_req, res) => res.json({ service: 'racik-api', status: 'ok' }));
app.get('/api/health/ready', async (_req, res) => {
  if (!pool) return res.status(503).json({ status: 'not_ready', reason: 'database_not_configured' });
  try {
    await pool.query('SELECT 1');
    return res.json({ status: 'ready', database: 'connected' });
  } catch {
    return res.status(503).json({ status: 'not_ready', database: 'unavailable' });
  }
});
app.get('/health', (_req,res)=>res.json({service:'racik-api',status:'ok'}));
app.get('/health/ready', async (_req,res)=>{
  if(!pool)return res.status(503).json({status:'not_ready',reason:'database_not_configured'});
  try{await pool.query('SELECT 1');return res.json({status:'ready',database:'connected'});}
  catch{return res.status(503).json({status:'not_ready',database:'unavailable'});}
});

if (pool) {
  registerAuthRoutes(app, { pool, isProduction, loginLimiter });
  registerBusinessRoutes(app, { pool });
  app.use('/api/setup', setupLimiter);
  registerSetupRoutes(app, { pool });
} else {
  app.use('/api', (_req, res) => res.status(503).json({ error: 'database_not_configured' }));
}

app.use((err, _req, res, _next) => {
  if (err?.message === 'Origin not allowed') return res.status(403).json({ error: 'origin_not_allowed' });
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'invalid_json' });
  console.error('Racik API error:', err?.message || 'unknown');
  return res.status(500).json({ error: 'internal_server_error' });
});

export default app;

// Vercel imports the Express app as a Function. Local development starts a listener.
if (!process.env.VERCEL) {
  const port = Number(process.env.PORT || 3000);
  const server = app.listen(port, () => console.log(`Racik API listening on port ${port}`));
  const shutdown = () => server.close(async () => { if (pool) await pool.end(); process.exit(0); });
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
