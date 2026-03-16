# Tautulli — Now Playing Panel

The Tautulli panel gives you a real-time view of active Plex streams — who's watching, what they're watching, playback progress, and stream count.

## What you'll need

- Tautulli installed and running alongside your Plex server
- Tautulli accessible on your network (usually at `http://YOUR-SERVER-IP:8181`)

> **Why Tautulli?** Orbit reads stream data through Tautulli's API, which provides richer playback details than Plex alone. Tautulli must be running for this panel to work.

## Step-by-step

### 1. Find your Tautulli API key

1. Open Tautulli in your browser.
2. Go to **Settings → Web Interface**.
3. Scroll down to the **API Key** field.
4. Copy the key. If no key exists yet, click **Generate** to create one.

### 2. Enter your details in Orbit

1. Open Orbit and click the **⚙** button in the bottom bar to open Settings.
2. Go to **Settings → Integrations → Tautulli**.
3. Enter your Tautulli **URL** (e.g. `http://192.168.1.100:8181`) and **API Key**.
4. Save — the panel will connect and show active Plex streams.

## Where to enter it in Orbit

**Settings → Integrations → Tautulli**

- **URL** — Your Tautulli address (e.g. `http://192.168.1.100:8181`)
- **API Key** — The key from Tautulli's Web Interface settings

## Troubleshooting

**No streams showing:**
- Confirm Tautulli is running and accessible in your browser at the URL you entered.
- Make sure Tautulli is properly connected to your Plex server (check Tautulli → **Settings → Plex Media Server**).

**"Tautulli offline" error:**
- Double-check the URL and API key in Orbit Settings.
- Try opening the Tautulli URL in your browser — if it doesn't load, the service may not be running.
- Check that your firewall isn't blocking Orbit from reaching Tautulli on port 8181.

**Data seems stale or delayed:**
- Restart Tautulli, then refresh Orbit. Occasionally Tautulli's API cache needs a nudge.

← Back to [Setup Guide](./README.md)
