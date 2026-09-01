const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'index.html'), 'utf8');
const rendererPath = require.resolve('../src/renderer/renderer');
const translations = require('../src/translations');

function flush() {
  return new Promise((resolve) => setImmediate(resolve));
}

async function bootRenderer(loadedWorkspace, releaseNotes = { version: '0.2.3', dismissed: true }) {
  const dom = new JSDOM(html, { url: 'https://randnotizen.local/' });
  let settings = {
    displayId: 'primary', side: 'right', language: 'de', design: 'paper', font: 'inter', keepVisible: false,
  };
  let autostart = true;
  const saved = [];
  const autostartUpdates = [];
  const callbacks = {};
  const positionPreviews = [];
  const backupActions = [];
  const notesApp = {
    loadWorkspace: async () => loadedWorkspace,
    saveWorkspace: async (workspace) => saved.push(structuredClone(workspace)),
    exportWorkspace: async () => {
      backupActions.push('export');
      return { canceled: false, filePath: 'backup.json' };
    },
    importWorkspace: async () => {
      backupActions.push('import');
      return { canceled: false, workspace: structuredClone(saved.at(-1)) };
    },
    getSettings: async () => ({ ...settings }),
    updateSettings: async (next) => {
      settings = { ...settings, ...next };
      return { ...settings };
    },
    previewPosition: async (position) => positionPreviews.push(position),
    listDisplays: async () => [
      { id: '1', label: 'Monitor A', primary: true, size: '1920 × 1080' },
      { id: '2', label: 'Monitor B', primary: false, size: '2560 × 1440' },
    ],
    getAutostart: async () => autostart,
    setAutostart: async (enabled) => {
      autostart = enabled;
      autostartUpdates.push(enabled);
      return enabled;
    },
    getVersion: async () => '0.2.3',
    getReleaseNotes: async () => ({ ...releaseNotes }),
    dismissReleaseNotes: async () => {
      releaseNotes.dismissed = true;
      return { ...releaseNotes };
    },
    getInstallPath: async () => 'C:\\Programme\\Randnotizen',
    chooseTaskImage: async () => ({
      canceled: false,
      image: { name: 'planung.png', dataUrl: 'data:image/png;base64,AQID' },
    }),
    hide: () => { callbacks.hidden = true; },
    onPanelState: (callback) => { callbacks.panelState = callback; },
    onLanguageChanged: (callback) => { callbacks.languageChanged = callback; },
    onDesignChanged: (callback) => { callbacks.designChanged = callback; },
    onQuickCapture: (callback) => { callbacks.quickCapture = callback; },
  };

  globalThis.document = dom.window.document;
  globalThis.RandnotizenI18n = translations;
  globalThis.notesApp = notesApp;
  globalThis.requestAnimationFrame = (callback) => callback();
  delete require.cache[rendererPath];
  require(rendererPath);
  dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
  await flush();
  await flush();

  return {
    dom, saved, callbacks, autostartUpdates, positionPreviews, backupActions, getSettings: () => settings,
  };
}

function submit(dom, selector, value) {
  const form = dom.window.document.querySelector(selector);
  const input = form.querySelector('input');
  input.value = value;
  form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
}

function keydown(dom, init) {
  dom.window.document.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    ...init,
  }));
}

test.afterEach(() => {
  delete require.cache[rendererPath];
  delete globalThis.document;
  delete globalThis.RandnotizenI18n;
  delete globalThis.notesApp;
  delete globalThis.requestAnimationFrame;
});

test('renderer shows release notes once per version and remembers dismissal', async () => {
  const releaseNotes = { version: '0.2.3', dismissed: false };
  const { dom } = await bootRenderer({
    version: 6,
    activeTopicId: 'topic-a',
    topics: [{ id: 'topic-a', title: 'Arbeit', lists: [] }],
  }, releaseNotes);
  const { document } = dom.window;

  assert.equal(document.querySelector('#release-notes-overlay').hidden, false);
  assert.match(document.querySelector('#release-notes-intro').textContent, /0\.2\.3/);
  assert.equal(document.querySelectorAll('.release-note').length, 5);
  document.querySelector('#release-notes-dismiss-checkbox').checked = true;
  document.querySelector('#close-release-notes-button').click();
  await flush();

  assert.equal(document.querySelector('#release-notes-overlay').hidden, true);
  assert.equal(releaseNotes.dismissed, true);
});

