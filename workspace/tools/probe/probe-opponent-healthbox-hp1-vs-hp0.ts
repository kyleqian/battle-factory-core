// ISSUES #97, docs/turn5-resolve-ab-pools-diagnosis.md §19.4's own named
// next probe: render `opponentHealthboxContentForHp(1)` vs a hypothetical
// `opponentHealthboxContentForHp(0)` in isolation and diff the two
// composited outputs at full-frame (52,33)-(52,34) - the exact 2px element
// that transitions 2 render ticks late in the app vs real hardware.
//
// `opponentHealthboxContentForHp` itself is a module-private function in
// battleScene.ts (not exported, and this session may not export it - `git
// diff -- src/` must stay empty), so this probe reconstructs its exact call
// shape directly against `composeOpponentHealthbox` (a leaf module, no
// circular-trio TDZ concern - `healthboxAssembly.ts` imports nothing from
// battleScene.ts/battleSceneCanonical.ts/battleMenu.ts) using the same
// asset wiring and GROVYLE-anchor params battleScene.ts:2260-2266/2253-2258
// use, sourced from their own upstream leaf modules.
//
// Usage: node --experimental-strip-types tools/probe/probe-opponent-healthbox-hp1-vs-hp0.ts

import { composeOpponentHealthbox, HEALTHBOX_FRAME_ORIGIN } from "../../src/engine/healthboxAssembly.ts";
import { resolveBattle1PresentationHpValues } from "../../src/engine/battle1PresentationHpStaging.ts";
import battleHealthboxAsset from "../../src/assets/gen/battle-healthbox.json" with { type: "json" };
import speciesNamesAsset from "../../src/data/gen/species-names.json" with { type: "json" };

const battle1 = resolveBattle1PresentationHpValues();
const anchorOpponentBattler = battle1.opponent; // GROVYLE
const anchorOpponentName = (speciesNamesAsset as { species: { name: string }[] }).species[anchorOpponentBattler.species]!.name;
const ANCHOR_OPPONENT_GENDER = "male";

const healthboxAssemblyAssets = {
  frame: (battleHealthboxAsset as any).singlesOpponent,
  hpbar: (battleHealthboxAsset as any).hpbar,
  hpbarAnim: (battleHealthboxAsset as any).hpbarAnim,
  frameEnd: (battleHealthboxAsset as any).frameEnd,
  statusIcons: (battleHealthboxAsset as any).status2,
};

console.log("anchorOpponentBattler:", anchorOpponentBattler, "name:", anchorOpponentName);

function contentForHp(hp: number) {
  return composeOpponentHealthbox(healthboxAssemblyAssets, {
    name: anchorOpponentName,
    level: anchorOpponentBattler.level,
    gender: ANCHOR_OPPONENT_GENDER,
    hpFraction: hp / anchorOpponentBattler.maxHP,
    status: "none",
  });
}

const c1 = contentForHp(1);
const c0 = contentForHp(0);

console.log(`content size: ${c1.width}x${c1.height}, FRAME_ORIGIN=(${HEALTHBOX_FRAME_ORIGIN.x},${HEALTHBOX_FRAME_ORIGIN.y})`);

// Target full-frame pixels (52,33) and (52,34) per §19.4 -> local coords.
const targets = [
  { fx: 52, fy: 33 },
  { fx: 52, fy: 34 },
];
for (const { fx, fy } of targets) {
  const lx = fx - HEALTHBOX_FRAME_ORIGIN.x;
  const ly = fy - HEALTHBOX_FRAME_ORIGIN.y;
  const p1 = c1.pixels[ly * c1.width + lx];
  const p0 = c0.pixels[ly * c0.width + lx];
  console.log(`full(${fx},${fy}) -> local(${lx},${ly}): hp=1 -> ${JSON.stringify(p1)}, hp=0 -> ${JSON.stringify(p0)}`);
}

// Full compositor diff (any OTHER pixel that also differs hp=1 vs hp=0).
let diffCount = 0;
const diffCoords: { lx: number; ly: number; fx: number; fy: number; p1: unknown; p0: unknown }[] = [];
for (let ly = 0; ly < c1.height; ly += 1) {
  for (let lx = 0; lx < c1.width; lx += 1) {
    const i = ly * c1.width + lx;
    const p1 = c1.pixels[i];
    const p0 = c0.pixels[i];
    const same = JSON.stringify(p1) === JSON.stringify(p0);
    if (!same) {
      diffCount += 1;
      diffCoords.push({ lx, ly, fx: lx + HEALTHBOX_FRAME_ORIGIN.x, fy: ly + HEALTHBOX_FRAME_ORIGIN.y, p1, p0 });
    }
  }
}
console.log(`\nTotal differing pixels (hp=1 vs hp=0), full compositor: ${diffCount}`);
for (const d of diffCoords) {
  console.log(`  local(${d.lx},${d.ly}) full(${d.fx},${d.fy}): hp=1 -> ${JSON.stringify(d.p1)}, hp=0 -> ${JSON.stringify(d.p0)}`);
}
