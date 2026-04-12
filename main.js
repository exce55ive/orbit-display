const { app, BrowserWindow, screen, ipcMain, shell, Menu, globalShortcut, Notification, dialog, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

// ─── AUTO-UPDATER CONFIG ──────────────────────────────────────────────────────
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = false;

autoUpdater.on('checking-for-update', () => log.info('Checking for update...'));

autoUpdater.on('error', (err) => {
  log.warn('AutoUpdater error:', err && err.message ? err.message : err);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-error', err && err.message ? err.message : String(err));
  }
});

const isDev = !app.isPackaged;

const PENDING_UPDATE_PATH = path.join(app.getPath('userData'), 'pending-update.json');

function loadPendingUpdateMarker() {
  try {
    if (fs.existsSync(PENDING_UPDATE_PATH)) {
      const data = JSON.parse(fs.readFileSync(PENDING_UPDATE_PATH, 'utf-8'));
      if (data && data.downloaded) return data;
    }
  } catch (e) { log.warn('Failed to read pending-update.json:', e.message); }
  return null;
}

function savePendingUpdateMarker(version) {
  try { fs.writeFileSync(PENDING_UPDATE_PATH, JSON.stringify({ version, downloaded: true })); }
  catch (e) { log.warn('Failed to write pending-update.json:', e.message); }
}

function deletePendingUpdateMarker() {
  try { if (fs.existsSync(PENDING_UPDATE_PATH)) fs.unlinkSync(PENDING_UPDATE_PATH); }
  catch (e) { log.warn('Failed to delete pending-update.json:', e.message); }
}

// Restore persisted state from prior session
const savedMarker = loadPendingUpdateMarker();
let pendingUpdate = savedMarker ? { version: savedMarker.version, releaseNotes: '' } : null;
let updateDownloaded = savedMarker ? true : false;

autoUpdater.on('update-available', (info) => {
  log.info('Update available:', info.version);
  pendingUpdate = { version: info.version, releaseNotes: info.releaseNotes || '' };
  updateDownloaded = false;
  if (mainWindow) {
    mainWindow.webContents.send('update-available', pendingUpdate);
  }
});

autoUpdater.on('download-progress', (progress) => {
  if (mainWindow) {
    mainWindow.webContents.send('update-progress', Math.round(progress.percent));
  }
});

autoUpdater.on('update-downloaded', (info) => {
  log.info('Update downloaded:', info.version);
  updateDownloaded = true;
  savePendingUpdateMarker(info.version);
  if (mainWindow) {
    mainWindow.webContents.send('update-downloaded');
  }
});



// ─── ORBIT CONFIG ─────────────────────────────────────────────────────────────
const ORBIT_CONFIG_NAME = 'orbit-config.json';

function getOrbitConfigPath() {
  return path.join(app.getPath('userData'), ORBIT_CONFIG_NAME);
}

function loadOrbitConfig() {
  const p = getOrbitConfigPath();
  if (!fs.existsSync(p)) return null;
  try {
    const cfg = JSON.parse(fs.readFileSync(p, 'utf-8'));
    // One-time cleanup: remove stale panel visibility=false entries (hide feature removed)
    if (cfg.panels && typeof cfg.panels === 'object') {
      let dirty = false;
      for (const key of Object.keys(cfg.panels)) {
        if (cfg.panels[key] === false) { delete cfg.panels[key]; dirty = true; }
      }
      if (dirty) {
        try { fs.writeFileSync(p, JSON.stringify(cfg, null, 2), 'utf-8'); log.info('Cleaned up stale panel visibility entries'); } catch (e) { log.warn('Failed to clean panel visibility:', e.message); }
      }
    }
    const validated = validateAndFillDefaults(cfg);
    return validated ? decryptConfigSecrets(validated) : null;
  } catch (e) {
    log.warn('Failed to parse orbit-config.json:', e.message);
    return null;
  }
}

function loadConfigSchema() {
  try {
    const schemaPath = path.join(__dirname, 'config-schema.json');
    return JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
  } catch { return null; }
}

function validateAndFillDefaults(cfg) {
  if (!cfg || typeof cfg !== 'object') {
    log.warn('Config is not a valid object, falling back to defaults');
    return null;
  }
  const schema = loadConfigSchema();
  if (!schema) return cfg; // schema missing — skip validation

  // Fill required top-level fields with defaults
  if (schema.requiredFields) {
    for (const [key, defaultVal] of Object.entries(schema.requiredFields)) {
      if (cfg[key] === undefined || cfg[key] === null) {
        log.info(`Config missing "${key}", filling with default`);
        cfg[key] = JSON.parse(JSON.stringify(defaultVal));
      }
    }
  }

  // Ensure integrations sub-keys exist with defaults
  if (schema.integrationDefaults && cfg.integrations) {
    for (const [key, defaults] of Object.entries(schema.integrationDefaults)) {
      if (!cfg.integrations[key]) {
        cfg.integrations[key] = JSON.parse(JSON.stringify(defaults));
      } else {
        // Fill missing fields within each integration
        for (const [field, val] of Object.entries(defaults)) {
          if (cfg.integrations[key][field] === undefined) {
            cfg.integrations[key][field] = val;
          }
        }
      }
    }
  }

  // Ensure prefs has defaults
  if (!cfg.prefs) cfg.prefs = { tempUnit: 'C', timeFormat: '24h' };
  if (!cfg.prefs.tempUnit) cfg.prefs.tempUnit = 'C';
  if (!cfg.prefs.timeFormat) cfg.prefs.timeFormat = '24h';

  // Ensure panels key exists (for panel visibility feature) with default true
  if (!cfg.panels || typeof cfg.panels !== 'object') cfg.panels = {};
  // Panels that default to hidden (opt-in)
  if (cfg.panels.proxmox === undefined) cfg.panels.proxmox = false;
  if (cfg.panels.docker === undefined) cfg.panels.docker = false;
  if (cfg.panels.pihole === undefined) cfg.panels.pihole = false;
  if (cfg.panels.truenas === undefined) cfg.panels.truenas = false;
  if (cfg.panels.network === undefined) cfg.panels.network = false;
  if (cfg.panels.unraid === undefined) cfg.panels.unraid = false;
  if (cfg.panels.immich === undefined) cfg.panels.immich = false;
  if (cfg.panels.speedtest === undefined) cfg.panels.speedtest = false;
  if (cfg.panels.calendar === undefined) cfg.panels.calendar = false;
  if (cfg.panels.sabnzbd === undefined) cfg.panels.sabnzbd = false;

  // Log warning for unknown top-level keys
  const knownKeys = new Set(['theme','pages','integrations','prefs','customServices','signalrgbFavorites','links','panels','firstRunComplete','panelOrder','panelCollapsed','layouts','currentLayout','notifications','demoMode']);
  for (const key of Object.keys(cfg)) {
    if (!knownKeys.has(key)) log.warn(`Config has unknown key: "${key}" — ignoring`);
  }

  return cfg;
}

function migrateOrbitConfig(cfg) {
  if (!cfg) return cfg;
  // Migrate SignalRGB port 16034 → 16038 (API changed in SignalRGB 2.x)
  if (cfg.integrations?.signalrgb?.url?.includes('16034')) {
    cfg.integrations.signalrgb.url = cfg.integrations.signalrgb.url.replace('16034', '16038');
    saveOrbitConfig(cfg);
  }
  return cfg;
}

// ─── CREDENTIAL ENCRYPTION (Electron safeStorage) ──────────────────────────
// Sensitive fields are encrypted at rest using the OS keychain (DPAPI on Windows,
// Keychain on macOS, libsecret on Linux). Config stores encrypted values as
// "encrypted:base64..." strings. Decrypted transparently on load.
const SENSITIVE_FIELDS = {
  'integrations.tautulli.apiKey': true,
  'integrations.sonarr.apiKey': true,
  'integrations.radarr.apiKey': true,
  'integrations.overseerr.apiKey': true,
  'integrations.nzbget.password': true,
  'integrations.sabnzbd.apiKey': true,
  'integrations.homeassistant.token': true,
  'integrations.spotify.clientSecret': true,
  'integrations.spotify.accessToken': true,
  'integrations.spotify.refreshToken': true,
  'integrations.jellyfin.apiKey': true,
  'integrations.proxmox.tokenSecret': true,
  'integrations.pihole.apiKey': true,
  'integrations.truenas.apiKey': true,
  'integrations.unraid.apiKey': true,
  'integrations.immich.apiKey': true,
  'integrations.uptimekuma.password': true,
};

