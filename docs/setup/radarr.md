# Radarr — Movies Panel

The Radarr panel shows your movie library stats, download queue, recent downloads, and upcoming releases — including whether they're hitting cinemas or digital.

## What it shows

- Total movie library size
- Current download queue
- Movies downloaded today
- Upcoming releases with release type classification

## Requirements

- Radarr v3 or later, running and reachable on your network

## How to get your API key

1. Open Radarr in your browser.
2. Go to **Settings → General**.
3. Find the **API Key** field and copy it.

## Settings fields

| Field | Value |
|---|---|
| URL | `http://YOUR-SERVER-IP:7878` |
| API Key | Paste the key from Radarr |

## Upcoming release classification

Orbit labels upcoming movies based on their release type:

- 🎭 **CINEMA** — theatrical release, heading to cinemas
- 💾 **DOWNLOAD** — expected digital/home release

## Troubleshooting

**Missing movies or empty queue:**
- Confirm your Radarr URL and API key in Orbit Settings.
- Ensure Radarr v3+ is running — older versions use a different API.
- Check that Radarr's root folders and calendar are configured correctly inside Radarr itself.
