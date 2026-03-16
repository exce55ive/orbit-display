<div align="center">

# Orbit

**One screen for your entire homelab.**

[![Platform](https://img.shields.io/badge/platform-Windows%2010%2F11%20x64-0078D4?logo=windows&logoColor=white)](https://github.com/exce55ive/orbit-display/releases)
[![Release](https://img.shields.io/github/v/release/exce55ive/orbit-display?label=release&color=00d9ff)](https://github.com/exce55ive/orbit-display/releases/latest)
[![License](https://img.shields.io/badge/license-Proprietary-ef4444)](LICENSE.md)
[![Website](https://img.shields.io/badge/website-orbit.exce55ive.xyz-8b5cf6)](https://orbit.exce55ive.xyz)

</div>

---

Orbit is a modular desktop dashboard for Windows, built for homelab users who are done Alt‑Tabbing between Sonarr, Home Assistant, Plex, and a dozen other browser tabs. You wire up your services once — media stack, home automation, RGB lighting, download queues, system stats — and Orbit keeps everything visible on a single screen of panels you arrange yourself.

It runs locally. It talks directly to your LAN services. Config stays on your machine. No cloud, no account, no telemetry.

---

<div align="center">

![Orbit Dashboard](docs/screenshot.png)

*Replace `docs/screenshot.png` with an actual screenshot before public release.*

</div>

---

## ⬇ Download

**[OrbitSetup‑0.1.0.exe](https://github.com/exce55ive/orbit-display/releases/download/v0.1.0/OrbitSetup-0.1.0.exe)** — Windows 10/11 x64 · portable · no install required

Or from PowerShell:

```powershell
Invoke-WebRequest -Uri "https://github.com/exce55ive/orbit-display/releases/download/v0.1.0/OrbitSetup-0.1.0.exe" -OutFile OrbitSetup-0.1.0.exe
.\OrbitSetup-0.1.0.exe
```

On first launch, a setup wizard walks you through connecting your services. After that, the dashboard loads automatically.

---

## Panels

| | Panel | What it shows |
|---|---|---|
| 🕐 | **Clock & Weather** | Local time, current conditions, 5‑day forecast via wttr.in + Open‑Meteo |
| ⚡ | **SignalRGB** | Effect browser, search, favourites, brightness slider |
| 💡 | **Home Assistant** | Toggle lights, set brightness, pick entities |
| ▶️ | **Now Playing** | Tautulli / Plex sessions — album art, track progress |
| 💻 | **System Monitor** | CPU, RAM, GPU, network — live |
| 🔗 | **Quick Links** | Configurable shortcut buttons to anything |
| 📺 | **Sonarr** | Upcoming episodes, queue, import status |
| 🎬 | **Radarr** | Upcoming movies, queue, import status |
| 🎭 | **Overseerr** | Recent media requests |
| ⬇️ | **NZBGet** | Download speed, queue, progress bars |
| 🎵 | **Spotify** | Now playing, progress, queue preview |
| 🎞️ | **Jellyfin** | Active sessions and playback |
| 📡 | **Services** | Health monitor for custom HTTP endpoints |

Up to **6 panels per page**, across multiple pages. Drag‑and‑drop to reorder. Navigate pages via the bottom bar.

---

## Integrations

Everything is configured through the built‑in setup wizard — enter a URL and an API key, and you're connected.

| Service | What you need |
|---|---|
| **Sonarr** | URL + API key |
| **Radarr** | URL + API key |
| **Overseerr** | URL + API key |
| **NZBGet** | URL + password |
| **Tautulli / Plex** | Tautulli URL + API key |
| **Home Assistant** | URL + long‑lived access token |
| **SignalRGB** | Local HTTP API (default `http://localhost:16034`) |
| **Spotify** | OAuth flow — local callback at `http://127.0.0.1:8888/callback` |
| **Jellyfin** | URL + API key |
| **Weather** | City name (free — no key required) |
| **Custom Services** | Any HTTP endpoint for health checks |

---

## Themes

| Theme | Accent |
|---|---|
| **Midnight** (default) | Cyan |
| **Carbon** | Red |
| **Nebula** | Purple |
| **Forest** | Green |
| **Ember** | Orange |

Accent colour and panel spacing are adjustable in Settings.

---

## Development

```bash
git clone https://github.com/exce55ive/orbit-display.git
cd orbit-display
npm install
npm start
```

### Architecture (the short version)

There is no build step for the UI. `index.html` is plain HTML/CSS/JS — React 18 is loaded from CDN and used via `h()` calls. No Webpack, no Vite, no bundler.

Electron's main process (`main.js`) handles all HTTP requests to your services (bypassing CORS), file I/O, and IPC. `preload.js` exposes a `window.orbit.*` API to the renderer via `contextBridge`. Config lives as JSON in Electron's `userData` directory.

The setup wizard, settings panel, and about screen are each their own `BrowserWindow`.

Edit the UI directly — save the file, restart the app, see the change.

> For the full technical breakdown, see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
> To add a panel or contribute, see [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md).

---

## Build

Create a Windows portable executable from Linux (requires `wine64`):

```bash
npx electron-builder --win portable --config.directories.output=dist-new
```

> NSIS installer builds require `wine32`.

---

## Project Structure

```
orbit/
├── main.js           # Electron main process — networking, IPC, file I/O
├── preload.js        # contextBridge → window.orbit.* API
├── index.html        # Dashboard renderer (React 18 via CDN, no build step)
├── setup.html        # First‑run setup wizard
├── settings.html     # Settings window
├── about.html        # About window
├── config.json       # Default config schema
├── icon.ico          # App icon
├── package.json
└── docs/
    ├── ARCHITECTURE.md
    └── CONTRIBUTING.md
```

---

## License

Proprietary — © 2026 Exce55ive Software. All rights reserved.
Redistribution, resale, or sublicensing is not permitted without written permission.

See [`LICENSE.md`](LICENSE.md) for details.

---

<div align="center">

**[Website](https://orbit.exce55ive.xyz)** · **[Download](https://github.com/exce55ive/orbit-display/releases/latest)** · **[Report a Bug](https://github.com/exce55ive/orbit-display/issues)**

</div>
