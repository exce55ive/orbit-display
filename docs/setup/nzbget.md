# NZBGet — Downloads Panel

The NZBGet panel shows your active download queue, current download speed, and how much data is left — updated in near real-time.

## What you'll need

- NZBGet running and reachable on your network
- Your NZBGet username and password

## Step-by-step

### 1. Find your NZBGet credentials

Use the same username and password you use to log into NZBGet's web interface. If you've never changed them, the defaults are usually `nzbget` and `tegbzn6789` — but you should change those for security.

To check or update your credentials:
1. Open NZBGet in your browser.
2. Go to **Settings → Security**.
3. Your **ControlUsername** and **ControlPassword** are listed there.

### 2. Enter your details in Orbit

1. Open Orbit and click the **⚙** button in the bottom bar to open Settings.
2. Go to **Settings → Integrations → NZBGet**.
3. Enter your NZBGet **URL** (e.g. `http://192.168.1.100:6789`), **Username**, and **Password**.
4. Save — the panel connects and shows your download queue.

## Where to enter it in Orbit

**Settings → Integrations → NZBGet**

- **URL** — Your NZBGet address (e.g. `http://192.168.1.100:6789`)
- **Username** — Your NZBGet control username
- **Password** — Your NZBGet control password

## Good to know

Orbit polls NZBGet every 1.5 seconds while downloads are active, so the queue and speed display stay close to real-time.

## Troubleshooting

**Queue not showing or panel is blank:**
- Verify your URL, username, and password by logging into NZBGet's web interface directly. If you can't log in there, the credentials are wrong.
- Check the port — NZBGet defaults to `6789`, but it may have been changed during setup.

**"Authentication failed" error:**
- Double-check the username and password in Orbit Settings. They need to match what's set in NZBGet under Settings → Security.

**Speed shows 0 but downloads are queued:**
- NZBGet might be paused. Check the NZBGet web interface and click Resume if needed.

← Back to [Setup Guide](./README.md)
