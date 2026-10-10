// sw67 (docs/next-adapters-sw67.md): Shock Wave 351's geometry-keyed sprite-order plan, checked per frame against plans48's 8 ROM
// receipts (fixtures/plans48/units.json sw-*, both sides) through the production seam (liveMoveAnimation.ts
// liveMoveGeometrySpriteOrderPlanText case 351 = shockWave.ts shockWaveSpriteOrderPlanText over the reducer's own allocation timeline),
// at each receipt's own start order (F0 as the lent order). Per unit: the seam text equals the tool's direct reducer text; every window's
// free order F equals the ROM's after the plan prefix; window count equal; every window's body age equals the ROM frame offset.
// With --predictions=<predictions.json> (sw67Predict.ts, committed before the probes) each unit's committed predicted text and start order
// must also equal the ROM's (prediction == plan == ROM).
// usage: node --experimental-strip-types tools/integration/sw67ShockWaveFit.ts [out.json] [--units=<units.json>] [--prefix=sw-]
//        [--predictions=<predictions.json>]
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { shockWaveSpriteOrderPlanWindows, type ShockWaveLiveInputs } from "../../src/animation/shockWave.ts";
import shockWaveAsset from "../../src/animation/assets/shock-wave.json" with { type: "json" };
import { createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";
import { liveBattlerAnchors, liveMoveGeometrySpriteOrderPlanText } from "../../src/engine/liveMoveAnimation.ts";
import { composeLivePalettes } from "../../src/engine/liveMovePaletteComposite.ts";
import { liveShockWaveInputs } from "../../src/engine/liveOamMoves.ts";
import { decodeSpriteOrderPlan } from "../../src/engine/spriteOrderEventTransform.ts";
import {
  KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER, applySpriteOrderUnitPlan, createSpriteOrderPlanCursor, spriteOrderWithOccupiedPrefix,
} from "../../src/engine/spriteOrderProvider.ts";

type Side = "player" | "opponent";
export function sw67Inputs(attackerSide: Side, playerSpecies: number, opponentSpecies: number, lentFree: readonly number[]): ShockWaveLiveInputs {
  const art = createBattleCommandFieldArtView({ player: { species: playerSpecies }, opponent: { species: opponentSpecies } } as never);
  const targetSide = attackerSide === "player" ? "opponent" : "player";
  const attacker = liveBattlerAnchors(attackerSide, art), target = liveBattlerAnchors(targetSide, art);
  const rgb555 = (c: { r: number; g: number; b: number }) => (c.r >> 3) | (c.g >> 3) << 5 | (c.b >> 3) << 10;
  const resourcePalette = (name: string) => (shockWaveAsset as unknown as { art: Record<string, { palette: { r: number; g: number; b: number }[] }> }).art[name]!.palette.map(rgb555);
  const animationInputs = liveShockWaveInputs({ attackerSide, opponentSpecies: art.opponent.speciesSymbol, attacker, target,
    palettes: composeLivePalettes(art.player.speciesSymbol, art.opponent.speciesSymbol)!,
    activationOrder: spriteOrderWithOccupiedPrefix({ known: true, free: lentFree, pendingDestroyed: [] }, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER)!,
    resourcePalettes: { circleOfLight: resourcePalette("circleOfLight"), electricOrbs: resourcePalette("electricOrbs"), spark: resourcePalette("spark"), lightning: resourcePalette("lightning") } });
  return { ...animationInputs, attackerSide, targetSide, attackerSpecies: art[attackerSide].speciesSymbol, targetSpecies: art[targetSide].speciesSymbol,
    attackerPictureOrigin: attacker.picOffsetPoint, targetPictureOrigin: target.picOffsetPoint,
    targetBattlePosition: { x: target.picOffsetPoint.x, y: target.battlePositionCenter.y } } as never;
}

/** The seam's plan text for (side, species, lent order): liveMoveGeometrySpriteOrderPlanText(351, ...). */
export function sw67SeamPlan(attackerSide: Side, playerSpecies: number, opponentSpecies: number, lentFree: readonly number[]): string | null {
  return liveMoveGeometrySpriteOrderPlanText(351, attackerSide, { playerSpecies, opponentSpecies },
    { player: { species: playerSpecies }, opponent: { species: opponentSpecies } } as never, lentFree);
}

const same = (l: readonly number[], r: readonly number[]) => l.length === r.length && l.every((v, i) => v === r[i]);
interface RomUnit { readonly label: string; readonly frame: number; readonly F0: number[]; readonly windows: { f: number; F: number[] }[] }
export function sw67CheckUnit(side: Side, playerSpecies: number, opponentSpecies: number, unit: RomUnit) {
  const windows = shockWaveSpriteOrderPlanWindows(sw67Inputs(side, playerSpecies, opponentSpecies, unit.F0));
  const text = windows.map(w => w.text).join(";");
  const seam = sw67SeamPlan(side, playerSpecies, opponentSpecies, unit.F0);
  const plan = decodeSpriteOrderPlan(text);
  const start = createSpriteOrderPlanCursor({ known: true, free: unit.F0, pendingDestroyed: [] });
  let firstDivergence = -1, frameMismatches = 0;
  for (let k = 0; k < Math.min(plan.length, unit.windows.length); k += 1) {
    const cursor = applySpriteOrderUnitPlan(start, plan.slice(0, k + 1));
    if (!cursor.order.known || !same(cursor.order.free, unit.windows[k]!.F)) { firstDivergence = k; break; }
    if (windows[k]!.age !== unit.windows[k]!.f - unit.frame) frameMismatches += 1;
  }
  const exact = firstDivergence < 0 && plan.length === unit.windows.length && frameMismatches === 0 && seam === text;
  return { side, playerSpecies, opponentSpecies, romWindows: unit.windows.length, modelWindows: plan.length, firstDivergence, frameMismatches,
    seamEqual: seam === text, exact, plan: text };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (name: string) => process.argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3);
  const out = process.argv.slice(2).find(a => !a.startsWith("--"));
  const unitsPath = arg("units") ?? new URL("./fixtures/plans48/units.json", import.meta.url).pathname;
  const prefix = arg("prefix") ?? "sw-";
  const jobs = JSON.parse(readFileSync(unitsPath, "utf8")).jobs as Record<string, { base: string; ops?: [string, string, number][]; species?: { player: number; opponent: number }; units: RomUnit[] }>;
  const predictionsPath = arg("predictions");
  const predicted = new Map<string, { plan: string; F0: number[] }>(predictionsPath === undefined ? []
    : JSON.parse(readFileSync(predictionsPath, "utf8")).rows.map((row: { id: string; plan: string; F0: number[] }) => [row.id, row]));
  const rows: { exact: boolean }[] = [];
  for (const [job, entry] of Object.entries(jobs)) {
    if (!job.startsWith(prefix)) continue;
    let species = entry.species;
    if (!species) {
      const scenario = JSON.parse(readFileSync(new URL(`../battle-lab/${entry.base}.json`, import.meta.url), "utf8"));
      const s = { player: scenario.overrides.parties.player[0].species, opponent: scenario.overrides.parties.opponent[0].species };
      for (const op of entry.ops ?? []) if (op[0] === "species") s[op[1] as Side] = op[2];
      species = s;
    }
    for (const unit of entry.units) {
      const m = /^body 351:(player|opponent)$/.exec(unit.label);
      if (!m) continue;
      const checked = sw67CheckUnit(m[1] as Side, species.player, species.opponent, unit);
      const prediction = predictionsPath === undefined ? undefined : predicted.get(job);
      const predictionEqual = prediction === undefined ? undefined : prediction.plan === checked.plan && same(prediction.F0, unit.F0);
      const row = { job, ...checked, ...(predictionsPath === undefined ? {} : { predictionEqual }),
        exact: checked.exact && (predictionsPath === undefined || predictionEqual === true) };
      rows.push(row);
      console.log(`${job} ${row.side} ${JSON.stringify(species)}: ROM ${row.romWindows} windows, model ${row.modelWindows}; ` +
        (row.exact ? `PER-FRAME EXACT (F, count, ages, seam${predictionsPath === undefined ? "" : ", committed prediction"})`
          : `first divergence ${row.firstDivergence}, age mismatches ${row.frameMismatches}, seam ${row.seamEqual}, prediction ${predictionEqual}`));
    }
  }
  const summary = { units: rows.length, exact: rows.filter(r => r.exact).length };
  console.log(`exact ${summary.exact} / ${summary.units}`);
  const unitsSha256 = createHash("sha256").update(readFileSync(unitsPath)).digest("hex");
  if (out) writeFileSync(out, `${JSON.stringify({ schema: "sw67-fit-v1", unitsSha256, prefix, summary, rows }, null, 1)}\n`);
  if (summary.exact !== summary.units || summary.units === 0) process.exitCode = 1;
}
