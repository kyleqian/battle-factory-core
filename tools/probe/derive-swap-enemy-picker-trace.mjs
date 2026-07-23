#!/usr/bin/env node
/**
 * Produce tightly captured Battle Scene OFF traces for the S8 enemy picker.
 *
 * The committed battle1-swapyes-b route remains the canonical input prefix.
 * This derives small gate variants from it without duplicating its 174
 * segments or ever supplying renderer assets.
 *
 * Usage:
 *   node tools/probe/derive-swap-enemy-picker-trace.mjs canonical > /tmp/t.json
 *   node tools/probe/derive-swap-enemy-picker-trace.mjs earliest-swap-a > /tmp/t.json
 *   node tools/probe/derive-swap-enemy-picker-trace.mjs earliest-picker-right > /tmp/t.json
 *   node tools/probe/derive-swap-enemy-picker-trace.mjs earliest-accept-a > /tmp/t.json
 *
 * Optional two integer arguments replace the default inclusive capture range.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..');
const basePath = resolve(root, 'tools/compare/traces-groundtruth/battle1-swapyes-b.json');
const base = JSON.parse(readFileSync(basePath, 'utf8'));

const scenario = process.argv[2] ?? 'canonical';
const defaults = {
  canonical: [29802, 29935],
  'earliest-swap-a': [29780, 29935],
  'earliest-picker-right': [29930, 29942],
  'earliest-accept-a': [29930, 30005],
};

if (!(scenario in defaults)) {
  throw new Error(`unknown scenario ${scenario}; expected ${Object.keys(defaults).join(', ')}`);
}

const [defaultStart, defaultEnd] = defaults[scenario];
const captureStart = process.argv[3] === undefined ? defaultStart : Number(process.argv[3]);
const captureEnd = process.argv[4] === undefined ? defaultEnd : Number(process.argv[4]);
if (!Number.isInteger(captureStart) || !Number.isInteger(captureEnd) || captureEnd < captureStart) {
  throw new Error('capture range must be two inclusive integer ticks');
}
if (captureEnd - captureStart + 1 > 256) {
  throw new Error('oracle captures are limited to 256 frames; use a narrower range');
}

const cloned = structuredClone(base);
let segments;
switch (scenario) {
  case 'canonical':
    segments = cloned.segments;
    break;
  case 'earliest-swap-a':
    // The canonical DOWN is tick 29781. Its visible/menu-state handoff is
    // 29782, which is the earliest subsequent A edge that selects SWAP.
    segments = [...cloned.segments.slice(0, 151), { buttons: ['A'], frames: 1 }, { buttons: [], frames: 400 }];
    break;
  case 'earliest-picker-right':
    // Prefix ends before original 29802..30000 idle span.  At 29935 the
    // transition task hands control to HandleChooseMons; RIGHT is accepted.
    segments = [...cloned.segments.slice(0, 153), { buttons: [], frames: 133 }, { buttons: ['RIGHT'], frames: 1 }, { buttons: [], frames: 200 }];
    break;
  case 'earliest-accept-a':
    // Same first picker-ready edge, selecting enemy slot 0 (GROVYLE).
    segments = [...cloned.segments.slice(0, 153), { buttons: [], frames: 133 }, { buttons: ['A'], frames: 1 }, { buttons: [], frames: 250 }];
    break;
}

process.stdout.write(`${JSON.stringify({
  oracleProfile: 'battle-scene-off',
  _comment: `derived from ${basePath} (${scenario}); evidence only, not an app acceptance trace`,
  segments,
  captureFrames: Array.from({ length: captureEnd - captureStart + 1 }, (_, i) => captureStart + i),
}, null, 2)}\n`);
