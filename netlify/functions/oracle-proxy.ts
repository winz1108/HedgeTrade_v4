import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

const ORACLE_VM_URL = "http://130.61.50.101:54321";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
  "Content-Type": "application/json",
};

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: "",
    };
  }

  try {
    const endpoint = event.queryStringParameters?.endpoint;

    if (!endpoint) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "endpoint parameter is required" }),
      };
    }

    const oracleUrl = `${ORACLE_VM_URL}${endpoint}`;
    console.log("Proxying to Oracle VM:", oracleUrl, "Method:", event.httpMethod);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const requestOptions: RequestInit = {
      method: event.httpMethod,
      headers: {
        "Content-Type": "application/json",
        "Cookie": event.headers.cookie || "",
      },
      signal: controller.signal,
    };

    if (event.body && (event.httpMethod === "POST" || event.httpMethod === "PUT")) {
      requestOptions.body = event.body;
    }

    const response = await fetch(oracleUrl, requestOptions);

    clearTimeout(timeoutId);

    const responseCookies = response.headers.get("set-cookie");
    const responseHeaders = { ...headers };
    if (responseCookies) {
      responseHeaders["set-cookie"] = responseCookies;
    }

    if (!response.ok) {
      let errorBody;
      try {
        errorBody = await response.json();
      } catch {
        errorBody = await response.text();
      }
      console.error(`Oracle VM responded with status ${response.status}:`, errorBody);
      return {
        statusCode: response.status,
        headers: responseHeaders,
        body: JSON.stringify({
          error: `Oracle VM responded with status ${response.status}`,
          details: errorBody
        }),
      };
    }

    const data = await response.json();
    console.log("Successfully fetched data from Oracle VM");

    return {
      statusCode: 200,
      headers: responseHeaders,
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error("Error connecting to Oracle VM:", error);
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to connect to Oracle VM",
        oracleVmUrl: ORACLE_VM_URL
      }),
    };
  }
};
