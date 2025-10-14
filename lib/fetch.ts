export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  opts: { timeoutMs?: number; retries?: number; backoffMs?: number } = {},
): Promise<Response> {
  const timeoutMs = opts.timeoutMs ?? 5000;
  const retries = Math.max(0, opts.retries ?? 0);
  const backoffMs = Math.max(0, opts.backoffMs ?? 150);

  let lastError: unknown = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(input, { ...init, signal: controller.signal });
      clearTimeout(timer);
      return res;
    } catch (err) {
      lastError = err;
      clearTimeout(timer);
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, backoffMs));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("fetch failed");
}

export async function headThenGet(
  url: string,
  init: RequestInit = {},
  opts: { timeoutMs?: number } = {},
): Promise<{ response: Response; usedMethod: "HEAD" | "GET" }> {
  const timeoutMs = opts.timeoutMs ?? 5000;
  try {
    const headRes = await fetchWithTimeout(
      url,
      { ...init, method: "HEAD", redirect: "follow" },
      { timeoutMs },
    );
    if (headRes.ok) {
      return { response: headRes, usedMethod: "HEAD" };
    }
  } catch {
    // fall through to GET
  }

  const getRes = await fetchWithTimeout(
    url,
    { ...init, method: "GET", redirect: "follow" },
    { timeoutMs },
  );
  return { response: getRes, usedMethod: "GET" };
}
