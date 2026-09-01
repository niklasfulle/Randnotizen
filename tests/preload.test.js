const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

test('preload exposes the complete renderer API and forwards IPC events', async () => {
  const invocations = [];
  const sends = [];
  const listeners = new Map();
  let exposedApi;
  const electron = {
    contextBridge: {
      exposeInMainWorld(name, api) {
        assert.equal(name, 'notesApp');
        exposedApi = api;
      },
    },
    ipcRenderer: {
      invoke(channel, payload) {
        invocations.push([channel, payload]);
        return Promise.resolve(channel);
      },
      send(channel, payload) {
        sends.push([channel, payload]);
      },
      on(channel, callback) {
        listeners.set(channel, callback);
      },
    },
  };

  const originalLoad = Module._load;
  Module._load = function mockElectron(request, parent, isMain) {
    return request === 'electron' ? electron : originalLoad.call(this, request, parent, isMain);
  };

  try {
    delete require.cache[require.resolve('../src/preload')];
    require('../src/preload');
  } finally {
    Module._load = originalLoad;
  }

  const workspace = { version: 2, topics: [] };
  const settings = { displayId: 'primary', side: 'left' };
  await exposedApi.loadWorkspace();
  await exposedApi.saveWorkspace(workspace);
  await exposedApi.exportWorkspace();
  await exposedApi.importWorkspace();
  await exposedApi.chooseTaskImage();
  await exposedApi.getSettings();
  await exposedApi.updateSettings(settings);
  await exposedApi.previewPosition(settings);
  await exposedApi.listDisplays();
  await exposedApi.getAutostart();
  await exposedApi.setAutostart(true);
  await exposedApi.getVersion();
  await exposedApi.getInstallPath();
  exposedApi.hide();

  assert.deepEqual(invocations, [
    ['workspace:load', undefined],
    ['workspace:save', workspace],
    ['workspace:export', undefined],
    ['workspace:import', undefined],
    ['task-image:choose', undefined],
    ['settings:get', undefined],
    ['settings:update', settings],
    ['settings:preview-position', settings],
    ['displays:list', undefined],
    ['autostart:get', undefined],
    ['autostart:set', true],
    ['app:version', undefined],
    ['app:install-path', undefined],
  ]);
  assert.deepEqual(sends, [['panel:hide', undefined]]);

  const received = [];
  exposedApi.onPanelState((value) => received.push(value));
  exposedApi.onLanguageChanged((value) => received.push(value));
  exposedApi.onDesignChanged((value) => received.push(value));
  exposedApi.onQuickCapture(() => received.push('quick-capture'));
  listeners.get('panel-state')({}, { open: true });
  listeners.get('language:changed')({}, 'en');
  listeners.get('design:changed')({}, 'dark');
  listeners.get('quick-capture:open')({});

  assert.deepEqual(received, [{ open: true }, 'en', 'dark', 'quick-capture']);
});
