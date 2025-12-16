import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ORACLE_VM_URL = "http://130.61.50.101:54321";

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

    const response = await fetch(oracleUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.error(`Oracle VM responded with status ${response.status}`);
      return new Response(
        JSON.stringify({
          error: `Oracle VM responded with status ${response.status}`
        }),
        {
          status: response.status,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const data = await response.json();
    console.log("Oracle VM Response:", {
      hasPriceHistory: !!data.priceHistory,
      priceHistoryKeys: data.priceHistory ? Object.keys(data.priceHistory) : [],
      priceHistory1mLength: data.priceHistory?.['1m']?.length || 0,
      priceHistory5mLength: data.priceHistory?.['5m']?.length || 0,
      priceHistory15mLength: data.priceHistory?.['15m']?.length || 0,
      priceHistory1hLength: data.priceHistory?.['1h']?.length || 0,
      priceHistory4hLength: data.priceHistory?.['4h']?.length || 0,
      priceHistory1dLength: data.priceHistory?.['1d']?.length || 0,
      cacheStatus: data.cacheStatus
    });

    return new Response(JSON.stringify(data), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error connecting to Oracle VM:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to connect to Oracle VM",
        oracleVmUrl: ORACLE_VM_URL
      }),
      {
        status: 503,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});