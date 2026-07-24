#!/usr/bin/env node
/**
 * Produce tightly captured Battle Scene OFF quit-swapping evidence traces.
 *
 * The long post-win route is only a deterministic entry fixture.  Every
 * scenario branches from its settled player picker; no image data is read or
 * supplied by this script.
 *
 * Usage:
 *   node tools/probe/derive-swap-quit-trace.mjs player-b > /tmp/quit.json
 *   node tools/probe/derive-swap-quit-trace.mjs player-b-too-early > /tmp/quit.json
 *
 * Optional two integer arguments replace the default inclusive capture range.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..');
const basePath = resolve(root, 'tools/compare/traces-groundtruth/battle1-swapyes-a.json');
const base = JSON.parse(readFileSync(basePath, 'utf8'));
const scenario = process.argv[2] ?? 'player-b';

const defaults = {
  'player-b-too-early': [29698, 29953],
  'player-b': [29698, 29953],
  'player-b-prompt-a-too-early': [29730, 29820],
  'player-b-yes': [29730, 29920],
  'player-b-no': [29730, 29920],
  'player-b-return-b': [29730, 29920],
  'player-cancel-yes': [29698, 29765],
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

// The first 147 segments finish the offer-YES fade on tick 29602.  The edge
// check inserts B during that fade (29650), then releases it before the
// settled picker B (29702).  This gives a control-edge rejection/acceptance
// pair without conflating held input with a later JOY_NEW sample.
const playerPickerPrefix = base.segments.slice(0, 147);
const readyB = [...playerPickerPrefix, { buttons: [], frames: 99 }, { buttons: ['B'], frames: 1 }];
const readyCancel = [
  ...playerPickerPrefix,
  { buttons: [], frames: 99 },
  { buttons: ['LEFT'], frames: 1 },
  { buttons: [], frames: 4 },
  { buttons: ['A'], frames: 1 },
];

let segments;
switch (scenario) {
  case 'player-b-too-early':
    segments = [
      ...playerPickerPrefix,
      { buttons: [], frames: 47 }, { buttons: ['B'], frames: 1 },
      { buttons: [], frames: 51 }, { buttons: ['B'], frames: 1 },
      { buttons: [], frames: 600 },
    ];
    break;
  case 'player-b':
    segments = [...readyB, { buttons: [], frames: 600 }];
    break;
  case 'player-b-prompt-a-too-early':
    // State 5 first appears in the snapshot after 29736's task run.  This
    // edge is deliberately one frame too early, then released.
    segments = [...readyB, { buttons: [], frames: 34 }, { buttons: ['A'], frames: 1 }, { buttons: [], frames: 600 }];
    break;
  case 'player-b-yes':
    // The next edge, at state-5 snapshot + 1, takes the default YES path.
    segments = [...readyB, { buttons: [], frames: 35 }, { buttons: ['A'], frames: 1 }, { buttons: [], frames: 600 }];
    break;
  case 'player-b-no':
    segments = [...readyB, { buttons: [], frames: 35 }, { buttons: ['DOWN'], frames: 1 }, { buttons: [], frames: 19 }, { buttons: ['A'], frames: 1 }, { buttons: [], frames: 600 }];
    break;
  case 'player-b-return-b':
    segments = [...readyB, { buttons: [], frames: 55 }, { buttons: ['B'], frames: 1 }, { buttons: [], frames: 600 }];
    break;
  case 'player-cancel-yes':
    segments = [...readyCancel, { buttons: [], frames: 35 }, { buttons: ['A'], frames: 1 }, { buttons: [], frames: 600 }];
    break;
}

process.stdout.write(`${JSON.stringify({
  oracleProfile: 'battle-scene-off',
  _comment: `derived from ${basePath} (${scenario}); short player-origin quit acceptance window`,
  segments,
  captureFrames: Array.from({ length: captureEnd - captureStart + 1 }, (_, i) => captureStart + i),
}, null, 2)}\n`);
