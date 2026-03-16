const { app, BrowserWindow, screen, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

// ─── AUTO-UPDATER CONFIG ──────────────────────────────────────────────────────
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

const isDev = !app.isPackaged;

let pendingUpdate = null;

autoUpdater.on('update-available', (info) => {
  log.info('Update available:', info.version);
  pendingUpdate = { version: info.version, releaseNotes: info.releaseNotes || '' };
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
  if (mainWindow) {
    mainWindow.webContents.send('update-downloaded');
  }
});

autoUpdater.on('error', (err) => {
  log.error('Update error:', err.message);
  if (mainWindow) {
    mainWindow.webContents.send('update-error', err.message);
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
  try { return JSON.parse(fs.readFileSync(p, 'utf-8')); } catch { return null; }
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

function saveOrbitConfig(cfg) {
  fs.writeFileSync(getOrbitConfigPath(), JSON.stringify(cfg, null, 2));
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
    const res = await fetch(url, { ...options, signal: controller.signal });
    const text = await res.text();
    try { return JSON.parse(text); } catch { return text; }
  } catch (e) { return { error: e.message }; }
  finally { clearTimeout(timer); }
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
      preload: path.join(__dirname, 'preload.js')
    }
  });
  mainWindow.loadFile('index.html');

  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.control && input.key.toLowerCase() === 'q') app.quit();
    if (input.control && input.key.toLowerCase() === 't') {
      mainWindow.setAlwaysOnTop(!mainWindow.isAlwaysOnTop());
    }
    if (input.control && input.key.toLowerCase() === 'd') showPicker();
  });

  mainWindow.on('closed', () => { mainWindow = null; });
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
      preload: path.join(__dirname, 'preload.js')
    }
  });
  pickerWindow.loadFile('picker.html');
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
  // Discord RPC connects on-demand (not proactively) to avoid surprise auth prompts
  const orbitCfg = migrateOrbitConfig(loadOrbitConfig());
  const hasConfig = orbitCfg && orbitCfg.pages && orbitCfg.pages.length > 0;

  if (!hasConfig) {
    const setupWin = new BrowserWindow({
      width: 860, height: 700, resizable: true, center: true,
      backgroundColor: '#0a0a0f',
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true, nodeIntegration: false
      }
    });
    setupWin.loadFile('setup.html');
  } else {
    const settings = loadSettings();
    if (settings.displayId) {
      launchMain(settings.displayId);
    } else {
      showPicker();
    }
  }

  if (!isDev) {
    autoUpdater.checkForUpdatesAndNotify();
  }
});

app.on('window-all-closed', () => { app.quit(); });

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

// ─── IPC: OPEN EXTERNAL URL ─────────────────────────────────────────────────
ipcMain.handle('notify-config-saved', () => { return { ok: true }; }); // no-op; main window receives config-updated via save-config

ipcMain.handle('open-external', (_e, url) => {
  shell.openExternal(url);
  return { ok: true };
});

// ─── IPC: SETUP ──────────────────────────────────────────────────────────────
ipcMain.handle('open-setup', async () => {
  // Close any existing setup windows first
  BrowserWindow.getAllWindows().forEach(w => { if (w !== mainWindow) w.close(); });
  const setupWin = new BrowserWindow({
    width: 860, height: 700, resizable: true, center: true,
    backgroundColor: '#0a0a0f',
    alwaysOnTop: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false
    }
  });
  setupWin.loadFile('setup.html');
  setupWin.once('ready-to-show', () => { setupWin.show(); setupWin.focus(); });
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
ipcMain.handle('api-get', async (_e, { url, headers, timeout }) => {
  return safeFetch(url, { headers: headers || {}, timeout: timeout || 8000 });
});

ipcMain.handle('api-post', async (_e, { url, body, headers }) => {
  const fetch = await getFetch();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(headers || {}) },
      body: typeof body === 'string' ? body : JSON.stringify(body),
      signal: controller.signal
    });
    const text = await res.text();
    try { return JSON.parse(text); } catch { return text; }
  } catch (e) { return { error: e.message }; }
  finally { clearTimeout(timer); }
});

ipcMain.handle('api-put', async (_e, { url, body, headers }) => {
  const fetch = await getFetch();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...(headers || {}) },
      body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
      signal: controller.signal
    });
    if (res.status === 204) return { ok: true };
    const text = await res.text();
    try { return JSON.parse(text); } catch { return { ok: true }; }
  } catch (e) { return { error: e.message }; }
  finally { clearTimeout(timer); }
});

// ─── IPC: SIGNALRGB (legacy direct) ─────────────────────────────────────────

