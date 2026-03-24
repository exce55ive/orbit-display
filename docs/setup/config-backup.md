# Config Backup & Restore

Export your full Orbit configuration as a JSON file and import it anywhere. Useful for migrating to a new machine, saving a known-good setup before experimenting, or sharing panel layouts.

## What gets saved

Everything in `orbit-config.json` — panel layout, page order, integration credentials, theme, and all settings. One file, complete state.

## How to use

1. Open **Settings → System**.
2. Click **Save Config Backup** — pick a location, and Orbit writes the JSON file there.
3. To restore, click **Load Config Backup** — select a previously saved file, and Orbit replaces the current config with it.

Orbit restarts automatically after a restore to apply the new config.

## Use cases

- **New machine** — set up Orbit once, export the config, import it on the second machine. Done.
- **Before experimenting** — save a backup, break things freely, restore if needed.
- **Sharing layouts** — send someone your config file so they can replicate your dashboard setup.

## Security note

Your config file contains service URLs and API keys. Treat backups like you'd treat a password file — don't commit them to public repos or drop them in shared folders.
