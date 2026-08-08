// One-time local setup script. Run with `npm run get-refresh-token` after
// putting GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local. It walks
// you through Google's OAuth consent screen once and prints the refresh
// token you need to add to .env.local (and to Vercel) as
// GOOGLE_REFRESH_TOKEN. See README.md for the full walkthrough.

import http from "node:http";
import { config } from "dotenv";
import { google } from "googleapis";

config({ path: ".env.local" });

const PORT = 3001;
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error(
    "\nMissing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env.local.\n" +
      "Add those two values first (see README.md), then re-run this script.\n"
  );
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);

// drive.file only ever grants access to files this app creates itself, so
// no verification step from Google is required to use it long-term. See
// README.md if you'd rather use the broader `drive` scope.
const SCOPES = ["https://www.googleapis.com/auth/drive.file"];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: SCOPES,
});

console.log("\nOpen this URL and approve access with the Google account that owns your scrapbook folder:\n");
console.log(authUrl + "\n");

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://localhost:${PORT}`);

  if (url.pathname !== "/oauth2callback") {
    response.writeHead(404);
    response.end();
    return;
  }

  const code = url.searchParams.get("code");
  if (!code) {
    response.writeHead(400, { "Content-Type": "text/plain" });
    response.end("Missing authorization code — check the terminal and try again.");
    return;
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);

    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    response.end("<p>Done — you can close this tab and go back to your terminal.</p>");

    if (!tokens.refresh_token) {
      console.log(
        "\nGoogle didn't return a refresh token. This usually means this app already has " +
          "access from a previous run. Go to https://myaccount.google.com/permissions, " +
          "remove access for this app, then run this script again.\n"
      );
    } else {
      console.log("\nAdd this to .env.local and to your Vercel project's environment variables:\n");
      console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`);
    }
  } catch (error) {
    console.error("\nCouldn't exchange the code for tokens:", error.message, "\n");
  } finally {
    server.close();
  }
});

server.listen(PORT, () => {
  console.log(`Waiting for the redirect on http://localhost:${PORT} ...`);
  console.log("(This is a one-time local step — it isn't part of the deployed app.)\n");
});
