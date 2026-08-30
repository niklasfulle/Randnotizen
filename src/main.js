const { app, BrowserWindow, globalShortcut, ipcMain, screen, Tray, Menu, nativeImage } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { getPanelBounds, resolveDisplay } = require('./panel-bounds');
const { createTrayIconPng } = require('./tray-icon');
const { normalizeLanguage, normalizeDesign, normalizeFont, translate } = require('./translations');
const { createWorkspaceStore } = require('./workspace-store');

const PANEL_WIDTH = 520;
const HOTKEY = 'CommandOrControl+Alt+N';
const APP_ICON = path.join(__dirname, 'assets', 'icon.ico');

let panel;
let tray;
let isOpen = false;
let workspaceStore;
let panelSettings = {
  displayId: 'primary',
  side: 'right',
  language: 'de',
  design: 'paper',
  font: 'segoe',
  keepVisible: false,
};

function t(key, variables) {
  return translate(panelSettings.language, key, variables);
}

function settingsFile() {
  return path.join(app.getPath('userData'), 'settings.json');
}

function normalizePanelSettings(settings = {}) {
  const legacyDesign = settings.theme === 'dark' ? 'dark' : 'paper';
  return {
    displayId: typeof settings.displayId === 'string' ? settings.displayId : 'primary',
    side: settings.side === 'left' ? 'left' : 'right',
    language: normalizeLanguage(settings.language),
    design: normalizeDesign(settings.design || legacyDesign),
    font: normalizeFont(settings.font),
    keepVisible: Boolean(settings.keepVisible),
  };
}

function loadSettings() {
  try {
    return normalizePanelSettings(JSON.parse(fs.readFileSync(settingsFile(), 'utf8')));
  } catch {
    return normalizePanelSettings();
  }
}

function saveSettings(settings) {
  fs.writeFileSync(settingsFile(), JSON.stringify(settings, null, 2), 'utf8');
}

function configuredDisplay(settings = panelSettings) {
  return resolveDisplay(screen.getAllDisplays(), settings.displayId, screen.getPrimaryDisplay());
}

function panelBounds(settings = panelSettings) {
  return getPanelBounds(
    configuredDisplay(settings).workArea,
    PANEL_WIDTH,
    settings.side,
  );
}

function setPanelState(open) {
  isOpen = open;
  if (!panel || panel.isDestroyed()) return;

  panel.webContents.send('panel-state', { open });
  if (!open) {
    panel.hide();
    return;
  }

  panel.setBounds(panelBounds());
  panel.setIgnoreMouseEvents(false);
  panel.show();
}

function togglePanel() {
  if (!isOpen) return showPanel();
  if (!panel.isFocused()) return panel.focus();
  setPanelState(false);
}

function showPanel() {
  setPanelState(true);
  panel.focus();
}

function workspaceFile() {
  return path.join(app.getPath('userData'), 'workspace.json');
}

function workspaceDatabaseFile() {
  return path.join(app.getPath('userData'), 'workspace.sqlite');
}

function legacyNoteFile() {
  return path.join(app.getPath('userData'), 'notes.json');
}

function loadWorkspace() {
  return workspaceStore.loadWorkspace();
}

function saveWorkspace(_event, workspace) {
  workspaceStore.saveWorkspace(workspace);
}

function listDisplays() {
  const primaryId = screen.getPrimaryDisplay().id;
  return screen.getAllDisplays().map((display, index) => ({
    id: String(display.id),
    label: display.label || `${t('display')} ${index + 1}`,
    primary: display.id === primaryId,
    size: `${display.workArea.width} × ${display.workArea.height}`,
  }));
}

