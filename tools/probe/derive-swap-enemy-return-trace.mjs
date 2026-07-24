#!/usr/bin/env node
/**
 * Derive short Battle Scene OFF probes for the enemy `PKMN FOR SWAP` action.
 *
 * The long post-win route is referenced, never copied.  The appended inputs
 * start at the source-owned enemy picker and only navigate cursor 0 -> 3,
 * where Swap_ActionPkmnForSwap returns to the player picker.
 *
 * Usage:
 *   node tools/probe/derive-swap-enemy-return-trace.mjs rejected > /tmp/t.json
 *   node tools/probe/derive-swap-enemy-return-trace.mjs accepted > /tmp/t.json
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

const scenario = process.argv[2] ?? 'accepted';
const defaults = {
  // Tick 29935 installs HandleChooseMons state 1 during the advance. A
  // direction edge on that same tick cannot be processed by the old task.
  rejected: [29930, 29945],
  // One fresh DPAD_DOWN edge moves from the ball row to the `PKMN FOR SWAP`
  // action (index 3), then A invokes Swap_ActionPkmnForSwap. The rest is the
  // shared out/switch/in sequence.
  accepted: [29934, 30048],
  // HandleChooseMons is installed during tick 30047, so an edge there is
  // rejected; its first fresh player-picker edge is tick 30048.
  'player-input-rejected': [30042, 30052],
  'first-player-input': [30042, 30052],
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
const rejected = [...prefix, { buttons: [], frames: 132 }, { buttons: ['DOWN'], frames: 1 }, { buttons: [], frames: 80 }];
const accepted = [
  ...prefix,
  { buttons: [], frames: 133 },
  { buttons: ['DOWN'], frames: 1 }, { buttons: [], frames: 1 },
  { buttons: ['A'], frames: 1 }, { buttons: [], frames: 240 },
];

const returnPrefix = [
  ...prefix,
  { buttons: [], frames: 133 },
  { buttons: ['DOWN'], frames: 1 }, { buttons: [], frames: 1 },
  { buttons: ['A'], frames: 1 },
];
const playerInputRejected = [...returnPrefix, { buttons: [], frames: 108 }, { buttons: ['RIGHT'], frames: 1 }, { buttons: [], frames: 8 }];
const firstPlayerInput = [...returnPrefix, { buttons: [], frames: 109 }, { buttons: ['RIGHT'], frames: 1 }, { buttons: [], frames: 8 }];
const segments = {
  rejected,
  accepted,
  'player-input-rejected': playerInputRejected,
  'first-player-input': firstPlayerInput,
}[scenario];
process.stdout.write(`${JSON.stringify({
  oracleProfile: 'battle-scene-off',
  _comment: `derived from ${basePath} (${scenario}); evidence only, not an app acceptance trace`,
  segments,
  captureFrames: Array.from({ length: captureEnd - captureStart + 1 }, (_, i) => captureStart + i),
}, null, 2)}\n`);
