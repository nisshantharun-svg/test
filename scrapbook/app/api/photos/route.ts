import { NextRequest, NextResponse } from "next/server";
import { listPhotos } from "@/lib/google-drive";

// This route calls out to Google Drive on every miss, so it must never be
// statically generated at build time (when no credentials are available).
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const pageToken = searchParams.get("pageToken") ?? undefined;
  const pageSizeParam = searchParams.get("pageSize");
  const pageSize = pageSizeParam ? Number(pageSizeParam) : 24;

  if (!Number.isFinite(pageSize) || pageSize < 1 || pageSize > 100) {
    return NextResponse.json(
      { error: "pageSize must be a number between 1 and 100." },
      { status: 400 }
    );
  }

  try {
    const page = await listPhotos({ pageToken, pageSize });
    return NextResponse.json(page, {
      headers: {
        // Edge/CDN cache for a short window so a burst of visitors doesn't
        // each trigger their own Drive API call; stale-while-revalidate
        // keeps things feeling instant while a fresh copy is fetched.
        "Cache-Control": "public, s-maxage=20, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    console.error("GET /api/photos failed:", error);
    return NextResponse.json(
      {
        error:
          "Couldn't load photos from Google Drive. Double-check your environment variables and that the Drive folder still exists.",
      },
      { status: 502 }
    );
  }
}
