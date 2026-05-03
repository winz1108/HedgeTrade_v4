import { useState, useCallback } from 'react';
import { Send, X, Lock, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';

interface ManualOrderPanelProps {
  currentPrice?: number;
  inPosition?: boolean;
  positionSide?: 'LONG' | 'SHORT' | null;
}

type Exchange = 'both' | 'kraken' | 'binance';
type OrderStatus = 'idle' | 'loading' | 'success' | 'error';

interface OrderResult {
  status: OrderStatus;
  message: string;
}

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.hedgetrade.eu';

export function ManualOrderPanel({ currentPrice, inPosition, positionSide }: ManualOrderPanelProps) {
  const [exchange, setExchange] = useState<Exchange>('both');
  const [tp, setTp] = useState<string>('');
  const [sl, setSl] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [orderResult, setOrderResult] = useState<OrderResult>({ status: 'idle', message: '' });

  const clearResult = useCallback(() => {
    setTimeout(() => setOrderResult({ status: 'idle', message: '' }), 3000);
  }, []);

  const sendOrder = async (side: 'LONG' | 'SHORT') => {
    if (!password) {
      setOrderResult({ status: 'error', message: 'Password required' });
      clearResult();
      return;
    }

    setOrderResult({ status: 'loading', message: `Opening ${side}...` });

    try {
      const body: any = { exchange, side, password };
      if (tp) body.tp = parseFloat(tp);
      if (sl) body.sl = parseFloat(sl);

      const res = await fetch(`${API_BASE}/api/manual-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok && data.success !== false) {
        setOrderResult({ status: 'success', message: data.message || `${side} order sent` });
      } else {
        setOrderResult({ status: 'error', message: data.error || data.message || 'Order failed' });
      }
    } catch (err) {
      setOrderResult({ status: 'error', message: 'Network error' });
    }

    clearResult();
  };

  const sendClose = async () => {
    if (!password) {
      setOrderResult({ status: 'error', message: 'Password required' });
      clearResult();
      return;
    }

    setOrderResult({ status: 'loading', message: 'Closing position...' });

    try {
      const res = await fetch(`${API_BASE}/api/manual-close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exchange, password }),
      });

      const data = await res.json();

      if (res.ok && data.success !== false) {
        setOrderResult({ status: 'success', message: data.message || 'Position closed' });
      } else {
        setOrderResult({ status: 'error', message: data.error || data.message || 'Close failed' });
      }
    } catch (err) {
      setOrderResult({ status: 'error', message: 'Network error' });
    }

    clearResult();
  };

  const exchangeOptions: { value: Exchange; label: string }[] = [
    { value: 'both', label: 'All' },
    { value: 'kraken', label: 'Kraken' },
    { value: 'binance', label: 'Binance' },
  ];

  return (
    <div className="bg-slate-800/95 border border-slate-700 rounded-lg shadow-sm p-2">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[11px] font-bold text-slate-200 tracking-wide uppercase">Manual Order</h3>
        <Send className="w-3 h-3 text-slate-500" />
      </div>

      <div className="space-y-2">
        <div>
          <div className="text-[9px] text-slate-400 font-medium mb-1 uppercase tracking-wider">Exchange</div>
          <div className="flex gap-1">
            {exchangeOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setExchange(opt.value)}
                className={`flex-1 py-1 text-[10px] font-semibold rounded transition-all ${
                  exchange === opt.value
                    ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50'
                    : 'bg-slate-700/40 text-slate-500 border border-slate-700/50 hover:bg-slate-700/60 hover:text-slate-400'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <div>
            <div className="text-[9px] text-slate-400 font-medium mb-0.5 uppercase tracking-wider">TP %</div>
            <input
              type="number"
              step="0.1"
              min="0"
              placeholder="--"
              value={tp}
              onChange={e => setTp(e.target.value)}
              className="w-full bg-slate-700/50 border border-slate-600 rounded px-2 py-1 text-[11px] text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 tabular-nums"
            />
          </div>
          <div>
            <div className="text-[9px] text-slate-400 font-medium mb-0.5 uppercase tracking-wider">SL %</div>
            <input
              type="number"
              step="0.1"
              min="0"
              placeholder="--"
              value={sl}
              onChange={e => setSl(e.target.value)}
              className="w-full bg-slate-700/50 border border-slate-600 rounded px-2 py-1 text-[11px] text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 tabular-nums"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => sendOrder('LONG')}
            disabled={orderResult.status === 'loading'}
            className="py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all
              bg-cyan-600/80 text-white border border-cyan-500/60
              hover:bg-cyan-500/90 hover:shadow-[0_0_8px_rgba(34,211,238,0.3)]
              active:scale-[0.97]
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            LONG
          </button>
          <button
            onClick={() => sendOrder('SHORT')}
            disabled={orderResult.status === 'loading'}
            className="py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all
              bg-orange-600/80 text-white border border-orange-500/60
              hover:bg-orange-500/90 hover:shadow-[0_0_8px_rgba(251,146,60,0.3)]
              active:scale-[0.97]
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            SHORT
          </button>
        </div>

        <button
          onClick={sendClose}
          disabled={orderResult.status === 'loading'}
          className="w-full py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all
            bg-slate-600/60 text-slate-300 border border-slate-500/50
            hover:bg-slate-500/60 hover:text-white
            active:scale-[0.98]
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Close Position
        </button>

        <div>
          <div className="text-[9px] text-slate-400 font-medium mb-0.5 uppercase tracking-wider flex items-center gap-1">
            <Lock className="w-2.5 h-2.5" />
            Password
          </div>
          <input
            type="password"
            placeholder="********"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full bg-slate-700/50 border border-slate-600 rounded px-2 py-1 text-[11px] text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
          />
        </div>

        {orderResult.status !== 'idle' && (
          <div className={`flex items-center gap-1.5 rounded px-2 py-1 text-[10px] font-medium transition-all ${
            orderResult.status === 'loading'
              ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-300'
              : orderResult.status === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
          }`}>
            {orderResult.status === 'loading' && <Loader2 className="w-3 h-3 animate-spin" />}
            {orderResult.status === 'success' && <CheckCircle className="w-3 h-3" />}
            {orderResult.status === 'error' && <AlertTriangle className="w-3 h-3" />}
            <span className="truncate">{orderResult.message}</span>
          </div>
        )}
      </div>
    </div>
  );
}
