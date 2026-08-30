const { app, BrowserWindow } = require('electron');
const assert = require('node:assert/strict');
const path = require('node:path');

const projectDirectory = path.join(__dirname, '..');

app.on('window-all-closed', () => undefined);

app.once('ready', async () => {
  const window = new BrowserWindow({
    width: 520,
    height: 1050,
    show: false,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'readme-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  try {
    await window.loadFile(path.join(projectDirectory, 'src', 'renderer', 'index.html'));
    await window.webContents.executeJavaScript(
      'new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))',
    );

    const bounds = await window.webContents.executeJavaScript(`(() => {
      const listElement = document.querySelector('.lists');
      const listViewport = listElement.getBoundingClientRect();
      const cards = [...document.querySelectorAll('.checklist-card')];
      const activeCard = document.querySelector('.checklist-card.keyboard-active');
      const outlineExtent = 6;
      const shadowExtent = 5;
      const visualBounds = cards.map((element) => {
        const card = element.getBoundingClientRect();
        const pin = element.querySelector('.pin').getBoundingClientRect();
        return {
          top: Math.min(card.top - outlineExtent, pin.top),
          left: card.left - outlineExtent,
          right: card.right + Math.max(outlineExtent, shadowExtent),
        };
      });
      const activeIndex = cards.indexOf(activeCard);

      return {
        viewport: {
          top: listViewport.top,
          left: listViewport.left,
          right: listViewport.left + listElement.clientWidth,
        },
        active: visualBounds[activeIndex],
        cards: visualBounds,
        clientWidth: listElement.clientWidth,
        scrollWidth: listElement.scrollWidth,
      };
    })()`);

    console.log(JSON.stringify(bounds));
    assert.ok(
      bounds.active.top >= bounds.viewport.top,
      `Kartenoberkante ist um ${(bounds.viewport.top - bounds.active.top).toFixed(2)} px abgeschnitten`,
    );
    for (const [index, card] of bounds.cards.entries()) {
      assert.ok(
        card.left >= bounds.viewport.left,
        `Karte ${index + 1} ist links um ${(bounds.viewport.left - card.left).toFixed(2)} px abgeschnitten`,
      );
      assert.ok(
        card.right <= bounds.viewport.right,
        `Karte ${index + 1} ist rechts um ${(card.right - bounds.viewport.right).toFixed(2)} px abgeschnitten`,
      );
    }
    assert.equal(bounds.scrollWidth, bounds.clientWidth, 'Karten erzeugen horizontales Scroll-Clipping');
    app.exit(0);
  } catch (error) {
    console.error(error);
    app.exit(1);
  } finally {
    window.destroy();
  }
});