function getNestedValue(obj, path) {
  return path.split('.').reduce((o, k) => o?.[k], obj);
}

function setNestedValue(obj, path, val) {
  const keys = path.split('.');
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!cur[keys[i]] || typeof cur[keys[i]] !== 'object') cur[keys[i]] = {};
    cur = cur[keys[i]];
  }
  cur[keys[keys.length - 1]] = val;
}

function encryptConfigSecrets(cfg) {
  if (!safeStorage.isEncryptionAvailable()) return cfg;
  const copy = JSON.parse(JSON.stringify(cfg));
  for (const field of Object.keys(SENSITIVE_FIELDS)) {
    const val = getNestedValue(copy, field);
    if (val && typeof val === 'string' && !val.startsWith('encrypted:')) {
      try {
        const encrypted = safeStorage.encryptString(val).toString('base64');
        setNestedValue(copy, field, 'encrypted:' + encrypted);
      } catch (e) { log.warn('Failed to encrypt field ' + field + ':', e.message); }
    }
  }
  return copy;
}

function decryptConfigSecrets(cfg) {
  if (!safeStorage.isEncryptionAvailable()) return cfg;
  for (const field of Object.keys(SENSITIVE_FIELDS)) {
    const val = getNestedValue(cfg, field);
    if (val && typeof val === 'string' && val.startsWith('encrypted:')) {
      try {
        const buf = Buffer.from(val.slice('encrypted:'.length), 'base64');
        const decrypted = safeStorage.decryptString(buf);
        setNestedValue(cfg, field, decrypted);
      } catch (e) { log.warn('Failed to decrypt field ' + field + ':', e.message); }
    }
  }
  return cfg;
}

function saveOrbitConfig(cfg) {
  const encrypted = encryptConfigSecrets(cfg);
  fs.writeFileSync(getOrbitConfigPath(), JSON.stringify(encrypted, null, 2));
}

// ─── LEGACY CONFIG (config.json — read-only fallback) ─────────────────────────
let legacyConfig = {};
try {
  const configPaths = [
    path.join(process.resourcesPath, 'config.json'),
    path.join(__dirname, 'config.json')
  ];
  for (const cp of configPaths) {
    if (fs.existsSync(cp)) { legacyConfig = JSON.parse(fs.readFileSync(cp, 'utf-8')); break; }
  }
} catch {}

// ─── SETTINGS (persists display selection) ───────────────────────────────────
const SETTINGS_PATH = path.join(app.getPath('userData'), 'settings.json');
function loadSettings() {
  try { return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8')); } catch { return {}; }
}
function saveSettings(s) {
  try { fs.writeFileSync(SETTINGS_PATH, JSON.stringify(s, null, 2)); } catch {}
}

// ─── FETCH HELPER ────────────────────────────────────────────────────────────
let fetchFn;
async function getFetch() {
  if (fetchFn) return fetchFn;
  if (typeof globalThis.fetch === 'function') { fetchFn = globalThis.fetch; return fetchFn; }
  const mod = await import('node-fetch');
  fetchFn = mod.default;
  return fetchFn;
}
async function safeFetch(url, options = {}) {
  const fetch = await getFetch();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeout || 8000);
  try {
    const fetchOpts = { ...options, signal: controller.signal };
    // Support rejectUnauthorized: false for self-signed certs (e.g. Proxmox)
    if (options.rejectUnauthorized === false && url.startsWith('https')) {
      const https = require('https');
      fetchOpts.agent = new https.Agent({ rejectUnauthorized: false });
    }
    delete fetchOpts.rejectUnauthorized;
    delete fetchOpts.timeout;
    const res = await fetch(url, fetchOpts);
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    if (!res.ok) {
      return { error: `HTTP ${res.status}`, status: res.status, data };
    }
    return data;
  } catch (e) { return { error: e.message }; }
  finally { clearTimeout(timer); }
}

// ─── URL ALLOWLIST (SSRF protection) ─────────────────────────────────────────
function isAllowedUrl(urlStr) {
  try {
    const u = new URL(urlStr);
    if (!['http:', 'https:'].includes(u.protocol)) return false;
    const host = u.hostname;
    // Block cloud metadata endpoints
    if (host === '169.254.169.254' || host === 'metadata.google.internal') return false;
    return true;
  } catch {
    return false;
  }
}

// ─── WINDOWS ─────────────────────────────────────────────────────────────────
let mainWindow, pickerWindow;

function getDisplayList() {
  const primary = screen.getPrimaryDisplay();
  return screen.getAllDisplays().map((d, i) => ({
    id: d.id,
    label: `Display ${i + 1}${d.id === primary.id ? ' (Primary)' : ''}`,
    resolution: `${d.bounds.width}×${d.bounds.height}`,
    x: d.bounds.x,
    y: d.bounds.y,
    isPrimary: d.id === primary.id
  }));
}

function launchMain(displayId) {
  const displays = screen.getAllDisplays();
  const primary = screen.getPrimaryDisplay();
  let target = displays.find(d => d.id === displayId);
  if (!target) target = displays.find(d => d.id !== primary.id && d.bounds.width === 2560);
  if (!target) target = displays.find(d => d.id !== primary.id);
  if (!target) target = primary;

  mainWindow = new BrowserWindow({
    x: target.bounds.x,
    y: target.bounds.y,
    width: target.bounds.width,
    height: target.bounds.height,
    fullscreen: true,
    frame: false,
    alwaysOnTop: false,
    skipTaskbar: false,
    backgroundColor: '#060a10',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  mainWindow.loadFile('index.html');
  mainWindow.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file://')) e.preventDefault(); });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.control && input.key.toLowerCase() === 'q') app.quit();
    if (input.control && input.key.toLowerCase() === 't') {
      mainWindow.setAlwaysOnTop(!mainWindow.isAlwaysOnTop());
    }
    if (input.control && input.key.toLowerCase() === 'd') showPicker();
  });

  mainWindow.webContents.on('did-finish-load', () => {
    if (updateDownloaded && pendingUpdate) {
      mainWindow.webContents.send('update-available', pendingUpdate);
      mainWindow.webContents.send('update-downloaded');
    } else if (pendingUpdate) {
      mainWindow.webContents.send('update-available', pendingUpdate);
    }
  });

  mainWindow.on('closed', () => {
    // Clean up SignalR WebSocket connections
    for (const conn of Object.values(_signalRConnections)) {
      if (conn) conn.close();
    }
    _signalRConnections = {};
    mainWindow = null;
  });
}

