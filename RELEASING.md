# Releasing Orbit

## Standard release (bumps version)
```
make release VERSION=0.0.9
```
This bumps `package.json`, commits, tags `v0.0.9`, and pushes. CI builds the NSIS installer and publishes it to GitHub Releases with `latest.yml` for auto-update.

## Hotfix (no version bump — retag current HEAD)
```
make hotfix VERSION=0.0.8-1
```
Tags the current HEAD without touching `package.json`. Useful for CI/workflow fixes or shipping a corrected build under the same version.

## Local build only
```
make build
```

## CI behaviour
- Tags matching `v*` trigger `.github/workflows/build.yml`
- Windows NSIS installer + `latest.yml` are auto-attached to the GitHub Release
- `latest.yml` powers the in-app auto-updater (`electron-updater`)

## Checklist before releasing
- [ ] All changes committed and pushed to `main`
- [ ] `package.json` version matches the tag you're about to create
- [ ] CI is green on `main`
