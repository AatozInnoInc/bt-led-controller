/**
 * Builds theme-matching PWA PNGs (RGBA) with only Node builtins (zlib + buffers).
 * Run from apps/simulator: node scripts/generate-pwa-icons.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'public', 'icons');

mkdirSync(outDir, { recursive: true });

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'binary');
  const crcSrc = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcSrc), 0);
  return Buffer.concat([length, typeBuf, data, crc]);
}

function ihdr(width, height) {
  const b = Buffer.alloc(13);
  b.writeUInt32BE(width, 0);
  b.writeUInt32BE(height, 4);
  b[8] = 8;
  b[9] = 6;
  b[10] = 0;
  b[11] = 0;
  b[12] = 0;
  return b;
}

function rgbaAt(size, x, y) {
  const cx = size / 2;
  const cy = size / 2;
  const bgR = 13;
  const bgG = 13;
  const bgB = 15;

  const dx = x + 0.5 - cx;
  const dy = y + 0.5 - cy;
  const rMax = Math.hypot(cx, cy);
  const dist = Math.hypot(dx, dy);
  let t = 1 - Math.min(dist / (rMax * 0.9), 1);
  t = t * t;

  let rr = Math.round(bgR + (48 - bgR) * t * 0.4 + (60 - bgR) * t * t * 0.45);
  let gg = Math.round(bgG + (44 - bgG) * t * 0.4 + (52 - bgG) * t * t * 0.45);
  let bb = Math.round(bgB + (90 - bgB) * t * 0.45 + (137 - bgB) * t * t * 0.5);

  const dotR = Math.max(size * 0.055, 5);
  const step = size / 10;
  for (let k = -4; k <= 4; k++) {
    const px = cx + k * step;
    const dd = Math.hypot(x + 0.5 - px, y + 0.5 - cy);
    if (dd < dotR) {
      const u = 1 - dd / dotR;
      const glow = u * u * 0.85;
      rr = Math.min(255, Math.round(rr + (120 - rr) * glow));
      gg = Math.min(255, Math.round(gg + (100 - gg) * glow));
      bb = Math.min(255, Math.round(bb + (235 - bb) * glow));
    }
  }

  if (rr < 0)
    rr = 0;

  if (rr > 255)
    rr = 255;

  if (gg < 0)
    gg = 0;

  if (gg > 255)
    gg = 255;

  if (bb < 0)
    bb = 0;

  if (bb > 255)
    bb = 255;

  return [rr, gg, bb, 255];
}

function pngBuffer(size) {
  const row = 1 + size * 4;
  const raw = Buffer.alloc(row * size);

  for (let y = 0; y < size; y++) {
    raw[y * row] = 0;
    const base = y * row + 1;

    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = rgbaAt(size, x, y);
      const o = base + x * 4;
      raw[o] = r;
      raw[o + 1] = g;
      raw[o + 2] = b;
      raw[o + 3] = a;
    }
  }

  const idatPayload = deflateSync(raw, { level: 9 });
  const parts = [
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr(size, size)),
    chunk('IDAT', idatPayload),
    chunk('IEND', Buffer.alloc(0)),
  ];

  return Buffer.concat(parts);
}

writeFileSync(join(outDir, 'icon-192.png'), pngBuffer(192));
writeFileSync(join(outDir, 'icon-512.png'), pngBuffer(512));

console.warn('wrote apps/simulator/public/icons/icon-192.png and icon-512.png');