function showPicker() {
  if (pickerWindow) { pickerWindow.focus(); return; }
  const primary = screen.getPrimaryDisplay();
  pickerWindow = new BrowserWindow({
    width: 520, height: 520,
    x: primary.bounds.x + Math.round((primary.bounds.width - 520) / 2),
    y: primary.bounds.y + Math.round((primary.bounds.height - 400) / 2),
    resizable: false, frame: false, alwaysOnTop: true,
    backgroundColor: '#060a10',
    webPreferences: {
      nodeIntegration: false, contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  pickerWindow.loadFile('picker.html');
  pickerWindow.webContents.on('will-navigate', (e) => e.preventDefault());
  pickerWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  pickerWindow.on('closed', () => { pickerWindow = null; });
}

// ─── APP READY ───────────────────────────────────────────────────────────────
// ─── SINGLE INSTANCE + CUSTOM PROTOCOL: orbit:// ────────────────────────────
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) { app.quit(); }
app.setAsDefaultProtocolClient('orbit');

// Windows: deep link arrives as second-instance argv
let _spotifyAuthResolve = null;
app.on('second-instance', (_e, argv) => {
  const url = argv.find(a => a.startsWith('orbit://'));
  if (url && _spotifyAuthResolve) _spotifyAuthResolve(url);
});
// macOS: deep link arrives as open-url event
app.on('open-url', (_e, url) => {
  if (_spotifyAuthResolve) _spotifyAuthResolve(url);
});

app.whenReady().then(() => {
  const orbitCfg = migrateOrbitConfig(loadOrbitConfig());
  const hasConfig = orbitCfg && orbitCfg.pages && orbitCfg.pages.length > 0;

  if (!hasConfig) {
    const setupWin = new BrowserWindow({
      width: 860, height: 700, resizable: true, center: true,
      backgroundColor: '#0a0a0f',
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true, nodeIntegration: false,
        sandbox: true
      }
    });
    setupWin.loadFile('setup.html');
    setupWin.webContents.on('will-navigate', (e) => e.preventDefault());
    setupWin.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  } else {
    const settings = loadSettings();
    if (settings.displayId) {
      launchMain(settings.displayId);
    } else {
      showPicker();
    }
  }

  if (!isDev) {
    function scheduleUpdateCheck(delayMs) {
      setTimeout(async () => {
        try {
          await autoUpdater.checkForUpdates();
        } catch (e) {
          log.warn('Update check failed, retrying in 5min:', e.message || e);
          scheduleUpdateCheck(5 * 60 * 1000);
        }
      }, delayMs);
    }
    scheduleUpdateCheck(30000);
  }

  // ─── DEVTOOLS GLOBAL SHORTCUT ──────────────────────────────────────────────
  const isMac = process.platform === 'darwin';
  const devToolsAccelerator = isMac ? 'Cmd+Alt+I' : 'Ctrl+Shift+I';
  globalShortcut.register(devToolsAccelerator, () => {
    const w = BrowserWindow.getFocusedWindow();
    if (w) w.webContents.openDevTools({ mode: 'undocked' });
  });

  // ─── APPLICATION MENU (Help > Toggle DevTools) ─────────────────────────────
  const menuTemplate = [
    {
      label: 'Help',
      submenu: [
        {
          label: 'Toggle DevTools',
          accelerator: devToolsAccelerator,
          click: () => {
            const w = BrowserWindow.getFocusedWindow();
            if (w) w.webContents.openDevTools({ mode: 'undocked' });
          }
        }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));
});

app.on('window-all-closed', () => { app.quit(); });

app.on('will-quit', () => { globalShortcut.unregisterAll(); });

ipcMain.on('quit-app', () => { app.quit(); });

// ─── IPC: DISPLAY PICKER ────────────────────────────────────────────────────
ipcMain.handle('get-displays', () => getDisplayList());

ipcMain.handle('select-display', (_e, displayId) => {
  const settings = loadSettings();
  settings.displayId = displayId;
  saveSettings(settings);
  if (pickerWindow) { pickerWindow.close(); pickerWindow = null; }
  if (!mainWindow) launchMain(displayId);
  return { ok: true };
});

ipcMain.handle('show-picker', () => { showPicker(); return { ok: true }; });

// ─── IPC: ORBIT CONFIG ──────────────────────────────────────────────────────
ipcMain.handle('save-config', async (_e, config) => {
  saveOrbitConfig(config);
  // Notify main window to reload config
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('config-updated', config);
  }
  return { ok: true };
});

// open-settings removed — settings now live in setup.html

ipcMain.handle('load-config', async () => {
  return loadOrbitConfig();
});

// ─── IPC: CONFIG BACKUP / RESTORE ──────────────────────────────────────────
ipcMain.handle('save-config-backup', async () => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    defaultPath: 'orbit-config-backup.json',
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (canceled) return { canceled: true };
  const cfg = loadOrbitConfig();
  fs.writeFileSync(filePath, JSON.stringify(cfg, null, 2));
  return { ok: true };
});

ipcMain.handle('load-config-backup', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile']
  });
  if (canceled) return { canceled: true };
  const data = JSON.parse(fs.readFileSync(filePaths[0], 'utf8'));
  saveOrbitConfig(data);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('config-updated', data);
  }
  return { ok: true, config: data };
});

// ─── IPC: OPEN EXTERNAL URL ─────────────────────────────────────────────────
ipcMain.handle('notify-config-saved', () => { return { ok: true }; }); // no-op; main window receives config-updated via save-config

ipcMain.handle('app:get-version', () => app.getVersion());

ipcMain.handle('open-external', async (_e, url) => {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return { error: 'Invalid protocol' };
    await shell.openExternal(url);
    return { ok: true };
  } catch {
    return { error: 'Invalid URL' };
  }
});

// ─── IPC: SETUP ──────────────────────────────────────────────────────────────
// ─── IPC: SETTINGS WINDOW ────────────────────────────────────────────────────
let settingsWindow = null;
ipcMain.handle('open-settings-window', async () => {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return;
  }
  settingsWindow = new BrowserWindow({
    width: 1000, height: 700, minWidth: 800, minHeight: 560,
    resizable: true, center: true,
    backgroundColor: '#0a0a0f',
    alwaysOnTop: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false,
      sandbox: true
    }
  });
  settingsWindow.loadFile('settings.html');
  settingsWindow.webContents.on('will-navigate', (e) => e.preventDefault());
  settingsWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  settingsWindow.once('ready-to-show', () => { settingsWindow.show(); settingsWindow.focus(); });
  settingsWindow.on('closed', () => {
    settingsWindow = null;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('settings-window-closed');
    }
  });
});

ipcMain.handle('open-setup', async () => {
  // Close any existing setup windows first
  BrowserWindow.getAllWindows().forEach(w => { if (w !== mainWindow) w.close(); });
  const setupWin = new BrowserWindow({
    width: 860, height: 700, resizable: true, center: true,
    backgroundColor: '#0a0a0f',
    alwaysOnTop: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false,
      sandbox: true
    }
  });
  setupWin.loadFile('setup.html');
  setupWin.webContents.on('will-navigate', (e) => e.preventDefault());
  setupWin.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  setupWin.once('ready-to-show', () => { setupWin.show(); setupWin.focus(); });
});

ipcMain.handle('open-about', async () => {
  // Check for existing about window
  const existing = BrowserWindow.getAllWindows().find(w => w._isAboutWindow);
  if (existing) { existing.focus(); return; }
  const aboutWin = new BrowserWindow({
    width: 420, height: 360, resizable: false, center: true,
    frame: false, transparent: false,
    backgroundColor: '#060a10',
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload-about.js')
    }
  });
  aboutWin._isAboutWindow = true;
  aboutWin.loadFile('about.html');
  aboutWin.webContents.on('will-navigate', (e) => e.preventDefault());
  aboutWin.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  aboutWin.once('ready-to-show', () => { aboutWin.show(); aboutWin.focus(); });
});

ipcMain.on('about:close', (e) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  if (win) win.close();
});

ipcMain.handle('reset-config', async () => {
  try {
    // Wipe config and saved display preference
    const configPath = getOrbitConfigPath();
    if (fs.existsSync(configPath)) fs.unlinkSync(configPath);
    const settings = loadSettings();
    delete settings.displayId;
    saveSettings(settings);
    // Close main window, open fresh setup wizard
    if (mainWindow) { mainWindow.close(); mainWindow = null; }
    BrowserWindow.getAllWindows().forEach(w => { if (!w.isDestroyed()) w.close(); });
    const setupWin = new BrowserWindow({
      width: 860, height: 700, resizable: true, center: true,
      backgroundColor: '#0a0a0f',
      alwaysOnTop: false,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true, nodeIntegration: false,
        sandbox: true
      }
    });
    setupWin.loadFile('setup.html');
    setupWin.webContents.on('will-navigate', (e) => e.preventDefault());
    setupWin.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    setupWin.once('ready-to-show', () => { setupWin.show(); setupWin.focus(); });
    return { ok: true };
  } catch (e) { return { ok: false, error: e.message }; }
});

ipcMain.handle('setup-complete', async () => {
  const settings = loadSettings();
  if (mainWindow) {
    // Already have a main window — just reload it and close extras
    mainWindow.loadFile('index.html');
    BrowserWindow.getAllWindows().forEach(w => { if (w !== mainWindow) w.close(); });
  } else {
    // Close setup window before opening next screen
    BrowserWindow.getAllWindows().forEach(w => w.close());
    if (settings.displayId) {
      launchMain(settings.displayId);
    } else {
      showPicker();
    }
  }
});

// ─── IPC: SETTINGS PERSISTENCE ───────────────────────────────────────────────
ipcMain.handle('save-settings', (_e, s) => {
  try {
    const current = loadSettings();
    saveSettings({ ...current, ...s });
    return { ok: true };
  } catch (e) { return { ok: false, error: e.message }; }
});

ipcMain.handle('load-settings', () => {
  try { return loadSettings(); } catch { return {}; }
});

ipcMain.handle('get-config', () => legacyConfig);

