# Getting Started

Orbit is a live desktop dashboard for Windows that pulls real-time data from your homelab services — Plex, Sonarr, Home Assistant, Spotify, and more — and displays everything in side-by-side panels on a single screen. No more juggling browser tabs.

## System requirements

- Windows 10 or 11 (64-bit)
- A monitor — ultrawide (34"+) or dual-monitor setups work best, but any display will do
- Network access to the services you want to connect

## Installing Orbit

1. Download the Orbit installer (`OrbitSetup-0.0.1.exe`).
2. Double-click to run it — no admin rights are needed.
3. The installer sets up Orbit in your AppData folder and creates shortcuts on your Desktop and Start Menu.
4. That's it — click the shortcut to launch Orbit.

## The setup wizard

The first time you open Orbit, a setup wizard walks you through the basics:

### Welcome
A quick intro to what Orbit does. Click **Next** to continue.

### Integrations
This is where you connect your services. For each one, you'll enter a URL and a credential (usually an API key or token). Don't worry about getting everything connected right now — you can add or change integrations at any time from Settings.

### Pages
Choose your panel layout. Your dashboard starts with three panels — **Clock & Weather**, **System Monitor**, and **Quick Links** — which work without any integrations. As you enable integrations in the previous step, their panels become available to add here. You can always add or remove panels later from Settings.

### Done
The wizard finishes and Orbit launches your dashboard. Panels start populating as they connect to your services.

## Your first look around

Once Orbit is running, here's what you'll see:

- **Panels** fill the screen, each showing live data from a connected service.
- **Pages** let you spread panels across multiple screens. Use the **left/right arrow keys** on your keyboard (or swipe on a touchscreen) to move between pages.
- If a panel shows "offline," it just means that service isn't connected yet — or the URL or credentials need checking.

## How to open Settings

Click the **⚙** button in the bottom bar. This opens the Settings window where you can:

- Add, remove, or reorder panels
- Enter or update credentials for each integration
- Change your page layout

You can open Settings at any time — your dashboard keeps running in the background.

## Adding and managing panels

- In Settings, click **Add Panel** to pick a service and fill in its connection details.
- To remove a panel, click the **trash icon** next to it in the panel list.
- To reorder panels, drag them left or right in the list.

## What's next

Now that Orbit is running, connect your services one by one. Each integration has its own setup guide:

- [Plex](./plex.md) — active streams
- [Tautulli](./tautulli.md) — Plex stream monitoring
- [Home Assistant](./home-assistant.md) — light controls
- [Sonarr](./sonarr.md) — TV library and calendar
- [Radarr](./radarr.md) — movie library and upcoming releases
- [Overseerr](./overseerr.md) — media requests
- [NZBGet](./nzbget.md) — download queue
- [Jellyfin](./jellyfin.md) — active streams
- [Spotify](./spotify.md) — now playing and controls
- [SignalRGB](./signalrgb.md) — lighting effects
- [System Monitor](./system-monitor.md) — CPU, GPU, and RAM
- [Clock & Weather](./clock-weather.md) — time and forecast

Or browse them all from the [Setup Guide index](./README.md).

> **Tip:** If a panel shows "offline" after entering your credentials, double-check the URL and credentials in Settings and click **Test Connection**.
