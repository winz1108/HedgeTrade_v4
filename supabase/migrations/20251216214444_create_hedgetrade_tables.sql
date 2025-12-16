/*
  # Create HedgeTrade Trading System Tables

  ## Overview
  This migration creates all necessary tables for the HedgeTrade trading dashboard system.

  ## New Tables
  
  ### 1. candles
  Stores price candle data for multiple timeframes (1m, 5m, 15m, 1h, 4h, 1d)
  - `id` (uuid, primary key)
  - `timeframe` (text) - '1m', '5m', '15m', '1h', '4h', '1d'
  - `timestamp` (bigint) - Unix timestamp in milliseconds
  - `open`, `high`, `low`, `close`, `volume` (numeric)
  - Technical indicators: `ema20`, `ema50`, `bb_upper`, `bb_lower`, `bb_middle`, `macd`, `signal`, `histogram`, `rsi`
  - `is_prediction` (boolean)
  - `created_at` (timestamptz)

  ### 2. predictions
  Stores AI model predictions
  - `id` (uuid, primary key)
  - `timestamp` (bigint)
  - `take_profit_prob`, `stop_loss_prob` (numeric)
  - `v5moe_take_profit_prob`, `v5moe_stop_loss_prob` (numeric)
  - `created_at` (timestamptz)

  ### 3. market_state
  Stores market state probabilities
  - `id` (uuid, primary key)
  - `timestamp` (bigint)
  - `bull_div`, `bull_conv`, `bear_div`, `bear_conv`, `sideways` (numeric)
  - `active_state` (text)
  - `gate_weights` (jsonb)
  - `created_at` (timestamptz)

  ### 4. accounts
  Stores trading account information
  - `id` (uuid, primary key)
  - `account_id` (text, unique)
  - `account_name` (text)
  - Asset information
  - `created_at`, `updated_at` (timestamptz)

  ### 5. holdings
  Stores current positions
  - `id` (uuid, primary key)
  - `account_id` (text)
  - Position details
  - `created_at`, `updated_at` (timestamptz)

  ### 6. trades
  Stores all executed trades
  - `id` (uuid, primary key)
  - `account_id` (text)
  - Trade details
  - `created_at` (timestamptz)

  ### 7. metrics
  Stores performance metrics
  - `id` (uuid, primary key)
  - `account_id` (text)
  - Performance statistics
  - `created_at` (timestamptz)

  ### 8. system_state
  Stores current system state
  - `id` (uuid, primary key)
  - `version`, `current_timestamp_ms`, `current_price`
  - `last_update` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Public read access for dashboard display
  - Write access restricted to service role

  ## Indexes
  - Timestamp indexes for efficient querying
  - Account ID indexes for joins
  - Unique constraints on key fields
*/

-- Create candles table
CREATE TABLE IF NOT EXISTS candles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timeframe text NOT NULL,
  timestamp bigint NOT NULL,
  open numeric NOT NULL,
  high numeric NOT NULL,
  low numeric NOT NULL,
  close numeric NOT NULL,
  volume numeric NOT NULL DEFAULT 0,
  ema20 numeric,
  ema50 numeric,
  bb_upper numeric,
  bb_middle numeric,
  bb_lower numeric,
  bb_width numeric,
  macd numeric,
  signal numeric,
  histogram numeric,
  rsi numeric,
  is_prediction boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS candles_timeframe_timestamp_idx ON candles(timeframe, timestamp);
CREATE INDEX IF NOT EXISTS candles_timestamp_idx ON candles(timestamp);

-- Create predictions table
CREATE TABLE IF NOT EXISTS predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp bigint NOT NULL,
  take_profit_prob numeric NOT NULL,
  stop_loss_prob numeric NOT NULL,
  v5moe_take_profit_prob numeric,
  v5moe_stop_loss_prob numeric,
  prediction_target_timestamp bigint,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS predictions_timestamp_idx ON predictions(timestamp DESC);