// ─── IPC: HOME ASSISTANT ────────────────────────────────────────────────────
ipcMain.handle('ha-get-state', async (_e, entityId) => {
  if (!entityId || !/^[a-z_]+\.[a-z0-9_]+$/i.test(entityId)) {
    return { error: 'Invalid entity ID' };
  }
  const cfg = loadOrbitConfig();
  if (!cfg || !cfg.integrations || !cfg.integrations.homeassistant || !cfg.integrations.homeassistant.url) {
    return { error: 'Home Assistant not configured' };
  }
  const ha = cfg.integrations.homeassistant;
  return safeFetch(`${ha.url}/api/states/${entityId}`, {
    headers: { Authorization: `Bearer ${ha.token}`, 'Content-Type': 'application/json' }
  });
});

ipcMain.handle('ha-call-service', async (_e, { domain, service, data }) => {
  if (!domain || !/^[a-z_]+$/i.test(domain)) return { error: 'Invalid domain' };
  if (!service || !/^[a-z_]+$/i.test(service)) return { error: 'Invalid service' };
  const cfg = loadOrbitConfig();
  if (!cfg || !cfg.integrations || !cfg.integrations.homeassistant || !cfg.integrations.homeassistant.url) {
    return { error: 'Home Assistant not configured' };
  }
  const ha = cfg.integrations.homeassistant;
  return safeFetch(`${ha.url}/api/services/${domain}/${service}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ha.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
});

// ─── IPC: TAUTULLI ──────────────────────────────────────────────────────────
ipcMain.handle('fetch-tautulli', async () => {
  const cfg = loadOrbitConfig();
  if (!cfg || !cfg.integrations || !cfg.integrations.tautulli || !cfg.integrations.tautulli.url || !cfg.integrations.tautulli.apiKey) {
    return { error: 'Tautulli not configured' };
  }
  const t = cfg.integrations.tautulli;
  return safeFetch(`${t.url}/api/v2?apikey=${t.apiKey}&cmd=get_activity`);
});

// ─── IPC: GENERIC API PROXY ─────────────────────────────────────────────────
ipcMain.handle('api-get', async (_e, { url, headers, timeout, rejectUnauthorized }) => {
  if (!isAllowedUrl(url)) return { error: 'URL not allowed' };
  return safeFetch(url, { headers: headers || {}, timeout: timeout || 8000, rejectUnauthorized });
});

ipcMain.handle('api-post', async (_e, { url, body, headers, timeout }) => {
  if (!isAllowedUrl(url)) return { error: 'URL not allowed' };
  return safeFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(headers || {}) },
    body: typeof body === 'string' ? body : JSON.stringify(body),
    timeout: timeout || 8000
  });
});

ipcMain.handle('api-put', async (_e, { url, body, headers, timeout }) => {
  if (!isAllowedUrl(url)) return { error: 'URL not allowed' };
  return safeFetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...(headers || {}) },
    body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
    timeout: timeout || 8000
  });
});

// ─── IPC: SIGNALRGB (legacy direct) ─────────────────────────────────────────

// ─── IPC: TEST INTEGRATION ─────────────────────────────────────────────────────
ipcMain.handle('test-integration', async (_e, { type, url, apiKey, username, password, token, tokenId, tokenSecret, node, port, useTLS }) => {
  const fetch = await getFetch();
  const ok = (msg, detail='') => ({ ok: true, message: msg, detail });
  const fail = (msg) => ({ ok: false, message: msg });
  const headGet = async (u, headers={}) => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 5000);
    const r = await fetch(u, { headers, signal: controller.signal });
    return r;
  };
  try {
    if (type === 'signalrgb') {
      const base = (url || 'http://localhost:16038').replace(/\/$/, '');
      const r = await headGet(`${base}/api/v1/lighting`);
      const j = await r.json();
      if (j.status === 'ok') return ok(`Connected — Effect: ${j.data?.attributes?.name || 'unknown'}`);
      return fail(`Unexpected response: ${r.status}`);
    }
    if (type === 'tautulli') {
      if (!url || !apiKey) return fail('URL and API Key required');
      const r = await headGet(`${url.replace(/\/$/, '')}/api/v2?cmd=get_server_info&apikey=${apiKey}`);
      const j = await r.json(); if (j.response?.result === 'success') return ok(`Connected — ${j.response.data?.pms_name || 'Tautulli'}`);
      return fail(j.response?.message || 'Auth failed');
    }
    if (type === 'plex') {
      if (!url || !token) return fail('URL and Token required');
      const r = await headGet(`${url.replace(/\/$/, '')}/?X-Plex-Token=${token}`, { Accept: 'application/json' });
      if (r.ok) return ok(`Connected — Plex ${r.status}`); return fail(`HTTP ${r.status}`);
    }
    if (type === 'sonarr') {
      if (!url || !apiKey) return fail('URL and API Key required');
      const r = await headGet(`${url.replace(/\/$/, '')}/api/v3/system/status?apikey=${apiKey}`);
      const j = await r.json(); if (j.appName === 'Sonarr') return ok(`Connected — Sonarr v${j.version}`);
      return fail(r.status === 401 ? 'Auth failed — check API key' : `HTTP ${r.status}`);
    }
    if (type === 'radarr') {
      if (!url || !apiKey) return fail('URL and API Key required');
      const r = await headGet(`${url.replace(/\/$/, '')}/api/v3/system/status?apikey=${apiKey}`);
      const j = await r.json(); if (j.appName === 'Radarr') return ok(`Connected — Radarr v${j.version}`);
      return fail(r.status === 401 ? 'Auth failed — check API key' : `HTTP ${r.status}`);
    }
    if (type === 'overseerr') {
      if (!url || !apiKey) return fail('URL and API Key required');
      const r = await headGet(`${url.replace(/\/$/, '')}/api/v1/status`, { 'X-Api-Key': apiKey });
      const j = await r.json(); if (j.version) return ok(`Connected — Overseerr v${j.version}`);
      return fail(r.status === 403 ? 'Auth failed — check API key' : `HTTP ${r.status}`);
    }
    if (type === 'sabnzbd') {
      if (!url || !apiKey) return fail('URL and API Key required');
      const base = url.replace(/\/$/, '');
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 5000);
      const r = await fetch(`${base}/api?apikey=${encodeURIComponent(apiKey)}&output=json&mode=version`, { signal: controller.signal });
      const j = await r.json(); if (j.version) return ok(`Connected — SABnzbd ${j.version}`);
      return fail(j.error || 'Connection failed — check URL and API key');
    }
    if (type === 'nzbget') {
      if (!url) return fail('URL required');
      const base = url.replace(/\/jsonrpc$/, '').replace(/\/+$/, '');
      const auth = (username && password) ? Buffer.from(`${username}:${password}`).toString('base64') : null;
      const headers = auth ? { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 5000);
      const r = await fetch(`${base}/jsonrpc`, { method: 'POST', headers, body: JSON.stringify({ version:'1.1', method:'version', id:1 }), signal: controller.signal });
      const j = await r.json(); if (j.result) return ok(`Connected — NZBGet ${j.result}`);
      return fail(j.error?.message || 'Auth failed');
    }
    if (type === 'jellyfin') {
      if (!url || !apiKey) return fail('URL and API Key required');
      const r = await headGet(`${url.replace(/\/$/, '')}/System/Info`, { 'X-Emby-Token': apiKey });
      const j = await r.json(); if (j.ServerName) return ok(`Connected — ${j.ServerName} v${j.Version}`);
      return fail(r.status === 401 ? 'Auth failed — check API key' : `HTTP ${r.status}`);
    }
    if (type === 'homeassistant') {
      if (!url || !token) return fail('URL and Token required');
      const r = await headGet(`${url.replace(/\/$/, '')}/api/`, { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });
      const j = await r.json(); if (j.message === 'API running.') return ok('Connected — HA API running');
      return fail(r.status === 401 ? 'Auth failed — check token' : `HTTP ${r.status}`);
    }
    if (type === 'spotify') {
      const cfg = loadOrbitConfig();
      if (cfg?.integrations?.spotify?.accessToken) return ok('Spotify linked — access token present');
      return fail('Not linked — complete OAuth in Orbit app');
    }
    if (type === 'weather') {
      if (!url) return fail('City name required');
      const r = await headGet(`https://wttr.in/${encodeURIComponent(url)}?format=j1`);
      if (r.ok) return ok(`Weather available for "${url}"`);
      return fail(`Location not found`);
    }
    if (type === 'proxmox') {
      if (!url || !tokenId || !tokenSecret) return fail('URL, Token ID and Token Secret required');
      const base = url.replace(/\/+$/, '');
      const n = node || 'pve';
      const r = await safeFetch(`${base}/api2/json/nodes/${n}/status`, {
        headers: { Authorization: 'PVEAPIToken=' + tokenId + '=' + tokenSecret },
        rejectUnauthorized: false,
        timeout: 5000
      });
      if (r.error) return fail(r.error);
      if (r.data?.uptime) return ok('Connected — node ' + n + ', uptime ' + Math.floor(r.data.uptime/3600) + 'h');
      return ok('Connected — Proxmox API responding');
    }
    if (type === 'docker') {
      const host = url || 'localhost';
      const dockerPort = port || 2375;
      const proto = useTLS ? 'https' : 'http';
      const r = await safeFetch(`${proto}://${host}:${dockerPort}/containers/json?all=true&limit=1`, { timeout: 5000 });
      if (r.error) return fail(r.error);
      return ok('Connected — Docker Engine API responding');
    }
    if (type === 'pihole') {
      if (!url) return fail('URL required');
      const base = url.replace(/\/+$/, '');
      // Try v6 first
      try {
        const v6 = await safeFetch(`${base}/api/stats/summary`, {
          headers: { 'X-Pi-Hole-Authenticate': apiKey || '' },
          timeout: 5000
        });
        if (v6 && !v6.error && (v6.queries !== undefined || v6.dns_queries_today !== undefined)) {
          return ok('Connected — Pi-hole v6 API');
        }
      } catch {}
      // Fall back to v5
      const v5 = await safeFetch(`${base}/admin/api.php?summaryRaw&auth=${apiKey || ''}`, { timeout: 5000 });
      if (v5.error) return fail(v5.error);
      if (v5.dns_queries_today !== undefined) return ok('Connected — Pi-hole v5 API');
      return fail('Unexpected response — check URL and API key');
    }
    if (type === 'truenas') {
      if (!url) return fail('URL required');
      if (!apiKey) return fail('API Key required');
      const base = url.replace(/\/+$/, '');
      const r = await safeFetch(`${base}/api/v2.0/system/info`, {
        headers: { Authorization: 'Bearer ' + apiKey },
        timeout: 8000
      });
      if (r.error) return fail(r.error);
      const info = r.data || r;
      if (info.hostname || info.version) return ok('Connected — ' + (info.hostname || 'TrueNAS') + ' ' + (info.version || ''));
      return ok('Connected — TrueNAS API responding');
    }
    if (type === 'unraid') {
      if (!url) return fail('URL required');
      if (!apiKey) return fail('API Key required');
      const base = url.replace(/\/+$/, '');
      const r = await safeFetch(`${base}/api/v1/array`, {
        headers: { Authorization: 'Bearer ' + apiKey },
        timeout: 8000
      });
      if (r.error) return fail(r.error);
      return ok('Connected — Unraid API responding');
    }
    if (type === 'services') return ok('Services panel auto-detects configured URLs — no test needed');
    return fail('Unknown integration type');
  } catch (e) {
    if (e.name === 'AbortError') return fail('Timeout — is the service running?');
    return fail(e.message);
  }
});

