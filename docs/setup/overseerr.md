# Overseerr — Requests Panel

The Overseerr panel shows a live count of media requests and a list of the most recent ones — so you can see what's been asked for and what's in progress.

## What it shows

- Request counts broken down by status: **Total**, **Pending**, **Processing**, and **Available**
- Recent requests with media title and the name of who requested it

## Requirements

- Overseerr running and reachable on your network

## How to get your API key

1. Open Overseerr in your browser.
2. Go to **Settings → General**.
3. Find the **API Key** field and copy it.

## Settings fields

| Field | Value |
|---|---|
| URL | `http://YOUR-SERVER-IP:5055` |
| API Key | Paste the key from Overseerr |

## Troubleshooting

**Requests not updating:**
- Confirm Overseerr is accessible in your browser at the URL in Settings.
- Check that the API key is correct and hasn't been regenerated since you saved it.
- Restart Orbit if the panel appears stuck.
