const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');

test('main process wires panel, tray, persistence, settings and lifecycle events', async (context) => {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'randnotizen-main-'));
  context.after(() => fs.rmSync(userData, { recursive: true, force: true }));

  const displays = [
    { id: 1, label: '', workArea: { x: 0, y: 0, width: 1920, height: 1080 } },
    { id: 2, label: 'Zweiter Monitor', workArea: { x: 1920, y: 0, width: 2560, height: 1440 } },
  ];
  const app = new EventEmitter();
  app.getPath = () => userData;
  app.exit = (code) => { app.exitCode = code; };
  app.getVersion = () => '0.2.0';
  app.getLoginItemSettings = () => ({ openAtLogin: Boolean(app.loginSettings?.openAtLogin) });
  app.setLoginItemSettings = (settings) => { app.loginSettings = settings; };

  class FakeBrowserWindow extends EventEmitter {
    constructor(options) {
      super();
      this.options = options;
      this.destroyed = false;
      this.webContents = {
        messages: [],
        send: (...args) => this.webContents.messages.push(args),
      };
      FakeBrowserWindow.instance = this;
    }
    isDestroyed() { return this.destroyed; }
    setAlwaysOnTop(...args) { this.alwaysOnTop = args; }
    setVisibleOnAllWorkspaces(...args) { this.visibleOnAllWorkspaces = args; }
    loadFile(file) { this.loadedFile = file; }
    setBounds(bounds) { this.bounds = bounds; }
    setIgnoreMouseEvents(value) { this.ignoreMouse = value; }
    show() { this.visible = true; }
    hide() { this.visible = false; this.focused = false; }
    focus() { this.focused = true; }
    isFocused() { return Boolean(this.focused); }
  }
  class FakeTray extends EventEmitter {
    constructor(icon) {
      super();
      this.icon = icon;
      this.destroyed = false;
      FakeTray.instance = this;
    }
    isDestroyed() { return this.destroyed; }
    setToolTip(value) { this.tooltip = value; }
    setContextMenu(value) { this.menu = value; }
  }

  const registered = {};
  const globalShortcut = {
    register(accelerator, callback) { registered[accelerator] = callback; return true; },
    unregisterAll() { globalShortcut.cleared = true; },
  };
  const handlers = new Map();
  const ipcMain = new EventEmitter();
  ipcMain.handle = (channel, handler) => handlers.set(channel, handler);
  const screen = new EventEmitter();
  screen.getAllDisplays = () => displays;
  screen.getPrimaryDisplay = () => displays[0];
  const Menu = { buildFromTemplate: (template) => template };
  const nativeImage = { createFromBuffer: () => ({ isEmpty: () => false }) };
  let saveDialogResult = { canceled: true };
  let openDialogResult = { canceled: true };
  const dialog = {
    showSaveDialog: async () => saveDialogResult,
    showOpenDialog: async () => openDialogResult,
  };
  const electron = {
    app, BrowserWindow: FakeBrowserWindow, dialog, globalShortcut, ipcMain, screen, Tray: FakeTray, Menu, nativeImage,
  };

  const originalLoad = Module._load;
  Module._load = function mockElectron(request, parent, isMain) {
    return request === 'electron' ? electron : originalLoad.call(this, request, parent, isMain);
  };
  try {
    delete require.cache[require.resolve('../src/main')];
    require('../src/main');
  } finally {
    Module._load = originalLoad;
  }

  app.emit('ready');
  const panel = FakeBrowserWindow.instance;
  const tray = FakeTray.instance;
  assert.equal(panel.options.width, 520);
  assert.match(panel.options.icon, /assets[\\/]icon\.ico$/);
  assert.match(panel.loadedFile, /renderer[\\/]index\.html$/);
  assert.equal(tray.tooltip, 'Randnotizen · Strg + Alt + N');

  panel.emit('ready-to-show');
  registered['CommandOrControl+Alt+N']();
  assert.equal(panel.visible, true);
  assert.equal(panel.focused, true);
  registered['CommandOrControl+Alt+N']();
  assert.equal(panel.visible, false);
  tray.emit('click');
  tray.emit('double-click');
  assert.equal(panel.visible, true);

  assert.equal(handlers.get('workspace:load')(), null);
  fs.writeFileSync(path.join(userData, 'notes.json'), JSON.stringify([{ title: 'Alt' }]));
  assert.deepEqual(handlers.get('workspace:load')(), [{ title: 'Alt' }]);
  const workspace = { version: 4, activeTopicId: null, topics: [], trash: [] };
  handlers.get('workspace:save')(null, workspace);
  assert.deepEqual(handlers.get('workspace:load')(), workspace);
  assert.throws(() => handlers.get('workspace:save')(null, null), /Ungültige/);

  const backupPath = path.join(userData, 'backup.json');
  saveDialogResult = { canceled: false, filePath: backupPath };
  assert.deepEqual(await handlers.get('workspace:export')(), { canceled: false, filePath: backupPath });
  assert.deepEqual(JSON.parse(fs.readFileSync(backupPath, 'utf8')), workspace);
  openDialogResult = { canceled: false, filePaths: [backupPath] };
  assert.deepEqual((await handlers.get('workspace:import')()).workspace, workspace);

  const listedDisplays = handlers.get('displays:list')();
  assert.equal(listedDisplays[0].label, 'Bildschirm 1');
  assert.equal(listedDisplays[1].primary, false);
  assert.deepEqual(handlers.get('settings:preview-position')(null, {
    displayId: '2', side: 'left',
  }), { displayId: '2', side: 'left' });
  assert.equal(handlers.get('settings:get')().displayId, 'primary');
  const updated = handlers.get('settings:update')(null, {
    displayId: '2', side: 'left', language: 'en', design: 'dark', font: 'lora', keepVisible: true,
  });
  assert.deepEqual(updated, {
    displayId: '2', side: 'left', language: 'en', design: 'dark', font: 'lora', keepVisible: true,
  });
  assert.equal(panel.bounds.x, 1920);
  assert.ok(panel.webContents.messages.some(([channel]) => channel === 'language:changed'));
  assert.ok(panel.webContents.messages.some(([channel]) => channel === 'design:changed'));

  panel.focused = false;
  panel.emit('blur');
  assert.equal(panel.visible, true);
  registered['CommandOrControl+Alt+N']();
  assert.equal(panel.focused, true);
  assert.equal(panel.visible, true);
  registered['CommandOrControl+Alt+N']();
  assert.equal(panel.visible, false);

  assert.deepEqual(tray.menu.map((item) => item.type || item.label), ['Open Edge Notes', 'separator', 'Exit']);
  assert.equal(handlers.get('app:version')(), '0.2.0');
  assert.equal(handlers.get('autostart:get')(), false);
  assert.equal(handlers.get('autostart:set')(null, true), true);
  assert.equal(app.loginSettings.openAtLogin, true);
  assert.ok(app.loginSettings.path);

  screen.emit('display-metrics-changed');
  screen.emit('display-added');
  screen.emit('display-removed');
  ipcMain.emit('panel:hide');
  panel.emit('blur');
  const closeEvent = { prevented: false, preventDefault() { this.prevented = true; } };
  panel.emit('close', closeEvent);
  assert.equal(closeEvent.prevented, true);

  const windowEvent = { prevented: false, preventDefault() { this.prevented = true; } };
  app.emit('window-all-closed', windowEvent);
  app.emit('will-quit');
  assert.equal(windowEvent.prevented, true);
  assert.equal(globalShortcut.cleared, true);
  tray.menu.at(-1).click();
  assert.equal(app.exitCode, 0);
});
