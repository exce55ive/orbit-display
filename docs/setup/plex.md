# Plex — Now Playing Panel

The Plex panel shows who's currently streaming on your Plex server, what they're watching, and how far through they are.

## What you'll need

- A Plex Media Server running on your network
- Your Plex server URL (usually something like `http://192.168.1.100:32400`)
- Your Plex authentication token (instructions below)

## Step-by-step

### 1. Find your Plex server URL

This is the address Orbit uses to talk to your Plex server. For most home setups, it looks like:

`http://YOUR-SERVER-IP:32400`

Replace `YOUR-SERVER-IP` with the local IP address of the machine running Plex. If you're not sure what it is, open the Plex web app and look at the address bar — the IP and port are right there.

If you access Plex remotely, you can find your external URL in the Plex web app under **Settings → Remote Access**.

### 2. Get your Plex token

Your Plex token is a unique key that lets Orbit access your server. Here are two easy ways to find it — pick whichever suits you.

**Method A — From your Plex account page**

1. Open [plex.tv](https://plex.tv) in your browser and sign in.
2. Click your profile icon in the top-right corner, then click **Account**.
3. Scroll down to **Authorized Devices**.
4. Your token is listed alongside your devices.

**Method B — From the Plex web app URL (most reliable)**

1. Open [app.plex.tv](https://app.plex.tv) in your browser and sign in.
2. Navigate to any movie or TV show and open its detail page.
3. Click the **⋮** (three dots) menu, then click **Get Info**.
4. Look at the URL in your browser's address bar — you'll see `X-Plex-Token=` followed by a string of characters.
5. Copy everything after the `=` sign. That's your token.

### 3. Enter your details in Orbit

1. Open Orbit and click the **⚙** button in the bottom bar to open Settings.
2. Go to **Settings → Integrations → Plex**.
3. Enter your **Server URL** and **Token**.
4. Save — the panel will connect and show any active streams.

## Where to enter it in Orbit

**Settings → Integrations → Plex**

- **URL** — Your Plex server address (e.g. `http://192.168.1.100:32400`)
- **Token** — Your X-Plex-Token from the steps above

## Troubleshooting

**Panel shows "offline" or no streams appear:**
- Double-check that the URL is correct and that your Plex server is running. Try opening the URL in your browser — you should see an XML page.
- Make sure the token is correct. If you've recently changed your Plex password, your old token may have been invalidated — grab a fresh one.

**"Unauthorized" error:**
- Your token may have expired or been revoked. Follow the steps above to get a new one and update it in Orbit Settings.

**Streams show for a moment then disappear:**
- This usually means the connection is dropping. Check that Orbit and your Plex server are on the same network, and that no firewall is blocking port 32400.

← Back to [Setup Guide](./README.md)
