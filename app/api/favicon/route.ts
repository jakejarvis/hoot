import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const domain = searchParams.get("domain");

  if (!domain) {
    return new NextResponse("Domain parameter is required", { status: 400 });
  }

  try {
    // First try the Google favicon service
    const googleUrl = `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(domain)}`;
    const googleResponse = await fetch(googleUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; hoot.sh/0.1)",
      },
    });

    if (googleResponse.ok) {
      const favicon = await googleResponse.arrayBuffer();

      return new NextResponse(favicon, {
        status: 200,
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=31536000", // 24 hour cache
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // Fallback: try to fetch favicon.ico directly from the domain
    const directUrl = `https://${domain}/favicon.ico`;
    const directResponse = await fetch(directUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; hoot.sh/0.1)",
      },
    });

    if (directResponse.ok) {
      const favicon = await directResponse.arrayBuffer();

      return new NextResponse(favicon, {
        status: 200,
        headers: {
          "Content-Type": "image/x-icon",
          "Cache-Control": "public, max-age=31536000",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // If both fail, return a 404
    return new NextResponse("Favicon not found", { status: 404 });
  } catch (error) {
    console.error("Error fetching favicon:", error);
    return new NextResponse("Error fetching favicon", { status: 500 });
  }
}
