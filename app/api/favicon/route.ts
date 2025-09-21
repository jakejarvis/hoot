import { NextResponse } from "next/server";
import { toRegistrableDomain } from "@/lib/domain-server";
import { captureServer } from "@/server/analytics/posthog";
import {
  clampFaviconSize,
  getFaviconPngForDomain,
} from "@/server/services/favicon";

export const runtime = "nodejs";
export const maxDuration = 10;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const raw = url.searchParams.get("domain") ?? url.searchParams.get("d");
  const sizeParam = Number(
    url.searchParams.get("size") ?? url.searchParams.get("sz") ?? "",
  );
  const size = clampFaviconSize(sizeParam);
  const startedAt = Date.now();
  // Attempt to associate events with user via PostHog cookie
  let distinctId: string | undefined;
  try {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (key) {
      const cookieName = `ph_${key}_posthog`;
      const cookieStr = req.headers.get("cookie") ?? "";
      const m = cookieStr.match(new RegExp(`${cookieName}=([^;]+)`));
      if (m) {
        const parsed = JSON.parse(decodeURIComponent(m[1]));
        if (parsed && typeof parsed.distinct_id === "string") {
          distinctId = parsed.distinct_id;
        }
      }
    }
  } catch {
    // ignore
  }

  const registrable = raw ? toRegistrableDomain(raw) : null;
  if (!registrable) {
    await captureServer(
      "favicon_fetch",
      {
        domain: raw ?? "",
        valid: false,
        reason: "invalid_domain",
      },
      distinctId,
    );
    return NextResponse.json({ error: "Invalid domain" }, { status: 400 });
  }

  const png = await getFaviconPngForDomain(registrable, size, { distinctId });
  if (png) {
    return new NextResponse(png as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        // Cache for a week; allow CDN to keep for a week
        "Cache-Control": "public, max-age=604800, s-maxage=604800",
        "Content-Length": String(png.length),
      },
    });
  }

  await captureServer(
    "favicon_fetch",
    {
      domain: registrable,
      size,
      outcome: "not_found",
      duration_ms: Date.now() - startedAt,
    },
    distinctId,
  );

  return new NextResponse("Favicon not found", {
    status: 404,
  });
}
