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

async function bootRenderer(loadedWorkspace) {
  const dom = new JSDOM(html, { url: 'https://randnotizen.local/' });
  let settings = {
    displayId: 'primary', side: 'right', language: 'de', design: 'paper', font: 'segoe', keepVisible: false,
  };
  let autostart = true;
  const saved = [];
  const autostartUpdates = [];
  const callbacks = {};
  const positionPreviews = [];
  const notesApp = {
    loadWorkspace: async () => loadedWorkspace,
    saveWorkspace: async (workspace) => saved.push(structuredClone(workspace)),
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
    getVersion: async () => '0.1.23',
    hide: () => { callbacks.hidden = true; },
    onPanelState: (callback) => { callbacks.panelState = callback; },
    onLanguageChanged: (callback) => { callbacks.languageChanged = callback; },
    onDesignChanged: (callback) => { callbacks.designChanged = callback; },
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

  return { dom, saved, callbacks, autostartUpdates, positionPreviews, getSettings: () => settings };
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

  assert.equal(document.querySelector('#active-topic-title').textContent, 'Arbeit');
  assert.equal(document.querySelector('#topic-progress-label').textContent, '50%');
  assert.equal(document.documentElement.dataset.design, 'paper');
  assert.equal(document.documentElement.dataset.font, 'segoe');
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

  submit(dom, '#topic-form', 'Neues Thema');
  await flush();
  assert.equal(document.querySelector('#active-topic-title').textContent, 'Neues Thema');
  assert.equal(document.activeElement, document.querySelector('#list-input'));
  submit(dom, '#list-form', 'Neue Liste');
  await flush();
  assert.equal(document.querySelector('.checklist-card h3').textContent, 'Neue Liste');
  assert.equal(document.activeElement, document.querySelector('.item-form input'));
  submit(dom, '.item-form', 'Erste Aufgabe');
  await flush();
  assert.equal(document.querySelector('.checklist-item .item-text').textContent, 'Erste Aufgabe');
  assert.equal(document.activeElement, document.querySelector('.item-form input'));

  document.querySelector('.item-details-toggle').click();
  const description = document.querySelector('.item-description');
  description.value = 'Release sorgfältig vorbereiten';
  description.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  await flush();
  submit(dom, '.substep-form', 'Smoke-Test ausführen');
  await flush();
  assert.equal(document.querySelector('.substep-text').textContent, 'Smoke-Test ausführen');
  document.querySelector('.substep-checkbox').click();
  await flush();
  document.querySelector('.item-main-row .task-checkbox').click();
  await flush();
  assert.equal(document.querySelector('.checklist-item').classList.contains('completed'), true);
  assert.equal(document.querySelector('.item-details').hidden, false);
  assert.equal(saved.at(-1).topics.at(-1).lists[0].items[0].details, 'Release sorgfältig vorbereiten');
  assert.equal(saved.at(-1).topics.at(-1).lists[0].items[0].steps[0].completed, true);

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
  assert.equal(document.querySelector('#save-status').tagName, 'OUTPUT');
  assert.equal(document.querySelector('#version-label').textContent, '0.1.23');
  assert.equal(
    document.querySelector('.copyright-label').textContent,
    '© 2026 Urheberrecht: Niklas Fulle',
  );
  assert.equal(document.querySelector('#autostart-checkbox').checked, true);
  assert.match(document.querySelector('#display-select option:nth-child(2)').textContent, /Primär/);
  document.querySelector('#language-setting').click();
  document.querySelector('#display-select').value = '2';
  document.querySelector('#display-select').dispatchEvent(new dom.window.Event('change'));
  document.querySelector('#side-select').value = 'left';
  document.querySelector('#side-select').dispatchEvent(new dom.window.Event('change'));
  document.querySelector('#design-select').value = 'dark';
  document.querySelector('#design-select').dispatchEvent(new dom.window.Event('change'));
  document.querySelector('#font-select').value = 'georgia';
  document.querySelector('#font-select').dispatchEvent(new dom.window.Event('change'));
  document.querySelector('#autostart-checkbox').checked = false;
  document.querySelector('#keep-visible-checkbox').checked = true;
  document.querySelector('#settings-form').dispatchEvent(
    new dom.window.Event('submit', { bubbles: true, cancelable: true }),
  );
  await flush();
  assert.deepEqual(getSettings(), {
    displayId: '2', side: 'left', language: 'en', design: 'dark', font: 'georgia', keepVisible: true,
  });
  assert.deepEqual(positionPreviews, [
    { displayId: '2', side: 'right' },
    { displayId: '2', side: 'left' },
  ]);
  assert.deepEqual(autostartUpdates, [false]);
  assert.equal(document.documentElement.lang, 'en');
  assert.equal(
    document.querySelector('.copyright-label').textContent,
    '© 2026 Copyright: Niklas Fulle',
  );
  assert.equal(document.documentElement.dataset.theme, 'dark');
  assert.equal(document.documentElement.dataset.design, 'dark');
  assert.equal(document.documentElement.dataset.font, 'georgia');
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

test('renderer migrates legacy notes and handles empty and malformed input', async () => {
  const legacyNotes = [
    { title: 'Alt', content: 'Inhalt' },
    {},
  ];
  const { dom, saved } = await bootRenderer(legacyNotes);
  const { document } = dom.window;

  assert.equal(saved[0].version, 3);
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
