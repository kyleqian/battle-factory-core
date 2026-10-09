// plans51: Shock Wave 351 geometry-keyed plan attempt (docs/next-adapters-plans51.md "Not landed"). The candidate generator derives
// the sprite-order plan from the body reducer's own timeline (shockWave.ts shockWaveAtAge: owned sprites + the modelled sSpriteOrder
// painter order per age; creations first-free in slot order, a same-age destroy group in the previous age's painter order), with
// the reducer inputs the live `case 351` adapter builds (liveOamMoves.ts liveShockWaveInputs at the known-entry first-action
// order), and checks it per frame against plans48's 8 Shock Wave ROM receipts (fixtures/plans48/units.json sw-*).
// Result: windows 0..36 exact on all 8; window 37 (f81) diverges everywhere: the duration-40 charging particles stay allocated in
// the ROM until f92 / f93 (the reducer ends them at f79 / f80, pixel-neutral for the renderer). With those two lifetimes forced to
// the ROM's (--force-particles), the next divergence is window 40..46 (bolt lifetimes); opponent side 79 ROM windows vs 98 modelled.
// usage: node --experimental-strip-types tools/integration/plans51ShockWaveFit.ts [--force-particles]
import { readFileSync } from "node:fs";
import { shockWaveAtAge, shockWaveTimingFor, type ShockWaveLiveInputs } from "../../src/animation/shockWave.ts";
import shockWaveAsset from "../../src/animation/assets/shock-wave.json" with { type: "json" };
import { createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";
import { liveBattlerAnchors } from "../../src/engine/liveMoveAnimation.ts";
import { composeLivePalettes } from "../../src/engine/liveMovePaletteComposite.ts";
import { liveShockWaveInputs } from "../../src/engine/liveOamMoves.ts";
import { decodeSpriteOrderPlan } from "../../src/engine/spriteOrderEventTransform.ts";
import {
  KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER, applySpriteOrderUnitPlan, createSpriteOrderPlanCursor,
  spriteOrderWithOccupiedPrefix,
} from "../../src/engine/spriteOrderProvider.ts";

const force = process.argv.includes("--force-particles");
function planText(input: Readonly<ShockWaveLiveInputs>): string {
  const lastAge = shockWaveTimingFor(input).cleanupAge;
  const owner = (sprite: { readonly kind: string; readonly birthAge: number }) => `${sprite.kind}@${sprite.birthAge}`;
  const created = new Map<string, number>();
  let live = new Map<string, number>(), painter: readonly number[] = [];
  const windows: string[] = [];
  for (let age = 0; age <= lastAge; age += 1) {
    const state = shockWaveAtAge(age, input);
    const now = new Map<string, number>(state.sprites.map(sprite => [owner(sprite), sprite.slot]));
    if (force && age >= 79 && age <= 91) now.set("charging@31", 3);
    if (force && age >= 80 && age <= 92) now.set("charging@32", 4);
    const made = [...now.entries()].filter(([id]) => !live.has(id)).sort((l, r) => l[1] - r[1]).map(([id]) => id);
    const destroyed = [...live.entries()].filter(([id]) => !now.has(id)).sort((l, r) => painter.indexOf(l[1]) - painter.indexOf(r[1])).map(([id]) => id);
    for (const id of made) created.set(id, created.size);
    const parts: string[] = [];
    if (made.length) parts.push(`C${"f".repeat(made.length)}`);
    if (destroyed.length) parts.push(`D${destroyed.map(id => created.get(id)).join(",")}`);
    if (parts.length) windows.push(parts.join("/"));
    live = now; painter = state.painterOrder;
  }
  return windows.join(";");
}
function inputsAt(attackerSide: "player" | "opponent", playerSpecies: number, opponentSpecies: number): ShockWaveLiveInputs {
  const art = createBattleCommandFieldArtView({ player: { species: playerSpecies }, opponent: { species: opponentSpecies } } as never);
  const targetSide = attackerSide === "player" ? "opponent" : "player";
  const attacker = liveBattlerAnchors(attackerSide, art), target = liveBattlerAnchors(targetSide, art);
  const rgb555 = (c: { r: number; g: number; b: number }) => (c.r >> 3) | (c.g >> 3) << 5 | (c.b >> 3) << 10;
  const resourcePalette = (name: string) => (shockWaveAsset as unknown as { art: Record<string, { palette: { r: number; g: number; b: number }[] }> }).art[name]!.palette.map(rgb555);
  const animationInputs = liveShockWaveInputs({ attackerSide, opponentSpecies: art.opponent.speciesSymbol, attacker, target,
    palettes: composeLivePalettes(art.player.speciesSymbol, art.opponent.speciesSymbol)!,
    activationOrder: spriteOrderWithOccupiedPrefix({ known: true, free: KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER, pendingDestroyed: [] }, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER)!,
    resourcePalettes: { circleOfLight: resourcePalette("circleOfLight"), electricOrbs: resourcePalette("electricOrbs"), spark: resourcePalette("spark"), lightning: resourcePalette("lightning") } });
  return { ...animationInputs, attackerSide, targetSide, attackerSpecies: art[attackerSide].speciesSymbol, targetSpecies: art[targetSide].speciesSymbol,
    attackerPictureOrigin: attacker.picOffsetPoint, targetPictureOrigin: target.picOffsetPoint,
    targetBattlePosition: { x: target.picOffsetPoint.x, y: target.battlePositionCenter.y } } as never;
}

const same = (l: readonly number[], r: readonly number[]) => l.length === r.length && l.every((v, i) => v === r[i]);
const units = JSON.parse(readFileSync(new URL("./fixtures/plans48/units.json", import.meta.url), "utf8")).jobs;
for (const [job, entry] of Object.entries<any>(units)) {
  if (!job.startsWith("sw-")) continue;
  const scenario = JSON.parse(readFileSync(new URL(`../battle-lab/${entry.base}.json`, import.meta.url), "utf8"));
  const species = { player: scenario.overrides.parties.player[0].species, opponent: scenario.overrides.parties.opponent[0].species };
  for (const op of entry.ops ?? []) if (op[0] === "species") species[op[1] as "player"] = op[2];
  for (const unit of entry.units) {
    const m = /^body 351:(player|opponent)$/.exec(unit.label);
    if (!m) continue;
    const plan = decodeSpriteOrderPlan(planText(inputsAt(m[1] as "player", species.player, species.opponent)));
    const start = createSpriteOrderPlanCursor({ known: true, free: unit.F0, pendingDestroyed: [] });
    let firstDivergence = -1;
    for (let k = 0; k < Math.min(plan.length, unit.windows.length); k += 1) {
      const cursor = applySpriteOrderUnitPlan(start, plan.slice(0, k + 1));
      if (!cursor.order.known || !same(cursor.order.free, unit.windows[k].F)) { firstDivergence = k; break; }
    }
    console.log(`${job} ${m[1]} ${JSON.stringify(species)}: ROM ${unit.windows.length} windows, model ${plan.length}; ` +
      (firstDivergence < 0 && plan.length === unit.windows.length ? "PER-FRAME EXACT" : `first divergence window ${firstDivergence} (f+${unit.windows[firstDivergence]?.f - unit.frame})`));
  }
}
