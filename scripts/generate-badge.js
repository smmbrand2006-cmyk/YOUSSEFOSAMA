const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Create a valid 72x72 RGBA PNG with a white message bubble silhouette
const width = 72;
const height = 72;

// RGBA pixel buffer: 72 * 72 * 4 bytes
// Pre-fill transparent (0, 0, 0, 0)
const rawData = Buffer.alloc(height * (1 + width * 4));

function setPixel(x, y, r, g, b, a) {
  if (x < 0 || x >= width || y < 0 || y >= height) return;
  const offset = y * (1 + width * 4) + 1 + x * 4;
  rawData[offset] = r;
  rawData[offset + 1] = g;
  rawData[offset + 2] = b;
  rawData[offset + 3] = a;
}

// Draw a rounded chat bubble (white on transparent)
// Center bubble: x from 14 to 58, y from 14 to 52
const radius = 10;
const x0 = 14, y0 = 14, x1 = 58, y1 = 50;

for (let y = 0; y < height; y++) {
  // Filter byte for PNG scanline
  rawData[y * (1 + width * 4)] = 0;

  for (let x = 0; x < width; x++) {
    let inBubble = false;

    // Check main body
    if (x >= x0 + radius && x <= x1 - radius && y >= y0 && y <= y1) {
      inBubble = true;
    } else if (x >= x0 && x <= x1 && y >= y0 + radius && y <= y1 - radius) {
      inBubble = true;
    } else {
      // 4 rounded corners
      const corners = [
        [x0 + radius, y0 + radius],
        [x1 - radius, y0 + radius],
        [x0 + radius, y1 - radius],
        [x1 - radius, y1 - radius],
      ];
      for (const [cx, cy] of corners) {
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy <= radius * radius) {
          inBubble = true;
          break;
        }
      }
    }

    // Small chat tail at bottom right (x: 44 to 56, y: 48 to 60)
    if (!inBubble && x >= 40 && x <= 56 && y >= 48 && y <= 60) {
      const tx = x - 40;
      const ty = y - 48;
      if (tx >= ty * 0.7 && tx <= 16) {
        inBubble = true;
      }
    }

    if (inBubble) {
      setPixel(x, y, 255, 255, 255, 255); // Pure white
    }
  }
}

// Build PNG chunks
function createChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);

  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);

  const crc = crc32(body);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc, 0);

  return Buffer.concat([len, body, crcBuf]);
}

// Standard CRC32 table
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

// 1. Signature
const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// 2. IHDR
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(width, 0);
ihdr.writeUInt32BE(height, 4);
ihdr[8] = 8;  // bit depth
ihdr[9] = 6;  // color type 6: RGBA
ihdr[10] = 0; // compression
ihdr[11] = 0; // filter
ihdr[12] = 0; // interlace
const ihdrChunk = createChunk('IHDR', ihdr);

// 3. IDAT
const compressed = zlib.deflateSync(rawData);
const idatChunk = createChunk('IDAT', compressed);

// 4. IEND
const iendChunk = createChunk('IEND', Buffer.alloc(0));

const png = Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);

const target = path.join(__dirname, '..', 'public', 'icons', 'badge-72.png');
fs.writeFileSync(target, png);
console.log('Successfully generated', target, png.length, 'bytes');