test('renderer adds a task to the selected list through quick capture', async () => {
  const { dom, saved, callbacks } = await bootRenderer({
    version: 6,
    activeTopicId: 'topic-a',
    topics: [
      { id: 'topic-a', title: 'Arbeit', lists: [{ id: 'list-a', title: 'Heute', items: [] }] },
      { id: 'topic-b', title: 'Privat', lists: [{ id: 'list-b', title: 'Einkaufen', items: [] }] },
    ],
  });
  const { document } = dom.window;

  callbacks.quickCapture();
  assert.equal(document.querySelector('#quick-capture-overlay').hidden, false);
  assert.equal(document.querySelector('#quick-capture-list').options.length, 2);
  assert.equal(document.activeElement, document.querySelector('#quick-capture-input'));

  document.querySelector('#quick-capture-list').value = 'list-b';
  document.querySelector('#quick-capture-input').value = 'Milch kaufen';
  document.querySelector('#quick-capture-form').dispatchEvent(new dom.window.Event('submit', {
    bubbles: true,
    cancelable: true,
  }));
  await flush();

  assert.equal(document.querySelector('#quick-capture-overlay').hidden, true);
  assert.equal(saved.at(-1).topics[1].lists[0].items[0].text, 'Milch kaufen');
});

test('renderer supports topics, lists, tasks, shortcuts, settings and confirmations', async () => {
  const loaded = {
    version: 2,
    activeTopicId: 'topic-a',
    topics: [
      {
        id: 'topic-a',
        title: 'Arbeit',
        lists: [
          {
            id: 'list-a',
            title: 'Heute',
            items: [
              { id: 'item-a', text: 'Testen', completed: false },
              { id: 'item-b', text: 'Bauen', completed: true },
            ],
          },
          { id: 'list-b', title: 'Später', items: [] },
        ],
      },
      { id: 'topic-b', title: 'Privat', lists: [] },
    ],
  };
  const {
    dom, saved, callbacks, autostartUpdates, positionPreviews, getSettings,
  } = await bootRenderer(loaded);
  const { document } = dom.window;

  const shortcutDock = document.querySelector('#shortcut-dock');
  const shortcutDockToggle = document.querySelector('#shortcut-dock-toggle');
  assert.equal(shortcutDockToggle.tagName, 'BUTTON');
  shortcutDockToggle.click();
  assert.equal(shortcutDock.classList.contains('collapsed'), true);
  assert.equal(shortcutDockToggle.getAttribute('aria-expanded'), 'false');
  shortcutDockToggle.click();
  assert.equal(shortcutDock.classList.contains('collapsed'), false);
  assert.equal(shortcutDockToggle.getAttribute('aria-expanded'), 'true');

  assert.equal(document.querySelector('#active-topic-title').textContent, 'Arbeit');
  assert.equal(document.querySelector('#topic-progress-label').textContent, '50%');
  assert.equal(document.documentElement.dataset.design, 'paper');
  assert.equal(document.documentElement.dataset.font, 'inter');
  assert.equal(document.documentElement.dataset.textScale, '1.250');
  assert.equal(document.documentElement.style.getPropertyValue('--text-scale'), '1.250');
  assert.equal(document.querySelectorAll('.checklist-card').length, 2);
  assert.deepEqual(
    [...document.querySelectorAll('.item-number')].map((element) => element.textContent),
    ['1.', '2.'],
  );

  keydown(dom, { altKey: true, code: 'Digit1' });
  assert.equal(document.activeElement, document.querySelector('.checklist-card .item-form input'));
  keydown(dom, { ctrlKey: true, code: 'Digit1' });
  assert.equal(document.querySelector('.checklist-item.keyboard-selected .item-number').textContent, '1.');
  assert.equal(saved.at(-1).topics[0].lists[0].items[0].completed, false);
  keydown(dom, { altKey: true, code: 'Digit2' });
  assert.equal(document.querySelector('.checklist-item.keyboard-selected'), null);
  document.querySelector('.checklist-item').dispatchEvent(
    new dom.window.Event('pointerdown', { bubbles: true }),
  );
  assert.equal(document.querySelector('.checklist-item.keyboard-selected .item-number').textContent, '1.');
  keydown(dom, { code: 'Space' });
  await flush();
  assert.equal(saved.at(-1).topics[0].lists[0].items[0].completed, true);
  keydown(dom, { ctrlKey: true, code: 'ArrowDown' });
  assert.equal(document.querySelector('.checklist-item.keyboard-selected .item-number').textContent, '2.');
  keydown(dom, { ctrlKey: true, code: 'ArrowDown' });
  assert.equal(document.querySelector('.checklist-item.keyboard-selected .item-number').textContent, '2.');
  keydown(dom, { ctrlKey: true, code: 'ArrowUp' });
  assert.equal(document.querySelector('.checklist-item.keyboard-selected .item-number').textContent, '1.');

  keydown(dom, { ctrlKey: true, shiftKey: true, code: 'KeyT' });
  assert.equal(document.activeElement, document.querySelector('#topic-input'));
  keydown(dom, { ctrlKey: true, shiftKey: true, code: 'KeyL' });
  assert.equal(document.activeElement, document.querySelector('#list-input'));
  keydown(dom, { ctrlKey: true, code: 'KeyF' });
  assert.equal(document.activeElement, document.querySelector('#search-input'));

  submit(dom, '#topic-form', 'Neues Thema');
  await flush();
  assert.equal(document.querySelector('#active-topic-title').textContent, 'Neues Thema');
  assert.equal(document.querySelector('.topic-tab.active').classList.contains('motion-enter'), true);
  assert.equal(document.activeElement, document.querySelector('#list-input'));
  submit(dom, '#list-form', 'Neue Liste');
  await flush();
  assert.equal(document.querySelector('.checklist-card h3').textContent, 'Neue Liste');
  assert.equal(document.querySelector('.checklist-card').classList.contains('motion-enter'), true);
  assert.equal(document.activeElement, document.querySelector('.item-form input'));
  submit(dom, '.item-form', 'Erste Aufgabe');
  await flush();
  assert.equal(document.querySelector('.checklist-item .item-text').textContent, 'Erste Aufgabe');
  assert.equal(document.querySelector('.checklist-item').classList.contains('motion-enter'), true);
  assert.equal(document.activeElement, document.querySelector('.item-form input'));

  document.querySelector('.item-details-toggle').click();
  const description = document.querySelector('.item-description');
  const descriptionToggle = document.querySelector('.item-description-toggle');
  assert.equal(description.hidden, false);
  assert.equal(descriptionToggle.textContent, '−');
  descriptionToggle.click();
  assert.equal(description.hidden, true);
  assert.equal(descriptionToggle.textContent, '+');
  assert.equal(descriptionToggle.getAttribute('aria-expanded'), 'false');
  descriptionToggle.click();
  assert.equal(description.hidden, false);
  assert.equal(descriptionToggle.textContent, '−');
  assert.equal(descriptionToggle.getAttribute('aria-expanded'), 'true');
  assert.equal(document.activeElement, description);
  description.value = 'Release sorgfältig vorbereiten';
  description.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  await flush();
  submit(dom, '.substep-form', 'Smoke-Test ausführen');
  await flush();
  assert.equal(document.querySelector('.substep-text').textContent, 'Smoke-Test ausführen');
  assert.equal(document.querySelector('.substep-item').classList.contains('motion-enter'), true);
  document.querySelector('.substep-checkbox').click();
  await flush();
  document.querySelector('.item-main-row .task-checkbox').click();
  await flush();
  assert.equal(document.querySelector('.checklist-item').classList.contains('completed'), true);
  assert.equal(document.querySelector('.item-details').hidden, true);
  assert.equal(document.querySelector('.item-details-toggle').getAttribute('aria-expanded'), 'false');
  document.querySelector('.item-details-toggle').click();
  assert.equal(document.querySelector('.item-details').hidden, false);
  assert.equal(document.querySelector('.item-description').disabled, true);
  assert.equal(document.querySelector('.substep-form input').disabled, true);
  assert.equal(document.querySelector('.substep-form button').disabled, true);
  assert.equal(document.querySelector('.substep-checkbox').disabled, true);
  assert.equal(document.querySelector('.remove-substep-button').disabled, true);
  submit(dom, '.substep-form', 'Darf nicht ergänzt werden');
  await flush();
  assert.equal(saved.at(-1).topics.at(-1).lists[0].items[0].details, 'Release sorgfältig vorbereiten');
  assert.equal(saved.at(-1).topics.at(-1).lists[0].items[0].steps[0].completed, true);
  assert.equal(saved.at(-1).topics.at(-1).lists[0].items[0].steps.length, 1);

  document.querySelector('.remove-item-button').click();
  await flush();
  assert.equal(document.querySelectorAll('.checklist-item').length, 0);

  document.querySelector('.delete-list-button').click();
  assert.equal(document.querySelector('#confirm-overlay').hidden, false);
  document.querySelector('#cancel-confirm-button').click();
  await flush();
  assert.equal(document.querySelectorAll('.checklist-card').length, 1);
  document.querySelector('.delete-list-button').click();
  document.querySelector('#accept-confirm-button').click();
  await flush();
  assert.equal(document.querySelectorAll('.checklist-card').length, 0);

  document.querySelector('#open-settings-button').click();
  await flush();
  await flush();
  assert.equal(document.querySelector('#settings-overlay').hidden, false);
  assert.equal(document.querySelector('.settings-popover').tagName, 'DIALOG');
  assert.equal(document.querySelectorAll('.settings-group').length, 7);
  assert.equal([...document.querySelectorAll('.settings-group')].every((group) => !group.open), true);
  document.querySelectorAll('.settings-group')[2].open = true;
  assert.equal(document.querySelectorAll('.settings-group')[2].open, true);
  assert.equal(document.querySelector('#save-status').tagName, 'OUTPUT');
  assert.equal(document.querySelector('#version-label').textContent, '0.2.3');
  assert.equal(document.querySelector('#install-path-label').textContent, 'C:\\Programme\\Randnotizen');
  assert.equal(document.querySelector('#settings-form button[type="submit"]').textContent, 'SPEICHERN');
  assert.equal(
    document.querySelector('.copyright-label').textContent,
    '© 2026 Niklas Fulle',
  );
  assert.equal(document.querySelector('#autostart-checkbox').checked, true);
  assert.match(document.querySelector('#display-select option:nth-child(2)').textContent, /Primär/);
  assert.equal(document.querySelectorAll('input[name="design"]').length, 8);
  const darkDesign = document.querySelector('input[name="design"][value="dark"]');
  assert.equal(document.querySelector('input[name="design"][value="paper"]').checked, true);
  document.querySelector('input[name="design"][value="pastel"]').click();
  assert.equal(document.documentElement.dataset.design, 'pastel');
  assert.equal(document.documentElement.dataset.theme, 'light');
  darkDesign.click();
  assert.equal(document.documentElement.dataset.design, 'dark');
  assert.equal(getSettings().design, 'paper');
  document.querySelector('#font-select').value = 'lora';
  document.querySelector('#font-select').dispatchEvent(new dom.window.Event('change'));
  assert.equal(document.documentElement.dataset.font, 'lora');
  assert.equal(getSettings().font, 'inter');
  document.querySelector('#close-settings-button').click();
  assert.equal(document.documentElement.dataset.design, 'paper');
  assert.equal(document.documentElement.dataset.font, 'inter');

  document.querySelector('#open-settings-button').click();
  await flush();
  document.querySelector('#language-setting').click();
  document.querySelector('#display-select').value = '2';
  document.querySelector('#display-select').dispatchEvent(new dom.window.Event('change'));
  document.querySelector('#side-select').value = 'left';
  document.querySelector('#side-select').dispatchEvent(new dom.window.Event('change'));
  document.querySelector('input[name="design"][value="dark"]').click();
  document.querySelector('#font-select').value = 'lora';
  document.querySelector('#font-select').dispatchEvent(new dom.window.Event('change'));
  document.querySelector('#autostart-checkbox').checked = false;
  document.querySelector('#keep-visible-checkbox').checked = true;
  document.querySelector('#settings-form').dispatchEvent(
    new dom.window.Event('submit', { bubbles: true, cancelable: true }),
  );
  await flush();
  assert.deepEqual(getSettings(), {
    displayId: '2', side: 'left', language: 'en', design: 'dark', font: 'lora', keepVisible: true,
  });
  assert.deepEqual(positionPreviews, [
    { displayId: 'primary', side: 'right' },
    { displayId: '2', side: 'right' },
    { displayId: '2', side: 'left' },
  ]);
  assert.deepEqual(autostartUpdates, [false]);
  assert.equal(document.documentElement.lang, 'en');
  assert.equal(
    document.querySelector('.copyright-label').textContent,
    '© 2026 Niklas Fulle',
  );
  assert.equal(document.documentElement.dataset.theme, 'dark');
  assert.equal(document.documentElement.dataset.design, 'dark');
  assert.equal(document.documentElement.dataset.font, 'lora');
  assert.equal(document.documentElement.dataset.side, 'left');
  assert.equal(document.querySelector('#save-status').textContent, 'Settings saved.');
  document.querySelector('#close-settings-button').click();
  assert.equal(document.querySelector('#settings-overlay').hidden, true);

  document.querySelector('#open-settings-button').click();
  await flush();
  document.querySelector('#display-select').value = 'primary';
  document.querySelector('#display-select').dispatchEvent(new dom.window.Event('change'));
  keydown(dom, { key: 'Escape', code: 'Escape' });
  assert.equal(document.querySelector('#settings-overlay').hidden, true);
  assert.deepEqual(positionPreviews.at(-1), { displayId: '2', side: 'left' });

  callbacks.languageChanged('de');
  callbacks.designChanged('paper');
  callbacks.panelState({ open: true });
  assert.equal(document.querySelector('.panel').classList.contains('panel-opening'), true);
  callbacks.panelState({ open: false });
  assert.equal(document.querySelector('.panel').classList.contains('panel-opening'), false);
  callbacks.panelState({ open: true });
  assert.equal(document.querySelector('.panel').classList.contains('panel-opening'), true);
  document.querySelector('#hide-button').click();
  assert.equal(callbacks.hidden, true);

  document.querySelector('#delete-topic-button').click();
  document.querySelector('#confirm-overlay').click();
  await flush();
  assert.equal(document.querySelector('#active-topic-title').textContent, 'Neues Thema');
  document.querySelector('#delete-topic-button').click();
  keydown(dom, { key: 'Escape', code: 'Escape' });
  await flush();
  document.querySelector('#delete-topic-button').click();
  document.querySelector('#accept-confirm-button').click();
  await flush();
  assert.notEqual(document.querySelector('#active-topic-title').textContent, 'Neues Thema');
});

