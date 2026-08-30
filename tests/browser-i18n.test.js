const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('browser translation bundle does not leak bindings that collide with renderer declarations', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'translations.js'), 'utf8');
  const context = vm.createContext({});

  vm.runInContext(source, context, { filename: 'translations.js' });

  assert.doesNotThrow(() => {
    vm.runInContext(
      'const { normalizeLanguage, normalizeTheme, translate } = globalThis.RandnotizenI18n;',
      context,
      { filename: 'renderer-bindings.js' },
    );
  });
});
