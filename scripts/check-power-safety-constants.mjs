#!/usr/bin/env node
// Fails (exit 1) when the firmware power safety header drifts from the
// TypeScript source of truth.
//
//   source of truth: packages/ble-protocol/src/powerSafety.ts
//   firmware mirror: bt-led-controller/power_safety_constants.h
//
// No dependencies, so CI can run it with plain `node`.
// Usage: node scripts/check-power-safety-constants.mjs

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TS_PATH = join(REPO_ROOT, 'packages/ble-protocol/src/powerSafety.ts');
const HEADER_PATH = join(REPO_ROOT, 'bt-led-controller/power_safety_constants.h');
const SHARED_NAMES = ['MAX_LED_COUNT', 'MA_PER_CHANNEL_AT_FULL', 'MAX_FRAME_CURRENT_MA'];

function readNumbers(path, pattern) {
  const values = new Map();
  const text = readFileSync(path, 'utf8');
  for (const match of text.matchAll(pattern)) {
    values.set(match[1], Number(match[2]));
  }
  return values;
}

const tsValues = readNumbers(TS_PATH, /^export const ([A-Z0-9_]+) = (\d+);/gm);
const headerValues = readNumbers(HEADER_PATH, /^\s*#define ([A-Z0-9_]+) (\d+)\b/gm);

const problems = [];
for (const name of SHARED_NAMES) {
  const tsValue = tsValues.get(name);
  const headerValue = headerValues.get(name);
  console.log(`${name}: ts=${tsValue} header=${headerValue}`);
  if (tsValue === undefined) {
    problems.push(`${name} missing from ${TS_PATH}`);
  } else if (headerValue === undefined) {
    problems.push(`${name} missing from ${HEADER_PATH}`);
  } else if (tsValue !== headerValue) {
    problems.push(`${name} differs: ts=${tsValue}, header=${headerValue}`);
  }
}

if (problems.length > 0) {
  console.error('Power safety constants are out of sync:');
  for (const problem of problems) {
    console.error(`  - ${problem}`);
  }
  process.exit(1);
}

console.log('Power safety constants are in sync.');
