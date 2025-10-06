import type { Browser } from "puppeteer-core";
import { captureServer } from "@/lib/analytics/server";
import { getScreenshotTtlSeconds, uploadScreenshot } from "@/lib/storage";
import { USER_AGENT } from "@/lib/constants";
import { addWatermarkToScreenshot, optimizePngCover } from "@/lib/image";
import { launchChromium } from "@/lib/puppeteer";
import { ns, redis } from "@/lib/redis";

const VIEWPORT_WIDTH = 1200;
const VIEWPORT_HEIGHT = 630;
const NAV_TIMEOUT_MS = 8000;
const IDLE_TIME_MS = 500;
const IDLE_TIMEOUT_MS = 3000;
const CAPTURE_MAX_ATTEMPTS_DEFAULT = 3;
const CAPTURE_BACKOFF_BASE_MS_DEFAULT = 200;
const CAPTURE_BACKOFF_MAX_MS_DEFAULT = 1200;
const LOCK_TTL_SECONDS = 15;
const LOCK_WAIT_ATTEMPTS = 6;
const LOCK_WAIT_DELAY_MS = 250;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffDelayMs(
  attemptIndex: number,
  baseMs: number,
  maxMs: number,
): number {
  const base = Math.min(maxMs, baseMs * 2 ** attemptIndex);
  const jitter = Math.floor(Math.random() * Math.min(base, maxMs) * 0.25);
  return Math.min(base + jitter, maxMs);
}

function buildHomepageUrls(domain: string): string[] {
  return [`https://${domain}`, `http://${domain}`];
}

