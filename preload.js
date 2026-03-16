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
  signalrgbSetEnabled: (enabled) => ipcRenderer.invoke('signalrgb-set-enabled', enabled),
  signalrgbSetBrightness: (brightness) => ipcRenderer.invoke('signalrgb-set-brightness', brightness),
  spotifyAuthStart: () => ipcRenderer.invoke('spotify-auth-start'),
  spotifyRefreshToken: () => ipcRenderer.invoke('spotify-refresh-token'),
  testIntegration: (opts) => ipcRenderer.invoke('test-integration', opts),
  signalrgbDetectPort: () => ipcRenderer.invoke('signalrgb-detect-port'),

  // Generic API proxy
  apiGet: (url, headers, timeout) => ipcRenderer.invoke('api-get', { url, headers, timeout }),
  apiPost: (url, body, headers) => ipcRenderer.invoke('api-post', { url, body, headers }),
  apiPut: (url, body, headers) => ipcRenderer.invoke('api-put', { url, body, headers }),
  startSignalR: (opts) => ipcRenderer.invoke('start-signalr', opts),
  getAppVersion: () => ipcRenderer.invoke('app:get-version'),
  openAbout: () => ipcRenderer.invoke('open-about'),
  onConfigUpdated: (cb) => { const h = (_e, cfg) => cb(cfg); ipcRenderer.on('config-updated', h); return () => ipcRenderer.removeListener('config-updated', h); },
  onSonarrEvent: (cb) => { const h = (_e, d) => cb(d); ipcRenderer.on('sonarr-signalr-event', h); return () => ipcRenderer.removeListener('sonarr-signalr-event', h); },
  onRadarrEvent: (cb) => { const h = (_e, d) => cb(d); ipcRenderer.on('radarr-signalr-event', h); return () => ipcRenderer.removeListener('radarr-signalr-event', h); },

  // Shell
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // Setup
  openSetup: () => ipcRenderer.invoke('open-setup'),
  resetConfig: () => ipcRenderer.invoke('reset-config'),
  notifyConfigSaved: () => ipcRenderer.invoke('notify-config-saved'),
  setupComplete: () => ipcRenderer.invoke('setup-complete'),

  // Uptime Kuma (Socket.IO)
  fetchUptimeKuma: (cfg) => ipcRenderer.invoke('fetch-uptime-kuma', cfg),

  // Service health check (in-house pinger)
  checkServices: (services) => ipcRenderer.invoke('check-services', services),

  // Settings persistence
  saveSettings: (s) => ipcRenderer.invoke('save-settings', s),
  loadSettings: () => ipcRenderer.invoke('load-settings'),
  getConfig: () => ipcRenderer.invoke('get-config'),

  // Updates
  checkUpdate: () => ipcRenderer.invoke('check-update'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  getPendingUpdate: () => ipcRenderer.invoke('get-pending-update'),
  onUpdateAvailable: (cb) => {
    const handler = (_e, info) => cb(info);
    ipcRenderer.on('update-available', handler);
    return () => ipcRenderer.removeListener('update-available', handler);
  },
  onUpdateProgress: (cb) => {
    const handler = (_e, pct) => cb(pct);
    ipcRenderer.on('update-progress', handler);
    return () => ipcRenderer.removeListener('update-progress', handler);
  },
  onUpdateDownloaded: (cb) => {
    const handler = (_e) => cb();
    ipcRenderer.on('update-downloaded', handler);
    return () => ipcRenderer.removeListener('update-downloaded', handler);
  },
  onUpdateError: (cb) => {
    const handler = (_e, msg) => cb(msg);
    ipcRenderer.on('update-error', handler);
    return () => ipcRenderer.removeListener('update-error', handler);
  },
});
