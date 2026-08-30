const test = require('node:test');
const assert = require('node:assert/strict');
const { createTrayIconPng, createAppIconIco } = require('../src/tray-icon');

test('tray icon is a valid 16 × 16 PNG with image data', () => {
  const icon = createTrayIconPng();

  assert.deepEqual([...icon.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(icon.readUInt32BE(16), 16);
  assert.equal(icon.readUInt32BE(20), 16);
  assert.ok(icon.includes(Buffer.from('IDAT')));
  assert.ok(icon.length > 100);
});

test('application icon contains a 256 × 256 PNG in a Windows ICO container', () => {
  const icon = createAppIconIco();

  assert.equal(icon.readUInt16LE(2), 1);
  assert.equal(icon.readUInt16LE(4), 1);
  assert.equal(icon.readUInt32LE(18), 22);
  assert.deepEqual([...icon.subarray(22, 30)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(icon.readUInt32BE(38), 256);
  assert.equal(icon.readUInt32BE(42), 256);
});
