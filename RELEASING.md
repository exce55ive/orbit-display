# Releasing Orbit

## Standard release (bumps version)
```
make release VERSION=0.0.11
```
This bumps `package.json`, commits, tags the version, creates the GitHub release with formatted notes, and pushes. CI builds all platform installers and attaches them to the release with `latest.yml` for auto-update.

## Hotfix (no version bump — retag current HEAD)
```
make hotfix VERSION=0.0.11-1
```
Tags the current HEAD without touching `package.json`. Useful for CI/workflow fixes or shipping a corrected build under the same version.

## Local build only
```
make build
```

## CI behaviour
- Tags matching `v*` trigger `.github/workflows/build.yml`
- All platform installers + `latest.yml` are auto-attached to the GitHub Release
- `latest.yml` powers the in-app auto-updater (`electron-updater`)

## Release Notes Format (Standard)

Every release uses this exact structure — enforced automatically by the Makefile:

```
## What's New

- **Add:** Feature description
- **Fix:** Fix description

## Downloads

| Platform | File |
|---|---|
| Windows x64 | `OrbitSetup-X.Y.Z.exe` |
| Windows ARM64 (Snapdragon) | `OrbitSetup-X.Y.Z-arm64.exe` |
| macOS ARM64 | `OrbitSetup-X.Y.Z-arm64.dmg` |
| Linux AppImage | `OrbitSetup-X.Y.Z.AppImage` |
| Linux .deb | `OrbitSetup-X.Y.Z.deb` |
```

The Makefile pulls the `## What's New` content directly from `CHANGELOG.md` for the matching version. **Keep CHANGELOG.md up to date before running `make release`.**

Bullet prefix conventions:
- `**Add:**` — new feature or panel
- `**Fix:**` — bug fix
- `**Change:**` — behaviour change to existing feature
- `**Remove:**` — removed feature

## Checklist before releasing
- [ ] All changes committed and pushed to `main`
- [ ] `package.json` version matches the tag you're about to create
- [ ] `CHANGELOG.md` has an entry for this version (Makefile pulls from it)
- [ ] CI is green on `main`
