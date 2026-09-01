const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('notesApp', {
  loadWorkspace: () => ipcRenderer.invoke('workspace:load'),
  saveWorkspace: (workspace) => ipcRenderer.invoke('workspace:save', workspace),
  exportWorkspace: () => ipcRenderer.invoke('workspace:export'),
  importWorkspace: () => ipcRenderer.invoke('workspace:import'),
  chooseTaskImage: () => ipcRenderer.invoke('task-image:choose'),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  updateSettings: (settings) => ipcRenderer.invoke('settings:update', settings),
  previewPosition: (position) => ipcRenderer.invoke('settings:preview-position', position),
  listDisplays: () => ipcRenderer.invoke('displays:list'),
  getAutostart: () => ipcRenderer.invoke('autostart:get'),
  setAutostart: (enabled) => ipcRenderer.invoke('autostart:set', enabled),
  getVersion: () => ipcRenderer.invoke('app:version'),
  getReleaseNotes: () => ipcRenderer.invoke('release-notes:get'),
  dismissReleaseNotes: () => ipcRenderer.invoke('release-notes:dismiss'),
  getInstallPath: () => ipcRenderer.invoke('app:install-path'),
  hide: () => ipcRenderer.send('panel:hide'),
  onPanelState: (callback) => ipcRenderer.on('panel-state', (_event, state) => callback(state)),
  onLanguageChanged: (callback) => ipcRenderer.on('language:changed', (_event, language) => callback(language)),
  onDesignChanged: (callback) => ipcRenderer.on('design:changed', (_event, design) => callback(design)),
  onQuickCapture: (callback) => ipcRenderer.on('quick-capture:open', () => callback()),
});
