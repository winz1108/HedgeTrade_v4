import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ORACLE_VM_URL = "http://130.61.50.101:54321";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const endpoint = url.searchParams.get("endpoint");

    if (!endpoint) {
      return new Response(
        JSON.stringify({ error: "endpoint parameter is required" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const oracleUrl = `${ORACLE_VM_URL}${endpoint}`;
    console.log("Fetching from Oracle VM:", oracleUrl);

    try {
      const response = await fetch(oracleUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(5000),
      });

      console.log("Oracle VM response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Oracle VM error response:", errorText);
        throw new Error(`Oracle VM responded with status ${response.status}`);
      }

      const data = await response.json();
      console.log("Successfully fetched data from Oracle VM");

      return new Response(JSON.stringify(data), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    } catch (fetchError) {
      console.error("Oracle VM unreachable, returning mock data:", fetchError);

      const mockData = {
        version: "mock",
        currentAsset: 10000,
        initialAsset: 10000,
        currentTime: Date.now(),
        currentPrice: 95100.50,
        priceHistory1m: generateMockCandles(60),
        pricePredictions: [],
        trades: [],
        holding: {
          isHolding: false
        },
        currentPrediction: {
          takeProfitProb: 0,
          stopLossProb: 1.0
        },
        lastPredictionUpdateTime: Date.now(),
        metrics: {
          portfolioReturn: 0,
          marketReturn: 0,
          avgTradeReturn: 0,
          takeProfitCount: 0,
          stopLossCount: 0
        }
      };

      return new Response(JSON.stringify(mockData), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "X-Data-Source": "mock"
        },
      });
    }
  } catch (error) {
    console.error("Error proxying to Oracle VM:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to proxy request",
        oracleVmUrl: ORACLE_VM_URL
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

function generateMockCandles(count: number) {
  const candles = [];
  const now = Date.now();
  let price = 95000 + Math.random() * 200;

  for (let i = count - 1; i >= 0; i--) {
    const change = (Math.random() - 0.5) * 100;
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.random() * 50;
    const low = Math.min(open, close) - Math.random() * 50;

    candles.push({
      timestamp: now - (i * 60000),
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume: parseFloat((Math.random() * 100 + 50).toFixed(2)),
      ema20: parseFloat((price * (1 + (Math.random() - 0.5) * 0.002)).toFixed(2)),
      ema50: parseFloat((price * (1 + (Math.random() - 0.5) * 0.003)).toFixed(2)),
      bb_upper: parseFloat((price * 1.02).toFixed(2)),
      bb_lower: parseFloat((price * 0.98).toFixed(2)),
      macd: parseFloat(((Math.random() - 0.5) * 20).toFixed(2)),
      signal: parseFloat(((Math.random() - 0.5) * 18).toFixed(2)),
      histogram: parseFloat(((Math.random() - 0.5) * 10).toFixed(2)),
      rsi: parseFloat((30 + Math.random() * 40).toFixed(1))
    });

    price = close;
  }

  return candles;
}