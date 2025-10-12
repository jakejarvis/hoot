import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { toRegistrableDomain } from "@/lib/domain-server";

// Matches beginning "http:" or "https:" followed by any number of slashes, e.g.:
// "https://", "https:/", "https:////" etc.
// Then captures everything up to the next slash as the authority.
const HTTP_PREFIX_CAPTURE_AUTHORITY = /^https?:[:/]+([^/]+)/i;

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Fast path: only act on non-root paths
  if (path.length <= 1) {
    return NextResponse.next({
      headers: {
        "x-middleware-verdict": "ignore",
      },
    });
  }

  // Remove the leading "/" so we can inspect the raw string the user pasted after the host
  const afterSlash = path.slice(1);

  // Decode once if possible; fall back to raw on failure
  let candidate = afterSlash;
  try {
    candidate = decodeURIComponent(afterSlash);
  } catch {
    // ignore decoding failures; fall back to raw
  }

  // If the candidate contains a scheme, extract authority; otherwise normalize the raw candidate the same way
  const match = candidate.match(HTTP_PREFIX_CAPTURE_AUTHORITY);
  let authority = match ? match[1] : candidate;

  // Strip any query or fragment that may be present
  const queryIndex = authority.indexOf("?");
  const fragmentIndex = authority.indexOf("#");
  let cutoffIndex = -1;
  if (queryIndex !== -1 && fragmentIndex !== -1) {
    cutoffIndex = Math.min(queryIndex, fragmentIndex);
  } else {
    cutoffIndex = queryIndex !== -1 ? queryIndex : fragmentIndex;
  }
  if (cutoffIndex !== -1) authority = authority.slice(0, cutoffIndex);

  // For scheme-less inputs, drop any path portion after the first slash
  if (!match) {
    const slashIndex = authority.indexOf("/");
    if (slashIndex !== -1) authority = authority.slice(0, slashIndex);
  }

  authority = authority.trim();

  // Remove userinfo if present
  const atIndex = authority.lastIndexOf("@");
  if (atIndex !== -1) authority = authority.slice(atIndex + 1);

  // Detect bracketed IPv6 literal and only strip port if a colon appears after the closing ']'.
  if (authority.startsWith("[")) {
    const closingBracketIndex = authority.indexOf("]");
    if (closingBracketIndex !== -1) {
      const colonAfterBracketIndex = authority.indexOf(
        ":",
        closingBracketIndex + 1,
      );
      if (colonAfterBracketIndex !== -1) {
        authority = authority.slice(0, colonAfterBracketIndex);
      } else {
        // keep the bracketed host intact when no port is present
        authority = authority.slice(0, closingBracketIndex + 1);
      }
    } else {
      // Malformed bracket: fall back to first colon behavior
      const colonIndex = authority.indexOf(":");
      if (colonIndex !== -1) authority = authority.slice(0, colonIndex);
    }
  } else {
    const colonIndex = authority.indexOf(":");
    if (colonIndex !== -1) authority = authority.slice(0, colonIndex);
  }

  candidate = authority.trim();

  if (!candidate) {
    return NextResponse.next({
      headers: {
        "x-middleware-verdict": "ignore",
      },
    });
  }

  // Determine registrable apex and subdomain presence
  const registrable = toRegistrableDomain(candidate);
  if (!registrable) {
    return NextResponse.next({
      headers: {
        "x-middleware-verdict": "ignore",
      },
    });
  }

  // If coming from a full URL carrier, any subdomain is present, or the host differs from registrable (case/trailing dot), redirect to apex
  const shouldRedirectToApex = Boolean(match) || candidate !== registrable;
  if (shouldRedirectToApex) {
    const url = request.nextUrl.clone();
    url.pathname = `/${encodeURIComponent(registrable)}`;
    url.search = "";
    url.hash = "";
    return NextResponse.redirect(url, {
      headers: {
        "x-middleware-verdict": "redirect",
      },
    });
  }

  // Otherwise, it's already a bare registrable domain — proceed
  return NextResponse.next({
    headers: {
      "x-middleware-verdict": "ok",
    },
  });
}

export const config = {
  matcher: [
    // Exclude API and Next internals/static assets for performance and to avoid side effects
    "/((?!api|_next/static|_next/image|_next/webpack-hmr|_vercel|_proxy|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
