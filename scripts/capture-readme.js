const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const projectDirectory = path.join(__dirname, '..');
const imagesDirectory = path.join(projectDirectory, 'docs', 'images');
const preload = path.join(__dirname, 'readme-preload.js');

async function capturePage(file, outputName, width, height, preparePage) {
  const window = new BrowserWindow({
    width,
    height,
    show: false,
    frame: false,
    backgroundColor: '#111720',
    webPreferences: {
      preload,
      contextIsolation: true,
      nodeIntegration: false,
      offscreen: true,
    },
  });
  await window.loadFile(path.join(projectDirectory, 'src', 'renderer', file));
  await window.webContents.executeJavaScript(
    'new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))',
  );
  if (preparePage) {
    await window.webContents.executeJavaScript(preparePage);
    await window.webContents.executeJavaScript(
      'new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))',
    );
  }
  await window.webContents.executeJavaScript('document.fonts.ready');
  window.webContents.invalidate();
  await new Promise((resolve) => setTimeout(resolve, 300));
  const image = await window.webContents.capturePage();
  fs.writeFileSync(path.join(imagesDirectory, outputName), image.toPNG());
  window.destroy();
}

app.on('window-all-closed', () => undefined);

app.once('ready', async () => {
  try {
    fs.mkdirSync(imagesDirectory, { recursive: true });
    await capturePage('index.html', 'randnotizen-panel.png', 520, 1050);
    await capturePage(
      'index.html',
      'randnotizen-search.png',
      520,
      850,
      `(() => {
        const input = document.querySelector('#search-input');
        input.value = 'README';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      })()`,
    );
    await capturePage(
      'index.html',
      'randnotizen-quick-capture.png',
      520,
      700,
      `(() => {
        const overlay = document.querySelector('#quick-capture-overlay');
        const list = document.querySelector('#quick-capture-list');
        list.append(new Option('Projektstart · Heute', 'list-today'));
        list.append(new Option('Projektstart · Release', 'list-release'));
        document.querySelector('#quick-capture-input').value = 'Release-Notizen prüfen';
        overlay.hidden = false;
        document.querySelector('#quick-capture-input').focus();
      })()`,
    );
    await capturePage(
      'index.html',
      'randnotizen-settings.png',
      520,
      1450,
      `(async () => {
        document.querySelector('#open-settings-button').click();
        await new Promise((resolve) => setTimeout(resolve, 250));
        document.querySelector('#settings-overlay').hidden = false;
        document.querySelectorAll('.settings-group')[1].open = true;
        document.querySelector('#font-select').size = 11;
        document.querySelector('input[name="design"][value="paper"]').checked = true;
        await document.fonts.ready;
      })()`,
    );
    app.quit();
  } catch (error) {
    console.error(error);
    app.exit(1);
  }
});
