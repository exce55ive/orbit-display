# Uptime Kuma — Status Panel

The Uptime Kuma panel shows the live status of all your configured monitors — instantly see what's up, down, or pending.

## What it shows

- All monitors from your Uptime Kuma instance
- Status for each monitor: **Up**, **Down**, or **Pending**
- Recent uptime at a glance

## Requirements

- Uptime Kuma **v2 or later**

> ⚠️ **Uptime Kuma v1 is not supported.** The v1 REST API does not provide the data Orbit needs. You must be running v2+.

## How to get your API key

Uptime Kuma v2 requires a dedicated API key — it does not use a username/password for API access.

1. Open Uptime Kuma in your browser.
2. Go to **Settings → API Keys**.
3. Click **Add API Key**, give it a name (e.g. "Orbit"), and confirm.
4. **Copy the key immediately** — it won't be shown again.

## Settings fields

| Field | Value |
|---|---|
| URL | `http://YOUR-SERVER-IP:3001` |
| API Key | Paste the key from Uptime Kuma |

## Troubleshooting

**"Uptime Kuma offline" error:**
- Confirm you're running Uptime Kuma v2+.
- Verify the URL is correct and accessible in your browser.
- Check that the API key was copied correctly and hasn't been deleted in Uptime Kuma.

**No monitors showing:**
- Make sure you have monitors configured in Uptime Kuma.
- Try regenerating the API key and updating it in Orbit Settings.
