import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import express from 'express';
import { Pool } from 'pg';

dotenv.config();
const PORT = Number(process.env.PORT ?? 4000);
const DATABASE_URL = process.env.DATABASE_URL;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const buildPath = path.join(__dirname, 'dist');

if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set. Set it in a .env file or environment variables.');
  process.exit(1);
}

const app = express();
const pool = new Pool({ connectionString: DATABASE_URL });

let dbHost = 'unknown';
let dbName = 'unknown';
try {
  const parsed = new URL(DATABASE_URL);
  dbHost = parsed.hostname || dbHost;
  dbName = (parsed.pathname || '').replace(/^\//, '') || dbName;
} catch (e) {
  // ignore parse errors; values will remain 'unknown'
}

async function waitForDatabase(retries = 12, delayMs = 2000) {
  console.log(`Waiting for database at ${dbHost}/${dbName}...`);
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await pool.query('SELECT 1');
      console.log('Database connection successful.');
      return;
    } catch (err) {
      console.log(`Database not ready (attempt ${attempt}/${retries}): ${err.message}`);
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

const VALID_DIRECTIONS = ['BUY', 'SELL'];

async function createSignalTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS signals (
      id UUID PRIMARY KEY,
      symbol TEXT NOT NULL,
      direction TEXT NOT NULL CHECK (direction IN ('BUY', 'SELL')),
      entry_price NUMERIC NOT NULL,
      stop_loss NUMERIC NOT NULL,
      target_price NUMERIC NOT NULL,
      entry_time TIMESTAMPTZ NOT NULL,
      expiry_time TIMESTAMPTZ NOT NULL,
      status TEXT NOT NULL DEFAULT 'OPEN',
      realized_roi NUMERIC,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

function validateSignalInput(data) {
  const errors = [];
  const symbol = String(data.symbol ?? '').trim().toUpperCase();
  const direction = String(data.direction ?? '').toUpperCase();
  const entryPrice = Number(data.entryPrice);
  const stopLoss = Number(data.stopLoss);
  const targetPrice = Number(data.targetPrice);
  const entryTime = new Date(data.entryTime);
  const expiryTime = new Date(data.expiryTime);

  if (!symbol) {
    errors.push('symbol is required and must be a non-empty string.');
  }

  if (!VALID_DIRECTIONS.includes(direction)) {
    errors.push('direction is required and must be either BUY or SELL.');
  }

  if (!Number.isFinite(entryPrice) || entryPrice <= 0) {
    errors.push('entryPrice is required and must be a positive number.');
  }

  if (!Number.isFinite(stopLoss) || stopLoss <= 0) {
    errors.push('stopLoss is required and must be a positive number.');
  }

  if (!Number.isFinite(targetPrice) || targetPrice <= 0) {
    errors.push('targetPrice is required and must be a positive number.');
  }

  if (!data.entryTime || Number.isNaN(entryTime.getTime())) {
    errors.push('entryTime is required and must be a valid ISO date string.');
  }

  if (!data.expiryTime || Number.isNaN(expiryTime.getTime())) {
    errors.push('expiryTime is required and must be a valid ISO date string.');
  }

  if (!Number.isNaN(entryTime.getTime()) && !Number.isNaN(expiryTime.getTime()) && entryTime >= expiryTime) {
    errors.push('expiryTime must be after entryTime.');
  }

  if (direction === 'BUY') {
    if (!(stopLoss < entryPrice)) {
      errors.push('For BUY signals, stopLoss must be less than entryPrice.');
    }
    if (!(targetPrice > entryPrice)) {
      errors.push('For BUY signals, targetPrice must be greater than entryPrice.');
    }
  }

  if (direction === 'SELL') {
    if (!(stopLoss > entryPrice)) {
      errors.push('For SELL signals, stopLoss must be greater than entryPrice.');
    }
    if (!(targetPrice < entryPrice)) {
      errors.push('For SELL signals, targetPrice must be less than entryPrice.');
    }
  }

  return errors;
}

function calculateRoi(direction, entryPrice, currentPrice) {
  const entry = Number(entryPrice);
  const price = Number(currentPrice);

  if (!Number.isFinite(entry) || !Number.isFinite(price) || entry === 0) {
    return 0;
  }

  if (direction === 'BUY') {
    return ((price - entry) / entry) * 100;
  }

  if (direction === 'SELL') {
    return ((entry - price) / entry) * 100;
  }

  return 0;
}

function computeLiveStatus(signal, currentPrice) {
  const price = Number(currentPrice);
  const entryPrice = Number(signal.entryPrice);
  const stopLoss = Number(signal.stopLoss);
  const targetPrice = Number(signal.targetPrice);

  if (!Number.isFinite(price)) {
    return 'PRICE ERROR';
  }

  const expiryTime = new Date(signal.expiryTime);
  if (Number.isNaN(expiryTime.getTime())) {
    return 'UNKNOWN';
  }

  if (Date.now() >= expiryTime.getTime()) {
    return 'EXPIRED';
  }

  if (!Number.isFinite(entryPrice) || !Number.isFinite(stopLoss) || !Number.isFinite(targetPrice)) {
    return 'UNKNOWN';
  }

  if (signal.direction === 'BUY') {
    if (price >= targetPrice) {
      return 'TARGET HIT';
    }
    if (price <= stopLoss) {
      return 'STOP LOSS HIT';
    }
    return 'OPEN';
  }

  if (signal.direction === 'SELL') {
    if (price <= targetPrice) {
      return 'TARGET HIT';
    }
    if (price >= stopLoss) {
      return 'STOP LOSS HIT';
    }
    return 'OPEN';
  }

  return 'OPEN';
}

async function fetchBinancePrice(symbol) {
  const upperSymbol = String(symbol).toUpperCase();
  const url = `https://api.binance.com/api/v3/ticker/price?symbol=${encodeURIComponent(upperSymbol)}`;
  const response = await fetch(url);

  if (!response.ok) {
    console.error('Binance API returned non-OK status:', { symbol: upperSymbol, url, status: response.status, statusText: response.statusText });
    throw new Error(`Binance API returned ${response.status} for ${upperSymbol}`);
  }

  let data;
  try {
    data = await response.json();
  } catch (error) {
    console.error('Failed to parse Binance response as JSON:', { symbol: upperSymbol, url, error });
    throw new Error(`Unable to parse Binance response for ${upperSymbol}`);
  }

  console.log('Binance API response:', { symbol: upperSymbol, url, data });

  const currentPrice = Number(data.price);
  if (!Number.isFinite(currentPrice)) {
    console.error('Invalid Binance price value:', { symbol: upperSymbol, data });
    throw new Error(`Invalid price returned by Binance for ${upperSymbol}`);
  }

  return currentPrice;
}

function formatTimeRemaining(expiryTime) {
  const expiryDate = new Date(expiryTime);
  if (Number.isNaN(expiryDate.getTime())) {
    return 'Unknown';
  }

  const diffMs = expiryDate.getTime() - Date.now();
  if (diffMs <= 0) {
    return 'Expired';
  }

  const seconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours}h ${minutes}m ${secs}s`;
}

app.get('/api/signals', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, symbol, direction, entry_price, stop_loss, target_price, entry_time, expiry_time, status, realized_roi, created_at FROM signals ORDER BY created_at DESC`
    );
    res.json(result.rows.map((row) => ({
      id: row.id,
      symbol: row.symbol,
      direction: row.direction,
      entryPrice: Number(row.entry_price),
      stopLoss: Number(row.stop_loss),
      targetPrice: Number(row.target_price),
      entryTime: new Date(row.entry_time).toISOString(),
      expiryTime: new Date(row.expiry_time).toISOString(),
      status: row.status,
      realizedRoi: row.realized_roi == null ? null : Number(row.realized_roi),
      createdAt: new Date(row.created_at).toISOString(),
    })));
  } catch (error) {
    res.status(500).json({ message: 'Unable to load signals.' });
  }
});

