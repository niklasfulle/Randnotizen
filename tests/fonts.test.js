const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const bundledFonts = [
  ['inter', 'Inter.ttf'],
  ['nunito-sans', 'NunitoSans.ttf'],
  ['atkinson', 'AtkinsonHyperlegibleNext.ttf'],
  ['lora', 'Lora.ttf'],
  ['jetbrains-mono', 'JetBrainsMono.ttf'],
];

test('bundles every selectable font together with its OFL license', () => {
  for (const [directory, filename] of bundledFonts) {
    const fontDirectory = path.join(__dirname, '..', 'src', 'assets', 'fonts', directory);
    const fontPath = path.join(fontDirectory, filename);
    const licensePath = path.join(fontDirectory, 'OFL.txt');

    assert.ok(fs.statSync(fontPath).size > 1000, `${filename} is missing or empty`);
    assert.match(fs.readFileSync(licensePath, 'utf8'), /SIL OPEN FONT LICENSE Version 1\.1/);
  }
});