export async function getOrCreateScreenshotBlobUrl(
  domain: string,
  options?: {
    attempts?: number;
    backoffBaseMs?: number;
    backoffMaxMs?: number;
  },
): Promise<{ url: string | null }> {
  const startedAt = Date.now();
  console.debug("[screenshot] start", {
    domain,
    width: VIEWPORT_WIDTH,
    height: VIEWPORT_HEIGHT,
  });
  const attempts = Math.max(
    1,
    options?.attempts ?? CAPTURE_MAX_ATTEMPTS_DEFAULT,
  );
  const backoffBaseMs =
    options?.backoffBaseMs ?? CAPTURE_BACKOFF_BASE_MS_DEFAULT;
  const backoffMaxMs = options?.backoffMaxMs ?? CAPTURE_BACKOFF_MAX_MS_DEFAULT;

  // 1) Check Redis index first
  try {
    const key = ns(
      "screenshot:url",
      `${domain}:${VIEWPORT_WIDTH}x${VIEWPORT_HEIGHT}`,
    );
    console.debug("[screenshot] redis get", { key });
    const raw = (await redis.get(key)) as { url?: unknown } | null;
    if (raw && typeof raw === "object" && typeof raw.url === "string") {
      console.info("[screenshot] cache hit", {
        domain,
        width: VIEWPORT_WIDTH,
        height: VIEWPORT_HEIGHT,
        url: raw.url,
      });
      await captureServer("screenshot_capture", {
        domain,
        width: VIEWPORT_WIDTH,
        height: VIEWPORT_HEIGHT,
        source: "redis",
        duration_ms: Date.now() - startedAt,
        outcome: "ok",
        cache: "hit",
      });
      return { url: raw.url };
    }
    console.debug("[screenshot] cache miss", {
      domain,
      width: VIEWPORT_WIDTH,
      height: VIEWPORT_HEIGHT,
    });
  } catch {
    // ignore and proceed
  }

  // 2) Acquire short-lived lock to avoid duplicate concurrent captures/uploads
  async function waitForPublicUrl(url: string): Promise<void> {
    if (process.env.NODE_ENV === "test") return;
    for (let i = 0; i < 4; i++) {
      try {
        const res = await fetch(url, {
          method: "HEAD",
          cache: "no-store" as RequestCache,
        });
        if (res.ok) return;
      } catch {}
      await sleep(200);
    }
  }

  const lockKey = ns(
    "lock",
    `screenshot:${domain}:${VIEWPORT_WIDTH}x${VIEWPORT_HEIGHT}`,
  );
  let acquiredLock = false;
  try {
    console.debug("[screenshot] lock attempt", { lockKey });
    const setRes = await redis.set(lockKey, "1", {
      nx: true,
      ex: LOCK_TTL_SECONDS,
    });
    acquiredLock = setRes === "OK" || setRes === undefined;
    console.info("[screenshot] lock status", { acquiredLock });
  } catch {
    acquiredLock = true;
    console.warn("[screenshot] lock unsupported; proceeding without lock");
  }

  if (!acquiredLock) {
    // Another worker is producing the blob; wait briefly for index to be populated
    for (let i = 0; i < LOCK_WAIT_ATTEMPTS; i++) {
      try {
        const key = ns(
          "screenshot:url",
          `${domain}:${VIEWPORT_WIDTH}x${VIEWPORT_HEIGHT}`,
        );
        console.debug("[screenshot] waiting for index", {
          attempt: i + 1,
          key,
        });
        const raw = (await redis.get(key)) as { url?: unknown } | null;
        if (raw && typeof raw === "object" && typeof raw.url === "string") {
          console.info("[screenshot] index appeared while waiting", {
            url: raw.url,
          });
          return { url: raw.url };
        }
      } catch {}
      await sleep(LOCK_WAIT_DELAY_MS);
    }
    console.warn("[screenshot] gave up waiting for lock; returning null", {
      domain,
    });
    return { url: null };
  }

  // 3) Attempt to capture (wrapped to ensure lock release)
  try {
    let browser: Browser | null = null;
    try {
      // Re-check index after acquiring lock in case another writer finished
      try {
        const key = ns(
          "screenshot:url",
          `${domain}:${VIEWPORT_WIDTH}x${VIEWPORT_HEIGHT}`,
        );
        console.debug("[screenshot] redis recheck after lock", { key });
        const raw = (await redis.get(key)) as { url?: unknown } | null;
        if (raw && typeof raw === "object" && typeof raw.url === "string") {
          console.info("[screenshot] found index after lock", { url: raw.url });
          return { url: raw.url };
        }
      } catch {}

      browser = await launchChromium();
      console.debug("[screenshot] browser launched", { mode: "chromium" });

      const tryUrls = buildHomepageUrls(domain);
      for (const url of tryUrls) {
        let lastError: unknown = null;
        for (let attemptIndex = 0; attemptIndex < attempts; attemptIndex++) {
          try {
            const page = await browser.newPage();
            await page.setViewport({
              width: VIEWPORT_WIDTH,
              height: VIEWPORT_HEIGHT,
              deviceScaleFactor: 1,
            });
            await page.setUserAgent(USER_AGENT);

            console.debug("[screenshot] navigating", {
              url,
              attempt: attemptIndex + 1,
            });
            await page.goto(url, {
              waitUntil: "domcontentloaded",
              timeout: NAV_TIMEOUT_MS,
            });

            // Give chatty pages/CDNs a brief chance to settle without hanging
            try {
              await page.waitForNetworkIdle({
                idleTime: IDLE_TIME_MS,
                timeout: IDLE_TIMEOUT_MS,
              });
            } catch {}

            console.debug("[screenshot] navigated", {
              url,
              attempt: attemptIndex + 1,
            });

            const rawPng: Buffer = (await page.screenshot({
              type: "png",
              fullPage: false,
            })) as Buffer;
            console.debug("[screenshot] raw screenshot bytes", {
              bytes: rawPng.length,
            });

            const png = await optimizePngCover(
              rawPng,
              VIEWPORT_WIDTH,
              VIEWPORT_HEIGHT,
            );
            if (png && png.length > 0) {
              console.debug("[screenshot] optimized png bytes", {
                bytes: png.length,
              });
              const pngWithWatermark = await addWatermarkToScreenshot(
                png,
                VIEWPORT_WIDTH,
                VIEWPORT_HEIGHT,
              );
              console.debug("[screenshot] watermarked png bytes", {
                bytes: pngWithWatermark.length,
              });
              console.info("[screenshot] uploading via uploadthing");
              const { url: storedUrl, key } = await uploadScreenshot({
                domain,
                width: VIEWPORT_WIDTH,
                height: VIEWPORT_HEIGHT,
                png: pngWithWatermark,
              });
              console.info("[screenshot] uploaded", { url: storedUrl, key });
              await waitForPublicUrl(storedUrl);
              console.debug("[screenshot] public url ready", {
                url: storedUrl,
              });

              // Write Redis index and schedule purge
              try {
                const ttl = getScreenshotTtlSeconds();
                const expiresAtMs = Date.now() + ttl * 1000;
                const key = ns(
                  "screenshot:url",
                  `${domain}:${VIEWPORT_WIDTH}x${VIEWPORT_HEIGHT}`,
                );
                console.debug("[screenshot] redis set index", {
                  key,
                  ttlSeconds: ttl,
                  expiresAtMs,
                });
                await redis.set(
                  key,
                  { url: storedUrl, key, expiresAtMs },
                  {
                    ex: ttl,
                  },
                );
                console.debug("[screenshot] redis zadd purge", {
                  key,
                  expiresAtMs,
                });
                await redis.zadd(ns("purge", "screenshot"), {
                  score: expiresAtMs,
                  member: key, // store UploadThing file key for deletion API
                });
              } catch {
                // best effort
              }

              await captureServer("screenshot_capture", {
                domain,
                width: VIEWPORT_WIDTH,
                height: VIEWPORT_HEIGHT,
                source: url.startsWith("https://")
                  ? "direct_https"
                  : "direct_http",
                duration_ms: Date.now() - startedAt,
                outcome: "ok",
                cache: "store",
              });

              return { url: storedUrl };
            }
          } catch (err) {
            lastError = err;
            const delay = backoffDelayMs(
              attemptIndex,
              backoffBaseMs,
              backoffMaxMs,
            );
            console.warn("[screenshot] attempt failed", {
              url,
              attempt: attemptIndex + 1,
              delay_ms: delay,
              error: (err as Error)?.message,
            });
            if (attemptIndex < attempts - 1) {
              await sleep(delay);
            }
          }
        }

        // Exhausted attempts for this URL, move to next candidate
        if (lastError) {
          console.warn("[screenshot] all attempts failed for url", {
            url,
            attempts,
            error: (lastError as Error)?.message,
          });
        }
      }
    } catch (err) {
      // fallthrough to not_found

      console.error("[screenshot] capture failed", {
        domain,
        error: (err as Error)?.message,
      });
    } finally {
      if (browser) {
        try {
          await browser.close();
        } catch {}
      }
    }

    await captureServer("screenshot_capture", {
      domain,
      width: VIEWPORT_WIDTH,
      height: VIEWPORT_HEIGHT,
      duration_ms: Date.now() - startedAt,
      outcome: "not_found",
      cache: "miss",
    });

    console.warn("[screenshot] returning null", { domain });
    return { url: null };
  } finally {
    try {
      await redis.del(lockKey);
      console.debug("[screenshot] lock released", { lockKey });
    } catch {}
  }
}
