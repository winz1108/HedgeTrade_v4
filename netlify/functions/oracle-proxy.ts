import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

const ORACLE_VM_URL = "http://130.61.50.101:54321";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
  "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0",
  "Pragma": "no-cache",
  "Expires": "0",
};

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: "",
    };
  }

  try {
    const endpoint = event.queryStringParameters?.endpoint;

    if (!endpoint) {
      return {
        statusCode: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ error: "endpoint parameter is required" }),
      };
    }

    const oracleUrl = `${ORACLE_VM_URL}${endpoint}`;
    console.log("Fetching from Oracle VM:", oracleUrl);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(oracleUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`Oracle VM responded with status ${response.status}`);
      return {
        statusCode: response.status,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          error: `Oracle VM responded with status ${response.status}`
        }),
      };
    }

    const contentType = response.headers.get('content-type') || '';
    let body: string;
    let responseHeaders: Record<string, string>;

    if (contentType.includes('application/json')) {
      const data = await response.json();
      body = JSON.stringify(data);
      responseHeaders = {
        ...corsHeaders,
        "Content-Type": "application/json",
      };
    } else {
      body = await response.text();
      responseHeaders = {
        ...corsHeaders,
        "Content-Type": "text/plain",
      };
    }

    console.log("Successfully fetched data from Oracle VM");

    return {
      statusCode: 200,
      headers: responseHeaders,
      body,
    };
  } catch (error) {
    console.error("Error connecting to Oracle VM:", error);
    return {
      statusCode: 503,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to connect to Oracle VM",
        oracleVmUrl: ORACLE_VM_URL
      }),
    };
  }
};