function updatePanelSettings(_event, nextSettings) {
  const previousLanguage = panelSettings.language;
  const previousDesign = panelSettings.design;
  panelSettings = normalizePanelSettings(nextSettings);
  saveSettings(panelSettings);
  setPanelState(isOpen);
  refreshTrayMenu();
  if (previousLanguage !== panelSettings.language && panel && !panel.isDestroyed()) {
    panel.webContents.send('language:changed', panelSettings.language);
  }
  if (previousDesign !== panelSettings.design && panel && !panel.isDestroyed()) {
    panel.webContents.send('design:changed', panelSettings.design);
  }
  return panelSettings;
}

function previewPanelPosition(_event, preview) {
  const previewSettings = {
    ...panelSettings,
    displayId: typeof preview?.displayId === 'string' ? preview.displayId : panelSettings.displayId,
    side: preview?.side === 'left' ? 'left' : 'right',
  };
  panel.setBounds(panelBounds(previewSettings));
  return { displayId: previewSettings.displayId, side: previewSettings.side };
}

function autostartExecutable() {
  return process.env.PORTABLE_EXECUTABLE_FILE || process.execPath;
}

function getAutostart() {
  return app.getLoginItemSettings({ path: autostartExecutable() }).openAtLogin;
}

function setAutostart(_event, enabled) {
  app.setLoginItemSettings({
    openAtLogin: Boolean(enabled),
    path: autostartExecutable(),
  });
  return getAutostart();
}

function createPanel() {
  panel = new BrowserWindow({
    ...panelBounds(),
    frame: false,
    resizable: false,
    maximizable: false,
    minimizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    show: false,
    icon: APP_ICON,
    backgroundColor: '#15191f',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  panel.setAlwaysOnTop(true, 'floating');
  panel.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  panel.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  panel.once('ready-to-show', () => {
    setPanelState(false);
  });

  panel.on('blur', () => {
    if (!panelSettings.keepVisible) setPanelState(false);
  });
  panel.on('close', (event) => {
    event.preventDefault();
    setPanelState(false);
  });
}

function refreshTrayMenu() {
  if (!tray || tray.isDestroyed()) return;
  tray.setToolTip(t('trayTooltip'));
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: t('trayOpen'), accelerator: HOTKEY, click: () => showPanel() },
    { type: 'separator' },
    { label: t('trayExit'), click: () => app.exit(0) },
  ]));
}

function createTray() {
  const trayIcon = nativeImage.createFromBuffer(createTrayIconPng());
  if (trayIcon.isEmpty()) throw new Error('Das Infobereich-Icon konnte nicht erstellt werden.');
  tray = new Tray(trayIcon);
  tray.setToolTip(t('trayTooltip'));
  refreshTrayMenu();
  tray.on('click', () => showPanel());
  tray.on('double-click', () => showPanel());
}

function initializeApplication() {
  panelSettings = loadSettings();
  workspaceStore = createWorkspaceStore({
    databasePath: workspaceDatabaseFile(),
    legacyPaths: [workspaceFile(), legacyNoteFile()],
  });
  createPanel();
  createTray();
  globalShortcut.register(HOTKEY, togglePanel);

  ipcMain.handle('workspace:load', loadWorkspace);
  ipcMain.handle('workspace:save', saveWorkspace);
  ipcMain.handle('settings:get', () => panelSettings);
  ipcMain.handle('settings:update', updatePanelSettings);
  ipcMain.handle('settings:preview-position', previewPanelPosition);
  ipcMain.handle('displays:list', listDisplays);
  ipcMain.handle('autostart:get', getAutostart);
  ipcMain.handle('autostart:set', setAutostart);
  ipcMain.handle('app:version', () => app.getVersion());
  ipcMain.on('panel:hide', () => setPanelState(false));
  const repositionPanel = () => {
    setPanelState(isOpen);
    refreshTrayMenu();
  };
  screen.on('display-metrics-changed', repositionPanel);
  screen.on('display-added', repositionPanel);
  screen.on('display-removed', repositionPanel);
}

app.once('ready', initializeApplication);

app.on('will-quit', () => {
  workspaceStore?.close();
  globalShortcut.unregisterAll();
});
app.on('window-all-closed', (event) => event.preventDefault());
