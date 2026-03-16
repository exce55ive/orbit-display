# Jellyfin — Now Playing Panel

The Jellyfin panel shows active streams on your Jellyfin server — what's playing, who's watching, playback progress, and technical details like codec and transcode status.

## What you'll need

- Jellyfin running and reachable on your network
- A Jellyfin API key

## Step-by-step

### 1. Create a Jellyfin API key

1. Open the Jellyfin web interface in your browser.
2. Go to **Dashboard → API Keys** (under the Administration section).
3. Click the **+** button to create a new key.
4. Give it a name (e.g. "Orbit") and save.
5. Copy the generated key.

### 2. Enter your details in Orbit

1. Open Orbit and click the **⚙** button in the bottom bar to open Settings.
2. Go to **Settings → Integrations → Jellyfin**.
3. Enter your Jellyfin **URL** (e.g. `http://192.168.1.100:8096`) and **API Key**.
4. Save — the panel will show any active playback sessions.

## Where to enter it in Orbit

**Settings → Integrations → Jellyfin**

- **URL** — Your Jellyfin address (e.g. `http://192.168.1.100:8096`)
- **API Key** — The key you created in Jellyfin's Dashboard

## Troubleshooting

**No streams showing:**
- Make sure there are actually active playback sessions in Jellyfin. Idle users won't appear — someone needs to be actively watching something.
- Confirm the URL is correct by opening it in your browser. You should see the Jellyfin web interface.

**"Unauthorized" or connection refused:**
- Check that the API key was copied correctly. You can verify or create a new one in Jellyfin under Dashboard → API Keys.

**Panel shows "offline":**
- Verify Jellyfin is running and accessible on your network. Try restarting the Jellyfin service if the URL loads in a browser but Orbit can't connect.

← Back to [Setup Guide](./README.md)
