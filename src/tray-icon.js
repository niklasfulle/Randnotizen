const zlib = require('node:zlib');

const CRC_TABLE = Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  return crc >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  const checksum = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, checksum]);
}

function createTrayIconPng(size = 16) {
  const rowSize = 1 + size * 4;
  const pixels = Buffer.alloc(rowSize * size);

  function setPixel(x, y, red, green, blue, alpha = 255) {
    const startX = Math.floor((x * size) / 16);
    const endX = Math.ceil(((x + 1) * size) / 16);
    const startY = Math.floor((y * size) / 16);
    const endY = Math.ceil(((y + 1) * size) / 16);
    for (let scaledY = startY; scaledY < endY; scaledY += 1) {
      for (let scaledX = startX; scaledX < endX; scaledX += 1) {
        const offset = scaledY * rowSize + 1 + scaledX * 4;
        pixels[offset] = red;
        pixels[offset + 1] = green;
        pixels[offset + 2] = blue;
        pixels[offset + 3] = alpha;
      }
    }
  }

  const iconCoordinates = Array.from({ length: 14 }, (_, index) => index + 1);
  for (const y of iconCoordinates) {
    for (const x of iconCoordinates) {
      const corner = (x === 1 || x === 14) && (y === 1 || y === 14);
      if (corner) continue;
      const border = x === 1 || y === 1 || x === 14 || y === 14;
      setPixel(x, y, ...(border ? [23, 23, 23] : [39, 116, 230]));
    }
  }

  for (const [y, endX] of [[5, 11], [8, 11], [11, 9]]) {
    for (let column = 4; column <= endX; column += 1) setPixel(column, y, 217, 255, 97);
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', zlib.deflateSync(pixels)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function createAppIconIco() {
  const png = createTrayIconPng(256);
  const header = Buffer.alloc(22);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  header.writeUInt16LE(1, 10);
  header.writeUInt16LE(32, 12);
  header.writeUInt32LE(png.length, 14);
  header.writeUInt32LE(header.length, 18);
  return Buffer.concat([header, png]);
}

module.exports = { createTrayIconPng, createAppIconIco };
