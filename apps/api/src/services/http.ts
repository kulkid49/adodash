import { setTimeout as delay } from "node:timers/promises";

export type HttpClientOptions = {
  baseUrl: string;
  headers: Record<string, string>;
};

export async function httpRequestJson<T>(
  input: string,
  init: RequestInit & { expectedStatus?: number[] } = {},
): Promise<T> {
  const expected = init.expectedStatus ?? [200];
  const maxRetries = 5;

  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(input, init);
      if (res.status === 429 || res.status >= 500) {
        const retryAfter = res.headers.get("retry-after");
        const waitMs = retryAfter ? Number(retryAfter) * 1000 : 500 * Math.pow(2, attempt);
        await delay(Math.min(waitMs, 8000));
        continue;
      }

      if (!expected.includes(res.status)) {
        const text = await res.text();
        throw new Error(`http_${res.status}: ${text.slice(0, 1000)}`);
      }

      return (await res.json()) as T;
    } catch (e) {
      lastErr = e;
      await delay(200 * Math.pow(2, attempt));
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error("http_request_failed");
}

