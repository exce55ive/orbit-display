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
  const orbitCfg = loadOrbitConfig();
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
  const setupWin = new BrowserWindow({
    width: 860, height: 700, resizable: true, center: true,
    backgroundColor: '#0a0a0f',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false
    }
  });
  setupWin.loadFile('setup.html');
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
ipcMain.handle('fetch-signalrgb', async () => {
  const cfg = loadOrbitConfig();
  const base = cfg?.integrations?.signalrgb?.url || 'http://localhost:16034';
  const [state, effectsList] = await Promise.all([
    safeFetch(`${base}/api/v1/lighting`),
    safeFetch(`${base}/api/v1/lighting/effects`).catch(() => ({ data: [] }))
  ]);
  // Merge effects list into state response
  if (state && state.data) {
    const rawEffects = effectsList?.data || [];
    const names = rawEffects.map(e => typeof e === 'string' ? e : (e.name || e.id || String(e)));
    if (names.length > 0) state.data.effects = names;
  }
  return state;
});

ipcMain.handle('activate-effect', async (_e, effectId) => {
  const fetch = await getFetch();
  const cfg2 = loadOrbitConfig();
  try {
    const base = cfg2?.integrations?.signalrgb?.url || 'http://localhost:16034';
    const url = `${base}/api/v1/lighting/effects/${effectId}/activate`;
    const res = await fetch(url, { method: 'PUT' });
    const text = await res.text();
    try { return JSON.parse(text); } catch { return text; }
  } catch (e) { return { error: e.message }; }
});

ipcMain.handle('signalrgb-set-enabled', async (_e, enabled) => {
  const fetch = await getFetch();
  const cfg2 = loadOrbitConfig();
  try {
    const base = cfg2?.integrations?.signalrgb?.url || 'http://localhost:16034';
    const res = await fetch(`${base}/api/v1/lighting`, {
      method: 'PUT',
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
          saveOrbitConfig(currentCfg);
          resolve({ ok: true, user, guildCount: Array.isArray(guilds) ? guilds.length : 0 });
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
