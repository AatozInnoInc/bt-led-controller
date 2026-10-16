#!/usr/bin/env node
// Generates the power safety constants for the RN app and the firmware from
// one JSON source, so the two can never drift.
//
//   source:    packages/ble-protocol/power-safety.json
//   generated: packages/ble-protocol/src/powerSafety.ts
//              bt-led-controller/power_safety_constants.h
//
// Both generated files are checked in, because arduino-cli and the Arduino
// IDE compile whatever is on disk.
//
// Usage:
//   node scripts/generate-power-safety-constants.mjs          write both files
//   node scripts/generate-power-safety-constants.mjs --check  exit 1 if either
//                                                             checked-in file
//                                                             differs from what
//                                                             the JSON generates
//
// No dependencies, so CI can run it with plain `node`. Output is LF-only and
// byte-stable: the same JSON always produces the same bytes.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_RELATIVE = 'packages/ble-protocol/power-safety.json';
const TS_RELATIVE = 'packages/ble-protocol/src/powerSafety.ts';
const HEADER_RELATIVE = 'bt-led-controller/power_safety_constants.h';
const GENERATOR_RELATIVE = 'scripts/generate-power-safety-constants.mjs';

const NAME_PATTERN = /^[A-Z][A-Z0-9_]*$/;
const REGENERATE_COMMAND = 'npm run generate:power-safety';

function fail(message) {
  console.error(`[power-safety] ${message}`);
  process.exit(1);
}

// Parses and validates the JSON source. Throws away nothing silently: any
// shape problem stops generation with a message naming the bad entry.
function loadConstants() {
  const sourcePath = join(REPO_ROOT, SOURCE_RELATIVE);
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(sourcePath, 'utf8'));
  } catch (error) {
    fail(`could not read ${SOURCE_RELATIVE}: ${error.message}`);
  }

  const hasConstantsArray = parsed !== null && typeof parsed === 'object' && Array.isArray(parsed.constants);
  if (hasConstantsArray === false) {
    fail(`${SOURCE_RELATIVE} must contain a "constants" array`);
  }

  const seenNames = new Set();
  for (const constant of parsed.constants) {
    const label = JSON.stringify(constant && constant.name);
    const hasValidName = typeof constant.name === 'string' && NAME_PATTERN.test(constant.name);
    if (hasValidName === false) {
      fail(`constant ${label} needs an UPPER_SNAKE_CASE "name"`);
    }
    if (seenNames.has(constant.name)) {
      fail(`constant ${label} is listed twice`);
    }
    seenNames.add(constant.name);

    const hasValidValue = Number.isSafeInteger(constant.value) && constant.value >= 0;
    if (hasValidValue === false) {
      fail(`constant ${label} needs a non-negative integer "value"`);
    }

    const hasValidDoc = Array.isArray(constant.doc)
      && constant.doc.length > 0
      && constant.doc.every((line) => typeof line === 'string');
    if (hasValidDoc === false) {
      fail(`constant ${label} needs a non-empty "doc" array of strings`);
    }

    const hasValidOverrideFlag = constant.buildOverride === undefined || typeof constant.buildOverride === 'boolean';
    if (hasValidOverrideFlag === false) {
      fail(`constant ${label} has a non-boolean "buildOverride"`);
    }
  }

  console.log(`[power-safety] loaded ${parsed.constants.length} constants from ${SOURCE_RELATIVE}`);
  return parsed.constants;
}

function renderJsDoc(docLines) {
  if (docLines.length === 1) {
    return [`/** ${docLines[0]} */`];
  }
  const body = docLines.map((line) => (line === '' ? ' *' : ` * ${line}`));
  return ['/**', ...body, ' */'];
}

function renderLineComment(docLines) {
  return docLines.map((line) => (line === '' ? '//' : `// ${line}`));
}

function renderTypeScript(constants) {
  const lines = [
    '// GENERATED FILE. DO NOT EDIT BY HAND.',
    `// Source: ${SOURCE_RELATIVE}`,
    `// Generator: ${GENERATOR_RELATIVE}`,
    `// To change a value, edit the JSON and run \`${REGENERATE_COMMAND}\`.`,
    '//',
    '// Power safety constants shared by the RN app and the firmware. The firmware',
    `// copy is ${HEADER_RELATIVE}, generated from the same JSON.`,
  ];
  for (const constant of constants) {
    lines.push('', ...renderJsDoc(constant.doc), `export const ${constant.name} = ${constant.value};`);
  }
  return `${lines.join('\n')}\n`;
}

function renderHeader(constants) {
  const lines = [
    '#ifndef POWER_SAFETY_CONSTANTS_H',
    '#define POWER_SAFETY_CONSTANTS_H',
    '',
    '// GENERATED FILE. DO NOT EDIT BY HAND.',
    `// Source: ${SOURCE_RELATIVE}`,
    `// Generator: ${GENERATOR_RELATIVE}`,
    `// To change a value, edit the JSON and run \`${REGENERATE_COMMAND}\`.`,
    '//',
    '// ========================================',
    '// POWER SAFETY CONSTANTS (shared with the app)',
    '// ========================================',
    `// The app copy is ${TS_RELATIVE}, generated from the same JSON.`,
  ];
  for (const constant of constants) {
    lines.push('', ...renderLineComment(constant.doc));
    if (constant.buildOverride === true) {
      // Kept as a build override on purpose: the Saturday listening protocol
      // flashes with -DMAX_FRAME_CURRENT_MA=50 to prove the limiter engages.
      lines.push(
        `// Guarded so a build flag such as -D${constant.name}=50 wins over this default.`,
        `#ifndef ${constant.name}`,
        `#define ${constant.name} ${constant.value}`,
        '#endif',
      );
    } else {
      lines.push(`#define ${constant.name} ${constant.value}`);
    }
  }
  lines.push('', '#endif // POWER_SAFETY_CONSTANTS_H');
  return `${lines.join('\n')}\n`;
}

// Reads a checked-in file with CRLF folded to LF, so a Windows checkout with
// core.autocrlf does not count as drift. Returns null when the file is missing.
function readIfPresent(path) {
  try {
    return readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
  } catch {
    return null;
  }
}

function main() {
  const isCheckMode = process.argv.includes('--check');
  const constants = loadConstants();
  const outputs = [
    { relative: TS_RELATIVE, content: renderTypeScript(constants) },
    { relative: HEADER_RELATIVE, content: renderHeader(constants) },
  ];

  const staleFiles = [];
  for (const output of outputs) {
    const path = join(REPO_ROOT, output.relative);
    const current = readIfPresent(path);
    const isUpToDate = current === output.content;
    if (isUpToDate) {
      console.log(`[power-safety] up to date: ${output.relative}`);
    } else if (isCheckMode) {
      console.error(`[power-safety] out of date: ${output.relative}`);
      staleFiles.push(output.relative);
    } else {
      writeFileSync(path, output.content);
      console.log(`[power-safety] wrote: ${output.relative}`);
    }
  }

  if (staleFiles.length > 0) {
    fail(`${staleFiles.length} generated file(s) do not match ${SOURCE_RELATIVE}. Run \`${REGENERATE_COMMAND}\` and commit the result.`);
  }
  console.log(`[power-safety] ${isCheckMode ? 'check passed' : 'generation done'}`);
}

main();
