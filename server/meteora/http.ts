export class MeteoraHttpError extends Error {
  constructor(
    message: string,
    public status: number,
    public url: string,
    public bodySnippet: string
  ) {
    super(message);
    this.name = "MeteoraHttpError";
  }
}

export type HttpOptions = {
  timeoutMs: number;
  headers?: Record<string, string>;
  retries?: number;
};

export type Limiter = <T>(fn: () => Promise<T>) => Promise<T>;

export function createLimiter(concurrency: number): Limiter {
  let active = 0;
  const queue: Array<() => void> = [];

  const next = () => {
    if (active >= concurrency) return;
    const task = queue.shift();
    if (!task) return;
    task();
  };

  return async <T>(fn: () => Promise<T>) => {
    return new Promise<T>((resolve, reject) => {
      const run = async () => {
        active += 1;
        try {
          resolve(await fn());
        } catch (err) {
          reject(err);
        } finally {
          active -= 1;
          next();
        }
      };

      queue.push(run);
      next();
    });
  };
}

export async function getJson<T>(url: string, opts: HttpOptions): Promise<T> {
  const retries = opts.retries ?? 3;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), opts.timeoutMs);

    try {
      const response = await fetch(url, {
        headers: opts.headers,
        signal: controller.signal
      });

      if (response.ok) {
        return (await response.json()) as T;
      }

      const body = await safeText(response);
      if (shouldRetry(response.status) && attempt < retries) {
        await backoff(attempt);
        continue;
      }

      throw new MeteoraHttpError(
        `Meteora API error ${response.status}`,
        response.status,
        url,
        body
      );
    } catch (err) {
      if (attempt < retries && isRetryableError(err)) {
        await backoff(attempt);
        continue;
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error("Meteora API retry attempts exhausted");
}

export async function getJsonWithLimit<T>(
  limiter: Limiter,
  url: string,
  opts: HttpOptions
): Promise<T> {
  return limiter(() => getJson<T>(url, opts));
}

function shouldRetry(status: number): boolean {
  return status === 429 || status === 502 || status === 503 || status === 504;
}

function isRetryableError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const anyErr = err as { name?: string };
  return anyErr.name === "AbortError";
}

function backoff(attempt: number): Promise<void> {
  const base = 300;
  const delay = base * Math.pow(2, attempt) + Math.floor(Math.random() * 100);
  return new Promise((resolve) => setTimeout(resolve, delay));
}

async function safeText(response: Response): Promise<string> {
  try {
    const text = await response.text();
    return text.slice(0, 300);
  } catch {
    return "";
  }
}
