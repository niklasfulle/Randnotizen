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
  assert.equal(normalizeDesign('pastel'), 'pastel');
  assert.equal(normalizeDesign('newspaper'), 'newspaper');
  assert.equal(normalizeDesign('minimal'), 'minimal');
  assert.equal(normalizeDesign('unknown'), 'paper');
  assert.equal(themeForDesign('dark'), 'dark');
  assert.equal(themeForDesign('blueprint'), 'dark');
  assert.equal(themeForDesign('neon'), 'dark');
  assert.equal(themeForDesign('sunset'), 'light');
  assert.equal(themeForDesign('paper'), 'light');
  assert.equal(normalizeFont('lora'), 'lora');
  assert.equal(normalizeFont('nunito-sans'), 'nunito-sans');
  assert.equal(normalizeFont('scoutie-sans'), 'scoutie-sans');
  assert.equal(normalizeFont('betania-patmos'), 'betania-patmos');
  assert.equal(normalizeFont('playfair-display'), 'playfair-display');
  assert.equal(normalizeFont('ubuntu'), 'ubuntu');
  assert.equal(normalizeFont('space-grotesk'), 'space-grotesk');
  assert.equal(normalizeFont('ibm-plex-mono'), 'ibm-plex-mono');
  assert.equal(normalizeFont('georgia'), 'lora');
  assert.equal(normalizeFont('courier'), 'jetbrains-mono');
  assert.equal(normalizeFont('comic-sans'), 'inter');
});

test('translates interface text in German and English', () => {
  assert.equal(translate('de', 'trayExit'), 'Beenden');
  assert.equal(translate('en', 'trayExit'), 'Exit');
  assert.equal(translate('en', 'newTopic'), 'New topic …');
  assert.equal(translate('de', 'darkTheme'), 'Dunkel');
  assert.equal(translate('en', 'darkTheme'), 'Dark');
  assert.equal(translate('de', 'designNewspaper'), 'Zeitung');
  assert.equal(translate('de', 'saveSettings'), 'SPEICHERN');
  assert.equal(translate('en', 'saveSettings'), 'SAVE');
  assert.equal(translate('de', 'installPath'), 'Installationspfad');
  assert.equal(translate('de', 'hideTaskNotes'), 'NOTIZ AUSBLENDEN');
  assert.equal(translate('en', 'showTaskNotes'), 'SHOW NOTE');
  assert.equal(translate('de', 'copyright'), '© 2026 Niklas Fulle');
  assert.equal(translate('en', 'copyright'), '© 2026 Niklas Fulle');
  assert.equal(translate('de', 'releaseNotesTitle'), 'Neu seit Version 0.2.0');
  assert.equal(translate('en', 'releaseNotesDismiss'), 'Do not show again for this version');
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
