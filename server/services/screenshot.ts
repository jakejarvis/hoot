import { captureServer } from "@/lib/analytics/server";
import { headScreenshotBlob, putScreenshotBlob } from "@/lib/blob";
import { optimizePngCover } from "@/lib/image";
import { USER_AGENT } from "./constants";

const VIEWPORT_WIDTH = 1200;
const VIEWPORT_HEIGHT = 630;
const NAV_TIMEOUT_MS = 8000;

function buildHomepageUrls(domain: string): string[] {
  return [`https://${domain}`, `http://${domain}`];
}

export async function getOrCreateScreenshotBlobUrl(
  domain: string,
  opts?: { distinctId?: string },
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
      await captureServer(
        "screenshot_capture",
        {
          domain,
          width: VIEWPORT_WIDTH,
          height: VIEWPORT_HEIGHT,
          source: "blob",
          duration_ms: Date.now() - startedAt,
          outcome: "ok",
          cache: "hit_blob",
        },
        opts?.distinctId,
      );
      return { url: existing };
    }
  } catch {
    // ignore and proceed
  }

  // 2) Attempt to capture
  let browser: import("puppeteer-core").Browser | null = null;
  try {
    const isVercel = !!process.env.VERCEL_ENV;
    let puppeteer: typeof import("puppeteer-core") | typeof import("puppeteer");
    let launchOptions: Record<string, unknown> = { headless: true };

    if (isVercel) {
      const chromium = (await import("@sparticuz/chromium")).default;
      puppeteer = await import("puppeteer-core");
      launchOptions = {
        ...launchOptions,
        args: chromium.args,
        executablePath: await chromium.executablePath(),
      };
    } else {
      puppeteer = await import("puppeteer");
    }

    browser = await puppeteer.launch(launchOptions);

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

        await page.goto(url, {
          waitUntil: "networkidle2",
          timeout: NAV_TIMEOUT_MS,
        });

        const rawPng: Buffer = (await page.screenshot({
          type: "png",
          fullPage: false,
        })) as Buffer;

        const png =
          rawPng && rawPng.length > 0
            ? await optimizePngCover(rawPng, VIEWPORT_WIDTH, VIEWPORT_HEIGHT)
            : rawPng;
        if (png && png.length > 0) {
          const storedUrl = await putScreenshotBlob(
            domain,
            VIEWPORT_WIDTH,
            VIEWPORT_HEIGHT,
            png,
          );

          await captureServer(
            "screenshot_capture",
            {
              domain,
              width: VIEWPORT_WIDTH,
              height: VIEWPORT_HEIGHT,
              source: url.startsWith("https:") ? "direct_https" : "direct_http",
              duration_ms: Date.now() - startedAt,
              outcome: "ok",
              cache: "store_blob",
            },
            opts?.distinctId,
          );

          return { url: storedUrl };
        }
      } catch {
        // try next URL
      }
    }
  } catch {
    // fallthrough to not_found
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {}
    }
  }

  await captureServer(
    "screenshot_capture",
    {
      domain,
      width: VIEWPORT_WIDTH,
      height: VIEWPORT_HEIGHT,
      duration_ms: Date.now() - startedAt,
      outcome: "not_found",
      cache: "miss",
    },
    opts?.distinctId,
  );
  return { url: null };
}
