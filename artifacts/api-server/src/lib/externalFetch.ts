import { cacheGet, cacheSet } from "./cache";

export const DEFAULT_EXTERNAL_TTL = 300;

export async function cachedJson<T = unknown>(
  cacheKey: string,
  url: string,
  init: RequestInit = {},
  ttl = DEFAULT_EXTERNAL_TTL,
): Promise<{ data: T; source: "cache" | "live"; cachedAt: string }> {
  const hit = await cacheGet<{ data: T; cachedAt: string }>(cacheKey);
  if (hit) return { data: hit.data, source: "cache", cachedAt: hit.cachedAt };

  const res = await fetch(url, init);
  const text = await res.text();
  let body: unknown = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
  }
  if (!res.ok) {
    const message =
      typeof body === "object" && body && "message" in body
        ? String((body as { message: unknown }).message)
        : `Upstream ${res.status} ${res.statusText}`;
    const err = new Error(message) as Error & { status?: number; body?: unknown };
    err.status = res.status;
    err.body = body;
    throw err;
  }

  const cachedAt = new Date().toISOString();
  await cacheSet(cacheKey, { data: body, cachedAt }, ttl);
  return { data: body as T, source: "live", cachedAt };
}

export function externalErrorStatus(err: unknown): number {
  if (
    err &&
    typeof err === "object" &&
    "status" in err &&
    typeof (err as { status: unknown }).status === "number"
  ) {
    return (err as { status: number }).status;
  }
  return 502;
}

export function externalErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Upstream request failed";
}
