# Orbit — Architecture

This document explains how Orbit is structured so contributors can reason about panels, integrations, config, themes, and packaging without having to reverse-engineer the source.

---

## Core philosophy: no build step

Orbit is deliberately build-free. The UI is plain HTML, CSS, and JavaScript loaded directly by Electron — no webpack, no Vite, no transpilation. React 18 is loaded from CDN; components use the [`htm`](https://github.com/developit/htm) `h()` pragma instead of JSX, so there is nothing to compile.

This keeps the dev loop simple (edit → restart), the packaged app fully inspectable, and the dependency surface small.

---

## Process model

Orbit runs the standard Electron two-process model:

```
┌─────────────────────────────┐      IPC       ┌──────────────────────┐
│       Main process          │ ◄────────────► │  Renderer (UI pages) │
│  main.js                    │                │  HTML + JS + CDN React│
│  - Config file I/O          │                │                      │
│  - Outbound HTTP proxy      │                │  Uses window.orbit.* │
│  - System info (systeminformation) │         │  API only            │
│  - Auto-updater             │                └──────────────────────┘
│  - Window lifecycle         │
└─────────────────────────────┘
          ▲
          │ contextBridge
          │
    preload.js
    exposes window.orbit
```

**Main process** (`main.js`, Electron 28) is responsible for:

- **Config persistence** — reads and writes `orbit-config.json` in Electron's `userData` folder. Handles migration (e.g. SignalRGB port changes across API versions).
- **HTTP proxy** — all outbound HTTP calls (API integrations) go through the main process via IPC. This sidesteps CORS restrictions in the renderer and centralises auth handling.
- **System information** — uses the `systeminformation` package (native bindings) to expose CPU, RAM, GPU, disk, and network stats. Exposed as fast/slow split (`getSysinfoFast` / `getSysinfoSlow`) to keep the UI responsive.
- **Auto-updater** — `electron-updater` checks GitHub Releases on startup. Downloads happen in the background; install triggers on app quit.
- **Window lifecycle** — manages the main dashboard window plus three auxiliary windows: setup wizard, settings overlay, and about dialog.

---

## Preload and the `window.orbit` API

`preload.js` runs with `contextIsolation: true`. It exposes a single surface `window.orbit` via `contextBridge`. **Renderer code must only use `window.orbit.*` — never `require()` Node modules directly.**

The full API surface (from `preload.js`):

| Category | Methods |
|---|---|
| Config | `loadConfig()`, `saveConfig(cfg)`, `getConfig()` |
| Settings | `loadSettings()`, `saveSettings(s)` |
| System info | `getSysinfo(params)`, `getSysinfoFast()`, `getSysinfoSlow(params)` |
| HTTP proxy | `apiGet(url, headers, timeout)`, `apiPost(url, body, headers)`, `apiPut(url, body, headers)` |
| Home Assistant | `haGetState(id)`, `haCallService(domain, service, data)` |
| Tautulli | `fetchTautulli()` |
| SignalRGB | `fetchSignalRGB()`, `activateEffect(id)`, `signalrgbSetEnabled(enabled)`, `signalrgbSetBrightness(b)`, `signalrgbDetectPort()` |
| Spotify | `spotifyAuthStart()`, `spotifyRefreshToken()` |
| Uptime Kuma | `fetchUptimeKuma(cfg)` |
| Services | `checkServices(services)` |
| SignalR streams | `startSignalR(opts)` |
| Display | `getDisplays()`, `selectDisplay(id)`, `showPicker()` |
| Shell | `openExternal(url)` |
| Updates | `checkUpdate()`, `downloadUpdate()`, `installUpdate()`, `getPendingUpdate()` |
| Misc | `getAppVersion()`, `openAbout()`, `openSetup()`, `notifyConfigSaved()`, `setupComplete()`, `testIntegration(opts)` |
| Events (renderer listeners) | `onConfigUpdated(cb)`, `onSonarrEvent(cb)`, `onRadarrEvent(cb)`, `onUpdateAvailable(cb)`, `onUpdateProgress(cb)`, `onUpdateDownloaded(cb)`, `onUpdateError(cb)` |

---

## Config storage

**File:** `orbit-config.json` in Electron's `userData` directory.  
**Windows path:** `%APPDATA%\orbit\orbit-config.json`

The config holds:
- Integration credentials and endpoints (Sonarr, Radarr, HA, etc.)
- Panel layout (per page — which panels, which columns)
- Theme selection
- Global options (display target, polling intervals, etc.)

There is also a **legacy read-only fallback** (`config.json`) that Orbit checks during startup if no user config exists yet. It is never written to.

Config migrations run at startup — example: automatic SignalRGB port remapping when the API changed between versions.

---

## Panel system

Panels are modular UI components rendered inside the dashboard grid.

**Available panels:** Clock/Weather, SignalRGB, Home Assistant, Now Playing (Tautulli/Plex), System Monitor, Quick Links, Sonarr, Radarr, Overseerr, NZBGet, Spotify, Jellyfin, Services.

**Layout:** CSS grid with 1–6 configurable columns. The dashboard supports multiple pages; the user navigates between them via a bottom bar. Page definitions live in config.

**Lifecycle:** Panels are lightweight components. They should:
- Render fast and degrade gracefully if data is unavailable.
- Use `window.orbit.apiGet` / `window.orbit.apiPost` (not `fetch`) for integration calls — the main process handles CORS and credentials.
- Keep polling intervals configurable and avoid blocking the UI thread.

---

## Theme system

Themes are CSS custom property overrides applied globally at load time. Theme selection is stored in config.

| Theme | Accent colour |
|---|---|
| Midnight (default) | `#00d9ff` (cyan) |
| Carbon | `#ff4444` (red) |
| Nebula | `#a855f7` (purple) |
| Forest | `#50fa7b` (green) |
| Ember | `#ff9500` (orange) |

To add a theme: define a CSS variable set and register the theme name in the theme picker.

---

## Auxiliary windows

| Window | File | Type | Purpose |
|---|---|---|---|
| Setup wizard | `setup.html` | Standalone BrowserWindow, 4-step | First-run configuration |
| Settings | `settings.html` | Frameless overlay | Live editing of panels and integrations |
| About | `about.html` | Frameless, 420×360 | Version info, update prompt |

---

## Integrations

All integrations are HTTP-based. The main process proxies requests; credentials never touch the renderer.

| Integration | Notes |
|---|---|
| Sonarr | REST API + SignalR websocket events for live updates |
| Radarr | REST API + SignalR websocket events |
| Overseerr | REST API |
| NZBGet | JSON-RPC API |
| Tautulli | REST API |
| Plex | Via Tautulli; direct Plex metadata calls |
| Home Assistant | REST API for state reads; service calls via REST |
| SignalRGB | Local HTTP API (port 16038 in SignalRGB 2.x) |
| Spotify | OAuth2 PKCE flow; tokens stored in config |
| Jellyfin | REST API |
| Uptime Kuma | Socket.IO connection |
| wttr.in | Current weather |
| Open-Meteo | 5-day forecast |

---

## Build and packaging

Orbit uses `electron-builder` to produce a portable Windows executable.

```bash
# Recommended build command (portable only, custom output dir)
npx electron-builder --win portable --config.directories.output=dist-new
```

The `package.json` also defines `build:portable` and `build:win` scripts. The default `build` script targets NSIS installer + ZIP; use the portable target for single-file distribution.

**Auto-updates** are served from GitHub Releases (`exce55ive/orbit-display`). `electron-updater` handles detection, download, and install-on-quit.

---

## Security notes

- The main process is the trust boundary. It validates and issues outbound requests; the renderer never calls external services directly.
- `contextIsolation: true` is enforced — the renderer has no access to Node APIs beyond `window.orbit`.
- Integration tokens and API keys are stored in plain JSON in `userData`. Do not commit config files with real credentials.
- If you add higher-sensitivity secrets (OAuth tokens, etc.), consider OS-level credential storage rather than plain JSON.
