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
      'randnotizen-settings.png',
      520,
      1050,
      `(async () => {
        document.querySelector('#open-settings-button').click();
        await new Promise((resolve) => setTimeout(resolve, 100));
      })()`,
    );
    app.quit();
  } catch (error) {
    console.error(error);
    app.exit(1);
  }
});
