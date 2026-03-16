const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('orbitAbout', {
  getVersion: () => ipcRenderer.invoke('app:get-version'),
  getPendingUpdate: () => ipcRenderer.invoke('get-pending-update'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  close: () => ipcRenderer.send('about:close')
});
