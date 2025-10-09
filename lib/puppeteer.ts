import "server-only";

export async function launchChromium(
  overrides: Record<string, unknown> = {},
): Promise<import("puppeteer-core").Browser> {
  const chromium = (await import("@sparticuz/chromium")).default;
  const { launch } = await import("puppeteer-core");

  const executablePath = await chromium.executablePath();

  // Merge Chromium default args with a minimal set of stability flags and any caller overrides.
  const baseArgs = Array.isArray(
    (chromium as unknown as { args?: unknown }).args,
  )
    ? (chromium.args as string[])
    : [];
  const stabilityArgs = [
    "--disable-dev-shm-usage", // avoid tiny /dev/shm; use /tmp instead
    "--no-first-run",
    "--no-default-browser-check",
  ];
  const overrideArgs = (overrides as { args?: unknown }).args;
  const extraArgs = Array.isArray(overrideArgs)
    ? (overrideArgs as string[])
    : [];

  // Dedupe while preserving order: base -> stability -> overrides
  const seen = new Set<string>();
  const mergedArgs = [...baseArgs, ...stabilityArgs, ...extraArgs].filter(
    (arg) => {
      if (typeof arg !== "string") return false;
      if (seen.has(arg)) return false;
      seen.add(arg);
      return true;
    },
  );

  const { args: _ignoredArgs, ...restOverrides } = overrides as {
    args?: unknown;
    [key: string]: unknown;
  };

  return launch({
    headless: true,
    args: mergedArgs,
    executablePath,
    defaultViewport: null,
    ...restOverrides,
  });
}
