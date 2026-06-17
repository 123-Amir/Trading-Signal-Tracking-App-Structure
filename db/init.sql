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
