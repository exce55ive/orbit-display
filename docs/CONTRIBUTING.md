# Contributing to Orbit

Thanks for contributing. This guide covers running Orbit locally, adding a panel, building a release, and submitting a pull request.

---

## Prerequisites

- **Node.js** LTS
- **npm**
- **Windows** (for building the portable EXE — electron-builder targets Windows only)

For development you can run on any platform Electron supports. Building the release artifact requires Windows (or a configured cross-compilation environment).

---

## Run locally

```bash
# 1. Install dependencies
npm install

# 2. Start the app
npm start
```

This launches Electron directly. **There is no live-reload** — after editing a file, quit and restart with `npm start` to see changes.

Use `electron-log` output (visible in the console and in `%APPDATA%\orbit\logs\`) for debugging main-process behaviour.

---

## Project layout

```
orbit/
├── main.js           # Electron main process — IPC handlers, config, HTTP proxy
├── preload.js        # contextBridge — exposes window.orbit.* to renderers
├── index.html        # Main dashboard page
├── setup.html        # First-run setup wizard (4-step)
├── settings.html     # Settings overlay (frameless window)
├── about.html        # About dialog (frameless, 420×360)
├── package.json
├── docs/
│   ├── ARCHITECTURE.md
│   └── CONTRIBUTING.md  ← you are here
└── dist-new/         # Build output (gitignored)
```

---

## How to add a panel

### 1. Create the panel file(s)

Panels live as HTML/JS components. Follow the existing panel patterns. Use React 18 from CDN with `htm`/`h()` — no JSX compilation needed.

Example structure:
```
panels/
  my-panel/
    index.js     # panel component logic
```

Or inline the panel directly in `index.html` if it's small.

### 2. Use `window.orbit` for all IO

**Do not use `fetch` directly for integration calls.** Use the orbit API instead — the main process handles CORS and credentials:

```js
// HTTP GET via main-process proxy
const data = await window.orbit.apiGet('http://sonarr.local:8989/api/v3/series', {
  'X-Api-Key': config.sonarr.apiKey
});

// HTTP POST
await window.orbit.apiPost(url, body, headers);

// Load/save config
const config = await window.orbit.loadConfig();
await window.orbit.saveConfig({ ...config, myPanel: { enabled: true } });
```

### 3. Register the panel

Add your panel to the panels registry in the dashboard. Panels are referenced by ID in `orbit-config.json` layouts. At minimum your panel needs:
- A unique string ID
- A display name
- A render entry point (the HTML/JS component)

Look at how existing panels register themselves and follow the same pattern.

### 4. Handle missing data gracefully

Panels can be on a page that's visible while the integration is unavailable. Your panel should:
- Show a sensible placeholder or error state — not a blank box or a thrown exception.
- Not block other panels from rendering.
- Respect the user's configured polling interval.

### 5. Listen for live events (optional)

For Sonarr and Radarr, the main process maintains a SignalR connection and re-emits events. Subscribe in your panel:

```js
const unsub = window.orbit.onSonarrEvent((event) => {
  // handle live episode/queue updates
});
// clean up when panel unmounts
unsub();
```

### 6. Update docs

If your panel introduces a new integration or changes the IPC surface, update `docs/ARCHITECTURE.md`.

---

## Adding a theme

Themes are CSS custom property sets. To add one:

1. Define the variable overrides in the theme CSS block.
2. Add the theme name and accent colour to the theme picker list.
3. Store the theme key in `orbit-config.json` under a `theme` field.

See `docs/ARCHITECTURE.md → Theme system` for the existing theme table.

---

## Build a release

```bash
# Portable EXE only (recommended for distribution)
npx electron-builder --win portable --config.directories.output=dist-new
```

Output: `dist-new/Orbit-<version>-portable.exe`

The `package.json` also defines:
```bash
npm run build:portable   # same as above but output goes to dist/
npm run build:win        # NSIS installer + ZIP
```

Build requires Windows. Do not commit the `dist/` or `dist-new/` directories.

---

## Submitting a PR

1. Fork the repo and create a branch:
   ```bash
   git checkout -b feature/my-panel-name
   ```

2. Make focused commits with clear messages:
   ```
   feat: add MyPanel with live polling
   fix: handle empty Sonarr queue gracefully
   docs: document MyPanel config options
   ```
   Prefix conventions: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`

3. Open a PR to `main` and include:
   - What the change does and why
   - Screenshots if there are UI changes
   - How to test it locally

### PR checklist

- [ ] `npm start` opens the app without errors
- [ ] New panel renders correctly and degrades gracefully when its integration is offline
- [ ] No raw `fetch()` calls for integration requests — uses `window.orbit.apiGet` / `apiPost`
- [ ] No Node modules `require()`'d in renderer code
- [ ] `docs/ARCHITECTURE.md` updated if IPC surface or architecture changed
- [ ] No credentials or config files committed

---

## Questions

Open an issue or start a discussion on the PR. For quick questions, ping the maintainer (@exce55ive).
