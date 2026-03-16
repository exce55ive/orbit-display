# Radarr — Movies Panel

The Radarr panel shows your movie library stats, active download queue, recently grabbed movies, and upcoming releases — with labels showing whether they're heading to cinemas or available for download.

## What you'll need

- Radarr (v3 or later) running and reachable on your network
- Your Radarr API key

## Step-by-step

### 1. Find your Radarr API key

1. Open Radarr in your browser.
2. Go to **Settings → General**.
3. Copy the **API Key**.

### 2. Enter your details in Orbit

1. Open Orbit and click the **⚙** button in the bottom bar to open Settings.
2. Go to **Settings → Integrations → Radarr**.
3. Enter your Radarr **URL** (e.g. `http://192.168.1.100:7878`) and **API Key**.
4. Save — the panel connects and starts showing your movie library.

## Where to enter it in Orbit

**Settings → Integrations → Radarr**

- **URL** — Your Radarr address (e.g. `http://192.168.1.100:7878`)
- **API Key** — The key from Radarr's General settings

## Good to know

Orbit labels upcoming movies by release type:
- 🎭 **CINEMA** — heading to theatres
- 💾 **DOWNLOAD** — expected as a digital or home release

## Troubleshooting

**Panel is empty or movies are missing:**
- Double-check the URL and API key in Orbit Settings.
- Make sure you're running Radarr v3 or later — older versions use a different API.
- Check that Radarr has root folders configured and movies in its library.

**Upcoming section is blank:**
- Radarr needs release date information to show upcoming movies. If your library is mostly older titles, there may not be anything upcoming.

**Queue shows downloads but they're not appearing in the library count:**
- Downloads in progress show in the queue but aren't counted in the library total until they're imported. This is normal.

← Back to [Setup Guide](./README.md)
