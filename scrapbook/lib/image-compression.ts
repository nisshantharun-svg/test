/**
 * Runs in the browser, before a photo is uploaded. Two jobs:
 *
 * 1. HEIC/HEIF photos (the default on iPhones) aren't renderable in most
 *    browsers, so we convert them to JPEG here rather than storing a file
 *    nobody but Safari can preview.
 * 2. Phone cameras routinely produce 8-15MB photos, and Vercel Functions
 *    reject any request body over 4.5MB. Resizing and re-compressing here
 *    keeps uploads fast and comfortably under that ceiling - while also
 *    being a good idea for a gallery with "a lot of photos" regardless of
 *    the limit.
 *
 * Files that are already small enough are returned untouched, so a
 * well-sized PNG doesn't lose transparency or take a needless JPEG pass.
 */

const MAX_DIMENSION = 2400;
const TARGET_MAX_BYTES = 3.5 * 1024 * 1024;
const INITIAL_QUALITY = 0.85;
const MIN_QUALITY = 0.5;

export interface PreparedPhoto {
  blob: Blob;
  filename: string;
}

function isHeic(file: File): boolean {
  const type = file.type.toLowerCase();
  if (type === "image/heic" || type === "image/heif") return true;
  // Some browsers/OSes report an empty MIME type for HEIC files, so also
  // fall back to checking the extension.
  return /\.hei[cf]$/i.test(file.name);
}

async function convertHeicToJpeg(file: File): Promise<Blob> {
  const heic2any = (await import("heic2any")).default;
  const result = await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: INITIAL_QUALITY,
  });
  // heic2any returns an array for multi-image HEIC containers (e.g. Live
  // Photos); a single photo upload only ever wants the first frame.
  return Array.isArray(result) ? result[0] : result;
}

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That image couldn't be read."));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Compression failed."))),
      "image/jpeg",
      quality
    );
  });
}

async function resizeAndCompress(image: HTMLImageElement): Promise<Blob> {
  const scale = Math.min(1, MAX_DIMENSION / Math.max(image.width, image.height));
  const width = Math.round(image.width * scale);
  const height = Math.round(image.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas isn't supported in this browser.");
  ctx.drawImage(image, 0, 0, width, height);

  let quality = INITIAL_QUALITY;
  let output = await canvasToBlob(canvas, quality);

  while (output.size > TARGET_MAX_BYTES && quality > MIN_QUALITY) {
    quality -= 0.1;
    output = await canvasToBlob(canvas, quality);
  }

  return output;
}

export async function prepareImageForUpload(file: File): Promise<PreparedPhoto> {
  let working: Blob = file;
  let filename = file.name;

  if (isHeic(file)) {
    working = await convertHeicToJpeg(file);
    filename = filename.replace(/\.hei[cf]$/i, ".jpg");
  }

  const image = await loadImage(working);
  const oversizedBytes = working.size > TARGET_MAX_BYTES;
  const oversizedDimensions = Math.max(image.width, image.height) > MAX_DIMENSION;

  if (!oversizedBytes && !oversizedDimensions) {
    return { blob: working, filename };
  }

  const compressed = await resizeAndCompress(image);
  if (!/\.(jpe?g)$/i.test(filename)) {
    filename = filename.replace(/\.\w+$/, "") + ".jpg";
  }
  return { blob: compressed, filename };
}
