const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const styles = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles.css'), 'utf8');

test('quick-capture close button keeps a high-contrast color in dark mode', () => {
  assert.match(
    styles,
    /html\[data-theme="dark"\] \.quick-capture-card \.delete-button \{ color: #f4efe3; \}/,
  );
});
