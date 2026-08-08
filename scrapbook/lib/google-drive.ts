import "server-only";
import { google, drive_v3 } from "googleapis";
import { Readable } from "node:stream";
import type { Photo, PhotosPage } from "./types";

/**
 * All Google Drive access lives in this one file. Nothing here ever runs on
 * the client, and no route handler talks to the `googleapis` package
 * directly — they all go through the functions exported below.
 *
 * Auth model: OAuth 2.0 with a long-lived refresh token for a real Google
 * account (not a service account). Service accounts have no Drive storage
 * quota of their own, so they can't own uploaded files unless you're on a
 * paid Google Workspace plan with Shared Drives — a normal personal Google
 * account doesn't have that option. See README.md for how the refresh
 * token is generated.
 */

function readRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. See .env.local.example.`
    );
  }
  return value;
}

let driveClient: drive_v3.Drive | null = null;

function getDriveClient(): drive_v3.Drive {
  if (driveClient) return driveClient;

  const clientId = readRequiredEnv("GOOGLE_CLIENT_ID");
  const clientSecret = readRequiredEnv("GOOGLE_CLIENT_SECRET");
  const refreshToken = readRequiredEnv("GOOGLE_REFRESH_TOKEN");

  const auth = new google.auth.OAuth2(clientId, clientSecret);
  auth.setCredentials({ refresh_token: refreshToken });

  driveClient = google.drive({ version: "v3", auth });
  return driveClient;
}

function getFolderId(): string {
  return readRequiredEnv("GOOGLE_DRIVE_FOLDER_ID");
}

// Fields we ask Drive for on every photo. imageMediaMetadata gives us the
// original width/height so the gallery can reserve layout space before the
// image itself has loaded, which avoids content jumping around.
const PHOTO_FIELDS =
  "id, name, createdTime, mimeType, description, imageMediaMetadata(width, height)";

function toPhoto(file: drive_v3.Schema$File): Photo {
  return {
    id: file.id!,
    name: file.name ?? "Untitled",
    src: `/api/image/${file.id}`,
    createdTime: file.createdTime ?? new Date().toISOString(),
    width: file.imageMediaMetadata?.width ?? undefined,
    height: file.imageMediaMetadata?.height ?? undefined,
    caption: file.description ?? undefined,
  };
}

// Best-effort in-memory cache for the first page of results. It lives only
// for the lifetime of a warm serverless instance, so treat it as a
// "reduce duplicate calls during a burst of requests" optimization rather
// than a real shared cache — see README.md for notes on swapping in
// Vercel KV / Redis if you need caching that's consistent across instances.
const FIRST_PAGE_TTL_MS = 15_000;
let firstPageCache: { data: PhotosPage; expiresAt: number } | null = null;

export function invalidatePhotoCache(): void {
  firstPageCache = null;
}

export async function listPhotos(options: {
  pageToken?: string;
  pageSize?: number;
}): Promise<PhotosPage> {
  const { pageToken, pageSize = 24 } = options;

  if (!pageToken && firstPageCache && firstPageCache.expiresAt > Date.now()) {
    return firstPageCache.data;
  }

  const drive = getDriveClient();
  const folderId = getFolderId();

  const response = await drive.files.list({
    q: `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`,
    fields: `nextPageToken, files(${PHOTO_FIELDS})`,
    orderBy: "createdTime desc",
    pageSize,
    pageToken,
    spaces: "drive",
  });

  const page: PhotosPage = {
    photos: (response.data.files ?? []).map(toPhoto),
    nextPageToken: response.data.nextPageToken ?? null,
  };

  if (!pageToken) {
    firstPageCache = { data: page, expiresAt: Date.now() + FIRST_PAGE_TTL_MS };
  }

  return page;
}

export async function uploadPhoto(input: {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  caption?: string;
}): Promise<Photo> {
  const drive = getDriveClient();
  const folderId = getFolderId();

  const response = await drive.files.create({
    requestBody: {
      name: input.filename,
      parents: [folderId],
      description: input.caption,
    },
    media: {
      mimeType: input.mimeType,
      body: Readable.from(input.buffer),
    },
    fields: PHOTO_FIELDS,
  });

  invalidatePhotoCache();
  return toPhoto(response.data);
}

export async function fetchPhotoBytes(
  fileId: string
): Promise<{ buffer: Buffer; mimeType: string }> {
  const drive = getDriveClient();

  const response = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "arraybuffer" }
  );

  const mimeType =
    (response.headers as Record<string, string>)["content-type"] ??
    "application/octet-stream";

  return { buffer: Buffer.from(response.data as ArrayBuffer), mimeType };
}
