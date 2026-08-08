import { NextResponse } from "next/server";
import { fetchPhotoBytes } from "@/lib/google-drive";

// Photos are streamed through our own server instead of linking straight to
// Drive. That keeps the Drive folder private (no "anyone with the link"
// sharing required) and lets next/image optimize and resize every photo,
// since the source is same-origin.
export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Missing photo id." }, { status: 400 });
  }

  try {
    const { buffer, mimeType } = await fetchPhotoBytes(id);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": mimeType,
        // Drive file IDs are stable and we never mutate a file's bytes in
        // place, so it's safe to cache these aggressively.
        "Cache-Control": "public, max-age=86400, s-maxage=604800, immutable",
      },
    });
  } catch (error) {
    console.error(`GET /api/image/${id} failed:`, error);
    return NextResponse.json({ error: "Photo not found." }, { status: 404 });
  }
}
