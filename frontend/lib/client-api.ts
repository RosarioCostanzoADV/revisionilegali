"use client";

/**
 * Browser-side authenticated fetch toward the API gateway.
 * Reads the `auth_token` cookie (non-HttpOnly, set at login).
 *
 * Use only inside Client Components.
 */

function getCookieValue(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=")[1]!) : null;
}

export function getGatewayUrl(): string {
  const configured = process.env.NEXT_PUBLIC_GATEWAY_URL;
  if (configured) {
    try {
      const parsed = new URL(configured);
      const cfgIsLocal = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";

      if (typeof window === "undefined") return configured;

      const appIsLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
      if (!cfgIsLocal || appIsLocal) return configured;
    } catch {
      return configured;
    }
  }

  if (typeof window !== "undefined") {
    return "http://localhost:8080";
  }

  return "http://localhost:8080";
}

export function getAuthToken(): string | null {
  return getCookieValue("auth_token");
}

export function setAuthToken(token: string, maxAgeSec = 60 * 60 * 24): void {
  document.cookie = `auth_token=${encodeURIComponent(token)}; path=/; SameSite=Lax; max-age=${maxAgeSec}`;
}

export function clearAuthToken(): void {
  document.cookie = "auth_token=; path=/; max-age=0";
}

export async function apiFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const token = getAuthToken();
  const providedHeaders = init?.headers ?? {};

  // Don't set Content-Type for FormData (let browser set boundary)
  const isFormData = init?.body instanceof FormData;

  const headers: HeadersInit = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...providedHeaders,
  };

  return fetch(`${getGatewayUrl()}${path}`, {
    ...init,
    headers,
  });
}