// ─── IPC: SIGNALRGB PORT AUTO-DETECT ──────────────────────────────────────────
ipcMain.handle('signalrgb-detect-port', async () => {
  const fetch = await getFetch();
  const ports = [16038, 16034, 16035, 16036, 16037, 16039, 16040];
  for (const port of ports) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 1500);
      const res = await fetch(`http://localhost:${port}/api/v1/lighting`, { signal: controller.signal });
      clearTimeout(timer);
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        if (data.status === 'ok' || data.data) return { port, url: `http://localhost:${port}`, data };
      } catch {}
    } catch {}
  }
  return { error: 'SignalRGB not found on ports: ' + ports.join(', ') };
});

ipcMain.handle('fetch-signalrgb', async () => {
  const cfg = migrateOrbitConfig(loadOrbitConfig());
  const base = cfg?.integrations?.signalrgb?.url || 'http://localhost:16038';
  const [state, effectsList] = await Promise.all([
    safeFetch(`${base}/api/v1/lighting`),
    safeFetch(`${base}/api/v1/lighting/effects`).catch(() => ({ data: [] }))
  ]);
  // Merge effects list into state response
  // SignalRGB effects endpoint: data.items[{id:'<hash>', attributes:{name:'Matrix'}, type:'installed_effect'}]
  // The id is a hash used for activation; attributes.name is the display name
  if (state && state.data) {
    const rawEffects = effectsList?.data?.items || (Array.isArray(effectsList?.data) ? effectsList.data : []);
    const effects = Array.isArray(rawEffects)
      ? rawEffects.map(e => {
          if (typeof e === 'string') return { id: e, name: e.replace(/\.html$/i, '') };
          const name = (e.attributes?.name || e.id || '').replace(/\.html$/i, '');
          const id = e.id || name;
          return { id, name };
        }).filter(e => e.name)
      : [];
    if (effects.length > 0) state.data.effects = effects;
  }
  return state;
});

ipcMain.handle('activate-effect', async (_e, effectId) => {
  const fetch = await getFetch();
  const cfg2 = loadOrbitConfig();
  try {
    const base = cfg2?.integrations?.signalrgb?.url || 'http://localhost:16038';
    const url = `${base}/api/v1/lighting/effects/${effectId}/apply`;
    const res = await fetch(url, { method: 'POST' });
    const text = await res.text();
    try { return JSON.parse(text); } catch { return text; }
  } catch (e) { return { error: e.message }; }
});

ipcMain.handle('signalrgb-set-brightness', async (_e, brightness) => {
  const fetch = await getFetch();
  const cfg2 = loadOrbitConfig();
  try {
    const base = cfg2?.integrations?.signalrgb?.url || 'http://localhost:16038';
    const res = await fetch(`${base}/api/v1/lighting/global_brightness`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ global_brightness: Math.round(brightness) })
    });
    const text = await res.text();
    try { return JSON.parse(text); } catch { return text; }
  } catch (e) { return { error: e.message }; }
});

ipcMain.handle('signalrgb-set-enabled', async (_e, enabled) => {
  const fetch = await getFetch();
  const cfg2 = loadOrbitConfig();
  try {
    const base = cfg2?.integrations?.signalrgb?.url || 'http://localhost:16038';
    const res = await fetch(`${base}/api/v1/lighting/enabled`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled })
    });
    const text = await res.text();
    try { return JSON.parse(text); } catch { return text; }
  } catch (e) { return { error: e.message }; }
});

// ─── IPC: SYSTEM INFO ───────────────────────────────────────────────────────
// LibreHardwareMonitor fallback for AMD GPU — WMI does not expose AMD GPU usage/temp on Windows.
// Requires LHM running locally with its web server enabled (default: http://localhost:8085).
async function tryLHMGpu() {
  try {
    const res = await fetch('http://localhost:8085/data.json', { signal: AbortSignal.timeout(800) });
    const data = await res.json();
    const out = { usage: null, temp: null };
    function walk(node) {
      if (!node) return;
      const name = (node.Text || '').toLowerCase();
      const isGpu = name.includes('gpu') || name.includes('radeon') || name.includes('rx ');
      for (const child of node.Children || []) {
        const cn = (child.Text || '').toLowerCase();
        if (isGpu && cn === 'load') {
          for (const s of child.Children || []) {
            if ((s.Text || '').toLowerCase().includes('gpu core') && s.Value && out.usage === null)
              out.usage = parseFloat(s.Value);
          }
        }
        if (isGpu && cn === 'temperatures') {
          for (const s of child.Children || []) {
            if (s.Value && out.temp === null)
              out.temp = parseFloat(s.Value);
          }
        }
        walk(child);
      }
    }
    walk(data);
    return out;
  } catch { return { usage: null, temp: null }; }
}

