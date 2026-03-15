# Home Assistant — Lights Panel

The Home Assistant panel shows your light entities with on/off toggles and brightness controls, all accessible directly from Orbit.

## What it shows

- All selected light entities with their current on/off state
- Brightness slider for dimmable lights
- Real-time state reflects what's happening in your home

## Requirements

- Home Assistant running and reachable on your network
- A long-lived access token (replaces username/password for API access)

## How to create an access token

1. Open Home Assistant in your browser.
2. Click your **Profile** icon in the bottom-left corner.
3. Scroll down to **Long-Lived Access Tokens**.
4. Click **Create Token**, give it a name (e.g. "Orbit"), and confirm.
5. **Copy the token immediately** — it's only shown once.

## Settings fields

| Field | Value |
|---|---|
| URL | `http://YOUR-SERVER-IP:8123` |
| Token | Paste your long-lived access token |
| Light entities | Select using the Browse HA button |

## Selecting light entities

Click **Browse HA** in Orbit Settings to fetch all your entities live. Search by entity name or domain (e.g. `light`), then tick the ones you want to display. Changes apply when you save.

## Troubleshooting

**Entities not available or panel blank:**
- Ensure the token has not expired or been deleted in Home Assistant.
- Verify the URL is accessible in your browser.
- Click **Browse HA** again to refresh the entity list.

**Toggle doesn't work:**
- Confirm your token has write permissions (long-lived tokens do by default).
- Check that the light entity is not unavailable in Home Assistant.
