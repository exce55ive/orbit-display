# Sonarr — TV Panel

The Sonarr panel shows your TV library stats, active queue, episodes downloaded today, and your upcoming calendar.

## What it shows

- Total TV library size (series and episodes)
- Current download queue with item count
- Episodes downloaded today, including show name and episode info
- Upcoming calendar — what's expected soon

## Requirements

- Sonarr v3 or later, running and reachable on your network

## How to get your API key

1. Open Sonarr in your browser.
2. Go to **Settings → General**.
3. Find the **API Key** field and copy it.

## Settings fields

| Field | Value |
|---|---|
| URL | `http://YOUR-SERVER-IP:8989` |
| API Key | Paste the key from Sonarr |

## Notes

- **Real-time updates:** Orbit uses Sonarr's SignalR connection, so the panel refreshes automatically the moment an episode finishes downloading — no manual refresh needed.

## Troubleshooting

**No data or stale data:**
- Verify your Sonarr URL and API key are correct in Orbit Settings.
- Ensure Sonarr is accessible in your browser at the URL you entered.
- If real-time updates stop working, try restarting Sonarr.
