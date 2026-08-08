# Our Scrapbook

A collaborative digital scrapbook. Anyone with the link can drop a photo in
with the floating **+** button, and it's pasted onto the page — tape,
slight rotation, handwritten caption and all — for everyone else to see.
Every photo lives in a single Google Drive folder you control.

Built with Next.js (App Router) and TypeScript, deployed on Vercel.

## How it works, in short

- Photos are stored in **your** Google Drive folder, not in a database.
- The app authenticates to Drive as **your own Google account** (via a
  long-lived OAuth refresh token), not a service account — service
  accounts have no Drive storage quota of their own and can't own files on
  a personal (non-Workspace) account, so they aren't a good fit here.
- Nothing Google-related ever reaches the browser. All Drive calls happen
  in server-side route handlers; photos are streamed to the client through
  your own `/api/image/[id]` route, and the Drive folder itself stays
  private.
- New uploads appear instantly for the person who added them, and within
  ~30 seconds for everyone else (the gallery polls quietly in the
  background — see [Limitations](#limitations--possible-improvements) for
  why it's polling rather than push-based).

## Prerequisites

- Node.js 20 or later
- A Google account (personal Gmail is fine — no Workspace required)
- A [Vercel](https://vercel.com) account, for deployment

## 1. Google Cloud & Drive API setup

### Create a project and enable the API

1. Go to the [Google Cloud Console](https://console.cloud.google.com/) and
   create a new project (or pick an existing one).
2. Go to **APIs & Services → Library**, search for **Google Drive API**,
   and click **Enable**.

### Configure the OAuth consent screen

1. Go to **APIs & Services → OAuth consent screen**.
2. Choose **External** as the user type (this is fine even though only
   you will use the app — see the note on publishing status below), and
   fill in the required fields (app name, your email as both support and
   developer contact).
3. On the **Scopes** step, you don't need to add anything here — the
   setup script requests its scope directly.
4. On the **Test users** step, add the Google account you'll use to own
   the scrapbook folder.
5. Save.

### Create an OAuth client

1. Go to **APIs & Services → Credentials → Create Credentials → OAuth
   client ID**.
2. Application type: **Web application**.
3. Under **Authorized redirect URIs**, add exactly:
   ```
   http://localhost:3001/oauth2callback
   ```
4. Save, then copy the generated **Client ID** and **Client secret**.

### Create the Drive folder

1. Go to [Google Drive](https://drive.google.com) and create a new folder
   — this is where every scrapbook photo will live.
2. Open it and copy the ID out of the URL:
   `https://drive.google.com/drive/folders/`**`THIS_PART`**

### Generate a refresh token

1. Copy `.env.local.example` to `.env.local` and fill in `GOOGLE_CLIENT_ID`,
   `GOOGLE_CLIENT_SECRET`, and `GOOGLE_DRIVE_FOLDER_ID` from the steps
   above.
2. Install dependencies if you haven't yet: `npm install`.
3. Run:
   ```
   npm run get-refresh-token
   ```
4. Open the printed URL, sign in with the account that owns the folder,
   and approve access. The terminal will print a `GOOGLE_REFRESH_TOKEN`
   value — add it to `.env.local` too.

This is a one-time local step. It isn't part of the deployed app, and the
redirect URI above only ever needs to work on your own machine.

### Avoid the 7-day token expiry

By default, Google expires refresh tokens after 7 days for apps whose
OAuth consent screen is still in **Testing** status. To get a token that
doesn't expire:

1. Go back to **APIs & Services → OAuth consent screen → Audience** (or
   **OAuth consent screen**, depending on the console version).
2. Click **Publish app** to move it from Testing to **In production**.

Normally, publishing an app requires Google's review — but that's only
true for apps requesting **sensitive** or **restricted** scopes. This
project requests `drive.file`, which Google classifies as
**non-sensitive** specifically because it only ever grants access to
files the app itself created — so publishing is instant, with no review,
no verification, and no "unverified app" warning for your users (there
aren't any but you).

If you'd rather the gallery also pick up photos you drop into the folder
manually via Drive's own website (not just ones uploaded through this
app), you can switch the scope in `scripts/get-refresh-token.mjs` to
`https://www.googleapis.com/auth/drive`. That scope **is** restricted, so
you'd either need to stay in Testing mode and re-run the setup script
every 7 days, or go through Google's full verification process to publish
it — not something worth doing for a personal project. `drive.file` is the
better default for that reason.

## 2. Environment variables

| Variable | Where it comes from |
|---|---|
| `GOOGLE_CLIENT_ID` | OAuth client, above |
| `GOOGLE_CLIENT_SECRET` | OAuth client, above |
| `GOOGLE_REFRESH_TOKEN` | `npm run get-refresh-token`, above |
| `GOOGLE_DRIVE_FOLDER_ID` | Your Drive folder's URL |

Set all four in `.env.local` for local development. When you deploy, set
the same four in your Vercel project's **Settings → Environment
Variables** — they're never read by, or exposed to, the browser.

## 3. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). If a variable is
missing, the app will fail gracefully with a message in the UI rather
than crashing — check your terminal for which one.

## 4. Deploy to Vercel

1. Push this project to a GitHub repo (or use `vercel` from the CLI
   directly).
2. In the [Vercel dashboard](https://vercel.com/new), import the repo.
   Framework preset (Next.js) is auto-detected — no build settings to
   change.
3. Add the four environment variables from the table above under
   **Settings → Environment Variables** (for Production, and Preview if
   you want preview deployments to work too).
4. Deploy.

No further Google-side configuration is needed for production — the
deployed app authenticates using the stored refresh token directly; it
never runs the interactive OAuth flow itself.

## Project structure

```
app/
  api/
    photos/route.ts      GET  — list photos from Drive (paginated, cached briefly)
    image/[id]/route.ts  GET  — streams one photo's bytes through the server
    upload/route.ts      POST — uploads a new photo to Drive
  layout.tsx              Fonts (Caveat, Special Elite, Geist) + metadata
  page.tsx                Renders <Scrapbook />
  globals.css             Paper texture, color tokens, animations
components/               Scrapbook, PhotoCard, UploadButton, UploadModal, ...
hooks/usePhotos.ts        Loading, pagination, polling, optimistic updates
lib/
  google-drive.ts          The only file that talks to the Drive API
  image-compression.ts     Client-side HEIC conversion + resizing before upload
  photo-style.ts            Deterministic "randomness" for rotation/tape per photo
  types.ts
scripts/get-refresh-token.mjs   One-time local OAuth setup helper
```

## How it works, in detail

**Auth.** `lib/google-drive.ts` builds a Drive client from
`GOOGLE_REFRESH_TOKEN` on first use (not at module load, so a missing
variable only surfaces when a route actually needs Drive, with a clear
error, rather than crashing the whole app). No other file imports
`googleapis` directly.

**Listing photos.** `GET /api/photos` queries Drive for image files inside
your folder, newest first, and returns a page of results plus a
`nextPageToken`. Results are cached in memory for 15 seconds per warm
serverless instance, and the response also carries a short
`Cache-Control` header so Vercel's edge network can absorb a burst of
concurrent visitors without each one hitting the Drive API.

**Displaying photos.** Photos are never linked to directly from Drive.
`GET /api/image/[id]` streams the bytes through your own server instead,
which keeps the Drive folder private (no "anyone with the link" sharing
needed) and lets `next/image` optimize, resize, and lazy-load every photo
since the source is same-origin.

**Uploading.** The floating **+** button opens a modal with drag-and-drop
or a file picker. Before the file ever leaves the browser,
`lib/image-compression.ts` converts HEIC to JPEG (most browsers can't
render HEIC directly) and downsizes anything large — both because Vercel
Functions hard-cap request bodies at 4.5MB, and because a scrapbook with
a lot of full-resolution phone photos would otherwise load slowly.
`POST /api/upload` then validates the file server-side too and writes it
to Drive.

**Staying in sync.** The gallery polls `/api/photos` every 30 seconds and
prepends anything it hasn't seen yet, and the uploader's own new photo is
added to the page immediately without waiting for that poll. Both paths
go through the same `PhotoCard` mount animation, which is what makes new
photos visibly "land" on the page.

**Photo styling.** Each photo's rotation and tape color are derived from
a hash of its own Drive file ID (`lib/photo-style.ts`), not
`Math.random()` — so a photo doesn't visibly jump to a new crooked angle
every time the page reloads.

## Customizing the look

- Colors and fonts are defined once, in `app/globals.css` (the `:root`
  custom properties) and `app/layout.tsx` (the font trio). Change the
  hex values or swap the Google Fonts and the rest of the app follows.
- `lib/photo-style.ts` controls how much photos rotate and how tape gets
  placed — turn `rotation` toward 0 for a tidier look, or widen the range
  for a messier one.
- Dark mode isn't included on purpose — a paper-and-tape aesthetic
  doesn't translate well to a dark background. If you want it anyway,
  reintroduce a `prefers-color-scheme: dark` block in `globals.css` with
  a second set of token values.

## Limitations & possible improvements

- **Polling, not push.** New photos from other people show up within 30
  seconds, not instantly, because Vercel's serverless functions don't
  hold long-lived connections well. For true real-time updates, you'd add
  a service like Pusher or Ably and have `/api/upload` publish an event
  on success.
- **In-memory cache is per-instance.** The 15-second cache in
  `lib/google-drive.ts` lives inside one warm serverless function and
  isn't shared across instances or regions. It still meaningfully cuts
  down on duplicate Drive calls during normal traffic; for a busier
  deployment, swap it for Vercel KV or Upstash Redis.
- **`drive.file` scope.** By default the app can only see photos it
  uploaded itself, not ones added directly through Drive's website — see
  [Avoid the 7-day token expiry](#avoid-the-7-day-token-expiry) above for
  the tradeoff and how to change it.
- **No moderation.** Anyone with the link can upload. If that's not right
  for your use case, add an allowlist check (e.g. a shared passphrase, or
  swapping the open link for real sign-in) in `app/api/upload/route.ts`.

## Troubleshooting

**"Missing required environment variable"** — one of the four values in
[Environment variables](#2-environment-variables) isn't set. Check
`.env.local` locally, or your Vercel project settings in production.

**Upload fails with a storage/quota-sounding error** — double check
you're using the OAuth refresh-token setup above and not a service
account key; service accounts can't own files in a personal Drive.

**"Couldn't load photos from Google Drive"** — usually means
`GOOGLE_DRIVE_FOLDER_ID` doesn't match an existing folder, or the
account that generated the refresh token doesn't have access to it.

**Refresh token stopped working after a week** — your OAuth consent
screen is still in Testing status; see
[Avoid the 7-day token expiry](#avoid-the-7-day-token-expiry).
