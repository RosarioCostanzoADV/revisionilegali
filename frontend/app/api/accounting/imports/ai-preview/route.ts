import { NextRequest } from "next/server";

function getGatewayUrl(): string {
  return process.env.GATEWAY_URL ?? "http://localhost:8080";
}

async function proxyAiPreviewRequest(request: NextRequest) {
  const token = request.cookies.get("auth_token")?.value;
  const headers = new Headers();
  const query = request.nextUrl.search ?? "";

  if (token) headers.set("authorization", `Bearer ${token}`);

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (err) {
    console.error("[ai-preview] formData parse error:", err);
    return new Response(JSON.stringify({ error: "Errore lettura file upload." }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${getGatewayUrl()}/api/accounting/imports/ai-preview${query}`, {
      method: request.method,
      headers,
      body: formData,
      cache: "no-store",
    });
  } catch (err) {
    console.error("[ai-preview] upstream fetch error:", err);
    return new Response(JSON.stringify({ error: "Gateway non raggiungibile." }), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  }

  const responseHeaders = new Headers();
  const responseContentType = upstream.headers.get("content-type");
  if (responseContentType) responseHeaders.set("content-type", responseContentType);

  const body = await upstream.text();
  if (!upstream.ok) {
    console.error(`[ai-preview] upstream ${upstream.status}:`, body);
  }

  return new Response(body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export async function POST(request: NextRequest) {
  return proxyAiPreviewRequest(request);
}