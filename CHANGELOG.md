# Changelog

## v0.1.5
- **Fix:** Audio Devices panel — PowerShell scripts now written to temp `.ps1` files and executed with `-File` flag, eliminating ALL command-line escaping issues (`$_`, quotes, backslashes etc.)
- **Fix:** Hidden panel restore — dedicated "HIDDEN PANELS" section in Settings with one-click RESTORE buttons for each hidden panel
- **Fix:** Hidden panel indicator in bottom bar shows amber badge with count, opens Settings to restore
- **Fix:** Auto-updater state race condition — `update-available` no longer resets `updateDownloaded` flag, `downloadUpdate()` properly awaited, 10s safety timeout if `update-downloaded` event never fires, null checks on `mainWindow`

## v0.1.4
- **Add:** Audio Devices panel — switch Windows audio output and input devices directly from the dashboard. Lists all playback and recording endpoints, highlights the current default, one-click switching via PowerShell PolicyConfig COM.
- **Add:** Hidden panel recovery in gallery — hidden panels now show an amber "HIDDEN" badge and remain clickable to restore, instead of being indistinguishable from active panels.
- **Change:** Gallery title changed from "ADD PANEL" to "PANELS" with subtitle "ADD A NEW PANEL OR RESTORE A HIDDEN ONE".

## v0.1.3
- **Add:** Centralized polling scheduler — all panel intervals managed by `PollScheduler` with automatic visibility-aware throttling. Polling slows 6x when the dashboard window is hidden/minimized, reducing CPU and network usage.
- **Add:** `usePoll` hook for panels to register with the scheduler (Clock weather, System fast/slow, SignalRGB, Lights, Services converted).
- **Add:** Debounced config saves — rapid operations (drag reorder, collapse toggles, SignalRGB favorites) are coalesced with a 500ms window to reduce file I/O.
- **Add:** Credential encryption at rest via Electron `safeStorage` (DPAPI on Windows, Keychain on macOS, libsecret on Linux). All API keys, tokens, and passwords in `orbit-config.json` are now stored encrypted.
- **Add:** Renderer-side logging bridge — panel errors and warnings are piped to `electron-log` for persistent diagnostics without DevTools.
- **Add:** Inline input validation on settings fields — URL format, API key length, and whitespace checks with on-blur error messages.
- **Add:** "Test Connection" button on all integration config panels — verify connectivity before saving.

## v0.1.2
- **Fix:** Docker test-integration crash — `opts` undefined, now uses destructured `port`/`useTLS` params
- **Fix:** SignalR WebSocket connections now cleaned up on main window close (resource leak)
- **Fix:** Spotify OAuth timeout now clears on successful auth (timer leak)
- **Fix:** Missing sabnzbd panel visibility default for fresh installs
- **Change:** System monitor polling slowed — CPU/RAM 3s→5s, temps/GPU 10s→30s — still feels real-time, far less WMI overhead
- **Change:** Clock date string now updates every 60s instead of every second (toLocaleDateString is expensive)
- **Change:** Spotify progress tick only triggers re-render when the displayed second actually changes
- **Change:** Mouse hover zones throttled from ~120 calls/s to 10 calls/s
- **Change:** All 26 panel components wrapped in React.memo() — prevents cascade re-renders when sibling panels update
- **Change:** Staggered initial polling on dashboard load — panels no longer all fire API calls in the same frame

## v0.1.1
- **Add:** Pages tab overhaul — full page management with add/remove pages, inline rename, drag-to-reorder. Each page shows its panels as chips with reorder (↑↓) and remove (✕) buttons. "Add Panel" picker shows only enabled panels not already on the page.
- **Add:** Panels tab overhaul — toggle switches now include inline collapsible "⚙ Configure" sections for each service. All integration config (URLs, API keys, etc.) moved from the old pages-tab scroll into per-panel collapsible rows. No more hunting through a long config wall.
- **Add:** Sticky save button — always-visible "💾 Save" button pinned to top-right of the settings window. Shows an amber unsaved-changes dot when config is dirty, turns green with "✓ Saved" on save (1.5s confirmation). Works across all tabs.
- **Fix:** Removed per-tab "Save Settings" buttons (replaced by the sticky save button).
- **Fix:** Quick Links config moved to Panels tab under its own toggle row with inline editor.

