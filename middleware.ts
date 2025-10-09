import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Matches beginning "http:" or "https:" followed by any number of slashes, e.g.:
// "https://", "https:/", "https:////" etc.
// Then captures everything up to the next slash as the authority.
const HTTP_PREFIX_CAPTURE_AUTHORITY = /^https?:[:/]+([^/]+)/i;

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Fast path: only act on non-root paths
  if (path.length <= 1) return NextResponse.next();

  // Remove the leading "/" so we can inspect the raw string the user pasted after the host
  const afterSlash = path.slice(1);

  // Decode once if possible; fall back to raw on failure
  let candidate = afterSlash;
  try {
    candidate = decodeURIComponent(afterSlash);
  } catch {
    // ignore decoding failures; fall back to raw
  }

  // Minimal: handle scheme-less single-segment '/www.<host>' redirects
  if (!candidate.includes("/") && /^www\./i.test(candidate)) {
    const host = candidate.replace(/^www\./i, "").replace(/\.$/, "");
    if (host) {
      const url = request.nextUrl.clone();
      url.pathname = `/${encodeURIComponent(host.toLowerCase())}`;
      url.search = "";
      url.hash = "";
      return NextResponse.redirect(url);
    }
  }

  // Match the pattern at the top for pasted URLs with scheme
  const match = candidate.match(HTTP_PREFIX_CAPTURE_AUTHORITY);
  if (!match) return NextResponse.next();

  // May include userinfo@host:port; we only want the host
  let authority = match[1];

  // Strip userinfo@ if present
  const atIndex = authority.lastIndexOf("@");
  if (atIndex !== -1) authority = authority.slice(atIndex + 1);

  // Strip port if present
  const colonIndex = authority.indexOf(":");
  if (colonIndex !== -1) authority = authority.slice(0, colonIndex);

  // Trim whitespace before last checks
  authority = authority.trim();

  // Normalize common "www." prefix
  if (/^www\./i.test(authority)) authority = authority.slice(4);

  // Skip IP addresses entirely (unsupported)
  const isIPv4Like = /^(?:\d{1,3}\.){3}\d{1,3}$/.test(authority);
  if (isIPv4Like) return NextResponse.next();

  // The final bailout: if we end up with an empty string by here, it's not a valid domain
  if (!authority) return NextResponse.next();

  const url = request.nextUrl.clone();
  const hostLower = authority.toLowerCase();
  url.pathname = `/${encodeURIComponent(hostLower)}`;
  url.search = ""; // remove any irrelevant query string from the pasted URL carrier path
  url.hash = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    // Exclude API and Next internals/static assets for performance and to avoid side effects
    "/((?!api|_next/static|_next/image|_next/webpack-hmr|_vercel|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
