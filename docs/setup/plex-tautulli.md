# Plex / Tautulli — Now Playing Panel

The Now Playing panel shows your active Plex streams in real time — who's watching, what they're watching, and how far through they are.

## What it shows

- Active streams with username, title, and media type
- Playback progress and current state (playing, paused, buffering)
- Stream count at a glance

## Requirements

- Plex Media Server running on your network
- Tautulli installed and running alongside Plex

> **Why Tautulli?** Orbit reads stream data through Tautulli's API rather than Plex directly. Tautulli must be running for this panel to work.

## How to get your API key

1. Open Tautulli in your browser.
2. Go to **Settings → Web Interface**.
3. Scroll down to find the **API Key** field.
4. Copy the key.

## Settings fields

| Field | Value |
|---|---|
| URL | `http://YOUR-SERVER-IP:8181` |
| API Key | Paste the key from Tautulli |

## Troubleshooting

**No streams showing:**
- Confirm Tautulli is running and accessible in your browser at the URL you entered.
- Make sure Tautulli is connected to your Plex server (Tautulli → Settings → Plex Media Server).
- Try refreshing the panel or restarting Orbit.

**"Tautulli offline" error:**
- Double-check the URL and API key in Orbit Settings.
- Try opening the Tautulli URL in your browser — if it doesn't load, the service may not be running.
- Check that your firewall or antivirus isn't blocking Orbit's outbound requests.
