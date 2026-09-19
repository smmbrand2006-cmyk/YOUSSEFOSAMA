const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const sourcePath = 'C:\\Users\\youse\\.gemini\\antigravity-ide\\brain\\c09872eb-2bd5-4e0e-ba32-bd024a4ed1d9\\.user_uploaded\\media_1789855602344.png';

if (!fs.existsSync(sourcePath)) {
  console.error('Source logo file not found:', sourcePath);
  process.exit(1);
}

const sourceBuffer = fs.readFileSync(sourcePath);
console.log('Source size:', sourceBuffer.length, 'bytes');

// Read dimensions from PNG IHDR
const width = sourceBuffer.readUInt32BE(16);
const height = sourceBuffer.readUInt32BE(20);
console.log('Original dimensions:', width, 'x', height);

const publicDir = path.join(__dirname, '..', 'public');
const iconsDir = path.join(publicDir, 'icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// 1. Save main high-res logo
fs.writeFileSync(path.join(publicDir, 'logo.png'), sourceBuffer);
console.log('Saved public/logo.png');

// 2. Save PWA icons
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), sourceBuffer);
fs.writeFileSync(path.join(iconsDir, 'icon-512-maskable.png'), sourceBuffer);
fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), sourceBuffer);
fs.writeFileSync(path.join(iconsDir, 'icon-192-maskable.png'), sourceBuffer);
fs.writeFileSync(path.join(iconsDir, 'apple-touch-icon.png'), sourceBuffer);
fs.writeFileSync(path.join(publicDir, 'favicon.png'), sourceBuffer);
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), sourceBuffer);

console.log('All logo and icon destinations updated successfully!');
