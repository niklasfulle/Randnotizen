const test = require('node:test');
const assert = require('node:assert/strict');
const packageJson = require('../package.json');

test('NSIS installer keeps a stable identity for manual upgrades', () => {
  assert.equal(packageJson.build.appId, 'de.randnotizen.app');
  assert.equal(packageJson.scripts.installer, 'electron-builder --win nsis');
  assert.equal(packageJson.build.nsis.artifactName, 'Randnotizen Setup ${version}.${ext}');
  assert.equal(packageJson.build.nsis.oneClick, false);
  assert.equal(packageJson.build.nsis.perMachine, false);
  assert.equal(packageJson.build.nsis.createDesktopShortcut, true);
  assert.equal(packageJson.build.nsis.createStartMenuShortcut, true);
  assert.equal(packageJson.build.nsis.deleteAppDataOnUninstall, false);
});
