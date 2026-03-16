# Uptime Kuma — Status Panel

The Uptime Kuma panel shows the live status of all your monitors at a glance — what's up, what's down, and what's pending.

## What you'll need

- Uptime Kuma **v2 or later** running and reachable on your network
- An Uptime Kuma API key

> ⚠️ **Uptime Kuma v1 is not supported.** Orbit requires the v2 API. If you're still on v1, you'll need to upgrade before this panel will work.

## Step-by-step

### 1. Create an API key in Uptime Kuma

1. Open Uptime Kuma in your browser.
2. Go to **Settings → API Keys**.
3. Click **Add API Key**, give it a name (e.g. "Orbit"), and confirm.
4. **Copy the key immediately** — Uptime Kuma won't show it again.

### 2. Enter your details in Orbit

1. Open Orbit and click the **⚙** button in the bottom bar to open Settings.
2. Go to **Settings → Integrations → Uptime Kuma**.
3. Enter your Uptime Kuma **URL** (e.g. `http://192.168.1.100:3001`) and **API Key**.
4. Save — the panel will populate with your monitor statuses.

## Where to enter it in Orbit

**Settings → Integrations → Uptime Kuma**

- **URL** — Your Uptime Kuma address (e.g. `http://192.168.1.100:3001`)
- **API Key** — The key you created in Uptime Kuma's Settings

## Troubleshooting

**"Uptime Kuma offline" error:**
- Confirm you're running Uptime Kuma v2 or later. Orbit does not support v1.
- Verify the URL is correct and accessible in your browser.
- Check that the API key was copied correctly and hasn't been deleted.

**No monitors showing:**
- Make sure you actually have monitors configured in Uptime Kuma. If you just installed it, you'll need to add some monitors first.

**Some monitors show "pending" indefinitely:**
- This usually means Uptime Kuma hasn't finished its first check cycle for those monitors. Give it a minute and refresh.

← Back to [Setup Guide](./README.md)
