import "server-only";

export async function launchChromium(
  overrides: Record<string, unknown> = {},
): Promise<import("puppeteer-core").Browser> {
  const chromium = (await import("@sparticuz/chromium")).default;
  const { launch } = await import("puppeteer-core");

  const executablePath = await chromium.executablePath();
  return launch({
    headless: true,
    args: chromium.args,
    executablePath,
    defaultViewport: null,
    ...overrides,
  });
}
