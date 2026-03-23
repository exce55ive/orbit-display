# Changelog

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
