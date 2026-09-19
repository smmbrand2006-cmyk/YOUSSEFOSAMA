const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

function createPng(width, height, getPixel) {
  const rowSize = width * 4 + 1;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter 0
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y, width, height);
      const pxOffset = rowOffset + 1 + x * 4;
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData);

  const crcTable = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[i] = c;
  }

  function crc32(buf) {
    let crc = -1;
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
    }
    return (crc ^ (-1)) >>> 0;
  }

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const toCrc = Buffer.concat([typeBuf, data]);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(toCrc), 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth 8
  ihdr[9] = 6; // color type 6 (RGBA)
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    sig,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', deflated),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

// Pixel shader for the App Icon
function renderIconPixel(x, y, w, h, maskable = false) {
  // Normalize coords: -1 to 1
  const nx = (x / w) * 2 - 1;
  const ny = (y / h) * 2 - 1;
  const distCenter = Math.sqrt(nx * nx + ny * ny);

  // Background gradient: dark modern indigo/purple
  // From #0B0E14 at top left to #1E1B4B at center to #4338CA at bottom right
  const diag = (nx + ny + 2) / 4; // 0 to 1
  let bgR = Math.round(11 + diag * (67 - 11));
  let bgG = Math.round(14 + diag * (56 - 14));
  let bgB = Math.round(20 + diag * (202 - 20));

  // Rounded squircle mask for non-maskable (radius 0.82)
  let alpha = 255;
  if (!maskable) {
    // Squircle formula: |x|^4 + |y|^4 <= R^4
    const p4 = Math.pow(Math.abs(nx), 3.5) + Math.pow(Math.abs(ny), 3.5);
    if (p4 > 0.88) {
      // smooth antialiasing
      const diff = p4 - 0.88;
      if (diff > 0.1) return [0, 0, 0, 0];
      alpha = Math.round(255 * (1 - diff / 0.1));
    }
  }

  // Draw chat bubble shape
  // Scale within inner 60%
  const scale = maskable ? 0.55 : 0.65;
  const bx = nx / scale;
  const by = ny / scale;

  // Chat bubble ellipse or rounded rect:
  // center at (0, -0.08), radius X: 0.85, radius Y: 0.7
  const cx = bx;
  const cy = by + 0.08;
  const inMainBubble = (cx * cx) / (0.82 * 0.82) + (cy * cy) / (0.68 * 0.68) <= 1.0;
  
  // Chat tail at bottom-left
  // Triangle roughly (-0.4, 0.4) to (-0.75, 0.8) to (-0.15, 0.55)
  const inTail = (bx >= -0.75 && bx <= -0.15 && by >= 0.35 && by <= 0.82 && (by - 0.35) > (bx + 0.75) * 0.6);

  if (inMainBubble || inTail) {
    // Inner bubble color: vibrant royal purple/indigo gradient #6366F1 to #8B5CF6
    const bGrad = (cx + cy + 1.5) / 3;
    let bR = Math.round(99 + bGrad * (139 - 99));
    let bG = Math.round(102 + bGrad * (92 - 102));
    let bB = Math.round(241 + bGrad * (246 - 241));

    // Stylized letter "Y" cut-out inside the bubble
    // Stem of Y: x in [-0.08, 0.08], y in [0.0, 0.35]
    // Left branch: y = -1.2 * x, from y: -0.32 to 0.0, x: -0.26 to 0.0
    // Right branch: y = 1.2 * x, from y: -0.32 to 0.0, x: 0.0 to 0.26
    const inStem = Math.abs(cx) <= 0.09 && cy >= 0.0 && cy <= 0.36;
    const inLeftArm = Math.abs(cy - (-1.2 * cx)) <= 0.11 && cy <= 0.05 && cy >= -0.36 && cx <= 0.05;
    const inRightArm = Math.abs(cy - (1.2 * cx)) <= 0.11 && cy <= 0.05 && cy >= -0.36 && cx >= -0.05;

    // Dot at top of right arm (active signal dot)
    const dotDist = Math.hypot(cx - 0.35, cy - (-0.38));
    const inDot = dotDist <= 0.12;

    if (inStem || inLeftArm || inRightArm || inDot) {
      // Pure clean white with subtle glow
      return [255, 255, 255, alpha];
    }

    return [bR, bG, bB, alpha];
  }

  return [bgR, bgG, bgB, alpha];
}

const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

console.log('Generating PWA icons...');

// 192x192 standard
const png192 = createPng(192, 192, (x, y, w, h) => renderIconPixel(x, y, w, h, false));
fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), png192);

// 192x192 maskable
const png192m = createPng(192, 192, (x, y, w, h) => renderIconPixel(x, y, w, h, true));
fs.writeFileSync(path.join(iconsDir, 'icon-192-maskable.png'), png192m);

// 512x512 standard
const png512 = createPng(512, 512, (x, y, w, h) => renderIconPixel(x, y, w, h, false));
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), png512);

// 512x512 maskable
const png512m = createPng(512, 512, (x, y, w, h) => renderIconPixel(x, y, w, h, true));
fs.writeFileSync(path.join(iconsDir, 'icon-512-maskable.png'), png512m);

// apple-touch-icon
fs.writeFileSync(path.join(iconsDir, 'apple-touch-icon.png'), png192);

// Also generate a crisp SVG version
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0B0E14" />
      <stop offset="50%" stop-color="#1E1B4B" />
      <stop offset="100%" stop-color="#4338CA" />
    </linearGradient>
    <linearGradient id="bubbleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6366F1" />
      <stop offset="100%" stop-color="#8B5CF6" />
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="#4F46E5" flood-opacity="0.45"/>
    </filter>
  </defs>
  <rect width="512" height="512" rx="120" fill="url(#bgGrad)"/>
  <g filter="url(#shadow)">
    <!-- Speech bubble body -->
    <path d="M 120 220 C 120 145 180 90 265 90 C 350 90 410 145 410 220 C 410 295 350 350 265 350 C 235 350 205 342 180 328 L 130 365 C 122 371 112 364 114 354 L 122 308 C 120 280 120 240 120 220 Z" fill="url(#bubbleGrad)"/>
    <!-- Stylized Y logo -->
    <path d="M 210 170 L 265 240 L 320 170" fill="none" stroke="#FFFFFF" stroke-width="26" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M 265 240 L 265 305" fill="none" stroke="#FFFFFF" stroke-width="26" stroke-linecap="round"/>
    <circle cx="340" cy="155" r="14" fill="#34D399"/>
  </g>
</svg>`;

fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svgContent);

console.log('PWA icons created successfully!');
