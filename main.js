const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// ─── CONFIG ──────────────────────────────────────────────────────────────────
let config;
try {
  const configPaths = [
    path.join(process.resourcesPath, 'config.json'),
    path.join(__dirname, 'config.json')
  ];
  for (const cp of configPaths) {
    if (fs.existsSync(cp)) { config = JSON.parse(fs.readFileSync(cp, 'utf-8')); break; }
  }
  if (!config) throw new Error('config.json not found');
} catch (e) {
  config = {
    tautulli: { url: 'http://YOUR_PLEX_SERVER:8181', apikey: 'YOUR_TAUTULLI_API_KEY' },
    signalrgb: { url: 'http://localhost:16034' },
    axiom: { url: '' }
  };
}

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
      const cur = mainWindow.isAlwaysOnTop();
      mainWindow.setAlwaysOnTop(!cur);
    }
    // Ctrl+D → show display picker again
    if (input.control && input.key.toLowerCase() === 'd') showPicker();
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

function showPicker() {
  if (pickerWindow) { pickerWindow.focus(); return; }

  const primary = screen.getPrimaryDisplay();
  pickerWindow = new BrowserWindow({
    width: 520,
    height: 520,
    x: primary.bounds.x + Math.round((primary.bounds.width - 520) / 2),
    y: primary.bounds.y + Math.round((primary.bounds.height - 400) / 2),
    resizable: false,
    frame: false,
    alwaysOnTop: true,
    backgroundColor: '#060a10',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  pickerWindow.loadFile('picker.html');
  pickerWindow.on('closed', () => { pickerWindow = null; });
}

app.whenReady().then(() => {
  const settings = loadSettings();
  if (settings.displayId) {
    launchMain(settings.displayId);
  } else {
    // First run — show picker
    showPicker();
  }
});

app.on('window-all-closed', () => { app.quit(); });

// ─── IPC ─────────────────────────────────────────────────────────────────────

// Picker: get display list
ipcMain.handle('get-displays', () => getDisplayList());

// Picker: user selected a display
ipcMain.handle('select-display', (_e, displayId) => {
  const settings = loadSettings();
  settings.displayId = displayId;
  saveSettings(settings);
  if (pickerWindow) { pickerWindow.close(); pickerWindow = null; }
  if (!mainWindow) launchMain(displayId);
  return { ok: true };
});

// Main: show picker again (Ctrl+D or from UI)
ipcMain.handle('show-picker', () => {
  showPicker();
  return { ok: true };
});

// SignalRGB
ipcMain.handle('fetch-signalrgb', async () =>
  safeFetch(`${config.signalrgb.url}/api/v1/lighting`));

ipcMain.handle('activate-effect', async (_e, effectId) => {
  const fetch = await getFetch();
  try {
    const res = await fetch(`${config.signalrgb.url}/api/v1/lighting/effects/${effectId}/activate`, { method: 'PUT' });
    const text = await res.text();
    try { return JSON.parse(text); } catch { return text; }
  } catch (e) { return { error: e.message }; }
});

// Tautulli
ipcMain.handle('fetch-tautulli', async () => {
  if (!config.tautulli.apikey || config.tautulli.apikey === 'YOUR_TAUTULLI_API_KEY')
    return { error: 'Tautulli API key not configured' };
  return safeFetch(`${config.tautulli.url}/api/v2?apikey=${config.tautulli.apikey}&cmd=get_activity`);
});

// Home Assistant
ipcMain.handle('ha-get-state', async (_e, entityId) => {
  return safeFetch(`${config.ha.url}/api/states/${entityId}`, {
    headers: { Authorization: `Bearer ${config.ha.token}` }
  });
});

ipcMain.handle('ha-call-service', async (_e, { domain, service, data }) => {
  return safeFetch(`${config.ha.url}/api/services/${domain}/${service}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.ha.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
});

// TODO: replace with Orbit status endpoint
// (fetch-axiom and fetch-axiom-agents removed — Orbit does not connect to Axiom's private backend)

// ─── UPDATE ──────────────────────────────────────────────────────────────────
// TODO: implement electron-updater for Orbit (check-update and do-update removed — will be replaced with proper electron-updater flow)

// Config endpoint — expose config to renderer
ipcMain.handle('get-config', () => config);

// Settings: save and load (complementing the internal functions)
ipcMain.handle('save-settings', (_e, s) => {
  try {
    const current = loadSettings();
    const merged = { ...current, ...s };
    saveSettings(merged);
    return { ok: true };
  } catch (e) { return { ok: false, error: e.message }; }
});

ipcMain.handle('load-settings', () => {
  try { return loadSettings(); } catch { return {}; }
});

// System info
ipcMain.handle('get-sysinfo', async (_e, params) => {
  try {
    const { cpuSensorIndex = 0, gpuControllerIndex = 0, showDisk = false } = params || {};
    const si = require('systeminformation');
    const [cpu, cpuLoad, cpuTemp, graphics, mem, netStats, fsSize] = await Promise.all([
      si.cpu(),
      si.currentLoad(),
      si.cpuTemperature().catch(() => ({ main: null, cores: [], chipset: null, socket: null, processors: [] })),
      si.graphics(),
      si.mem(),
      si.networkStats(),
      si.fsSize()
    ]);

    // Build CPU sensor list (for picker UI)
    const cpuSensors = [];
    if (cpuTemp.main != null) cpuSensors.push({ index: 0, name: 'Main', value: cpuTemp.main });
    if (Array.isArray(cpuTemp.cores)) {
      cpuTemp.cores.forEach((v, i) => { if (v != null) cpuSensors.push({ index: cpuSensors.length, name: `Core ${i}`, value: v }); });
    }
    if (cpuTemp.chipset != null) cpuSensors.push({ index: cpuSensors.length, name: 'Chipset', value: cpuTemp.chipset });
    if (cpuTemp.socket != null) cpuSensors.push({ index: cpuSensors.length, name: 'Socket', value: cpuTemp.socket });
    if (cpuSensors.length === 0) cpuSensors.push({ index: 0, name: 'N/A', value: null });

    // Pick CPU temp by index
    const chosenCpuTemp = cpuSensors[cpuSensorIndex] ?? cpuSensors[0];
    const cpuTempVal = chosenCpuTemp?.value ?? null;

    // Build GPU list (for picker UI)
    const controllers = graphics.controllers || [];
    const gpuList = controllers.map((c, i) => ({ index: i, model: c.model || `GPU ${i}` }));

    // Pick GPU by index
    const gpu = controllers[gpuControllerIndex] || controllers[0] || null;
    const gpuTempVal = (gpu && gpu.temperatureGpu && gpu.temperatureGpu > 0) ? gpu.temperatureGpu : null;

    const net = netStats && netStats[0];
    const disk = fsSize.find(d => d.mount === 'C:\\' || d.mount === 'C:' || d.mount === '/') || fsSize[0];

    const result = {
      cpuSensors,
      gpuList,
      cpu: {
        usage: Math.round(cpuLoad.currentLoad || 0),
        speed: cpu.speed || 0,
        brand: cpu.brand || 'CPU',
        temp: cpuTempVal
      },
      gpu: {
        usage: gpu ? Math.round(gpu.utilizationGpu || 0) : 0,
        temp: gpuTempVal,
        model: gpu ? (gpu.model || 'GPU') : 'GPU'
      },
      ram: {
        usage: Math.round((mem.used / mem.total) * 100),
        usedGB: (mem.used / 1073741824).toFixed(1),
        totalGB: (mem.total / 1073741824).toFixed(1)
      },
      net: { txSec: net ? net.tx_sec : 0, rxSec: net ? net.rx_sec : 0 }
    };

    if (showDisk) {
      result.disk = { usage: disk ? Math.round(disk.use) : 0, mount: disk ? disk.mount : 'C:\\' };
    }

    return result;
  } catch (e) { return { error: e.message }; }
});

// Fast sysinfo — lightweight, called every 3s
ipcMain.handle('get-sysinfo-fast', async (_e, params) => {
  const si = require('systeminformation');
  const [cpuLoad, mem, netStats] = await Promise.all([
    si.currentLoad(),
    si.mem(),
    si.networkStats().catch(() => [])
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

// Slow sysinfo — heavier, called every 10s
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
