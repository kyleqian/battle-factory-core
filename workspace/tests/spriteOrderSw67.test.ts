// sw67 (docs/next-adapters-sw67.md): Shock Wave 351's allocation timeline and its geometry-keyed sprite-order plan.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { shockWaveAtAge, shockWaveTimingFor } from "../src/animation/shockWave.ts";
import { liveMoveGeometrySpriteOrderPlanText } from "../src/engine/liveMoveAnimation.ts";
import { SPRITE_ORDER_GEOMETRY_KEYED_BODIES } from "../src/engine/spriteOrderEventTransform.ts";
import { KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER } from "../src/engine/spriteOrderProvider.ts";
import { generatedCommandAnimationReplay } from "../tools/integration/generatedCommandAnimationReplay.ts";
import { sw67CheckUnit, sw67Inputs } from "../tools/integration/sw67ShockWaveFit.ts";

const plans48 = JSON.parse(readFileSync(new URL("../tools/integration/fixtures/plans48/units.json", import.meta.url), "utf8")).jobs;
const swOpp = plans48["sw-opp"].units.find((unit: { label: string }) => unit.label === "body 351:opponent");
const CHARGING_DURATIONS = [40, 40, 35, 35, 30, 30, 25, 25, 20, 20, 15, 15, 10, 10, 10, 10, 10, 10, 10, 10];

/** kind@birthAge -> { slot, first, last } over the reducer's own timeline. */
function lifetimes(side: "player" | "opponent", player: number, opponent: number, free: readonly number[]) {
  const input = sw67Inputs(side, player, opponent, free);
  const runs = new Map<string, { kind: string; slot: number; first: number; last: number }>();
  for (let age = 0; age <= shockWaveTimingFor(input).cleanupAge; age += 1) {
    for (const sprite of shockWaveAtAge(age, input).sprites) {
      const id = `${sprite.kind}@${sprite.birthAge}`;
      const run = runs.get(id) ?? { kind: sprite.kind, slot: sprite.slot, first: age, last: age };
      expect(run.slot).toBe(sprite.slot);
      run.last = age;
      runs.set(id, run);
    }
  }
  return runs;
}

describe("sw67: Shock Wave allocation lifetimes (source) and the slot handoff", () => {
  const runs = lifetimes("opponent", 222, 180, swOpp.F0);
  it("source lifetimes: charging particle duration + 8, bolt 13, lightning 30, orb 45..105, palette blend 16..29", () => {
    const charging = [...runs.values()].filter(run => run.kind === "charging").sort((l, r) => l.first - r.first);
    expect(charging.map(run => run.first)).toEqual(CHARGING_DURATIONS.map((_, index) => 31 + index));
    // AnimTask_ElectricChargingParticles_Step data[0] = 40 - data[8] * 5; anim 0 (4 one-frame cmds + END) then AnimTranslateLinear
    // for data[0] steps, then DestroySprite: alive birth .. birth + duration + 7.
    expect(charging.map(run => run.last - run.first + 1)).toEqual(CHARGING_DURATIONS.map(duration => duration + 8));
    const bolts = [...runs.values()].filter(run => run.kind === "progressing");
    expect(bolts.length).toBeGreaterThan(0);
    // AnimShockWaveProgressingBolt: `++data[0] > 12` -> DestroySprite on its 13th callback.
    for (const bolt of bolts) expect(bolt.last - bolt.first + 1).toBe(13);
    const lightning = [...runs.values()].filter(run => run.kind === "lightning");
    expect(lightning.length).toBeGreaterThan(0);
    // AnimShockWaveLightning: DestroySprite at animEnded (sAnim_Lightning 5 + 5 + 8 + 5 + 5).
    for (const bolt of lightning) expect(bolt.last - bolt.first + 1).toBe(30);
    const orb = [...runs.values()].filter(run => run.kind === "orb");
    expect(orb.map(run => [run.first, run.last])).toEqual([[45, 105]]);
    const blend = [...runs.values()].filter(run => run.kind === "palette-blend");
    expect(blend.map(run => [run.first, run.last])).toEqual([[16, 29]]);
  });
  it("the duration-40 particles' slots pass to the bolts created on their destroy frame (AnimateSprites before RunTasks)", () => {
    const at = (kind: string, first: number) => [...runs.values()].find(run => run.kind === kind && run.first === first)!;
    expect([at("charging", 31).slot, at("charging", 31).last, at("charging", 32).slot, at("charging", 32).last]).toEqual([3, 78, 4, 79]);
    // The ROM snapshot sees slots 3 / 4 occupied until f+92 / f+93: the bolts born at 79 / 80 in the freed slots, 13 frames each.
    expect([at("progressing", 79).slot, at("progressing", 79).last + 1]).toEqual([3, 92]);
    expect([at("progressing", 80).slot, at("progressing", 80).last + 1]).toEqual([4, 93]);
  });
});

