import { NextRequest } from "next/server";

export function getGatewayUrl(): string {
  return process.env.GATEWAY_URL ?? "http://localhost:8080";
}

/** Proxy generico: inoltra la request (con cookie auth) all'upstream. */
export async function proxyTo(
  request: NextRequest,
  upstreamPath: string,
  options: { overrideMethod?: string } = {},
): Promise<Response> {
  const token = request.cookies.get("auth_token")?.value;
  const method = options.overrideMethod ?? request.method;
  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  if (token) headers.set("authorization", `Bearer ${token}`);

  const hasBody = method !== "GET" && method !== "HEAD";
  const upstream = await fetch(`${getGatewayUrl()}${upstreamPath}`, {
    method,
    headers,
    body: hasBody ? await request.text() : undefined,
    cache: "no-store",
  });

  const responseHeaders = new Headers();
  const ct = upstream.headers.get("content-type");
  if (ct) responseHeaders.set("content-type", ct);

  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: responseHeaders,
  });
}

/** Proxy per upload multipart: passa il form-data senza toccare il Content-Type boundary. */
export async function proxyFormDataTo(
  request: NextRequest,
  upstreamPath: string,
): Promise<Response> {
  const token = request.cookies.get("auth_token")?.value;
  const headers = new Headers();
  if (token) headers.set("authorization", `Bearer ${token}`);
  // NON impostiamo content-type: il browser lo aggiunge con il boundary corretto

  const upstream = await fetch(`${getGatewayUrl()}${upstreamPath}`, {
    method: "POST",
    headers,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    body: await request.formData() as any,
    cache: "no-store",
  });

  const responseHeaders = new Headers();
  const ct = upstream.headers.get("content-type");
  if (ct) responseHeaders.set("content-type", ct);

  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: responseHeaders,
  });
}

/** Proxy per download binario: stream diretto senza buffering in memoria. */
export async function proxyDownloadTo(
  request: NextRequest,
  upstreamPath: string,
): Promise<Response> {
  const token = request.cookies.get("auth_token")?.value;
  const headers = new Headers();
  if (token) headers.set("authorization", `Bearer ${token}`);

  const upstream = await fetch(`${getGatewayUrl()}${upstreamPath}`, {
    method: "GET",
    headers,
    cache: "no-store",
  });

  const responseHeaders = new Headers();
  for (const key of ["content-type", "content-disposition", "content-length"]) {
    const val = upstream.headers.get(key);
    if (val) responseHeaders.set(key, val);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}
