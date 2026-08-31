const { app, BrowserWindow } = require('electron');
const assert = require('node:assert/strict');
const path = require('node:path');

const projectDirectory = path.join(__dirname, '..');

function sendMouse(window, type, point, button = 'left') {
  window.webContents.sendInputEvent({
    type,
    x: Math.round(point.x),
    y: Math.round(point.y),
    button,
    clickCount: 1,
  });
}

app.on('window-all-closed', () => undefined);

app.once('ready', async () => {
  const window = new BrowserWindow({
    width: 520,
    height: 1400,
    show: true,
    webPreferences: {
      preload: path.join(__dirname, 'readme-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  try {
    await window.loadFile(path.join(projectDirectory, 'src', 'renderer', 'index.html'));
    window.focus();
    await new Promise((resolve) => setTimeout(resolve, 100));
    await window.webContents.executeJavaScript(
      'new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))',
    );
    await window.webContents.executeJavaScript(`(() => {
      globalThis.__dragEvents = [];
      for (const card of document.querySelectorAll('.checklist-card')) {
        for (const type of ['dragstart', 'dragenter', 'dragover', 'drop', 'dragend']) {
          card.addEventListener(type, (event) => {
            globalThis.__dragEvents.push({
              type,
              current: card.dataset.listId,
              target: event.target.closest('.checklist-card')?.dataset.listId || null,
              hasDataTransfer: Boolean(event.dataTransfer),
              types: [...(event.dataTransfer?.types || [])],
            });
          });
        }
      }
    })()`);
    const points = await window.webContents.executeJavaScript(`(() => {
      const cards = [...document.querySelectorAll('.checklist-card')];
      const center = (element) => {
        const box = element.getBoundingClientRect();
        return { x: box.left + (box.width / 2), y: box.top + (box.height / 2) };
      };
      return {
        source: center(cards[0].querySelector('.list-heading h3')),
        target: center(cards[1].querySelector('.list-heading h3')),
      };
    })()`);

    sendMouse(window, 'mouseMove', points.source, 'none');
    sendMouse(window, 'mouseDown', points.source);
    for (let index = 1; index <= 12; index += 1) {
      const ratio = index / 12;
      sendMouse(window, 'mouseMove', {
        x: points.source.x + ((points.target.x - points.source.x) * ratio),
        y: points.source.y + ((points.target.y - points.source.y) * ratio),
      });
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    window.webContents.debugger.attach('1.3');
    const dragData = {
      items: [{ mimeType: 'text/plain', data: 'list:topic-project:list-today' }],
      dragOperationsMask: 16,
    };
    for (const type of ['dragEnter', 'dragOver', 'drop']) {
      await window.webContents.debugger.sendCommand('Input.dispatchDragEvent', {
        type,
        x: points.target.x,
        y: points.target.y,
        data: dragData,
      });
    }
    sendMouse(window, 'mouseUp', points.target);
    await new Promise((resolve) => setTimeout(resolve, 150));

    const result = await window.webContents.executeJavaScript(`({
      order: [...document.querySelectorAll('.checklist-card h3')].map((heading) => heading.textContent),
      events: globalThis.__dragEvents,
    })`);
    console.log(JSON.stringify({ points, ...result }));
    const { order } = result;
    assert.deepEqual(order, ['Release', 'Heute']);
    app.exit(0);
  } catch (error) {
    console.error(error);
    app.exit(1);
  } finally {
    window.destroy();
  }
});