describe("sw67: the geometry-keyed plan through the seam", () => {
  it("plans48's 8 ROM receipts are per-frame exact (F, window count, body age = frame offset, seam text), both sides", () => {
    const rows: ReturnType<typeof sw67CheckUnit>[] = [];
    for (const [job, entry] of Object.entries<{ base: string; ops?: [string, string, number][]; units: { label: string }[] }>(plans48)) {
      if (!job.startsWith("sw-")) continue;
      const scenario = JSON.parse(readFileSync(new URL(`../tools/battle-lab/${entry.base}.json`, import.meta.url), "utf8"));
      const species: Record<string, number> = { player: scenario.overrides.parties.player[0].species, opponent: scenario.overrides.parties.opponent[0].species };
      for (const op of entry.ops ?? []) if (op[0] === "species") species[op[1]] = op[2];
      for (const unit of entry.units) {
        const m = /^body 351:(player|opponent)$/.exec(unit.label);
        if (m) rows.push(sw67CheckUnit(m[1] as "player", species.player!, species.opponent!, unit as never));
      }
    }
    expect(rows.length).toBe(8);
    expect(rows.filter(row => row.exact).length).toBe(8);
    expect(rows.map(row => `${row.side}:${row.romWindows}`).sort()).toEqual(
      ["opponent:79", "opponent:79", "opponent:79", "opponent:86", "player:106", "player:106", "player:106", "player:106"]);
    expect(new Set(rows.filter(row => row.side === "opponent").map(row => row.plan)).size).toBe(2);
    expect(new Set(rows.filter(row => row.side === "player").map(row => row.plan)).size).toBe(1);
  });
  it("the 18-pair grid (predictions committed before the probes): A == B, prediction == seam plan == ROM per frame, every class", () => {
    const grid = JSON.parse(readFileSync(new URL("../tools/integration/fixtures/sw67/units.json", import.meta.url), "utf8")).jobs;
    const predictions = JSON.parse(readFileSync(new URL("../tools/integration/fixtures/sw67/predictions.json", import.meta.url), "utf8")).rows;
    expect(predictions.length).toBe(18);
    const windows = new Map<string, Set<number>>([["player", new Set()], ["opponent", new Set()]]);
    for (const prediction of predictions) {
      const entry = grid[prediction.id];
      expect(entry.identicalAB).toBe(true);
      const unit = entry.units.find((u: { label: string }) => u.label === `body 351:${prediction.side}`);
      const row = sw67CheckUnit(prediction.side, entry.species.player, entry.species.opponent, unit);
      expect([row.exact, row.plan === prediction.plan, row.romWindows]).toEqual([true, true, prediction.windows]);
      windows.get(prediction.side)!.add(row.romWindows);
    }
    expect([...windows.get("player")!].sort()).toEqual([102, 104, 106]);
    expect([...windows.get("opponent")!].sort()).toEqual([79, 86]);
  });
  it("351 is geometry-keyed; no plan without the displayed field / a known-entry lend", () => {
    expect(SPRITE_ORDER_GEOMETRY_KEYED_BODIES.has(351)).toBe(true);
    const field = { player: { species: 222 }, opponent: { species: 180 } } as never;
    const species = { playerSpecies: 222, opponentSpecies: 180 };
    expect(liveMoveGeometrySpriteOrderPlanText(351, "opponent", species, field, KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER)).toMatch(/^Cf;D0;Cf/);
    expect(liveMoveGeometrySpriteOrderPlanText(351, "opponent", species, undefined, KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER)).toBeNull();
    expect(liveMoveGeometrySpriteOrderPlanText(351, "opponent", species, field, undefined)).toBeNull();
    expect(liveMoveGeometrySpriteOrderPlanText(351, "opponent", species, field, KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER.slice(1))).toBeNull();
  });
});

describe("sw67: live after a Shock Wave, Scene ON/OFF parity", () => {
  it("route 7/7 CASTFORM Shock Wave twice: both bodies live (the second fell back on 82690e775), gameplay identical ON / OFF", () => {
    const on = generatedCommandAnimationReplay(7, "on", [2, 2], 7, true, true);
    const off = generatedCommandAnimationReplay(7, "off", [2, 2], 7, true, true);
    const bodies = on.animations.filter((a) => a.moveId === 351 && a.attacker === 0);
    expect(bodies).toHaveLength(2);
    for (const body of bodies) expect(body.adapterActive.every(Boolean)).toBe(true);
    expect(on.stalled).toBe(off.stalled);
    expect(off.boundaries).toHaveLength(on.boundaries.length);
    const strip = (v: { rules: any }) => ({ ...v.rules, rulesContext: { ...v.rules.rulesContext, hitMarker: v.rules.rulesContext.hitMarker & ~0x80 } });
    for (let i = 0; i < on.boundaries.length; i += 1) {
      expect(strip(on.boundaries[i]!)).toEqual(strip(off.boundaries[i]!));
      expect(on.boundaries[i]!.rng).toEqual(off.boundaries[i]!.rng);
      expect(on.boundaries[i]!.boundary).toEqual(off.boundaries[i]!.boundary);
    }
    expect(on.state.facilityState).toEqual(off.state.facilityState);
    expect(on.state.round.rules.rngValue).toBe(off.state.round.rules.rngValue);
  }, 240000);
});
