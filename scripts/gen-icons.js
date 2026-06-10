// Generates the extension icons (icons/icon-{16,32,48,128}.png) with zero
// dependencies: a minimal PNG encoder over node:zlib. Motif: blue rounded
// tile with a white AM/PM rota grid, one red duty cell.
// Usage: node scripts/gen-icons.js

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

function png(size, pixelFn) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // colour type RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1);
    raw[row] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixelFn(x, y, size);
      raw.set([r, g, b, a], row + 1 + x * 4);
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

const BLUE = [37, 99, 235];   // --accent
const NAVY = [30, 58, 138];
const WHITE = [255, 255, 255];
const RED = [239, 68, 68];    // duty

function pixel(x, y, size) {
  const r = size * 0.18; // corner radius
  const cx = Math.max(r, Math.min(size - 1 - r, x));
  const cy = Math.max(r, Math.min(size - 1 - r, y));
  if ((x - cx) ** 2 + (y - cy) ** 2 > r * r) return [0, 0, 0, 0]; // outside tile

  // Background: subtle vertical gradient blue -> navy.
  const t = y / size;
  const bg = BLUE.map((c, i) => Math.round(c + (NAVY[i] - c) * t));

  // 2×2 rota grid of cells inside a margin.
  const m = size * 0.22;
  const gap = Math.max(1, size * 0.07);
  const cell = (size - 2 * m - gap) / 2;
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) {
      const x0 = m + col * (cell + gap);
      const y0 = m + row * (cell + gap);
      if (x >= x0 && x < x0 + cell && y >= y0 && y < y0 + cell) {
        return [...(row === 0 && col === 1 ? RED : WHITE), 255];
      }
    }
  }
  return [...bg, 255];
}

mkdirSync(new URL('../icons/', import.meta.url), { recursive: true });
for (const size of [16, 32, 48, 128]) {
  const file = new URL(`../icons/icon-${size}.png`, import.meta.url);
  writeFileSync(file, png(size, pixel));
  console.log(`icons/icon-${size}.png`);
}