test('renderer handles priorities, archives, sorting, backups and recoverable deletion', async () => {
  const loaded = {
    version: 4,
    activeTopicId: 'topic-a',
    trash: [],
    topics: [{
      id: 'topic-a',
      title: 'Release',
      lists: [{
        id: 'list-a',
        title: 'Plan',
        items: [
          { id: 'item-a', text: 'Bauen', completed: false, priority: 'none', archived: false, details: '', image: null, steps: [] },
          { id: 'item-b', text: 'Testen', completed: true, priority: 'medium', archived: false, details: '', steps: [] },
        ],
      }],
    }],
  };
  const { dom, saved, backupActions } = await bootRenderer(loaded);
  const { document } = dom.window;

  const priority = document.querySelector('.priority-sticker');
  const priorityMenu = document.querySelector('.priority-menu');
  assert.equal(priorityMenu.hidden, true);
  priority.click();
  assert.equal(priorityMenu.hidden, false);
  priorityMenu.querySelector('[data-priority="high"]').click();
  await flush();
  const updatedPriority = document.querySelector('.priority-sticker');
  assert.equal(updatedPriority.classList.contains('priority-high'), true);
  assert.equal(updatedPriority.textContent, 'Hoch');
  assert.equal(saved.at(-1).topics[0].lists[0].items[0].priority, 'high');

  document.querySelector('.item-image-button').click();
  await flush();
  assert.equal(document.querySelector('.item-image-button').classList.contains('has-image'), true);
  assert.deepEqual(saved.at(-1).topics[0].lists[0].items[0].image, {
    name: 'planung.png', dataUrl: 'data:image/png;base64,AQID',
  });
  document.querySelector('.item-image-button').click();
  assert.equal(document.querySelector('#image-overlay').hidden, false);
  assert.equal(document.querySelector('#task-image-preview').getAttribute('src'), 'data:image/png;base64,AQID');
  document.querySelector('#remove-preview-image-button').click();
  await flush();
  assert.equal(document.querySelector('#image-overlay').hidden, true);
  assert.equal(saved.at(-1).topics[0].lists[0].items[0].image, null);

  document.querySelector('.archive-completed-button').click();
  await flush();
  assert.equal(document.querySelectorAll('.checklist-item').length, 1);
  assert.equal(document.querySelector('.archive-count').textContent, '1');
  document.querySelector('.archive-item button').click();
  await flush();
  assert.equal(document.querySelectorAll('.checklist-item').length, 2);

  let rows = [...document.querySelectorAll('.checklist-item')];
  rows[0].dispatchEvent(new dom.window.Event('dragstart', { bubbles: true }));
  rows[1].dispatchEvent(new dom.window.Event('dragover', { bubbles: true, cancelable: true }));
  rows[1].dispatchEvent(new dom.window.Event('drop', { bubbles: true, cancelable: true }));
  await flush();
  assert.equal(saved.at(-1).topics[0].lists[0].items[0].id, 'item-b');

  document.querySelector('.remove-item-button').click();
  await flush();
  assert.equal(saved.at(-1).trash.length, 1);
  keydown(dom, { ctrlKey: true, code: 'KeyZ' });
  await flush();
  assert.equal(document.querySelectorAll('.checklist-item').length, 2);
  assert.equal(saved.at(-1).trash.length, 0);

  document.querySelector('.remove-item-button').click();
  await flush();
  document.querySelector('#open-settings-button').click();
  await flush();
  await flush();
  assert.equal(document.querySelector('#trash-count').textContent, '1');
  document.querySelector('#export-button').click();
  await flush();
  assert.deepEqual(backupActions, ['export']);
  document.querySelector('#import-button').click();
  document.querySelector('#accept-confirm-button').click();
  await flush();
  assert.deepEqual(backupActions, ['export', 'import']);
  assert.equal(document.querySelector('#backup-status').textContent, 'Backup wiederhergestellt.');
  document.querySelector('#empty-trash-button').click();
  document.querySelector('#accept-confirm-button').click();
  await flush();
  assert.equal(document.querySelector('#trash-count').textContent, '0');
});

