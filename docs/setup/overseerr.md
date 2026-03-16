# Overseerr — Requests Panel

The Overseerr panel shows a live count of media requests — total, pending, processing, and available — along with the most recent requests and who made them.

## What you'll need

- Overseerr running and reachable on your network
- Your Overseerr API key

## Step-by-step

### 1. Find your Overseerr API key

1. Open Overseerr in your browser.
2. Go to **Settings → General**.
3. Copy the **API Key** shown on that page.

### 2. Enter your details in Orbit

1. Open Orbit and click the **⚙** button in the bottom bar to open Settings.
2. Go to **Settings → Integrations → Overseerr**.
3. Enter your Overseerr **URL** (e.g. `http://192.168.1.100:5055`) and **API Key**.
4. Save — the panel starts showing your request counts and recent activity.

## Where to enter it in Orbit

**Settings → Integrations → Overseerr**

- **URL** — Your Overseerr address (e.g. `http://192.168.1.100:5055`)
- **API Key** — The key from Overseerr's General settings

## Troubleshooting

**Requests aren't updating:**
- Confirm Overseerr is accessible in your browser at the URL you entered.
- Check that the API key is correct — if it was recently regenerated in Overseerr, you'll need to update it in Orbit too.

**Panel shows zero counts but you know there are requests:**
- Make sure you're looking at the right Overseerr instance. If you have multiple setups (e.g. one for movies, one for TV), verify you've connected the right one.

**Panel shows "offline":**
- Restart Orbit and check that Overseerr is running. If the problem persists, try regenerating the API key in Overseerr and entering the new one.

← Back to [Setup Guide](./README.md)
