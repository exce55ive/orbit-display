# Spotify — Now Playing Panel

The Spotify panel shows your currently playing track with album art, a progress bar, playback controls (previous, play/pause, next), and your Up Next queue.

## What you'll need

- A **Spotify Premium** account (required for playback controls)
- A Spotify Developer App (free to create — takes about two minutes)

## Step-by-step

### 1. Create a Spotify Developer App

1. Go to [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard) and log in with your Spotify account.
2. Click **Create App**.
3. Fill in a name and description — these can be anything (e.g. "Orbit Dashboard").
4. Under **Redirect URIs**, add exactly: `http://127.0.0.1:8888/callback`
5. Save the app.
6. From the app's dashboard page, copy your **Client ID** and **Client Secret**.

### 2. Enter your details in Orbit

1. Open Orbit and click the **⚙** button in the bottom bar to open Settings.
2. Go to **Settings → Integrations → Spotify**.
3. Enter your **Client ID** and **Client Secret**.

### 3. Connect your Spotify account

1. Click the **Connect** button in Orbit's Spotify settings.
2. A browser window opens — log in to Spotify and grant Orbit permission to access your playback.
3. Once you approve, the browser redirects back and Orbit shows **Connected**.
4. Save — the panel starts showing your now-playing track.

## Where to enter it in Orbit

**Settings → Integrations → Spotify**

- **Client ID** — From your Spotify Developer App
- **Client Secret** — From your Spotify Developer App

## Good to know

- Playback controls (previous, play/pause, next) only work with a **Spotify Premium** subscription. Free accounts can see what's playing but can't control it.
- If you switch Spotify accounts, disconnect in Orbit Settings and reconnect with the new account.

## Troubleshooting

**Authorisation fails or the browser doesn't redirect:**
- Make sure the redirect URI in your Spotify Developer App is exactly `http://127.0.0.1:8888/callback` — no trailing slash, no `https`.
- Check that your browser isn't blocking the local redirect. Pop-up blockers can sometimes interfere.

**Panel shows "Not playing" even though music is on:**
- Spotify's API only reports playback from the account linked to Orbit. If you're playing from a different account or device, make sure it's the same account you connected.

**Controls don't respond:**
- Confirm you have a Spotify Premium subscription. Free accounts can't use the playback control API.
- Try disconnecting and reconnecting in Orbit Settings.

← Back to [Setup Guide](./README.md)
