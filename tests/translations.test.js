const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeLanguage,
  normalizeTheme,
  normalizeDesign,
  themeForDesign,
  normalizeFont,
  translate,
} = require('../src/translations');

test('normalizes supported and unsupported languages', () => {
  assert.equal(normalizeLanguage('en'), 'en');
  assert.equal(normalizeLanguage('de'), 'de');
  assert.equal(normalizeLanguage('fr'), 'de');
  assert.equal(normalizeLanguage(undefined), 'de');
});

test('normalizes light and dark themes', () => {
  assert.equal(normalizeTheme('dark'), 'dark');
  assert.equal(normalizeTheme('light'), 'light');
  assert.equal(normalizeTheme('neon'), 'light');
});

test('normalizes extensible designs and app fonts', () => {
  assert.equal(normalizeDesign('dark'), 'dark');
  assert.equal(normalizeDesign('unknown'), 'paper');
  assert.equal(themeForDesign('dark'), 'dark');
  assert.equal(themeForDesign('paper'), 'light');
  assert.equal(normalizeFont('georgia'), 'georgia');
  assert.equal(normalizeFont('comic-sans'), 'segoe');
});

test('translates interface text in German and English', () => {
  assert.equal(translate('de', 'trayExit'), 'Beenden');
  assert.equal(translate('en', 'trayExit'), 'Exit');
  assert.equal(translate('en', 'newTopic'), 'New topic …');
  assert.equal(translate('de', 'darkTheme'), 'Dunkel');
  assert.equal(translate('en', 'darkTheme'), 'Dark');
  assert.equal(translate('de', 'copyright'), '© 2026 Urheberrecht: Niklas Fulle');
  assert.equal(translate('en', 'copyright'), '© 2026 Copyright: Niklas Fulle');
});

test('interpolates translated dynamic text', () => {
  assert.equal(
    translate('de', 'tasksProgress', { completed: 2, total: 5 }),
    '2 von 5 Aufgaben erledigt',
  );
  assert.equal(
    translate('en', 'detachListMessage', { title: 'Weekend' }),
    '“Weekend” and all of its tasks will be deleted.',
  );
});
