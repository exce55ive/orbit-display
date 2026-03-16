# Sonarr — TV Panel

The Sonarr panel shows your TV library stats, active download queue, episodes downloaded today, and an upcoming calendar of what's airing soon.

## What you'll need

- Sonarr (v3 or later) running and reachable on your network
- Your Sonarr API key

## Step-by-step

### 1. Find your Sonarr API key

1. Open Sonarr in your browser.
2. Go to **Settings → General**.
3. You'll see the **API Key** field — copy the key.

### 2. Enter your details in Orbit

1. Open Orbit and click the **⚙** button in the bottom bar to open Settings.
2. Go to **Settings → Integrations → Sonarr**.
3. Enter your Sonarr **URL** (e.g. `http://192.168.1.100:8989`) and **API Key**.
4. Save — the panel connects and starts showing your library data.

## Where to enter it in Orbit

**Settings → Integrations → Sonarr**

- **URL** — Your Sonarr address (e.g. `http://192.168.1.100:8989`)
- **API Key** — The key from Sonarr's General settings

## Good to know

Orbit uses Sonarr's SignalR connection for real-time updates. That means the panel refreshes automatically the moment an episode finishes downloading — no manual refresh needed.

## Troubleshooting

**Panel is empty or shows no data:**
- Verify the URL and API key in Orbit Settings. Try opening the Sonarr URL in your browser to confirm it's running.
- Make sure you're running Sonarr v3 or later — older versions use a different API that Orbit doesn't support.

**Real-time updates stopped working:**
- Try restarting Sonarr. The SignalR connection can occasionally drop and needs to reconnect.

**Queue shows items but calendar is empty:**
- The calendar only shows upcoming episodes from series you're actively monitoring in Sonarr. Check that your series have future episodes scheduled.

← Back to [Setup Guide](./README.md)
