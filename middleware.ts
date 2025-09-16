import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Matches beginning "http:" or "https:" followed by any number of slashes, e.g.:
// "https://", "https:/", "https:////" etc. Then captures everything up to the next slash as the authority.
const HTTP_PREFIX_CAPTURE_AUTHORITY = /^https?:[:/]+([^/]+)/i;

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Fast path: only act on non-root paths
  if (path.length <= 1) return NextResponse.next();

  // Remove the leading "/" so we can inspect the raw string the user pasted after the host
  const afterSlash = path.slice(1);

  // Cheap precheck to avoid work for most routes
  const lower = afterSlash.toLowerCase();
  const looksHttpLike =
    lower.startsWith("http") ||
    lower.startsWith("https%3a") ||
    lower.startsWith("http%3a");
  if (!looksHttpLike) return NextResponse.next();

  // If it looks URL-encoded, decode once (fast path, no validation)
  let candidate = afterSlash;
  if (lower.includes("%3a") || lower.includes("%2f")) {
    try {
      candidate = decodeURIComponent(afterSlash);
    } catch {
      // ignore decoding failures; fall back to raw
    }
  }

  // Must start with "http:" or "https:" to be considered
  if (!/^https?:/i.test(candidate)) return NextResponse.next();

  const match = candidate.match(HTTP_PREFIX_CAPTURE_AUTHORITY);
  if (!match) return NextResponse.next();

  // May include userinfo@host:port; we only want the host
  let authority = match[1];
  const atIndex = authority.lastIndexOf("@");
  if (atIndex !== -1) authority = authority.slice(atIndex + 1);

  // IPv6 in brackets
  if (authority.startsWith("[") && authority.includes("]")) {
    authority = authority.slice(1, authority.indexOf("]"));
  }

  // Strip port if present
  const colonIndex = authority.indexOf(":");
  let hostname = colonIndex === -1 ? authority : authority.slice(0, colonIndex);
  hostname = hostname.trim();
  if (!hostname) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = `/${encodeURIComponent(hostname.toLowerCase())}`;
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
