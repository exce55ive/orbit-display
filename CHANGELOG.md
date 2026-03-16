# Changelog

## v0.0.9
- **Fix:** Display Switcher now correctly highlights the saved display when the System tab opens
- **Fix:** Makefile `hotfix` target always bumps version (prevents semver pre-release trap)
- **Add:** `Makefile` — `make release VERSION=x.y.z` / `make hotfix VERSION=x.y.z` for one-command releases
- **Add:** `RELEASING.md` — release process documentation

## v0.0.8
- **Add:** System tab in Settings — Display Switcher + Reset Settings (3-step confirm)
- **Fix:** CI workflow — use `--publish never` + `softprops/action-gh-release` (removes `--publish always` conflict)

## v0.0.7
- **Fix:** Default panels no longer forced on new installs (Tautulli/HA only appear if configured)
- **Fix:** AMD GPU LHM fallback for Windows WMI limitation
- **Docs:** Updated system-monitor.md and getting-started.md