test('renderer reorders complete lists by drag and drop', async () => {
  const loaded = {
    version: 4,
    activeTopicId: 'topic-a',
    trash: [],
    topics: [{
      id: 'topic-a',
      title: 'Release',
      lists: [
        { id: 'list-a', title: 'Plan', items: [] },
        { id: 'list-b', title: 'Später', items: [] },
      ],
    }],
  };
  const { dom, saved } = await bootRenderer(loaded);
  const cards = [...dom.window.document.querySelectorAll('.checklist-card')];
  const transferred = new Map();
  const dataTransfer = {
    effectAllowed: 'none',
    dropEffect: 'none',
    setData: (type, value) => transferred.set(type, value),
  };
  const dragStart = new dom.window.Event('dragstart', { bubbles: true });
  Object.defineProperty(dragStart, 'dataTransfer', { value: dataTransfer });
  const dragOver = new dom.window.Event('dragover', { bubbles: true, cancelable: true });
  Object.defineProperty(dragOver, 'dataTransfer', { value: dataTransfer });

  cards[0].dispatchEvent(dragStart);
  cards[1].dispatchEvent(dragOver);
  cards[1].dispatchEvent(new dom.window.Event('drop', { bubbles: true, cancelable: true }));
  await flush();

  assert.equal(dataTransfer.effectAllowed, 'move');
  assert.equal(dataTransfer.dropEffect, 'move');
  assert.equal(transferred.get('text/plain'), 'list:topic-a:list-a');
  assert.deepEqual(saved.at(-1).topics[0].lists.map((list) => list.id), ['list-b', 'list-a']);
});

