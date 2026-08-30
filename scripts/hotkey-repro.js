const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');

const workspace = {
  version: 2,
  activeTopicId: 'topic-1',
  topics: [{
    id: 'topic-1',
    title: 'Test',
    lists: [{
      id: 'list-1',
      title: 'Testliste',
      items: [{ id: 'item-1', text: 'Kontrasttest', completed: false }],
    }],
  }],
};

function sendShortcut(window, keyCode, modifiers) {
  window.webContents.sendInputEvent({ type: 'keyDown', keyCode, modifiers });
  window.webContents.sendInputEvent({ type: 'keyUp', keyCode, modifiers });
}

async function focusedSelector(window) {
  await new Promise((resolve) => setTimeout(resolve, 50));
  return window.webContents.executeJavaScript(`(() => {
    const active = document.activeElement;
    if (active?.id) return '#' + active.id;
    if (active?.matches('.item-form input')) return '.item-form input';
    return active?.tagName || 'NONE';
  })()`);
}

async function clickElement(window, selector) {
  const hit = await window.webContents.executeJavaScript(`(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    const rect = element.getBoundingClientRect();
    const x = Math.round(rect.left + rect.width / 2);
    const y = Math.round(rect.top + rect.height / 2);
    const target = document.elementFromPoint(x, y);
    return {
      x,
      y,
      target: target?.id || target?.className || target?.tagName,
      button: target?.closest('button')?.id || null,
    };
  })()`);
  window.webContents.sendInputEvent({ type: 'mouseDown', x: hit.x, y: hit.y, button: 'left', clickCount: 1 });
  window.webContents.sendInputEvent({ type: 'mouseUp', x: hit.x, y: hit.y, button: 'left', clickCount: 1 });
  await new Promise((resolve) => setTimeout(resolve, 50));
  return hit;
}

app.whenReady().then(async () => {
  let settings = {
    displayId: 'primary', side: 'right', language: 'de', theme: 'light',
  };
  ipcMain.handle('workspace:load', () => workspace);
  ipcMain.handle('workspace:save', () => undefined);
  ipcMain.handle('settings:get', () => settings);
  ipcMain.handle('settings:update', (_event, updated) => {
    settings = updated;
    return settings;
  });
  ipcMain.handle('displays:list', () => []);

  const window = new BrowserWindow({
    width: 420,
    height: 760,
    show: true,
    webPreferences: {
      preload: path.join(__dirname, '..', 'src', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  await window.loadFile(path.join(__dirname, '..', 'src', 'renderer', 'index.html'));
  window.focus();
  window.webContents.focus();
  await new Promise((resolve) => setTimeout(resolve, 150));
  const checks = [
    { key: 'T', modifiers: ['control', 'shift'], expected: '#topic-input' },
    { key: 'L', modifiers: ['control', 'shift'], expected: '#list-input' },
    { key: '1', modifiers: ['alt'], expected: '.item-form input' },
  ];

  let failed = false;
  for (const check of checks) {
    sendShortcut(window, check.key, check.modifiers);
    const actual = await focusedSelector(window);
    const passed = actual === check.expected;
    failed ||= !passed;
    console.log(`${passed ? 'PASS' : 'FAIL'} ${check.modifiers.join('+')}+${check.key}: ${actual}`);
  }

  const languageHit = await clickElement(window, '#language-toggle');
  const languageState = await window.webContents.executeJavaScript(`({
    language: document.documentElement.lang,
    brand: document.querySelector('[data-i18n="brandLineOne"]').textContent,
  })`);
  const languagePassed = languageHit.button === 'language-toggle'
    && languageState.language === 'en'
    && languageState.brand === 'EDGE'
    && settings.language === 'en';
  failed ||= !languagePassed;
  console.log(`${languagePassed ? 'PASS' : 'FAIL'} language toggle: hit=${languageHit.button} state=${JSON.stringify(languageState)}`);

  const themeHit = await clickElement(window, '#theme-toggle');
  const themeState = await window.webContents.executeJavaScript(`({
    theme: document.documentElement.dataset.theme,
    background: getComputedStyle(document.querySelector('.panel')).backgroundColor,
    cardBackground: getComputedStyle(document.querySelector('.checklist-card')).backgroundColor,
    itemBackground: getComputedStyle(document.querySelector('.checklist-item')).backgroundColor,
    itemColor: getComputedStyle(document.querySelector('.checklist-item')).color,
  })`);
  const themePassed = themeHit.button === 'theme-toggle'
    && themeState.theme === 'dark'
    && themeState.background === 'rgb(17, 23, 32)'
    && themeState.cardBackground === 'rgb(49, 91, 120)'
    && themeState.itemBackground === 'rgb(25, 35, 45)'
    && themeState.itemColor === 'rgb(245, 240, 228)'
    && settings.theme === 'dark';
  failed ||= !themePassed;
  console.log(`${themePassed ? 'PASS' : 'FAIL'} theme toggle: hit=${themeHit.button} state=${JSON.stringify(themeState)}`);

  sendShortcut(window, '1', ['control']);
  await new Promise((resolve) => setTimeout(resolve, 80));
  const toggleState = await window.webContents.executeJavaScript(`(() => {
    const row = document.querySelector('.checklist-item');
    const text = row.querySelector('label span');
    return {
      selectedList: document.querySelector('.checklist-card.keyboard-active')?.dataset.listId,
      completed: row.classList.contains('completed'),
      textDecoration: getComputedStyle(text).textDecorationLine,
    };
  })()`);
  const togglePassed = toggleState.selectedList === 'list-1'
    && toggleState.completed
    && toggleState.textDecoration === 'line-through';
  failed ||= !togglePassed;
  console.log(`${togglePassed ? 'PASS' : 'FAIL'} control+1 toggle: ${JSON.stringify(toggleState)}`);

  sendShortcut(window, '1', ['control']);
  await new Promise((resolve) => setTimeout(resolve, 80));
  const reopened = await window.webContents.executeJavaScript(
    `!document.querySelector('.checklist-item').classList.contains('completed')`,
  );
  failed ||= !reopened;
  console.log(`${reopened ? 'PASS' : 'FAIL'} control+1 reopens item`);

  app.exit(failed ? 1 : 0);
});
