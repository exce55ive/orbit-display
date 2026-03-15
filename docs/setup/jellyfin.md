# Jellyfin — Now Playing Panel

The Jellyfin panel shows active streams on your Jellyfin server — what's playing, who's watching, playback progress, and technical details like codec and transcode status.

## What it shows

- Active streams with title and username
- Playback progress
- Video codec and resolution
- Transcode status (direct play vs. transcoding)

## Requirements

- Jellyfin media server running and reachable on your network

## How to get your API key

1. Open the Jellyfin web interface.
2. Go to **Dashboard → API Keys**.
3. Click **+** to create a new key, give it a name (e.g. "Orbit"), and save.
4. Copy the generated key.

## Settings fields

| Field | Value |
|---|---|
| URL | `http://YOUR-SERVER-IP:8096` |
| API Key | Paste the key from Jellyfin |

## Troubleshooting

**No streams showing:**
- Confirm Jellyfin is accessible at the URL in Settings.
- Check that the API key is valid — you can verify by opening `http://YOUR-SERVER-IP:8096/Sessions?api_key=YOUR_KEY` in a browser.
- Ensure there are active playback sessions in Jellyfin (idle users won't appear).
