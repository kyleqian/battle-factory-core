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
 *   node tools/probe/derive-swap-enemy-picker-trace.mjs accept-state5-a > /tmp/t.json
 *   node tools/probe/derive-swap-enemy-picker-trace.mjs accept-yes > /tmp/t.json
 *   node tools/probe/derive-swap-enemy-picker-trace.mjs accept-no > /tmp/t.json
 *   node tools/probe/derive-swap-enemy-picker-trace.mjs accept-b > /tmp/t.json
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
  'accept-state5-a': [29996, 30020],
  'accept-yes': [29996, 30251],
  'accept-no': [29996, 30251],
  'accept-b': [30016, 30271],
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
// Through tick 29802, this is the committed route's SWAP press.  The picker
// task becomes HandleChooseMons at snapshot 29935, so the first processed A
// edge is 29936.  The accept task reaches its input-ready state at snapshot
// 29999; the first processed prompt edge is consequently 30000.  Keeping
// this construction in one place makes accept variants phase-relative
// evidence, rather than a copied long trace.
const toPrompt = [
  ...cloned.segments.slice(0, 153),
  { buttons: [], frames: 133 },
  { buttons: ['A'], frames: 1 },
  { buttons: [], frames: 63 },
];
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
  case 'accept-yes':
    // First processed HandleYesNo edge: A selects the default YES cursor.
    segments = [...toPrompt, { buttons: ['A'], frames: 1 }, { buttons: [], frames: 800 }];
    break;
  case 'accept-state5-a':
    // State 5 first appears in the snapshot after tick 29999's task run;
    // this A edge is deliberately one frame too early and is rejected.
    segments = [...cloned.segments.slice(0, 153), { buttons: [], frames: 133 }, { buttons: ['A'], frames: 1 }, { buttons: [], frames: 62 }, { buttons: ['A'], frames: 1 }, { buttons: [], frames: 100 }];
    break;
  case 'accept-no':
    // DOWN is accepted at the first processed prompt edge.  The deliberately delayed
    // A proves NO is an ordinary input-ready branch, not a one-frame edge.
    segments = [...toPrompt, { buttons: ['DOWN'], frames: 1 }, { buttons: [], frames: 19 }, { buttons: ['A'], frames: 1 }, { buttons: [], frames: 500 }];
    break;
  case 'accept-b':
    // B is deliberately delayed 20 frames after the first processed edge and still follows
    // the same no-mutation return path as A on NO.
    segments = [...toPrompt, { buttons: [], frames: 20 }, { buttons: ['B'], frames: 1 }, { buttons: [], frames: 500 }];
    break;
}

process.stdout.write(`${JSON.stringify({
  oracleProfile: 'battle-scene-off',
  _comment: `derived from ${basePath} (${scenario}); evidence only, not an app acceptance trace`,
  segments,
  captureFrames: Array.from({ length: captureEnd - captureStart + 1 }, (_, i) => captureStart + i),
}, null, 2)}\n`);
