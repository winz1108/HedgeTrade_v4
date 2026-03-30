export interface ZBPosition {
  dir: 'long' | 'short';
  entry_price: number;
  current_sl: number;
  initial_sl: number;
  risk: number;
  risk_pct: number;
  rr_target: number;
  trailing: boolean;
  extreme: number;
  bars_held: number;
  hold_minutes: number;
  zone_tests: number;
  unrealized_pct: number;
  pending_exit: boolean;
  pending_exit_reason: string | null;
}

export interface ZBSignal {
  dir: 'long' | 'short';
  zone_center: number;
  zone_tests: number;
  sl_price: number;
}

export interface ZBStatus {
  version: string;
  price: number;
  atr: number;
  bar_count: number;
  uptime_h: number;
  position: ZBPosition | null;
  signal: ZBSignal | null;
}

export interface ZBZone {
  type: 'S' | 'R';
  top: number;
  bot: number;
  center: number;
  tests: number;
  age_bars: number;
  dist_pct: number;
  strength: 'weak' | 'medium' | 'strong';
}

export interface ZBZones {
  supports: ZBZone[];
  resistances: ZBZone[];
  atr: number;
}

export interface ZBTradeEntry {
  time: string;
  type: 'ENTRY';
  dir: 'long' | 'short';
  entry_price: number;
  sl_price: number;
  risk_pct: number;
  zone_tests: number;
  fill_price: number | null;
  slippage_pct: number | null;
}

export interface ZBTradeExit {
  time: string;
  type: 'EXIT';
  dir: 'long' | 'short';
  exit_price: number;
  reason: 'SL' | 'Trail' | 'MaxHold';
  pnl: number;
  fill_price: number | null;
  slippage_pct: number | null;
}

export type ZBTrade = ZBTradeEntry | ZBTradeExit;

export interface ZBTrades {
  trades: ZBTrade[];
}

export interface ZBParams {
  version: string;
  pn: number;
  max_age: number;
  zw: number;
  sl_buf: number;
  rr_trig: number;
  trail_m: number;
  max_hold: number;
  touch_tol: number;
  atr_period: number;
  fee_rt: number;
  tf_seconds: number;
}

export interface ZBHealth {
  ok: boolean;
  ts: number;
}

export interface ZBData {
  status: ZBStatus | null;
  zones: ZBZones | null;
  trades: ZBTrade[];
  params: ZBParams | null;
  online: boolean;
}