## v0.1.0
- **Add:** SABnzbd panel — download queue with progress bars, current speed, status badge (Downloading/Paused/Idle), ETA, pause/resume button, total downloaded stats. Adaptive polling: 5s when active, 30s when idle. Error boundary with retry. Configurable in Settings and Setup Wizard with connection test.
- **Add:** Add Panel gallery — "+" button in the bottom bar opens a full-screen visual panel picker. Browse all 25 panel types with icons and descriptions. Already-visible panels show a checkmark and are dimmed. Click any unchecked panel to enable it instantly.
- **Add:** Iframe / Custom panel — embed any URL in a dashboard panel. Configurable title and zoom (0.5x–2.0x). Uses sandboxed iframe. Configure in Settings or Setup Wizard.
- **Add:** Config backup & restore — new "Save Config Backup" and "Load Config Backup" buttons in Settings → System tab. Export full configuration to a JSON file or restore from a previous backup via native file dialogs.
- **Add:** Playwright screenshot test — new test captures a demo-mode dashboard screenshot to `screenshots/orbit-dashboard.png`. Run with `xvfb-run npx playwright test` on headless systems.
- **Add:** `config-schema.json` updated with `custom` panel type and integration defaults.
- **Add:** Settings panel visibility list updated with all panel types (network, unraid, immich, speedtest, calendar, custom).
- **Add:** Setup Wizard updated with Custom / Iframe panel configuration section.

## v0.0.14
- **Add:** Immich panel — photo library dashboard showing total photos/videos count, storage used, most recent upload with thumbnail, and "On This Day" section showing up to 3 photos from this day in past years. Click thumbnails to open in Immich. Polls every 60s.
- **Add:** Speedtest panel — built-in internet speed test using Cloudflare's speed endpoints. Shows download/upload speeds (Mbps) and ping. History bar chart of last 5 results. Configurable auto-run schedule (default: off). Results persisted to config.
- **Add:** Calendar panel — upcoming events from iCal feeds (Google Calendar, Outlook, Apple Calendar, Nextcloud, etc.). Shows today + next 7 days grouped by date with time, title, and calendar colour dot. Minimal iCal parser handles VEVENT, DTSTART, DTEND, SUMMARY. Polls every 15 minutes.
- **Add:** Spotlight Search (Ctrl+K / Cmd+K) — global search overlay to quickly find and jump to panels, open settings, or launch service URLs. Search icon also added to bottom bar. Debounced 200ms input with keyboard navigation.
- **Add:** `config-schema.json` updated with `immich`, `speedtest`, and `calendar` integration defaults.
- **Add:** Setup Wizard and Settings window updated with Immich, Speedtest, and Calendar configuration sections.
- **Add:** `run-speedtest` IPC handler in main process for download/upload/ping measurement via Cloudflare CDN.
- **Add:** Demo mode panels for Immich, Speedtest, and Calendar.

## v0.0.13
- **Add:** Demo / Sample Mode — "Try Demo" button on first-run welcome overlay loads realistic fake data across all panels. Explore Orbit's full feature set without configuring any services. Clearly visible "DEMO MODE" badge in bottom bar with one-click exit.
- **Add:** Network Monitor panel — shows WAN connection status, ping latency to 8.8.8.8, live upload/download speeds, and local IP address. Optional router integration supports OpenWrt, pfSense, and UniFi for WAN IP, bandwidth totals, and active connection count. Polls ping every 5s, router every 30s.
- **Add:** Unraid panel — array status with colour badge, read/write speeds, disk list with temps/status/usage, VM list with status and memory, parity check progress. Connects via Unraid REST API (`/api/v1/`). Polls every 30s.
- **Add:** Landing page overhaul — new product page with hero section, dashboard mock preview, feature grid covering all 16+ integrations, highlight cards for drag-and-drop/layouts/notifications/auto-updates, platform download section, and dark theme matching Orbit's aesthetic.
- **Add:** `config-schema.json` updated with `demoMode`, `network` (routerUrl, routerType, username, password), and `unraid` (url, apiKey) integration defaults.
- **Add:** Setup Wizard and Settings window updated with Network Monitor and Unraid configuration sections.
- **Add:** `ping-host` IPC handler for real ICMP ping from main process. `get-sysinfo-fast` now includes local IP address.

