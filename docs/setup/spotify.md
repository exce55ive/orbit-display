# Spotify — Now Playing Panel

The Spotify panel shows your currently playing track with album art, a progress bar, playback controls, and an Up Next queue.

## What it shows

- Currently playing track, artist, and album art
- Playback progress bar
- Controls: previous, play/pause, next
- Up Next queue

## Requirements

- Spotify **Premium** account (required for playback control)
- A Spotify Developer App (free to create)

## How to create a Spotify Developer App

1. Go to [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard) and log in.
2. Click **Create App**.
3. Fill in a name and description (anything you like).
4. Under **Redirect URIs**, add exactly: `http://127.0.0.1:8888/callback`
5. Save the app.
6. From the app dashboard, copy your **Client ID** and **Client Secret**.

## Settings fields

| Field | Value |
|---|---|
| Client ID | From your Spotify Developer App |
| Client Secret | From your Spotify Developer App |

## How to connect

1. Enter your Client ID and Client Secret in Orbit Settings.
2. Click **Connect**.
3. A browser window opens — log in to Spotify and grant permissions.
4. Once authorised, the browser redirects and Orbit shows **Connected**.

## Notes

- Playback controls (prev/pause/next) require a **Spotify Premium** subscription.
- If you switch Spotify accounts, disconnect and reconnect in Settings.

## Troubleshooting

**Authorisation fails or browser doesn't redirect:**
- Confirm the redirect URI in your Spotify Developer App is exactly `http://127.0.0.1:8888/callback` — no trailing slash.
- Check that your browser isn't blocking the local redirect.
- Make sure pop-ups are allowed for the Spotify login page.
