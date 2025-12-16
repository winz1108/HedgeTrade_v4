import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, Cache-Control, Pragma",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const endpoint = url.searchParams.get("endpoint");

    if (endpoint === "/api/dashboard") {
      const now = Date.now();

      // Fetch system state
      const { data: systemState } = await supabase
        .from("system_state")
        .select("*")
        .single();

      // Fetch latest prediction
      const { data: latestPrediction } = await supabase
        .from("predictions")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Fetch latest market state
      const { data: latestMarketState } = await supabase
        .from("market_state")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Fetch candles for all timeframes
      const timeframes = ["1m", "5m", "15m", "1h", "4h", "1d"];
      const priceHistory: Record<string, any[]> = {};

      for (const tf of timeframes) {
        const { data: candles } = await supabase
          .from("candles")
          .select("*")
          .eq("timeframe", tf)
          .eq("is_prediction", false)
          .order("timestamp", { ascending: false })
          .limit(500);

        if (candles && candles.length > 0) {
          priceHistory[tf] = candles.reverse().map((c: any) => ({
            timestamp: c.timestamp,
            open: parseFloat(c.open),
            high: parseFloat(c.high),
            low: parseFloat(c.low),
            close: parseFloat(c.close),
            volume: parseFloat(c.volume),
            ema20: c.ema20 ? parseFloat(c.ema20) : undefined,
            ema50: c.ema50 ? parseFloat(c.ema50) : undefined,
            bb_upper: c.bb_upper ? parseFloat(c.bb_upper) : undefined,
            bb_middle: c.bb_middle ? parseFloat(c.bb_middle) : undefined,
            bb_lower: c.bb_lower ? parseFloat(c.bb_lower) : undefined,
            macd: c.macd ? parseFloat(c.macd) : undefined,
            signal: c.signal ? parseFloat(c.signal) : undefined,
            histogram: c.histogram ? parseFloat(c.histogram) : undefined,
            rsi: c.rsi ? parseFloat(c.rsi) : undefined,
          }));
        }
      }

      // Fetch default account
      const { data: account } = await supabase
        .from("accounts")
        .select("*")
        .eq("account_id", "default")
        .maybeSingle();

      // Fetch current holding
      const { data: holding } = await supabase
        .from("holdings")
        .select("*")
        .eq("account_id", "default")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Fetch trades
      const { data: trades } = await supabase
        .from("trades")
        .select("*")
        .eq("account_id", "default")
        .order("timestamp", { ascending: true });

      // Fetch latest metrics
      const { data: latestMetrics } = await supabase
        .from("metrics")
        .select("*")
        .eq("account_id", "default")
        .order("timestamp", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Get current price from latest 1m candle
      const currentPrice = priceHistory["1m"]?.[priceHistory["1m"].length - 1]?.close || 95000;

      // Build response matching ApiResponse interface
      const response = {
        version: systemState?.version || "v1.0.0",
        cacheStatus: systemState?.cache_status || "active",
        currentTime: systemState?.current_timestamp_ms || now,
        currentPrice: currentPrice,
        priceHistory: {
          "1m": priceHistory["1m"] || [],
          "5m": priceHistory["5m"] || [],
          "15m": priceHistory["15m"] || [],
          "1h": priceHistory["1h"] || [],
          "4h": priceHistory["4h"] || [],
          "1d": priceHistory["1d"] || [],
        },
        currentPrediction: {
          takeProfitProb: latestPrediction?.take_profit_prob || 0.5,
          stopLossProb: latestPrediction?.stop_loss_prob || 0.5,
          v5MoeTakeProfitProb: latestPrediction?.v5moe_take_profit_prob || 0.5,
          v5MoeStopLossProb: latestPrediction?.v5moe_stop_loss_prob || 0.5,
          lastUpdateTime: latestPrediction?.timestamp || now,
          predictionTargetTimestampMs: latestPrediction?.prediction_target_timestamp || now,
          marketState: latestMarketState ? {
            bullDiv: parseFloat(latestMarketState.bull_div || "0"),
            bullConv: parseFloat(latestMarketState.bull_conv || "0"),
            bearDiv: parseFloat(latestMarketState.bear_div || "0"),
            bearConv: parseFloat(latestMarketState.bear_conv || "0"),
            sideways: parseFloat(latestMarketState.sideways || "0"),
            activeState: latestMarketState.active_state || "sideways",
          } : undefined,
          gateWeights: latestMarketState?.gate_weights || [],
        },
        lastPredictionUpdateTime: latestPrediction?.timestamp || now,
        marketState: latestMarketState ? {
          bullDiv: parseFloat(latestMarketState.bull_div || "0"),
          bullConv: parseFloat(latestMarketState.bull_conv || "0"),
          bearDiv: parseFloat(latestMarketState.bear_div || "0"),
          bearConv: parseFloat(latestMarketState.bear_conv || "0"),
          sideways: parseFloat(latestMarketState.sideways || "0"),
          activeState: latestMarketState.active_state || "sideways",
        } : {
          bullDiv: 0,
          bullConv: 0,
          bearDiv: 0,
          bearConv: 0,
          sideways: 0,
          activeState: "sideways",
        },
        gateWeights: latestMarketState?.gate_weights || [],
        accounts: account ? [{
          accountId: account.account_id,
          accountName: account.account_name || "Default Account",
          asset: {
            currentAsset: parseFloat(account.current_asset || "0"),
            initialAsset: parseFloat(account.initial_asset || "100000"),
            currentBTC: parseFloat(account.current_btc || "0"),
            currentCash: parseFloat(account.current_cash || "0"),
            btcQuantity: parseFloat(account.btc_quantity || "0"),
            usdcFree: parseFloat(account.usdc_free || "0"),
            usdcLocked: parseFloat(account.usdc_locked || "0"),
          },
          holding: holding ? {
            hasPosition: holding.is_holding || false,
            entryPrice: holding.buy_price ? parseFloat(holding.buy_price) : undefined,
            quantity: holding.quantity ? parseFloat(holding.quantity) : undefined,
            currentPrice: currentPrice,
            unrealizedPnl: holding.unrealized_pnl ? parseFloat(holding.unrealized_pnl) : undefined,
            unrealizedPnlPct: holding.unrealized_pnl_pct ? parseFloat(holding.unrealized_pnl_pct) : undefined,
            tpPrice: holding.take_profit_price ? parseFloat(holding.take_profit_price) : undefined,
            slPrice: holding.stop_loss_price ? parseFloat(holding.stop_loss_price) : undefined,
            entryTime: holding.buy_time,
            initialTakeProfitProb: holding.initial_take_profit_prob ? parseFloat(holding.initial_take_profit_prob) : undefined,
          } : {
            hasPosition: false,
          },
          trades: trades?.map((t: any) => ({
            entryPrice: t.type === "buy" ? parseFloat(t.price) : 0,
            exitPrice: t.type === "sell" ? parseFloat(t.price) : 0,
            quantity: parseFloat(t.quantity || "0"),
            entryTime: t.entry_time || t.timestamp,
            exitTime: t.exit_time || t.timestamp,
            pnl: parseFloat(t.pnl || "0"),
            pnlPct: parseFloat(t.pnl_pct || "0"),
            profit: parseFloat(t.profit || "0"),
            exitReason: t.exit_reason || "TP",
            completed: t.type === "sell",
          })) || [],
          metrics: latestMetrics ? {
            portfolioReturn: parseFloat(latestMetrics.portfolio_return || "0"),
            portfolioReturnWithCommission: parseFloat(latestMetrics.portfolio_return_with_commission || "0"),
            totalTrades: latestMetrics.total_trades || 0,
            winningTrades: latestMetrics.winning_trades || 0,
            winRate: parseFloat(latestMetrics.win_rate || "0"),
            totalPnl: parseFloat(latestMetrics.total_pnl || "0"),
            avgPnl: parseFloat(latestMetrics.avg_pnl || "0"),
          } : {
            portfolioReturn: 0,
            totalTrades: 0,
            winningTrades: 0,
            winRate: 0,
          },
        }] : [],
        metrics: latestMetrics ? {
          portfolioReturn: parseFloat(latestMetrics.portfolio_return || "0"),
          totalTrades: latestMetrics.total_trades || 0,
          winningTrades: latestMetrics.winning_trades || 0,
          winRate: parseFloat(latestMetrics.win_rate || "0"),
          marketReturn: parseFloat(latestMetrics.market_return || "0"),
        } : {
          portfolioReturn: 0,
          totalTrades: 0,
          winningTrades: 0,
          winRate: 0,
          marketReturn: 0,
        },
      };

      console.log("Dashboard data fetched from Supabase:", {
        hasPriceHistory: !!response.priceHistory,
        priceHistory1mLength: response.priceHistory["1m"]?.length || 0,
        priceHistory4hLength: response.priceHistory["4h"]?.length || 0,
        currentPrice: response.currentPrice,
        accountsCount: response.accounts.length,
      });

      return new Response(JSON.stringify(response), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    return new Response(
      JSON.stringify({ error: "Invalid endpoint" }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching dashboard data from Supabase:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to fetch dashboard data",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});