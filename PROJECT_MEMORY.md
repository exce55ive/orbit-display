# PROJECT_MEMORY.md — Orbit

_Last updated: 2026-04-12 by project_memory_sync.py_memory_sync.py_memory_sync.py_memory_sync.py_memory_sync.py_memory_sync.py_memory_sync.py_memory_sync.py_memory_sync.py_memory_sync.py_memory_sync.py_memory_sync.py_memory_sync.py_memory_sync.py_memory_sync.py_memory_sync.py_memory_sync.py_memory_sync.py_

## What This Is

Orbit is Robby's modular desktop dashboard app. Electron-based, single-page panels for monitoring home infrastructure, media, smart home, and more. Released on GitHub as `exce55ive/orbit-display`.

**Current version:** v0.1.1
**GitHub:** https://github.com/exce55ive/orbit-display
**Landing page:** orbit.exce55ive.xyz

---

## Architecture

```
orbit/
├── index.html        — Main dashboard (panel grid)
├── settings.html     — Settings page
├── setup.html        — First-run onboarding wizard
├── picker.html       — Panel picker / gallery
├── about.html        — About page
├── config.json       — User panel config (backed up/restored)
├── config-schema.json — Config validation schema
├── package.json      — Electron app manifest
└── (main process)    — Electron main, IPC handlers, auto-updater
```

**Stack:** Electron 35 + vanilla HTML/JS/CSS (no framework, no build step). IPC bridge via preload.js (contextIsolation: true, sandbox: true). All outbound HTTP proxied through main process.
**Build:** electron-builder, CI via GitHub Actions (tag-triggered)
**Platforms:** Windows x64 + ARM64, macOS ARM64 + x64, Linux AppImage + deb

---

## Current State (What's Live)

### Panels (v0.1.0)
- Plex (now playing, library stats)
- Sonarr / Radarr (upcoming, queue, calendar)
- Home Assistant (entity picker, state display)
- Proxmox / Docker / Pi-hole / TrueNAS / Unraid
- Immich (photo frame — rotating images, 10s cycle, crossfade)
- Speedtest, Calendar
- Network Monitor (HEAD pings to custom services)
- Custom Iframe panel
- ServicesPanel (replaced Uptime Kuma — UK has no REST API)

### Features
- Drag-and-drop panel reorder
- Panel collapse/visibility toggle
- Multi-layout profiles
- Config backup/restore
- Add Panel gallery with Playwright screenshots
- Ctrl+K spotlight search
- Demo mode
- Error boundaries + onboarding wizard
- Auto-updater with persistent state + retry logic

---

## Key Decisions & Patterns

- **ARM64 auto-updater:** electron-updater needs `latest-arm64.yml` — without it, silently serves x64 to all ARM64 users. CI generates it automatically now.
- **CI stale asset prevention:** Two layers required: (1) `rm -rf dist && mkdir dist` before each platform build, (2) pre-upload step deletes wrong-version assets from release before attaching new ones.
- **Uptime Kuma:** v1 has NO REST API. All data is Socket.IO only. ServicesPanel replaces it with direct HEAD pings.
- **Immich panel auth:** Uses `x-api-key` header (not `Authorization: Bearer`). Thumbnails fetched via IPC `fetch-image` (data URL).
- **No framework:** Intentionally vanilla JS. Keeps bundle small and avoids framework churn.
- **Hooks rule (if we ever add React):** All hooks before any conditional return.

---

## Known Issues & Risks

- **Auto-updater edge cases:** Recovery from interrupted downloads needs monitoring
- **No Linux ARM64 build** — not in CI matrix yet
- **Panel config migration:** No schema versioning for config.json between versions
- **Docker test-integration bug:** handler references `opts` instead of destructured params
- **Monolithic index.html:** 5,093 lines — will need splitting if more panels added

---

## What's Blocked

_Nothing currently blocked._

---

## Recent Work (Last 7 Days)

- **Mar 24:** Massive sprint v0.0.11 → v0.0.14 in one day
  - v0.0.11: Error boundaries, onboarding, panel visibility, config validation, Playwright tests
  - v0.0.12: Drag-and-drop, panel collapse, multi-layout, toasts, Proxmox/Docker/Pi-hole/TrueNAS
  - v0.0.13: Demo mode, Network Monitor, Unraid, landing page overhaul
  - v0.0.14: Immich panel, Speedtest, Calendar, Ctrl+K spotlight search
  - ARM64 auto-updater fix, CI hardened (stale asset deletion, clean dist/)
- **Mar 18:** v0.0.10 — weather panel fix, ARM64 builds, DevTools toggle
- **Mar 15:** ServicesPanel, HA entity picker, custom services monitor, Xeneon Edge updates

---

## Deployment

- **Source:** `/home/robby/orbit/`
- **Landing page live file:** `/share/CACHEDEV1_DATA/Container/appdata/liftarr/site/orbit-exce55ive/index.html` on NAS
- **Deploy landing:** `cat index.html | ssh admin@100.101.30.98 "cat > /share/CACHEDEV1_DATA/Container/appdata/liftarr/site/orbit-exce55ive/index.html"` then purge Cloudflare
- **GitHub releases:** Published as actor `exce55ive`, auto-updater checks `latest.yml` / `latest-arm64.yml`
- **Release checklist:** Implement → Probe test → Upload → Format release notes → Verify auto-updater

---


_Auto-synced 2026-04-12 by project_memory_sync.py_

**Git (8 commits, last 7d):**
- `e3df651 release: v0.1.3`
- `dbe19bc feat: add polling scheduler, credential encryption, validation, and logging`
- `5885ac6 docs: add post-release checklist — verify CI assets + update orbit.exce55ive.xyz landing page`
- `ac81131 fix: remove parallel delete-stale steps from CI — race condition nukes sibling job assets`
- `6033b4a release: v0.1.2`
- `c567887 perf: reduce CPU usage — stagger polls, memo panels, throttle mouse, slower sysinfo`
- `2ea3784 fix: restore NZBGet test-integration handler — client-facing app supports both downloaders`
- `7499d44 fix: Docker test-integration crash, SignalR leak, Spotify OAuth timer leak, NZBGet dead code, sabnzbd default`

**Daily log mentions (4):**
- 2026-04-11: mentioned in daily log
- 2026-04-11: mentioned in 2026-04-11-0525.md
- 2026-04-07: mentioned in daily log
- 2026-04-06: mentioned in 2026-04-06-chooser-deploy.md
---

## Next Priorities

1. Config schema versioning / migration between versions
2. Linux ARM64 build in CI
3. More panels as needed (Robby drives feature requests)

---

## Agent Notes

- **Forge** is primary coder
- Use `mcporter call jcodemunch.search_symbols` with repo `local/orbit-2fd01b54` for symbol lookup
- Build: `npm run build` (uses electron-builder)
- Test: Playwright (`npx playwright test`)
- Releases go to GitHub — always include CHANGELOG.md content in release notes
