import { captureServer } from "@/lib/analytics/server";
import { headScreenshotBlob, putScreenshotBlob } from "@/lib/blob";
import { USER_AGENT } from "@/lib/constants";
import { optimizePngCover } from "@/lib/image";

const VIEWPORT_WIDTH = 1200;
const VIEWPORT_HEIGHT = 630;
const NAV_TIMEOUT_MS = 8000;

function buildHomepageUrls(domain: string): string[] {
  return [`https://${domain}`, `http://${domain}`];
}

export async function getOrCreateScreenshotBlobUrl(
  domain: string,
): Promise<{ url: string | null }> {
  const startedAt = Date.now();

  // 1) Check existing blob
  try {
    const existing = await headScreenshotBlob(
      domain,
      VIEWPORT_WIDTH,
      VIEWPORT_HEIGHT,
    );
    if (existing) {
      await captureServer("screenshot_capture", {
        domain,
        width: VIEWPORT_WIDTH,
        height: VIEWPORT_HEIGHT,
        source: "blob",
        duration_ms: Date.now() - startedAt,
        outcome: "ok",
        cache: "hit_blob",
      });
      return { url: existing };
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
      try {
        const page = await browser.newPage();
        await page.setViewport({
          width: VIEWPORT_WIDTH,
          height: VIEWPORT_HEIGHT,
          deviceScaleFactor: 1,
        });
        await page.setUserAgent(USER_AGENT);

        console.debug("[screenshot] navigating", { url });
        await page.goto(url, {
          waitUntil: "networkidle2",
          timeout: NAV_TIMEOUT_MS,
        });

        console.debug("[screenshot] navigated", { url });

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
          const storedUrl = await putScreenshotBlob(
            domain,
            VIEWPORT_WIDTH,
            VIEWPORT_HEIGHT,
            png,
          );

          console.info("[screenshot] stored blob", { url: storedUrl });

          await captureServer("screenshot_capture", {
            domain,
            width: VIEWPORT_WIDTH,
            height: VIEWPORT_HEIGHT,
            source: url.startsWith("https://") ? "direct_https" : "direct_http",
            duration_ms: Date.now() - startedAt,
            outcome: "ok",
            cache: "store_blob",
          });

          return { url: storedUrl };
        }
      } catch (err) {
        // try next URL

        console.warn("[screenshot] attempt failed", {
          url,
          error: (err as Error)?.message,
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
