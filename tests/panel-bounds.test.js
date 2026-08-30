const test = require('node:test');
const assert = require('node:assert/strict');
const { getPanelBounds, resolveDisplay } = require('../src/panel-bounds');

const PANEL_WIDTH = 420;

test('right-side panel stays entirely inside its configured display', () => {
  const workArea = { x: 0, y: 0, width: 1920, height: 1080 };
  const bounds = getPanelBounds(workArea, PANEL_WIDTH, 'right');

  assert.equal(bounds.x, 1500);
  assert.equal(bounds.width, PANEL_WIDTH);
  assert.ok(bounds.x + bounds.width <= workArea.x + workArea.width);
});

test('open panel uses its full width at the right edge', () => {
  const workArea = { x: 1920, y: 0, width: 2560, height: 1440 };
  const bounds = getPanelBounds(workArea, PANEL_WIDTH, 'right');

  assert.deepEqual(bounds, { x: 4060, y: 0, width: 420, height: 1440 });
});

test('left-side panel expands inward on displays with negative coordinates', () => {
  const workArea = { x: -1920, y: 0, width: 1920, height: 1080 };

  assert.deepEqual(getPanelBounds(workArea, PANEL_WIDTH, 'left'), {
    x: -1920, y: 0, width: 420, height: 1080,
  });
});

test('configured display is selected and missing displays fall back to primary', () => {
  const primary = { id: 10, workArea: { x: 0, y: 0, width: 1920, height: 1080 } };
  const secondary = { id: 22, workArea: { x: 1920, y: 0, width: 2560, height: 1440 } };
  const displays = [primary, secondary];

  assert.equal(resolveDisplay(displays, '22', primary), secondary);
  assert.equal(resolveDisplay(displays, 'missing', primary), primary);
  assert.equal(resolveDisplay(displays, 'primary', primary), primary);
});
