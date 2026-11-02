// pmf240 (ISSUES #190): diff the composed party-menu card renderer against an oracle frame, before (fainted row
// status null, the pre-fix projection) and after, over the level/icon cell and the whole card.
// Usage: node --experimental-strip-types tools/integration/pmf240CardProof.ts <oracle.png> <outDir> [cursor 0|1]
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import { createFramebuffer } from "../../src/engine/framebuffer.ts";
import { battlePartySelectStateForForcedParty, renderBattlePartySelect } from "../../src/engine/battlePartySelect.ts";
import {
  CANONICAL_FORCED_SWITCH_PARTY,
  CANONICAL_FORCED_SWITCH_RENTAL_RECORDS,
  CANONICAL_FORCED_SWITCH_REQUEST,
  createPartySelectStateFromForcedSwitch,
  PARTY_LIST_INPUT_ELAPSED,
} from "../../src/engine/partySelect.ts";

const [oraclePath, outDir, cursorArg] = process.argv.slice(2);
if (!oraclePath || !outDir) throw new Error("usage: pmf240CardProof.ts <oracle.png> <outDir> [cursor]");
const cursor = Number(cursorArg ?? "0") as 0 | 1;
const oracle = PNG.sync.read(readFileSync(oraclePath)).data;
const base = { ...createPartySelectStateFromForcedSwitch(CANONICAL_FORCED_SWITCH_REQUEST, CANONICAL_FORCED_SWITCH_RENTAL_RECORDS, CANONICAL_FORCED_SWITCH_PARTY), cursor, elapsed: PARTY_LIST_INPUT_ELAPSED + 40 };
const after = battlePartySelectStateForForcedParty(base);
const before = { ...after, rows: after.rows.map((row) => (row.fainted ? { ...row, status: null } : row)) } as typeof after;

const regions: Record<string, [number, number, number, number]> = {
  "ONIX level text cell (x40-72,y44-52)": [40, 44, 72, 52],
  "ONIX status icon sprite (centre 50,52 -> x34-66,y48-56)": [34, 48, 66, 56],
  "ONIX level/icon union (x34-72,y44-56)": [34, 44, 72, 56],
  "ONIX card (x0-88,y16-72)": [0, 16, 88, 72],
  "whole frame": [0, 0, 240, 160],
};
function render(state: typeof after): Uint8Array {
  const fb = createFramebuffer();
  renderBattlePartySelect(fb, state);
  return fb;
}
function count(fb: Uint8Array, [x0, y0, x1, y1]: [number, number, number, number]): number {
  let n = 0;
  for (let y = y0; y < y1; y += 1) for (let x = x0; x < x1; x += 1) {
    const i = (y * 240 + x) * 4;
    if (fb[i] !== oracle[i] || fb[i + 1] !== oracle[i + 1] || fb[i + 2] !== oracle[i + 2]) n += 1;
  }
  return n;
}
function save(name: string, fb: Uint8Array): void {
  const png = new PNG({ width: 240, height: 160 });
  png.data = Buffer.from(fb);
  writeFileSync(join(outDir, name), PNG.sync.write(png));
}
const b = render(before);
const a = render(after);
save(`composed-before-cursor${cursor}.png`, b);
save(`composed-after-cursor${cursor}.png`, a);
for (const [name, rect] of Object.entries(regions)) console.log(`${name}: ${count(b, rect)} -> ${count(a, rect)} differing px`);
