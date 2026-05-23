import { cookies } from "next/headers";

/**
 * Base URL of the API gateway.
 * - Inside Docker: GATEWAY_URL = http://api-gateway
 * - Outside Docker (dev): GATEWAY_URL = http://localhost:8080
 */
function getGatewayUrl(): string {
  return process.env.GATEWAY_URL ?? "http://localhost:8080";
}

/**
 * Server-side authenticated fetch toward the API gateway.
 * Reads the `auth_token` cookie from the current request context.
 *
 * Use only inside Server Components, Layouts, and Next.js middleware.
 */
export async function gw(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(init?.headers ?? {}),
  };

  return fetch(`${getGatewayUrl()}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
}

/**
 * Convenience wrapper: fetch + JSON parse.
 * Returns null if the response is not ok.
 */
export async function gwJson<T>(
  path: string,
  init?: RequestInit,
): Promise<T | null> {
  try {
    const res = await gw(path, init);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
