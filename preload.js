const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('xeneon', {
  // Display picker
  getDisplays: () => ipcRenderer.invoke('get-displays'),
  selectDisplay: (id) => ipcRenderer.invoke('select-display', id),
  showPicker: () => ipcRenderer.invoke('show-picker'),

  // Data sources
  fetchSignalRGB: () => ipcRenderer.invoke('fetch-signalrgb'),
  activateEffect: (id) => ipcRenderer.invoke('activate-effect', id),
  fetchTautulli: () => ipcRenderer.invoke('fetch-tautulli'),
  fetchAxiom: () => ipcRenderer.invoke('fetch-axiom'),
  fetchAxiomAgents: () => ipcRenderer.invoke('fetch-axiom-agents'),
  getSysinfo: (params) => ipcRenderer.invoke('get-sysinfo', params),
  getSysinfoFast: (params) => ipcRenderer.invoke('get-sysinfo-fast', params),
  getSysinfoSlow: (params) => ipcRenderer.invoke('get-sysinfo-slow', params),

  // Home Assistant
  haGetState: (entityId) => ipcRenderer.invoke('ha-get-state', entityId),
  haCallService: (domain, service, data) => ipcRenderer.invoke('ha-call-service', { domain, service, data }),

  // Updates (electron-updater)
  onUpdateAvailable: (cb) => ipcRenderer.on('update-available', (_e, version) => cb(version)),
  onUpdateDownloaded: (cb) => ipcRenderer.on('update-downloaded', (_e, version) => cb(version)),
  installUpdate: () => ipcRenderer.invoke('install-update'),

  // Config
  getConfig: () => ipcRenderer.invoke('get-config'),

  // Settings persistence
  saveSettings: (s) => ipcRenderer.invoke('save-settings', s),
  loadSettings: () => ipcRenderer.invoke('load-settings'),
});
