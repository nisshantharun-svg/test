import { NextRequest, NextResponse } from "next/server";
import { uploadPhoto } from "@/lib/google-drive";

export const runtime = "nodejs";
export const maxDuration = 30;

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

// Vercel Functions cap request bodies at 4.5MB, hard, at the infrastructure
// level — this can't be raised from app code. The client compresses photos
// before sending (see lib/image-compression.ts) so this limit is rarely
// hit; it's here as a safety net and to give the actual reason if it is.
const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024;

export async function POST(request: NextRequest) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Couldn't read the upload. Please try again." },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  const captionValue = formData.get("caption");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "No photo was attached to the upload." },
      { status: 400 }
    );
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json(
      {
        error:
          "That file type isn't supported. Please use JPG, PNG, WebP, or HEIC.",
      },
      { status: 415 }
    );
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      {
        error: `That photo is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Please use a photo under ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB.`,
      },
      { status: 413 }
    );
  }

  const caption =
    typeof captionValue === "string" && captionValue.trim().length > 0
      ? captionValue.trim().slice(0, 280)
      : undefined;

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const photo = await uploadPhoto({
      buffer,
      filename: file.name || `scrapbook-photo-${Date.now()}`,
      mimeType: file.type,
      caption,
    });

    return NextResponse.json({ photo }, { status: 201 });
  } catch (error) {
    console.error("POST /api/upload failed:", error);
    return NextResponse.json(
      {
        error:
          "The upload didn't make it to Google Drive. Check your connection and try again.",
      },
      { status: 502 }
    );
  }
}