ipcMain.handle('get-sysinfo', async (_e, params) => {
  try {
    const { cpuSensorIndex = 0, gpuControllerIndex = 0, showDisk = false } = params || {};
    const si = require('systeminformation');
    const [cpu, cpuLoad, cpuTemp, graphics, mem, netStats, fsSize] = await Promise.all([
      si.cpu(), si.currentLoad(),
      si.cpuTemperature().catch(() => ({ main: null, cores: [], chipset: null, socket: null })),
      si.graphics(), si.mem(), si.networkStats(), si.fsSize()
    ]);
    const cpuSensors = [];
    if (cpuTemp.main != null) cpuSensors.push({ index: 0, name: 'Main', value: cpuTemp.main });
    if (Array.isArray(cpuTemp.cores)) {
      cpuTemp.cores.forEach((v, i) => { if (v != null) cpuSensors.push({ index: cpuSensors.length, name: `Core ${i}`, value: v }); });
    }
    if (cpuTemp.chipset != null) cpuSensors.push({ index: cpuSensors.length, name: 'Chipset', value: cpuTemp.chipset });
    if (cpuSensors.length === 0) cpuSensors.push({ index: 0, name: 'N/A', value: null });
    const chosenCpuTemp = cpuSensors[cpuSensorIndex] ?? cpuSensors[0];
    const controllers = graphics.controllers || [];
    const gpuList = controllers.map((c, i) => ({ index: i, model: c.model || `GPU ${i}` }));
    const gpu = controllers[gpuControllerIndex] || controllers[0] || null;
    const gpuTempVal = (gpu && gpu.temperatureGpu && gpu.temperatureGpu > 0) ? gpu.temperatureGpu : null;
    const net = netStats && netStats[0];
    const disk = fsSize.find(d => d.mount === 'C:\\' || d.mount === 'C:' || d.mount === '/') || fsSize[0];
    const result = {
      cpuSensors, gpuList,
      cpu: { usage: Math.round(cpuLoad.currentLoad || 0), speed: cpu.speed || 0, brand: cpu.brand || 'CPU', temp: chosenCpuTemp?.value ?? null },
      gpu: { usage: gpu ? Math.round(gpu.utilizationGpu || 0) : 0, temp: gpuTempVal, model: gpu ? (gpu.model || 'GPU') : 'GPU' },
      ram: { usage: Math.round((mem.used / mem.total) * 100), usedGB: (mem.used / 1073741824).toFixed(1), totalGB: (mem.total / 1073741824).toFixed(1) },
      net: { txSec: net ? net.tx_sec : 0, rxSec: net ? net.rx_sec : 0 }
    };
    if (showDisk) {
      result.disk = { usage: disk ? Math.round(disk.use) : 0, mount: disk ? disk.mount : 'C:\\' };
    }
    // AMD GPU WMI fallback: if GPU usage and temp are both empty, try LibreHardwareMonitor
    if (result.gpu.usage === 0 && result.gpu.temp === null) {
      const lhm = await tryLHMGpu();
      if (lhm.usage !== null) result.gpu.usage = Math.round(lhm.usage);
      if (lhm.temp !== null) result.gpu.temp = lhm.temp;
    }
    return result;
  } catch (e) { return { error: e.message }; }
});

ipcMain.handle('get-sysinfo-fast', async () => {
  const si = require('systeminformation');
  const [cpuLoad, mem, netStats, netIfaces] = await Promise.all([
    si.currentLoad(), si.mem(), si.networkStats().catch(() => []), si.networkInterfaces().catch(() => [])
  ]);
  const net = netStats && netStats[0];
  // Find best local IP (skip loopback and docker/veth)
  const ifaces = Array.isArray(netIfaces) ? netIfaces : [];
  const localIface = ifaces.find(i => i.ip4 && !i.internal && !/^(docker|veth|br-)/.test(i.iface)) || ifaces.find(i => i.ip4 && !i.internal);
  return {
    cpu: { usage: Math.round(cpuLoad.currentLoad || 0) },
    ram: {
      usage: Math.round((mem.used / mem.total) * 100),
      usedGB: (mem.used / 1073741824).toFixed(1),
      totalGB: (mem.total / 1073741824).toFixed(1)
    },
    net: { txSec: net ? net.tx_sec : 0, rxSec: net ? net.rx_sec : 0, localIp: localIface?.ip4 || null }
  };
});

ipcMain.handle('get-sysinfo-slow', async (_e, params) => {
  const si = require('systeminformation');
  const { cpuSensorIndex = 0, gpuControllerIndex = 0, showDisk = false } = params || {};
  const [cpu, cpuTemp, graphics, fsSize] = await Promise.all([
    si.cpu(),
    si.cpuTemperature().catch(() => ({ main: null, cores: [], chipset: null })),
    si.graphics(),
    showDisk ? si.fsSize() : Promise.resolve([])
  ]);
  const cpuSensors = [
    cpuTemp.main != null ? { name: 'CPU (main)', value: cpuTemp.main } : null,
    ...(cpuTemp.cores || []).map((v, i) => ({ name: `Core ${i}`, value: v })),
    cpuTemp.chipset != null ? { name: 'Chipset', value: cpuTemp.chipset } : null
  ].filter(Boolean);
  const gpuList = (graphics.controllers || []).map((g, i) => ({ index: i, model: g.model }));
  const gpu = (graphics.controllers && graphics.controllers[gpuControllerIndex]) || (graphics.controllers && graphics.controllers[0]);
  const disk = showDisk ? (fsSize.find(d => d.mount === 'C:\\' || d.mount === 'C:' || d.mount === '/') || fsSize[0]) : null;
  const cpuTempVal = cpuSensors[cpuSensorIndex]?.value ?? null;
  const gpuTempVal = (gpu && gpu.temperatureGpu && gpu.temperatureGpu > 0) ? gpu.temperatureGpu : null;
  const gpuResult = { usage: gpu ? Math.round(gpu.utilizationGpu || 0) : 0, temp: gpuTempVal, model: gpu ? (gpu.model || 'GPU') : 'GPU', list: gpuList };
  // AMD GPU WMI fallback: if GPU usage and temp are both empty, try LibreHardwareMonitor
  if (gpuResult.usage === 0 && gpuResult.temp === null) {
    const lhm = await tryLHMGpu();
    if (lhm.usage !== null) gpuResult.usage = Math.round(lhm.usage);
    if (lhm.temp !== null) gpuResult.temp = lhm.temp;
  }
  return {
    cpu: { speed: cpu.speed || 0, brand: cpu.brand || 'CPU', temp: cpuTempVal, sensors: cpuSensors },
    gpu: gpuResult,
    disk: showDisk && disk ? { usage: Math.round(disk.use), mount: disk.mount } : null
  };
});

// ─── IPC: NETWORK PING ──────────────────────────────────────────────────────
ipcMain.handle('ping-host', async (_e, host) => {
  const target = (host || '8.8.8.8').replace(/[^a-zA-Z0-9.\-:]/g, '');
  return new Promise(resolve => {
    const isWin = process.platform === 'win32';
    const args = isWin ? ['-n', '1', '-w', '3000', target] : ['-c', '1', '-W', '3', target];
    const { execFile } = require('child_process');
    const start = Date.now();
    execFile('ping', args, { timeout: 5000 }, (err, stdout) => {
      if (err) return resolve({ ok: false, ms: null });
      const elapsed = Date.now() - start;
      // Try to parse RTT from output
      const m = stdout.match(/time[=<](\d+\.?\d*)\s*ms/i);
      resolve({ ok: true, ms: m ? parseFloat(m[1]) : elapsed });
    });
  });
});

/// ─── IPC: SPEEDTEST ─────────────────────────────────────────────────────────
ipcMain.handle('run-speedtest', async () => {
  try {
    const fetch = await getFetch();
    // Download test: fetch a known large file and measure throughput
    const testUrls = [
      'https://speed.cloudflare.com/__down?bytes=10000000',
      'https://proof.ovh.net/files/1Mb.dat'
    ];
    let downloadMbps = 0;
    let pingMs = 0;

    // Ping test
    const pingStart = Date.now();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      await fetch('https://speed.cloudflare.com/__down?bytes=0', { signal: controller.signal });
      clearTimeout(timer);
      pingMs = Date.now() - pingStart;
    } catch { pingMs = -1; }

    // Download test (10MB from Cloudflare)
    try {
      const dlStart = Date.now();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 30000);
      const res = await fetch(testUrls[0], { signal: controller.signal });
      const buffer = await res.arrayBuffer();
      clearTimeout(timer);
      const dlTime = (Date.now() - dlStart) / 1000;
      const bytes = buffer.byteLength;
      downloadMbps = Math.round(((bytes * 8) / dlTime / 1000000) * 100) / 100;
    } catch { downloadMbps = 0; }

    // Upload test (POST 2MB to Cloudflare)
    let uploadMbps = 0;
    try {
      const payload = new Uint8Array(2000000);
      const ulStart = Date.now();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 30000);
      await fetch('https://speed.cloudflare.com/__up', {
        method: 'POST',
        body: payload,
        signal: controller.signal
      });
      clearTimeout(timer);
      const ulTime = (Date.now() - ulStart) / 1000;
      uploadMbps = Math.round(((2000000 * 8) / ulTime / 1000000) * 100) / 100;
    } catch { uploadMbps = 0; }

    return {
      download: downloadMbps,
      upload: uploadMbps,
      ping: pingMs >= 0 ? pingMs : null,
      server: 'Cloudflare',
      timestamp: Date.now()
    };
  } catch (e) {
    return { error: e.message };
  }
});