// ─── IPC: TEST INTEGRATION ─────────────────────────────────────────────────────
ipcMain.handle('test-integration', async (_e, { type, url, apiKey, username, password, token }) => {
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
    if (type === 'nzbget') {
      if (!url) return fail('URL required');
      const base = url.replace(/\/jsonrpc$/, '').replace(/\/$/, '');
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
    if (type === 'discord') {
      const cfg = loadOrbitConfig();
      if (cfg?.integrations?.discord?.accessToken) {
        const user = cfg.integrations.discord.user;
        return ok(user ? `Connected as ${user.username}` : 'Connected');
      }
      return fail('Not linked — complete OAuth in Orbit app');
    }
    if (type === 'weather') {
      if (!url) return fail('City name required');
      const r = await headGet(`https://wttr.in/${encodeURIComponent(url)}?format=j1`);
      if (r.ok) return ok(`Weather available for "${url}"`);
      return fail(`Location not found`);
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
    const url = `${base}/api/v1/lighting/effect/${effectId}/apply`;
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
    const res = await fetch(`${base}/api/v1/lighting`, {
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
    return result;
  } catch (e) { return { error: e.message }; }
});

ipcMain.handle('get-sysinfo-fast', async () => {
  const si = require('systeminformation');
  const [cpuLoad, mem, netStats] = await Promise.all([
    si.currentLoad(), si.mem(), si.networkStats().catch(() => [])
  ]);
  const net = netStats && netStats[0];
  return {
    cpu: { usage: Math.round(cpuLoad.currentLoad || 0) },
    ram: {
      usage: Math.round((mem.used / mem.total) * 100),
      usedGB: (mem.used / 1073741824).toFixed(1),
      totalGB: (mem.total / 1073741824).toFixed(1)
    },
    net: { txSec: net ? net.tx_sec : 0, rxSec: net ? net.rx_sec : 0 }
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
  return {
    cpu: { speed: cpu.speed || 0, brand: cpu.brand || 'CPU', temp: cpuTempVal, sensors: cpuSensors },
    gpu: { usage: gpu ? Math.round(gpu.utilizationGpu || 0) : 0, temp: gpuTempVal, model: gpu ? (gpu.model || 'GPU') : 'GPU', list: gpuList },
    disk: showDisk && disk ? { usage: Math.round(disk.use), mount: disk.mount } : null
  };
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
  autoUpdater.quitAndInstall(false, true);
});

ipcMain.handle('get-pending-update', () => pendingUpdate);

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
    const server = http.createServer(async (req, res) => {
      if (!req.url.startsWith('/callback')) return;
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
    setTimeout(() => { try { server.close(); } catch {} resolve({ error: 'Auth timeout' }); }, 300000);
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


// ─── IPC: CHECK SERVICES (in-house pinger) ──────────────────────────────────
ipcMain.handle('check-services', async (_e, services) => {
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


// ─── DISCORD RPC (voice mute / voice channel connect) ─────────────────────────
let _rpcClient = null;
let _rpcConnecting = false;
let _rpcReconnectTimer = null;

async function connectDiscordRPC() {
  if (_rpcClient) return _rpcClient;
  if (_rpcConnecting) return null;
  const cfg = loadOrbitConfig();
  const clientId = cfg?.integrations?.discord?.clientId;
  if (!clientId) return null;
  _rpcConnecting = true;
  try {
    const DiscordRPC = require('discord-rpc');
    DiscordRPC.register(clientId);
    const savedToken = cfg?.integrations?.discord?.rpcToken;
    let client = new DiscordRPC.Client({ transport: 'ipc' });
    const loginOpts = savedToken
      ? { clientId, accessToken: savedToken }
      : { clientId, scopes: ['rpc', 'rpc.voice.read', 'rpc.voice.write'] };
    await new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('RPC connect timeout — check Discord for an authorization popup')), 30000);
      client.on('ready', () => { clearTimeout(t); resolve(); });
      client.login(loginOpts).catch(async (e) => {
        // If stored token failed, retry with full auth
        if (savedToken) {
          client.removeAllListeners();
          client = new DiscordRPC.Client({ transport: 'ipc' });
          client.on('ready', () => { clearTimeout(t); resolve(); });
          client.login({ clientId, scopes: ['rpc', 'rpc.voice.read', 'rpc.voice.write'] }).catch(reject);
        } else { reject(e); }
      });
    });
    // Persist the access token so future reconnects skip the auth dialog
    if (client.accessToken) {
      try {
        const updCfg = loadOrbitConfig();
        if (updCfg?.integrations?.discord) {
          updCfg.integrations.discord.rpcToken = client.accessToken;
          saveOrbitConfig(updCfg);
        }
      } catch {}
    }
    _rpcClient = client;
    client.on('disconnected', () => {
      _rpcClient = null;
      _rpcConnecting = false;
      // Auto-reconnect silently after 5s
      if (!_rpcReconnectTimer) {
        _rpcReconnectTimer = setTimeout(() => {
          _rpcReconnectTimer = null;
          connectDiscordRPC().catch(() => {});
        }, 5000);
      }
    });
    return client;
  } catch (e) {
    _rpcClient = null;
    return null;
  } finally {
    _rpcConnecting = false;
  }
}

// Alias for call sites
const getDiscordRPC = connectDiscordRPC;

ipcMain.handle('discord-toggle-mute', async () => {
  try {
    const rpc = await getDiscordRPC();
    if (!rpc) return { error: 'Discord RPC not available — is Discord running?' };
    const settings = await rpc.getVoiceSettings();
    const newMute = !settings.mute;
    await rpc.setVoiceSettings({ mute: newMute });
    _rpcMuted = newMute;
    return { muted: newMute };
  } catch (e) { return { error: e.message }; }
});

// Bot-powered voice state — uses REST API, no RPC required
ipcMain.handle('discord-check-voice', async () => {
  try {
    const cfg = loadOrbitConfig();
    const d = cfg?.integrations?.discord;
    const botToken = d?.botToken;
    const userId = d?.userId || d?.user?.id;
    const guilds = d?.guilds || [];
    if (!botToken || !userId || !guilds.length) return { error: 'Need bot token + user ID + guilds configured' };
    // Check each guild until we find an active voice state
    for (const guild of guilds) {
      try {
        const res = await fetch(`https://discord.com/api/v10/guilds/${guild.id}/voice-states/${userId}`, {
          headers: { Authorization: 'Bot ' + botToken }
        });
        if (res.ok) {
          const vs = await res.json();
          if (vs.channel_id) {
            // Fetch channel name
            let channelName = vs.channel_id;
            try {
              const chRes = await fetch(`https://discord.com/api/v10/channels/${vs.channel_id}`, { headers: { Authorization: 'Bot ' + botToken } });
              if (chRes.ok) { const ch = await chRes.json(); channelName = ch.name || channelName; }
            } catch {}
            return { inVoice: true, guildId: guild.id, guildName: guild.name, channelId: vs.channel_id, channelName, muted: vs.self_mute, deafened: vs.self_deaf };
          }
        }
      } catch {}
    }
    return { inVoice: false };
  } catch (e) { return { error: e.message }; }
});

// Bot-powered move to voice channel (only works if user is already in any voice channel in the guild)
ipcMain.handle('discord-move-to-voice', async (_e, guildId, channelId) => {
  try {
    const cfg = loadOrbitConfig();
    const d = cfg?.integrations?.discord;
    const botToken = d?.botToken;
    const userId = d?.userId || d?.user?.id;
    if (!botToken || !userId) return { error: 'Need bot token and user ID' };
    const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
      method: 'PATCH',
      headers: { Authorization: 'Bot ' + botToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel_id: channelId })
    });
    if (res.ok) return { moved: true };
    const err = await res.json().catch(() => ({}));
    return { error: err.message || `Status ${res.status}` };
  } catch (e) { return { error: e.message }; }
});

ipcMain.handle('discord-get-voice-state', async () => {
  try {
    const rpc = await getDiscordRPC();
    if (!rpc) return { error: 'Discord RPC not available' };
    const settings = await rpc.getVoiceSettings();
    const channel = await rpc.getSelectedVoiceChannel();
    return { muted: settings.mute, deafened: settings.deaf, channel: channel ? { id: channel.id, name: channel.name, guildId: channel.guild_id } : null };
  } catch (e) { return { error: e.message }; }
});

// Get voice channels for a guild (used during setup to let user pick a channel)
ipcMain.handle('discord-get-voice-channels', async (_e, guildId) => {
  let rpc;
  try {
    rpc = await getDiscordRPC();
  } catch (e) {
    return { error: 'RPC connect failed: ' + e.message };
  }
  if (!rpc) return { error: 'RPC busy or failed — close Orbit, reopen Discord, try again' };
  try {
    const channels = await rpc.getChannels(guildId);
    const voiceChannels = (channels?.channels || []).filter(c => c.type === 2);
    return { channels: voiceChannels.map(c => ({ id: c.id, name: c.name })) };
  } catch (e) { return { error: 'getChannels failed: ' + e.message }; }
});

ipcMain.handle('discord-join-voice', async (_e, channelId, guildId) => {
  try {
    const { shell } = require('electron');
    // Deep link opens Discord directly at the voice channel — user clicks Join Voice once
    if (guildId && channelId) {
      await shell.openExternal(`discord://discord.com/channels/${guildId}/${channelId}`);
    } else if (channelId) {
      await shell.openExternal(`discord://discord.com/channels/${channelId}`);
    }
    return { joined: true };
  } catch (e) { return { error: e.message }; }
});

// ─── IPC: DISCORD REFRESH GUILDS ──────────────────────────────────────────────
ipcMain.handle('discord-refresh-guilds', async () => {
  const cfg = loadOrbitConfig();
  const token = cfg?.integrations?.discord?.accessToken;
  if (!token) return { error: 'Not connected to Discord' };
  try {
    const fetch = await getFetch();
    const res = await fetch('https://discord.com/api/users/@me/guilds', { headers: { Authorization: 'Bearer ' + token } });
    const guilds = await res.json();
    if (!Array.isArray(guilds)) return { error: guilds.message || 'Failed to fetch guilds' };
    const mapped = guilds.map(g => ({ id: g.id, name: g.name, icon: g.icon }));
    cfg.integrations.discord.guilds = mapped;
    cfg.integrations.discord.guildCount = mapped.length;
    saveOrbitConfig(cfg);
    return { guilds: mapped };
  } catch (e) { return { error: e.message }; }
});

// ─── IPC: DISCORD OAUTH ────────────────────────────────────────────────────
ipcMain.handle('discord-auth-start', async () => {
  const cfg = loadOrbitConfig();
  const clientId = cfg?.integrations?.discord?.clientId;
  const clientSecret = cfg?.integrations?.discord?.clientSecret;
  if (!clientId) return { error: 'No Discord client ID configured' };

  const http = require('http');
  const { shell } = require('electron');
  const redirectUri = 'http://127.0.0.1:8893/callback';
  const scope = 'identify guilds';
  const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&response_type=code&scope=${encodeURIComponent(scope)}&redirect_uri=${encodeURIComponent(redirectUri)}`;

  return new Promise((resolve) => {
    const server = http.createServer(async (req, res) => {
      if (!req.url.startsWith('/callback')) return;
      const params = new URL(req.url, 'http://127.0.0.1:8893').searchParams;
      const code = params.get('code');
      const error = params.get('error');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<html><body style="font-family:monospace;background:#060a10;color:#5865F2;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><h2>Discord connected ✓ — you can close this tab.</h2></body></html>');
      server.close();

      if (error) { resolve({ error }); return; }
      if (!code) { resolve({ error: 'No code received' }); return; }

      const fetch = await getFetch();
      const body = new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri, client_id: clientId, client_secret: clientSecret });
      try {
        const r = await fetch('https://discord.com/api/oauth2/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body.toString()
        });
        const tokens = await r.json();
        if (tokens.access_token) {
          // Fetch user info and guilds
          const [userRes, guildsRes] = await Promise.all([
            fetch('https://discord.com/api/users/@me', { headers: { Authorization: 'Bearer ' + tokens.access_token } }),
            fetch('https://discord.com/api/users/@me/guilds', { headers: { Authorization: 'Bearer ' + tokens.access_token } })
          ]);
          const user = await userRes.json();
          const guilds = await guildsRes.json();

          const currentCfg = loadOrbitConfig();
          if (!currentCfg.integrations.discord) currentCfg.integrations.discord = {};
          currentCfg.integrations.discord.accessToken = tokens.access_token;
          if (tokens.refresh_token) currentCfg.integrations.discord.refreshToken = tokens.refresh_token;
          currentCfg.integrations.discord.tokenExpiry = Date.now() + (tokens.expires_in * 1000);
          currentCfg.integrations.discord.user = user;
          currentCfg.integrations.discord.guildCount = Array.isArray(guilds) ? guilds.length : 0;
          currentCfg.integrations.discord.guilds = Array.isArray(guilds) ? guilds.map(g => ({ id: g.id, name: g.name, icon: g.icon })) : [];
          saveOrbitConfig(currentCfg);
          resolve({ ok: true, user, guildCount: Array.isArray(guilds) ? guilds.length : 0, guilds: currentCfg.integrations.discord.guilds });
        } else {
          resolve({ error: tokens.error_description || 'Token exchange failed' });
        }
      } catch (e) { resolve({ error: e.message }); }
    });

    server.listen(8893, '127.0.0.1', () => shell.openExternal(authUrl));
    server.on('error', (e) => resolve({ error: 'Port 8893 in use: ' + e.message }));
    setTimeout(() => { try { server.close(); } catch {} resolve({ error: 'Auth timeout' }); }, 300000);
  });
});