## v0.0.12
- **Add:** Proxmox panel — live VM/container status, node CPU/RAM/storage usage with colour-coded health badges. Polls every 15s. Supports API token auth and self-signed certs.
- **Add:** Docker panel — running/stopped container list with per-container CPU and memory stats. Collapsible stopped section. Polls every 10s.
- **Add:** Pi-hole panel — query/blocked stats, block percentage bar, domain count, and enable/disable toggle. Auto-detects Pi-hole v5 and v6 APIs.
- **Add:** TrueNAS panel — pool list with status badges and usage bars, disk health summary, system info (hostname, version, uptime), and recent alerts with severity badges. Polls every 60s. Supports CORE and SCALE via REST API v2.0.
- **Add:** Drag-and-drop panel reordering — grab the ⠿ handle to rearrange panels. Order saved to config automatically.
- **Add:** Collapsible panels — click the ▼ arrow on any panel header to collapse/expand. State saved per-panel in config.
- **Add:** Layout system — save, switch, and manage named layouts (panel order, visibility, collapsed state). Built-in "Default" layout plus user-created presets. Layout picker in top-right corner.
- **Add:** Native OS notifications — panels can fire desktop notifications (e.g. NZBGet download complete, Sonarr new episode). Debounced to prevent spam.
- **Fix:** `config-schema.json` updated with all new config keys: `panelOrder`, `panelCollapsed`, `layouts`, `currentLayout`, `notifications`, `panels`, and integration defaults for Proxmox, Docker, Pi-hole, and TrueNAS.
- **Fix:** `api-get` IPC handler supports `rejectUnauthorized: false` for self-signed TLS certificates.
- **Fix:** `test-integration` IPC handler added for Proxmox, Docker, Pi-hole, and TrueNAS connection testing from Setup Wizard and Settings.

## v0.0.11
- **Add:** Error boundaries per panel — if a panel errors, it dims with "⚠ Service unavailable" and auto-retries every 30 seconds. Other panels continue working normally.
- **Add:** Config schema validation on load — missing required fields are filled with sensible defaults; unknown keys are logged as warnings.
- **Add:** SignalRGB auto-detect — new "Auto-detect" button in both Setup Wizard and Settings scans local ports for SignalRGB and fills the URL automatically.
- **Add:** Configurable panel visibility — new "Panels" tab in Settings with toggle switches for each panel. Hidden panels do not render or poll. Saved in `orbit-config.json` under `panels` key.
- **Add:** First-run onboarding — welcome overlay with Orbit logo, tagline, integration list, and "Open Setup" / "Skip for now" buttons. Only shows once (`firstRunComplete` flag in config).
- **Add:** Playwright test suite — `npm test` runs Electron integration tests covering config operations, panel visibility, and update flow.
- **Fix:** `config-schema.json` updated with all panel types, integration defaults, and required field definitions.

## v0.0.10
- **Add:** DevTools toggle — `Ctrl+Shift+I` (or `Cmd+Option+I` on Mac) opens DevTools on the focused window in any build (packaged or dev). Also available via Help menu.
- **Add:** ARM64 build support — new `build:win:arm64` script for native ARM Windows builds.
- **Fix:** Update check delayed 30s after startup to reduce load. Auto-download disabled — prompts user instead of silently downloading.
- **Fix:** AutoUpdater error handler hardened to prevent update failures from crashing the app.
- **Fix:** Weather panel now correctly unwraps wttr.in API response envelope (`data.data` → `data`)

## v0.0.9
- **Add:** Settings opens as a dedicated full-size window (1000×700) — no longer a small side overlay
- **Add:** Preferences tab — toggle °C/°F temperature unit and 12h/24h clock format
- **Add:** 12h clock shows small AM/PM marker
- **Fix:** Clock and weather panel respects temperature unit and time format preferences
- **Fix:** Display Switcher loads saved display selection correctly on open
- **Fix:** Settings gear now correctly opens Settings (was opening Setup Wizard)
- **Add:** `Makefile` — `make release VERSION=x.y.z` for one-command releases
- **Add:** `RELEASING.md` and `CHANGELOG.md`

## v0.0.8
- **Add:** System tab in Settings — Display Switcher + Reset Settings (3-step confirm)
- **Fix:** CI workflow — use `--publish never` + `softprops/action-gh-release`

## v0.0.7
- **Fix:** Default panels no longer forced on new installs
- **Fix:** AMD GPU LHM fallback for Windows WMI limitation
- **Docs:** Updated system-monitor.md and getting-started.md