// ─── IPC: UPDATES ───────────────────────────────────────────────────────────
ipcMain.handle('check-update', async () => {
  try {
    const result = await autoUpdater.checkForUpdates();
    return result ? { version: result.updateInfo?.version } : null;
  } catch (e) { return { error: e.message }; }
});

ipcMain.handle('download-update', async () => {
  try {
    autoUpdater.downloadUpdate();
    return { ok: true };
  } catch (e) { return { error: e.message }; }
});

ipcMain.handle('install-update', () => {
  deletePendingUpdateMarker();
  autoUpdater.quitAndInstall(false, true);
});

ipcMain.handle('get-pending-update', () => pendingUpdate ? { ...pendingUpdate, downloaded: updateDownloaded } : null);

// ─── IPC: SPOTIFY OAUTH ───────────────────────────────────────────────────────
ipcMain.handle('spotify-auth-start', async () => {
  const cfg = loadOrbitConfig();
  const clientId = cfg?.integrations?.spotify?.clientId;
  if (!clientId) return { error: 'No client ID configured' };

  const http = require('http');
  const { shell } = require('electron');
  const redirectUri = 'http://127.0.0.1:8888/callback';
  const scope = 'user-read-playback-state user-modify-playback-state user-read-currently-playing';
  const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=code&scope=${encodeURIComponent(scope)}&redirect_uri=${encodeURIComponent(redirectUri)}`;

  return new Promise((resolve) => {
    let authTimeout = null;
    const server = http.createServer(async (req, res) => {
      if (!req.url.startsWith('/callback')) return;
      if (authTimeout) clearTimeout(authTimeout);
      const params = new URL(req.url, 'http://127.0.0.1:8888').searchParams;
      const code = params.get('code');
      const error = params.get('error');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<html><body style="font-family:monospace;background:#060a10;color:#00d9ff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><h2>Spotify connected ✓ — you can close this tab.</h2></body></html>');
      server.close();

      if (error) { resolve({ error }); return; }
      if (!code) { resolve({ error: 'No code received' }); return; }

      const fetch = await getFetch();
      const clientSecret = cfg?.integrations?.spotify?.clientSecret;
      const body = new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri });
      try {
        const r = await fetch('https://accounts.spotify.com/api/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
          },
          body: body.toString()
        });
        const tokens = await r.json();
        if (tokens.access_token) {
          const currentCfg = loadOrbitConfig();
          currentCfg.integrations.spotify.accessToken = tokens.access_token;
          currentCfg.integrations.spotify.refreshToken = tokens.refresh_token;
          currentCfg.integrations.spotify.tokenExpiry = Date.now() + (tokens.expires_in * 1000);
          saveOrbitConfig(currentCfg);
          resolve({ ok: true });
        } else {
          resolve({ error: tokens.error_description || 'Token exchange failed' });
        }
      } catch (e) { resolve({ error: e.message }); }
    });

    server.listen(8888, '127.0.0.1', () => shell.openExternal(authUrl));
    server.on('error', (e) => resolve({ error: 'Port 8888 in use: ' + e.message }));
    authTimeout = setTimeout(() => { try { server.close(); } catch {} resolve({ error: 'Auth timeout' }); }, 300000);
  });
});

ipcMain.handle('spotify-refresh-token', async () => {
  const cfg = loadOrbitConfig();
  const { clientId, clientSecret, refreshToken } = cfg?.integrations?.spotify || {};
  if (!refreshToken) return { error: 'No refresh token' };
  const fetch = await getFetch();
  const params = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken });
  try {
    const r = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
      },
      body: params.toString()
    });
    const tokens = await r.json();
    if (tokens.access_token) {
      cfg.integrations.spotify.accessToken = tokens.access_token;
      cfg.integrations.spotify.tokenExpiry = Date.now() + (tokens.expires_in * 1000);
      saveOrbitConfig(cfg);
      return { ok: true, accessToken: tokens.access_token };
    }
    return { error: tokens.error_description || 'Refresh failed' };
  } catch (e) { return { error: e.message }; }
});

// ─── SignalR WebSocket clients (Sonarr / Radarr real-time events) ─────────────
let _signalRConnections = {};

function startSignalRConnection(name, baseUrl, apiKey) {
  if (!baseUrl || !apiKey) return null;
  const wsBase = baseUrl.replace(/^https?/, 'ws');
  const wsUrl = wsBase + '/signalr/events?access_token=' + encodeURIComponent(apiKey);
  let reconnectTimer = null;
  let ws = null;

  function connect() {
    try {
      const WS = globalThis.WebSocket;
      if (!WS) return; // Node < 22 without ws module
      ws = new WS(wsUrl);
      let buf = '';
      ws.addEventListener('open', () => {
        ws.send('{"protocol":"json","version":1}\x1e');
      });
      ws.addEventListener('message', (evt) => {
        buf += evt.data;
        const parts = buf.split('\x1e');
        buf = parts.pop();
        for (const p of parts) {
          if (!p.trim()) continue;
          try {
            const msg = JSON.parse(p);
            if (msg.type === 1 && msg.arguments?.[0]) {
              mainWindow?.webContents.send(name + '-signalr-event', msg.arguments[0]);
            }
          } catch {}
        }
      });
      ws.addEventListener('close', () => {
        reconnectTimer = setTimeout(connect, 8000);
      });
      ws.addEventListener('error', () => {});
    } catch {
      reconnectTimer = setTimeout(connect, 12000);
    }
  }

  connect();
  return {
    close: () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      try { if (ws) ws.close(); } catch {}
    }
  };
}

ipcMain.handle('start-signalr', (_e, { sonarrUrl, sonarrKey, radarrUrl, radarrKey }) => {
  if (_signalRConnections.sonarr) _signalRConnections.sonarr.close();
  if (_signalRConnections.radarr) _signalRConnections.radarr.close();
  if (sonarrUrl && sonarrKey) _signalRConnections.sonarr = startSignalRConnection('sonarr', sonarrUrl, sonarrKey);
  if (radarrUrl && radarrKey) _signalRConnections.radarr = startSignalRConnection('radarr', radarrUrl, radarrKey);
  return { ok: true };
});

// ─── IPC: NATIVE NOTIFICATIONS ──────────────────────────────────────────────
ipcMain.handle('orbit:notify', (_e, { title, body }) => {
  new Notification({ title, body }).show();
});

// ─── IPC: RENDERER LOGGING BRIDGE ──────────────────────────────────────────
// Pipes renderer console.error/warn/info to electron-log so panel issues
// are diagnosable without DevTools open.
ipcMain.handle('renderer-log', (_e, { level, args }) => {
  const fn = log[level] || log.info;
  fn.call(log, '[renderer]', ...args);
});


// ─── IPC: CHECK SERVICES (in-house pinger) ──────────────────────────────────
ipcMain.handle('check-services', async (_e, services) => {
  for (const s of services) {
    if (!s || !s.url || !isAllowedUrl(s.url)) {
      return { error: `URL not allowed for service ${s && s.name ? s.name : JSON.stringify(s)}` };
    }
  }
  const fetch = await getFetch();
  const results = await Promise.all(services.map(async ({ name, url, auth }) => {
    const start = Date.now();
    const baseHeaders = auth ? { Authorization: 'Basic ' + auth } : {};
    async function tryFetch(method) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      try {
        const res = await fetch(url, { method, headers: baseHeaders, signal: controller.signal, redirect: 'manual' });
        clearTimeout(timer);
        return { ok: true, status: res.status };
      } catch (e) {
        clearTimeout(timer);
        return { ok: false, error: e.message };
      }
    }
    try {
      // Services requiring auth (e.g. NZBGet) often drop HEAD — go straight to GET
      let result = auth ? { ok: false } : await tryFetch('HEAD');
      if (!result.ok) {
        result = await tryFetch('GET');
      }
      if (!result.ok) return { name, url, status: 'down', ms: Date.now() - start, error: result.error };
      const ms = Date.now() - start;
      const up = result.status < 500;
      return { name, url, status: up ? 'up' : 'down', ms, code: result.status };
    } catch (e) {
      return { name, url, status: 'down', ms: Date.now() - start, error: e.message };
    }
  }));
  return results;
});

// ─── IPC: UPTIME KUMA (Socket.IO) ───────────────────────────────────────────
ipcMain.handle('fetch-uptime-kuma', async (_e, { url, username, password }) => {
  try {
    const { io } = require('socket.io-client');
    return await new Promise((resolve) => {
      const socket = io(url, { transports: ['websocket'], timeout: 10000, reconnection: false });
      const timer = setTimeout(() => { socket.disconnect(); resolve({ error: 'Connection timeout' }); }, 12000);
      socket.on('connect_error', (err) => { clearTimeout(timer); socket.disconnect(); resolve({ error: err.message }); });
      socket.on('connect', () => {
        socket.emit('login', { username, password }, (result) => {
          if (!result?.ok) {
            clearTimeout(timer);
            socket.disconnect();
            resolve({ error: 'Login failed: ' + (result?.reason || 'wrong credentials') });
            return;
          }
          socket.emit('getMonitorList', (data) => {
            clearTimeout(timer);
            socket.disconnect();
            resolve({ monitors: Object.values(data || {}) });
          });
        });
      });
    });
  } catch (e) { return { error: e.message }; }
});


// ─── IPC: INPUT VALIDATION ──────────────────────────────────────────────────
// Validates integration fields before saving — catches typos early.
ipcMain.handle('validate-input', (_e, { type, field, value }) => {
  if (!value || typeof value !== 'string') return { valid: false, error: 'Value is required' };
  const v = value.trim();

  if (field === 'url') {
    try {
      const u = new URL(v);
      if (!['http:', 'https:'].includes(u.protocol)) return { valid: false, error: 'URL must start with http:// or https://' };
      if (!u.hostname) return { valid: false, error: 'URL must include a hostname' };
      return { valid: true };
    } catch {
      return { valid: false, error: 'Invalid URL format — include http:// or https://' };
    }
  }

  if (field === 'apiKey' || field === 'token' || field === 'tokenSecret') {
    if (v.length < 8) return { valid: false, error: 'Value seems too short — check for copy/paste errors' };
    if (/\s/.test(v)) return { valid: false, error: 'Value contains spaces — check for copy/paste errors' };
    return { valid: true };
  }

  if (field === 'city') {
    if (v.length < 2) return { valid: false, error: 'City name too short' };
    return { valid: true };
  }

  return { valid: true };
});

// ─── IPC: AUDIO DEVICES (Windows only) ---
// Write PowerShell to a temp .ps1 file, execute with -File, delete.
// Zero command-line escaping issues.
const os = require('os');
const _audioTmpDir = path.join(os.tmpdir(), 'orbit-audio');
if (!fs.existsSync(_audioTmpDir)) { fs.mkdirSync(_audioTmpDir, { recursive: true }); }

function _ps(body) {
  const { execSync } = require('child_process');
  const tmpFile = path.join(_audioTmpDir, 'cmd-' + Date.now() + '.ps1');
  try {
    fs.writeFileSync(tmpFile, body, 'utf8');
    return execSync('powershell -NoProfile -ExecutionPolicy Bypass -File "' + tmpFile + '"',
      { timeout: 15000, encoding: 'utf8', windowsHide: true });
  } finally {
    try { fs.unlinkSync(tmpFile); } catch {}
  }
}

ipcMain.handle('list-audio-devices', async () => {
  if (process.platform !== 'win32') return { error: 'Windows only' };
  try {
    const script = [
      '$devices = Get-CimInstance Win32_PnPEntity |',
      '  Where-Object { $_.PNPClass -eq "AudioEndpoint" -and $_.Status -eq "OK" } |',
      '  Select-Object Name, DeviceID |',
      '  ConvertTo-Json -Compress',
    ].join('\n');
    const raw = _ps(script).trim();
    if (!raw) return { output: [], input: [] };
    let devices = JSON.parse(raw);
    if (!Array.isArray(devices)) devices = [devices];
    // Get defaults from registry
    const defScript = [
      '$p = (Get-ItemProperty "HKCU:\\Software\\Microsoft\\Multimedia\\Sound Mapper" -Name "Playback" -EA 0).Playback',
      '$r = (Get-ItemProperty "HKCU:\\Software\\Microsoft\\Multimedia\\Sound Mapper" -Name "Recording" -EA 0).Recording',
      '@{ o=$p; i=$r } | ConvertTo-Json -Compress',
    ].join('\n');
    let defOut = '', defIn = '';
    try {
      const defRaw = _ps(defScript).trim();
      if (defRaw) { const d = JSON.parse(defRaw); defOut = d.o || ''; defIn = d.i || ''; }
    } catch {}
    const output = [], input = [];
    for (const d of devices) {
      const isInput = /mic|microphone|input|recording|cam/i.test(d.Name);
      const entry = { id: d.DeviceID, name: d.Name, isDefault: false };
      if (isInput) {
        if (defIn && d.Name.includes(defIn)) entry.isDefault = true;
        input.push(entry);
      } else {
        if (defOut && d.Name.includes(defOut)) entry.isDefault = true;
        output.push(entry);
      }
    }
    return { output, input };
  } catch (e) { return { error: e.message || String(e) }; }
});

ipcMain.handle('get-default-audio', async () => {
  if (process.platform !== 'win32') return { error: 'Windows only' };
  try {
    const script = [
      '$p = (Get-ItemProperty "HKCU:\\Software\\Microsoft\\Multimedia\\Sound Mapper" -Name "Playback" -EA 0).Playback',
      '$r = (Get-ItemProperty "HKCU:\\Software\\Microsoft\\Multimedia\\Sound Mapper" -Name "Recording" -EA 0).Recording',
      '@{ output = $p; input = $r } | ConvertTo-Json -Compress',
    ].join('\n');
    const raw = _ps(script).trim();
    if (!raw) return { output: null, input: null };
    const d = JSON.parse(raw);
    return { output: d.output || null, input: d.input || null };
  } catch (e) { return { error: e.message || String(e) }; }
});

ipcMain.handle('set-audio-device', async (_e, { deviceId }) => {
  if (process.platform !== 'win32') return { error: 'Windows only' };
  if (!deviceId) return { error: 'Device ID required' };
  try {
    const safeId = String(deviceId).replace(/[^a-zA-Z0-9{}._\\-]/g, '');
    const script = [
      'Add-Type -TypeDefinition @"',
      'using System;',
      'using System.Runtime.InteropServices;',
      'public class AudioSwitch {',
      '  public static void SetDefault(string id) {',
      '    var t = Type.GetTypeFromCLSID(new Guid("870af99c-171d-4f9e-af0d-e63df40c2bc9"));',
      '    var o = Activator.CreateInstance(t);',
      '    t.InvokeMember("SetDefaultEndpoint", System.Reflection.BindingFlags.InvokeMethod, null, o, new object[] { id, 0 });',
      '  }',
      '}',
      '"@ -ErrorAction SilentlyContinue',
      '[AudioSwitch]::SetDefault("' + safeId + '")',
    ].join('\n');
    _ps(script);
    return { ok: true };
  } catch (e) { return { error: e.message || String(e) }; }
});

// ─── IPC: FETCH IMAGE AS DATA URL (for auth-gated thumbnails) ────────────────
ipcMain.handle('fetch-image', async (_e, { url, headers }) => {
  if (!isAllowedUrl(url)) return { error: 'URL not allowed' };
  try {
    const fetch = await getFetch();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const res = await fetch(url, { headers: headers || {}, signal: controller.signal });
      if (!res.ok) return { error: `HTTP ${res.status}` };
      const buffer = await res.arrayBuffer();
      const contentType = res.headers.get('content-type') || 'image/jpeg';
      const base64 = Buffer.from(buffer).toString('base64');
      return { dataUrl: `data:${contentType};base64,${base64}` };
    } finally { clearTimeout(timer); }
  } catch (e) { return { error: e.message }; }
});
