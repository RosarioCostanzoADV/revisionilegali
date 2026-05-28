import { NextRequest } from "next/server";

function getGatewayUrl(): string {
  return process.env.GATEWAY_URL ?? "http://localhost:8080";
}

async function proxyCompaniesRequest(request: NextRequest) {
  const token = request.cookies.get("auth_token")?.value;
  const headers = new Headers();
  const contentType = request.headers.get("content-type");

  if (contentType) headers.set("content-type", contentType);
  if (token) headers.set("authorization", `Bearer ${token}`);

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const upstream = await fetch(`${getGatewayUrl()}/api/companies`, {
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

export async function GET(request: NextRequest) {
  return proxyCompaniesRequest(request);
}

export async function POST(request: NextRequest) {
  return proxyCompaniesRequest(request);
}

export async function PATCH(request: NextRequest) {
  return proxyCompaniesRequest(request);
}

export async function DELETE(request: NextRequest) {
  return proxyCompaniesRequest(request);
}