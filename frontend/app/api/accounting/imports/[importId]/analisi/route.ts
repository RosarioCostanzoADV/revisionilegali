import { NextRequest } from "next/server";

function getGatewayUrl(): string {
  return process.env.GATEWAY_URL ?? "http://localhost:8080";
}

type RouteContext = { params: Promise<{ importId: string }> };

async function proxyAnalisi(request: NextRequest, context: RouteContext) {
  const { importId } = await context.params;
  const token = request.cookies.get("auth_token")?.value;
  const headers = new Headers();

  if (token) headers.set("authorization", `Bearer ${token}`);
  if (request.method !== "GET") headers.set("content-type", "application/json");

  const upstream = await fetch(
    `${getGatewayUrl()}/api/accounting/imports/${importId}/analisi`,
    {
      method: request.method,
      headers,
      cache: "no-store",
    },
  );

  const responseHeaders = new Headers();
  const ct = upstream.headers.get("content-type");
  if (ct) responseHeaders.set("content-type", ct);

  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export async function GET(request: NextRequest, context: RouteContext) {
  return proxyAnalisi(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxyAnalisi(request, context);
}
