const fs = require('node:fs');
const path = require('node:path');
const { createAppIconIco } = require('../src/tray-icon');

const assetsDirectory = path.join(__dirname, '..', 'src', 'assets');
fs.mkdirSync(assetsDirectory, { recursive: true });
fs.writeFileSync(path.join(assetsDirectory, 'icon.ico'), createAppIconIco());
