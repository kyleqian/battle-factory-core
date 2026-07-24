#!/usr/bin/env node
/**
 * Derive compact Battle Scene OFF probes for player-picker SUMMARY return.
 *
 * The canonical post-win route is only an input prefix.  Appended inputs
 * begin at the already-proven player options popup and never enter Battle 2.
 *
 * Usage: node tools/probe/derive-swap-summary-return-trace.mjs <scenario>
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..');
const basePath = resolve(root, 'tools/compare/traces-groundtruth/battle1-swapyes-a.json');
const base = JSON.parse(readFileSync(basePath, 'utf8'));
const scenario = process.argv[2] ?? 'open';

const ranges = {
  'menu-a-too-early': [29754, 29830],
  open: [29754, 29999],
  'return-b': [29754, 29999],
  'return-b-too-early': [29754, 29999],
  'picker-down-too-early': [29754, 29999],
  'first-picker-input': [29754, 29999],
};
if (!(scenario in ranges))
  throw new Error(`unknown scenario ${scenario}; expected ${Object.keys(ranges).join(', ')}`);

const [start, end] = ranges[scenario];
if (end - start + 1 > 256)
  throw new Error('oracle capture limit is 256 frames; use the RAM probe for longer state windows');

// At 29759 Task_HandleMenu advances into its input state.  The fresh edge at
// 29760 selects the default SUMMARY option.  The preceding edge is retained
// separately as the rejected control pair.
const menuPrefix = [...base.segments.slice(0, 149), { buttons: [], frames: 57 }];
const open = [...menuPrefix, { buttons: ['A'], frames: 1 }];
let segments;
switch (scenario) {
  case 'menu-a-too-early':
    segments = [...base.segments.slice(0, 149), { buttons: [], frames: 56 }, { buttons: ['A'], frames: 1 }, { buttons: [], frames: 300 }];
    break;
  case 'open':
    segments = [...open, { buttons: [], frames: 600 }];
    break;
  case 'return-b-too-early':
    segments = [...open, { buttons: [], frames: 61 }, { buttons: ['B'], frames: 1 }, { buttons: [], frames: 400 }];
    break;
  case 'return-b':
    segments = [...open, { buttons: [], frames: 62 }, { buttons: ['B'], frames: 1 }, { buttons: [], frames: 400 }];
    break;
  case 'first-picker-input':
    segments = [...open, { buttons: [], frames: 62 }, { buttons: ['B'], frames: 1 }, { buttons: [], frames: 60 }, { buttons: ['DOWN'], frames: 1 }, { buttons: [], frames: 80 }];
    break;
  case 'picker-down-too-early':
    segments = [...open, { buttons: [], frames: 62 }, { buttons: ['B'], frames: 1 }, { buttons: [], frames: 59 }, { buttons: ['DOWN'], frames: 1 }, { buttons: [], frames: 80 }];
    break;
}

process.stdout.write(`${JSON.stringify({
  oracleProfile: 'battle-scene-off',
  _comment: `derived from ${basePath} (${scenario}); dev-only summary-return evidence`,
  segments,
  captureFrames: Array.from({ length: end - start + 1 }, (_, i) => start + i),
}, null, 2)}\n`);