test('renderer searches as you type, supports keyboard selection and saves due dates', async () => {
  const loaded = {
    version: 6,
    activeTopicId: 'topic-a',
    trash: [],
    topics: [
      {
        id: 'topic-a', title: 'Arbeit', lists: [{
          id: 'list-a', title: 'Heute', items: [{
            id: 'item-a', text: 'Rechnung prüfen', completed: false, details: '', priority: 'none', archived: false, image: null, dueDate: '', steps: [],
          }],
        }],
      },
      {
        id: 'topic-b', title: 'Privat', lists: [{
          id: 'list-b', title: 'Später', items: [{
            id: 'item-b', text: 'Einkaufen', completed: false, details: 'Milch prüfen', priority: 'none', archived: false, image: null, dueDate: '', steps: [],
          }],
        }],
      },
    ],
  };
  const { dom, saved } = await bootRenderer(loaded);
  const { document } = dom.window;
  const searchInput = document.querySelector('#search-input');

  searchInput.value = 'Milch';
  searchInput.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  assert.equal(document.querySelector('#list-section-label').textContent, 'SUCHERGEBNISSE');
  assert.equal(document.querySelectorAll('.search-result').length, 1);
  searchInput.dispatchEvent(new dom.window.KeyboardEvent('keydown', { bubbles: true, code: 'ArrowDown' }));
  assert.equal(document.activeElement.classList.contains('search-result'), true);
  document.activeElement.dispatchEvent(new dom.window.KeyboardEvent('keydown', { bubbles: true, code: 'Enter' }));
  await flush();
  assert.equal(document.querySelector('#active-topic-title').textContent, 'Privat');
  assert.equal(document.querySelector('.checklist-item .item-text').textContent, 'Einkaufen');

  document.querySelector('.item-details-toggle').click();
  const dueDate = document.querySelector('.due-date-input');
  dueDate.value = '2000-01-01';
  dueDate.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  await flush();
  assert.equal(saved.at(-1).topics[1].lists[0].items[0].dueDate, '2000-01-01');
  assert.equal(document.querySelector('.due-sticker').textContent, 'ÜBERFÄLLIG');
});

test('renderer migrates legacy notes and handles empty and malformed input', async () => {
  const legacyNotes = [
    { title: 'Alt', content: 'Inhalt' },
    {},
  ];
  const { dom, saved } = await bootRenderer(legacyNotes);
  const { document } = dom.window;

  assert.equal(saved[0].version, 6);
  assert.deepEqual(saved[0].topics[0].lists[0].items[0].steps, []);
  assert.equal(document.querySelectorAll('.checklist-item').length, 2);
  assert.match(document.querySelector('.checklist-item .item-text').textContent, /Alt/);
  submit(dom, '#topic-form', '   ');
  submit(dom, '#list-form', '   ');
  submit(dom, '.item-form', '   ');
  await flush();

  keydown(dom, { altKey: true, code: 'Digit9' });
  keydown(dom, { ctrlKey: true, code: 'Digit9' });
  assert.ok(saved.length >= 1);
});
