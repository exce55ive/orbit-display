# Changelog

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
