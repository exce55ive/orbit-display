const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('orbit', {
  // Display picker
  getDisplays: () => ipcRenderer.invoke('get-displays'),
  selectDisplay: (id) => ipcRenderer.invoke('select-display', id),
  showPicker: () => ipcRenderer.invoke('show-picker'),

  // Config
  saveConfig: (cfg) => ipcRenderer.invoke('save-config', cfg),
  loadConfig: () => ipcRenderer.invoke('load-config'),

  // System
  getSysinfo: (params) => ipcRenderer.invoke('get-sysinfo', params),
  getSysinfoFast: () => ipcRenderer.invoke('get-sysinfo-fast'),
  getSysinfoSlow: (params) => ipcRenderer.invoke('get-sysinfo-slow', params),

  // Home Assistant
  haGetState: (id) => ipcRenderer.invoke('ha-get-state', id),
  haCallService: (d, s, data) => ipcRenderer.invoke('ha-call-service', { domain: d, service: s, data }),

  // Tautulli
  fetchTautulli: () => ipcRenderer.invoke('fetch-tautulli'),

  // SignalRGB (legacy direct)
  fetchSignalRGB: () => ipcRenderer.invoke('fetch-signalrgb'),
  activateEffect: (id) => ipcRenderer.invoke('activate-effect', id),

  // Generic API proxy
  apiGet: (url, headers) => ipcRenderer.invoke('api-get', { url, headers }),
  apiPost: (url, body, headers) => ipcRenderer.invoke('api-post', { url, body, headers }),

  // Shell
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // Setup
  openSetup: () => ipcRenderer.invoke('open-setup'),
  setupComplete: () => ipcRenderer.invoke('setup-complete'),

  // Settings persistence
  saveSettings: (s) => ipcRenderer.invoke('save-settings', s),
  loadSettings: () => ipcRenderer.invoke('load-settings'),
  getConfig: () => ipcRenderer.invoke('get-config'),

  // Updates
  checkUpdate: () => ipcRenderer.invoke('check-update'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  getPendingUpdate: () => ipcRenderer.invoke('get-pending-update'),
  onUpdateAvailable: (cb) => ipcRenderer.on('update-available', (_e, info) => cb(info)),
  onUpdateProgress: (cb) => ipcRenderer.on('update-progress', (_e, pct) => cb(pct)),
  onUpdateDownloaded: (cb) => ipcRenderer.on('update-downloaded', (_e) => cb()),
  onUpdateError: (cb) => ipcRenderer.on('update-error', (_e, msg) => cb(msg)),
});
