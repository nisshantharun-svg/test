/**
 * A photo as the frontend understands it. Built from a Google Drive file
 * by lib/google-drive.ts — nothing in components ever sees raw Drive fields.
 */
export interface Photo {
  id: string;
  name: string;
  /** Same-origin proxy URL (/api/image/[id]) — never a raw Drive link. */
  src: string;
  createdTime: string;
  width?: number;
  height?: number;
  /** Optional handwritten-style note, stored in the Drive file's description. */
  caption?: string;
}

export interface PhotosPage {
  photos: Photo[];
  nextPageToken: string | null;
}
