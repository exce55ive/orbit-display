# Orbit

**Orbit** is a Windows desktop dashboard by [Exce55ive Software](https://github.com/exce55ive). It's a modular, configurable panel dashboard for home media, services monitoring, smart home control, and quick links — built on Electron with no build step required.

---

![Screenshot placeholder](docs/screenshot.png)

**[⬇ Download latest portable EXE →](https://github.com/exce55ive/orbit-display/releases/latest)**

---

## What it does

Orbit displays a grid of live panels on your desktop. Each panel talks to a service you already run — your media server, download client, smart home hub, or RGB controller. You configure once via a setup wizard; after that it just runs.

**Panels**

| Panel | What it shows |
|---|---|
| Clock / Weather | Local time, current conditions, 5-day forecast |
| System Monitor | CPU, RAM, GPU, disk, network — live |
| Now Playing | Currently playing from Tautulli / Plex |
| Sonarr | Recent/upcoming TV episodes |
| Radarr | Recent/upcoming movies |
| Overseerr | Pending media requests |
| NZBGet | Active download queue and speeds |
| Home Assistant | Entity states and service controls |
| SignalRGB | Scene browser and lighting controls |
| Spotify | Currently playing track, playback controls |
| Jellyfin | Library and playback status |
| Services | Health status of any HTTP endpoint |
| Quick Links | Configurable shortcut grid |

**Integrations:** Sonarr · Radarr · Overseerr · NZBGet · Tautulli · Plex · Home Assistant · SignalRGB · Spotify · Jellyfin · Uptime Kuma · wttr.in · Open-Meteo

**Themes**

| Name | Accent |
|---|---|
| Midnight (default) | Cyan `#00d9ff` |
| Carbon | Red `#ff4444` |
| Nebula | Purple `#a855f7` |
| Forest | Green `#50fa7b` |
| Ember | Orange `#ff9500` |

---

## Getting started

### Run in development

```bash
npm install
npm start
```

This opens Electron directly. There is no live-reload — restart the app to pick up UI changes.

### Build a release (portable EXE)

```bash
npx electron-builder --win portable --config.directories.output=dist-new
```

Output lands in `dist-new/`. Only the portable Windows target is supported (no NSIS installer in this build path).

---

## Configuration

Orbit stores all settings in a single JSON file in Electron's `userData` folder:

```
%APPDATA%\orbit\orbit-config.json
```

Config is managed through the in-app setup wizard (first run) and settings overlay. You don't need to edit it by hand.

---

## Setup

On first run, Orbit opens a 4-step setup wizard (`setup.html`) where you enter your integration endpoints and API keys. After setup, the main dashboard loads. Access settings again at any time from the toolbar.

---

## Auto-updates

Orbit checks GitHub Releases for updates via `electron-updater`. When an update is available, a prompt appears in the dashboard. Updates download in the background and install on next app quit.

---

## Contributing

See [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) for how to run locally and add panels.  
See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for a full technical breakdown.

---

## License

See [`LICENSE.md`](LICENSE.md).
