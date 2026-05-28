import { NextRequest } from "next/server";

function getGatewayUrl(): string {
  return process.env.GATEWAY_URL ?? "http://localhost:8080";
}

async function proxyAuthRequest(request: NextRequest, params: { path?: string[] }) {
  const token = request.cookies.get("auth_token")?.value;
  const headers = new Headers();
  const contentType = request.headers.get("content-type");

  if (contentType) headers.set("content-type", contentType);
  if (token) headers.set("authorization", `Bearer ${token}`);

  const upstreamPath = (params.path ?? []).join("/");
  const query = request.nextUrl.search ?? "";
  const hasBody = request.method !== "GET" && request.method !== "HEAD";

  const upstream = await fetch(`${getGatewayUrl()}/api/auth/${upstreamPath}${query}`, {
    method: request.method,
    headers,
    body: hasBody ? await request.text() : undefined,
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

type RouteContext = { params: Promise<{ path?: string[] }> };

export async function GET(request: NextRequest, context: RouteContext) {
  return proxyAuthRequest(request, await context.params);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxyAuthRequest(request, await context.params);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return proxyAuthRequest(request, await context.params);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return proxyAuthRequest(request, await context.params);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return proxyAuthRequest(request, await context.params);
}