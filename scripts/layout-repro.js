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
    await window.webContents.executeJavaScript(`(async () => {
      document.querySelector('#open-settings-button').click();
      await new Promise((resolve) => setTimeout(resolve, 100));
    })()`);

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
      const displaySelect = document.querySelector('#display-select');
      const settingsPopover = document.querySelector('.settings-popover').getBoundingClientRect();
      const settingsPins = [...document.querySelectorAll('.settings-pin')]
        .map((element) => element.getBoundingClientRect())
        .map(({ top, right, bottom, left }) => ({ top, right, bottom, left }));
      const displayStyle = getComputedStyle(displaySelect);
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      context.font = displayStyle.font;
      const selectedLabel = displaySelect.selectedOptions[0].textContent;
      const horizontalPadding = Number.parseFloat(displayStyle.paddingLeft)
        + Number.parseFloat(displayStyle.paddingRight);
      const selectArrowAllowance = 36;
      const readableTextSizes = [...document.querySelectorAll(
        '.composer-label, .section-title, .priority-sticker, .shortcut-dock p, kbd',
      )].map((element) => Number.parseFloat(getComputedStyle(element).fontSize));

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
        displaySelect: {
          label: selectedLabel,
          availableWidth: displaySelect.clientWidth,
          requiredWidth: Math.max(300, Math.ceil(context.measureText(selectedLabel).width
            + horizontalPadding + selectArrowAllowance)),
        },
        settingsPins: {
          pins: settingsPins,
          popover: {
            top: settingsPopover.top,
            right: settingsPopover.right,
            bottom: settingsPopover.bottom,
            left: settingsPopover.left,
          },
        },
        readability: {
          scale: document.documentElement.dataset.textScale,
          smallestFontSize: Math.min(...readableTextSizes),
        },
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
    assert.ok(
      bounds.displaySelect.availableWidth >= bounds.displaySelect.requiredWidth,
      `Bildschirm-Auswahl schneidet „${bounds.displaySelect.label}“ ab: ${bounds.displaySelect.availableWidth}px verfügbar, ${bounds.displaySelect.requiredWidth}px benötigt`,
    );
    assert.equal(bounds.settingsPins.pins.length, 2, 'Einstellungs-Popover benötigt zwei Pinnadeln');
    for (const [index, pin] of bounds.settingsPins.pins.entries()) {
      const popover = bounds.settingsPins.popover;
      assert.ok(
        pin.top >= popover.top && pin.right <= popover.right
          && pin.bottom <= popover.bottom && pin.left >= popover.left,
        `Pinnadel ${index + 1} liegt außerhalb des sichtbaren Popovers`,
      );
    }
    assert.ok(
      bounds.readability.smallestFontSize >= 8.5,
      `Kleinste UI-Schrift ist mit ${bounds.readability.smallestFontSize.toFixed(2)}px zu klein`,
    );
    window.setSize(520, 1400);
    await window.webContents.executeJavaScript(
      'new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))',
    );
    const largerMonitorScale = await window.webContents.executeJavaScript(
      'Number(document.documentElement.dataset.textScale)',
    );
    assert.ok(
      largerMonitorScale > Number(bounds.readability.scale),
      `Textskalierung reagiert nicht auf die Monitorhöhe: ${bounds.readability.scale} → ${largerMonitorScale}`,
    );
    app.exit(0);
  } catch (error) {
    console.error(error);
    app.exit(1);
  } finally {
    window.destroy();
  }
});
