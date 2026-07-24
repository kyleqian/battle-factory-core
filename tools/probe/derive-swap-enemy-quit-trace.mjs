#!/usr/bin/env node
/**
 * Produce compact Battle Scene OFF enemy-origin quit-swapping probes.
 *
 * The canonical post-win trace is used only to reach its settled enemy
 * picker. These scenarios cover picker B and the enemy CANCEL action; they
 * do not replay Battle 2 or provide image data.
 *
 * Usage: node tools/probe/derive-swap-enemy-quit-trace.mjs enemy-b-idle
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..');
const basePath = resolve(root, 'tools/compare/traces-groundtruth/battle1-swapyes-b.json');
const base = JSON.parse(readFileSync(basePath, 'utf8'));
const scenario = process.argv[2] ?? 'enemy-b-idle';

const defaults = {
  'enemy-b-too-early': [29930, 29950],
  'enemy-b-idle': [29930, 30040],
  'enemy-b-prompt-a-too-early': [29970, 29990],
  'enemy-b-yes': [29955, 30080],
  'enemy-b-no': [29955, 30110],
  'enemy-b-return-b': [29955, 30110],
  'enemy-b-no-input-rejected': [30050, 30070],
  'enemy-b-no-first-input': [30050, 30070],
  'enemy-cancel-idle': [29930, 30050],
  'enemy-cancel-yes': [29955, 30090],
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

const prefix = base.segments.slice(0, 153);
// HandleChooseMons is installed during tick 29935. The next fresh edge is
// therefore tick 29936; every route starts from this source-owned picker.
const readyB = [...prefix, { buttons: [], frames: 133 }, { buttons: ['B'], frames: 1 }];
const readyCancel = [
  ...prefix,
  { buttons: [], frames: 133 },
  { buttons: ['DOWN'], frames: 1 }, { buttons: [], frames: 1 },
  { buttons: ['DOWN'], frames: 1 }, { buttons: [], frames: 1 },
  { buttons: ['A'], frames: 1 },
];

let segments;
switch (scenario) {
  case 'enemy-b-too-early':
    segments = [...prefix, { buttons: [], frames: 132 }, { buttons: ['B'], frames: 1 }, { buttons: [], frames: 100 }];
    break;
  case 'enemy-b-idle':
    segments = [...readyB, { buttons: [], frames: 600 }];
    break;
  case 'enemy-b-yes':
    // State 5 is installed during 29977; the next physical edge takes YES.
    segments = [...readyB, { buttons: [], frames: 41 }, { buttons: ['A'], frames: 1 }, { buttons: [], frames: 600 }];
    break;
  case 'enemy-b-prompt-a-too-early':
    segments = [...readyB, { buttons: [], frames: 40 }, { buttons: ['A'], frames: 1 }, { buttons: [], frames: 600 }];
    break;
  case 'enemy-b-no':
    segments = [...readyB, { buttons: [], frames: 41 }, { buttons: ['DOWN'], frames: 1 }, { buttons: [], frames: 19 }, { buttons: ['A'], frames: 1 }, { buttons: [], frames: 600 }];
    break;
  case 'enemy-b-return-b':
    segments = [...readyB, { buttons: [], frames: 61 }, { buttons: ['B'], frames: 1 }, { buttons: [], frames: 600 }];
    break;
  case 'enemy-b-no-input-rejected':
    segments = [...readyB, { buttons: [], frames: 41 }, { buttons: ['DOWN'], frames: 1 }, { buttons: [], frames: 19 }, { buttons: ['A'], frames: 1 }, { buttons: [], frames: 48 }, { buttons: ['RIGHT'], frames: 1 }, { buttons: [], frames: 8 }];
    break;
  case 'enemy-b-no-first-input':
    segments = [...readyB, { buttons: [], frames: 41 }, { buttons: ['DOWN'], frames: 1 }, { buttons: [], frames: 19 }, { buttons: ['A'], frames: 1 }, { buttons: [], frames: 49 }, { buttons: ['RIGHT'], frames: 1 }, { buttons: [], frames: 8 }];
    break;
  case 'enemy-cancel-idle':
    segments = [...readyCancel, { buttons: [], frames: 600 }];
    break;
  case 'enemy-cancel-yes':
    // State 5 is installed during 29981; the next edge accepts default YES.
    segments = [...readyCancel, { buttons: [], frames: 41 }, { buttons: ['A'], frames: 1 }, { buttons: [], frames: 600 }];
    break;
}

process.stdout.write(`${JSON.stringify({
  oracleProfile: 'battle-scene-off',
  _comment: `derived from ${basePath} (${scenario}); enemy-origin quit evidence only`,
  segments,
  captureFrames: Array.from({ length: captureEnd - captureStart + 1 }, (_, i) => captureStart + i),
}, null, 2)}\n`);
