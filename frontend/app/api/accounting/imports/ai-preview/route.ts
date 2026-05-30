import { NextRequest } from "next/server";

function getGatewayUrl(): string {
  return process.env.GATEWAY_URL ?? "http://localhost:8080";
}

async function proxyAiPreviewRequest(request: NextRequest) {
  const token = request.cookies.get("auth_token")?.value;
  const headers = new Headers();
  const query = request.nextUrl.search ?? "";

  if (token) headers.set("authorization", `Bearer ${token}`);

  const upstream = await fetch(`${getGatewayUrl()}/api/accounting/imports/ai-preview${query}`, {
    method: request.method,
    headers,
    body: await request.formData(),
    cache: "no-store",
  });

  const responseHeaders = new Headers();
  const responseContentType = upstream.headers.get("content-type");
  if (responseContentType) responseHeaders.set("content-type", responseContentType);

  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export async function POST(request: NextRequest) {
  return proxyAiPreviewRequest(request);
}