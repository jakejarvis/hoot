import { captureServer } from "@/lib/analytics/server";
import { getScreenshotTtlSeconds, putScreenshotBlob } from "@/lib/blob";
import { USER_AGENT } from "@/lib/constants";
import { addWatermarkToScreenshot, optimizePngCover } from "@/lib/image";
import { ns, redis } from "@/lib/redis";

const VIEWPORT_WIDTH = 1200;
const VIEWPORT_HEIGHT = 630;
const NAV_TIMEOUT_MS = 8000;
const CAPTURE_MAX_ATTEMPTS_DEFAULT = 3;
const CAPTURE_BACKOFF_BASE_MS_DEFAULT = 200;
const CAPTURE_BACKOFF_MAX_MS_DEFAULT = 1200;

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
    const raw = (await redis.get(key)) as { url?: unknown } | null;
    if (raw && typeof raw === "object" && typeof raw.url === "string") {
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
  } catch {
    // ignore and proceed
  }

  // 2) Attempt to capture
  let browser: import("puppeteer-core").Browser | null = null;
  try {
    const isVercel = process.env.VERCEL === "1";
    const isLinux = process.platform === "linux";
    const preferChromium = isLinux || isVercel;

    type LaunchFn = (
      options?: Record<string, unknown>,
    ) => Promise<import("puppeteer-core").Browser>;
    let puppeteerLaunch: LaunchFn = async () => {
      throw new Error("puppeteer launcher not configured");
    };
    let launchOptions: Record<string, unknown> = { headless: true };
    let launcherMode: "chromium" | "puppeteer" = preferChromium
      ? "chromium"
      : "puppeteer";

    async function setupChromium() {
      const chromium = (await import("@sparticuz/chromium")).default;
      const core = await import("puppeteer-core");
      puppeteerLaunch = core.launch as unknown as LaunchFn;
      launchOptions = {
        ...launchOptions,
        args: chromium.args,
        executablePath: await chromium.executablePath(),
      };

      console.debug("[screenshot] using chromium", {
        executablePath: (launchOptions as { executablePath?: unknown })
          .executablePath,
      });
    }

    async function setupPuppeteer() {
      const full = await import("puppeteer");
      puppeteerLaunch = (full as unknown as { launch: LaunchFn }).launch;
      const path = process.env.PUPPETEER_EXECUTABLE_PATH;
      launchOptions = {
        ...launchOptions,
        ...(path ? { executablePath: path } : {}),
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
        ],
      };

      console.debug("[screenshot] using puppeteer", {
        executablePath: path || null,
      });
    }

    // First attempt based on platform preference
    try {
      if (launcherMode === "chromium") await setupChromium();
      else await setupPuppeteer();
      // Try launch

      console.debug("[screenshot] launching browser", { mode: launcherMode });
      browser = await puppeteerLaunch(launchOptions);
    } catch (firstErr) {
      console.warn("[screenshot] first launch attempt failed", {
        mode: launcherMode,
        error: (firstErr as Error)?.message,
      });
      // Flip mode and retry once
      launcherMode = launcherMode === "chromium" ? "puppeteer" : "chromium";
      try {
        if (launcherMode === "chromium") await setupChromium();
        else await setupPuppeteer();

        console.debug("[screenshot] retry launching browser", {
          mode: launcherMode,
        });
        browser = await puppeteerLaunch(launchOptions);
      } catch (secondErr) {
        console.error("[screenshot] both launch attempts failed", {
          first_error: (firstErr as Error)?.message,
          second_error: (secondErr as Error)?.message,
        });
        throw secondErr;
      }
    }

    console.debug("[screenshot] browser launched", { mode: launcherMode });

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
            waitUntil: "networkidle2",
            timeout: NAV_TIMEOUT_MS,
          });

          console.debug("[screenshot] navigated", {
            url,
            attempt: attemptIndex + 1,
          });

          const rawPng: Buffer = (await page.screenshot({
            type: "png",
            fullPage: false,
          })) as Buffer;

          const png = await optimizePngCover(
            rawPng,
            VIEWPORT_WIDTH,
            VIEWPORT_HEIGHT,
          );
          if (png && png.length > 0) {
            const pngWithWatermark = await addWatermarkToScreenshot(
              png,
              VIEWPORT_WIDTH,
              VIEWPORT_HEIGHT,
            );
            const storedUrl = await putScreenshotBlob(
              domain,
              VIEWPORT_WIDTH,
              VIEWPORT_HEIGHT,
              pngWithWatermark,
            );

            console.info("[screenshot] stored blob", { url: storedUrl });

            // Write Redis index and schedule purge
            try {
              const ttl = getScreenshotTtlSeconds();
              const expiresAtMs = Date.now() + ttl * 1000;
              const key = ns(
                "screenshot:url",
                `${domain}:${VIEWPORT_WIDTH}x${VIEWPORT_HEIGHT}`,
              );
              await redis.set(
                key,
                { url: storedUrl, expiresAtMs },
                {
                  ex: ttl,
                },
              );
              await redis.zadd(ns("purge", "screenshot"), {
                score: expiresAtMs,
                member: storedUrl, // store full URL for deletion API
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
}