-- Create market_state table
CREATE TABLE IF NOT EXISTS market_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp bigint NOT NULL,
  bull_div numeric DEFAULT 0,
  bull_conv numeric DEFAULT 0,
  bear_div numeric DEFAULT 0,
  bear_conv numeric DEFAULT 0,
  sideways numeric DEFAULT 0,
  active_state text DEFAULT 'sideways',
  gate_weights jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS market_state_timestamp_idx ON market_state(timestamp DESC);

-- Create accounts table
CREATE TABLE IF NOT EXISTS accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id text UNIQUE NOT NULL,
  account_name text,
  current_asset numeric DEFAULT 0,
  initial_asset numeric DEFAULT 100000,
  current_btc numeric DEFAULT 0,
  current_cash numeric DEFAULT 0,
  btc_quantity numeric DEFAULT 0,
  usdc_free numeric DEFAULT 0,
  usdc_locked numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS accounts_account_id_idx ON accounts(account_id);

-- Create holdings table
CREATE TABLE IF NOT EXISTS holdings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id text NOT NULL,
  is_holding boolean DEFAULT false,
  buy_price numeric,
  buy_time bigint,
  current_profit numeric DEFAULT 0,
  take_profit_price numeric,
  stop_loss_price numeric,
  initial_take_profit_prob numeric,
  v5moe_take_profit_prob numeric,
  quantity numeric DEFAULT 0,
  unrealized_pnl numeric DEFAULT 0,
  unrealized_pnl_pct numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS holdings_account_id_idx ON holdings(account_id);

-- Create trades table
CREATE TABLE IF NOT EXISTS trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id text NOT NULL,
  timestamp bigint NOT NULL,
  type text NOT NULL,
  price numeric NOT NULL,
  profit numeric,
  pair_id text,
  quantity numeric DEFAULT 0,
  entry_time bigint,
  exit_time bigint,
  pnl numeric,
  pnl_pct numeric,
  exit_reason text,
  prediction_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trades_account_id_idx ON trades(account_id);
CREATE INDEX IF NOT EXISTS trades_timestamp_idx ON trades(timestamp DESC);
CREATE INDEX IF NOT EXISTS trades_pair_id_idx ON trades(pair_id);

-- Create metrics table
CREATE TABLE IF NOT EXISTS metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id text NOT NULL,
  timestamp bigint NOT NULL,
  portfolio_return numeric DEFAULT 0,
  portfolio_return_with_commission numeric DEFAULT 0,
  market_return numeric DEFAULT 0,
  avg_trade_return numeric DEFAULT 0,
  total_trades integer DEFAULT 0,
  winning_trades integer DEFAULT 0,
  take_profit_count integer DEFAULT 0,
  stop_loss_count integer DEFAULT 0,
  win_rate numeric DEFAULT 0,
  total_pnl numeric DEFAULT 0,
  avg_pnl numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS metrics_account_id_idx ON metrics(account_id);
CREATE INDEX IF NOT EXISTS metrics_timestamp_idx ON metrics(timestamp DESC);

-- Create system_state table (singleton)
CREATE TABLE IF NOT EXISTS system_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text DEFAULT 'v1.0.0',
  current_timestamp_ms bigint NOT NULL,
  current_price numeric NOT NULL,
  cache_status text DEFAULT 'active',
  last_update timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE candles ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_state ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Allow public read access to candles"
  ON candles FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public read access to predictions"
  ON predictions FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public read access to market_state"
  ON market_state FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public read access to accounts"
  ON accounts FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public read access to holdings"
  ON holdings FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public read access to trades"
  ON trades FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public read access to metrics"
  ON metrics FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public read access to system_state"
  ON system_state FOR SELECT
  TO public
  USING (true);

-- Insert default system state
INSERT INTO system_state (current_timestamp_ms, current_price, version, cache_status)
VALUES (
  EXTRACT(EPOCH FROM now())::bigint * 1000,
  95000,
  'v1.0.0',
  'active'
)
ON CONFLICT DO NOTHING;

-- Insert default account
INSERT INTO accounts (account_id, account_name, current_asset, initial_asset)
VALUES (
  'default',
  'Default Account',
  100000,
  100000
)
ON CONFLICT (account_id) DO NOTHING;