app.get('/api/signals/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, symbol, direction, entry_price, stop_loss, target_price, entry_time, expiry_time, status, realized_roi, created_at FROM signals WHERE id = $1`,
      [req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Signal not found.' });
    }

    const row = result.rows[0];
    res.json({
      id: row.id,
      symbol: row.symbol,
      direction: row.direction,
      entryPrice: Number(row.entry_price),
      stopLoss: Number(row.stop_loss),
      targetPrice: Number(row.target_price),
      entryTime: new Date(row.entry_time).toISOString(),
      expiryTime: new Date(row.expiry_time).toISOString(),
      status: row.status,
      realizedRoi: row.realized_roi == null ? null : Number(row.realized_roi),
      createdAt: new Date(row.created_at).toISOString(),
    });
  } catch (error) {
    res.status(500).json({ message: 'Unable to load signal.' });
  }
});

app.get('/api/signals/:id/status', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, symbol, direction, entry_price, stop_loss, target_price, entry_time, expiry_time FROM signals WHERE id = $1`,
      [req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Signal not found.' });
    }

    const row = result.rows[0];
    const signal = {
      id: row.id,
      symbol: row.symbol,
      direction: row.direction,
      entryPrice: Number(row.entry_price),
      stopLoss: Number(row.stop_loss),
      targetPrice: Number(row.target_price),
      entryTime: new Date(row.entry_time).toISOString(),
      expiryTime: new Date(row.expiry_time).toISOString(),
    };

    const timeRemaining = formatTimeRemaining(signal.expiryTime);
    const currentPrice = await fetchBinancePrice(signal.symbol);
    const status = computeLiveStatus(signal, currentPrice);
    const rawRoi = calculateRoi(signal.direction, signal.entryPrice, currentPrice);
    const roi = Number.isFinite(rawRoi) ? Number(rawRoi.toFixed(2)) : 0;

    console.log('Status payload:', {
      id: signal.id,
      symbol: signal.symbol,
      expiryTime: signal.expiryTime,
      currentPrice,
      status,
      roi,
      timeRemaining,
    });

    res.json({ id: signal.id, status, currentPrice, roi, timeRemaining });
  } catch (error) {
    console.error('Error in /api/signals/:id/status:', { id: req.params.id, error });
    res.status(502).json({
      message: error instanceof Error ? error.message : 'Unable to fetch live status.',
      id: req.params.id,
      currentPrice: 0,
      status: 'PRICE ERROR',
      roi: 0,
      timeRemaining: 'Unknown',
    });
  }
});

app.post('/api/signals', async (req, res) => {
  const validationErrors = validateSignalInput(req.body);
  if (validationErrors.length > 0) {
    return res.status(400).json({ errors: validationErrors });
  }

  const signal = {
    id: crypto.randomUUID(),
    symbol: String(req.body.symbol).trim().toUpperCase(),
    direction: String(req.body.direction),
    entryPrice: Number(req.body.entryPrice),
    stopLoss: Number(req.body.stopLoss),
    targetPrice: Number(req.body.targetPrice),
    entryTime: new Date(req.body.entryTime).toISOString(),
    expiryTime: new Date(req.body.expiryTime).toISOString(),
  };

  try {
    const result = await pool.query(
      `INSERT INTO signals (id, symbol, direction, entry_price, stop_loss, target_price, entry_time, expiry_time, status, realized_roi)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, symbol, direction, entry_price AS "entryPrice", stop_loss AS "stopLoss", target_price AS "targetPrice", entry_time AS "entryTime", expiry_time AS "expiryTime", status, realized_roi AS "realizedRoi", created_at AS "createdAt"`,
      [
        signal.id,
        signal.symbol,
        signal.direction,
        signal.entryPrice,
        signal.stopLoss,
        signal.targetPrice,
        signal.entryTime,
        signal.expiryTime,
        'OPEN',
        null,
      ]
    );

    const row = result.rows[0];
    res.status(201).json({
      ...row,
      entryPrice: Number(row.entryPrice),
      stopLoss: Number(row.stopLoss),
      targetPrice: Number(row.targetPrice),
      realizedRoi: row.realizedRoi == null ? null : Number(row.realizedRoi),
    });
  } catch (error) {
    res.status(500).json({ message: 'Unable to create signal.' });
  }
});

app.delete('/api/signals/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM signals WHERE id = $1 RETURNING id`,
      [req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Signal not found.' });
    }

    res.json({ deleted: true, id: result.rows[0].id });
  } catch (error) {
    res.status(500).json({ message: 'Unable to delete signal.' });
  }
});

if (fs.existsSync(buildPath)) {
  app.use(express.static(buildPath));

  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ message: 'API endpoint not found.' });
    }
    res.sendFile(path.join(buildPath, 'index.html'));
  });
} else {
  app.use((req, res) => {
    res.status(404).json({ message: 'Endpoint not found.' });
  });
}

waitForDatabase()
  .then(() => createSignalTable())
  .then(() => {
    console.log('Database host:', dbHost);
    console.log('Database name:', dbName);
    console.log('Server port:', PORT);
    const server = app.listen(PORT, () => {
      console.log(`Signal backend running on http://localhost:${PORT}`);
    });

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Stop the process using that port or set PORT to an unused port.`);
      } else {
        console.error('Server error:', error);
      }
      process.exit(1);
    });
  })
  .catch((error) => {
    console.error('Unable to initialize database or start server:', error);
    process.exit(1);
  });
