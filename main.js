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
  return { ok: true };
});

ipcMain.handle('load-config', async () => {
  return loadOrbitConfig();
});

// ─── IPC: OPEN EXTERNAL URL ─────────────────────────────────────────────────
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
ipcMain.handle('api-get', async (_e, { url, headers }) => {
  return safeFetch(url, { headers: headers || {} });
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
