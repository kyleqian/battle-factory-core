import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import type { BattleResolutionDisplayedField } from "../../src/engine/battleResolutionPresentation.ts";
import {
  LIVE_MOVE_ANIMATION_IDS, LIVE_MOVE_OPPONENT_SHADOW_ROW, liveMoveAnimationDuration, liveMoveAnimationPresentation,
} from "../../src/engine/liveMoveAnimation.ts";
import { prepareLiveMoveSpriteOrder, type LiveMoveSpriteOrderInput } from "../../src/engine/liveMoveSpriteAllocator.ts";
import { knownEntrySpriteOrderState } from "../../src/engine/spriteOrderProvider.ts";
import {
  CURSE_STATS_ROWS, curseBlendCycleSchedule, curseSwayAtStep, curseSwayEndRow,
} from "../../src/animation/curseModel.ts";
import speciesStats from "../../src/data/gen/species-stats.json" with { type: "json" };
import { generatedCommandAnimationReplay } from "../../tools/integration/generatedCommandAnimationReplay.ts";
import { liveView, type Fixture } from "../../tools/integration/liveAdapterFramebuffer.ts";
import { iu120Ages, iu120Extra } from "../helpers/iu120Rows.ts";

// curse-live (docs/next-adapters-prep23.md s1.3/s3): the non-Ghost MOVE_CURSE body from the source model
// (src/animation/curseModel.ts) and the production provider (liveOamMoves.ts liveCurseStatsInputs). Dense framebuffer proofs:
// tools/integration/fixtures/curse-live/*.json (receipt curse-live-adapter-receipt.json).
type Json = Record<string, any>;
const corpus = (path: string): Json[] => JSON.parse(gunzipSync(readFileSync(path)).toString("utf8")).frames;
const request = (attacker: 0 | 1, extra: Partial<BattleMoveAnimationRequest> = {}): BattleMoveAnimationRequest => ({
  moveId: 174, attacker, target: attacker === 0 ? 1 : 0, turn: 1, power: 0, damage: 0, friendship: 70, multihit: 0, ...extra,
});
function displayed(player: string, opponent: string, personality?: number): BattleResolutionDisplayedField {
  const mon = (name: string, side: "player" | "opponent") => ({
    species: speciesStats.species.find(s => s.name === `SPECIES_${name}`)!.id, speciesSymbol: name, name, level: 50,
    hp: 100, maxHP: 100, gender: "male", status: "none", ...(personality !== undefined && side === "player" ? { personality } : {}),
  });
  return { player: mon(player, "player"), opponent: mon(opponent, "opponent") } as unknown as BattleResolutionDisplayedField;
}
const knownOrder = (): LiveMoveSpriteOrderInput =>
  ({ ...prepareLiveMoveSpriteOrder(knownEntrySpriteOrderState("ordinary-factory"), request(0)).input!, firstBody: true });
const rulesWithoutSceneMarker = (v: { rules: any }) => {
  const rc = v.rules.rulesContext;
  return { ...v.rules, rulesContext: { ...rc, hitMarker: rc.hitMarker & ~0x80 } };
};
const fixture = (name: string): Fixture =>
  JSON.parse(readFileSync(`tools/integration/fixtures/curse-live/${name}.json`, "utf8")) as Fixture;
const inputsAt = (f: Fixture, age: number): Json => {
  const view = liveView(f, age), effect = view.effect as any;
  const state = liveMoveAnimationPresentation(effect.request, view.field, age, undefined, effect.spriteAllocatorInput,
    effect.spriteOrderInput, undefined, effect.battlerX2Input) as any;
  return state.config.animationInputs;
};
/** BG banks 2-4 and the battler OBJ banks 16 / 17: the palette words the stats renderer reads. */
const consumed = (palette: readonly number[]) => [...palette.slice(32, 80), ...palette.slice(256, 288)];

describe("curse-live: MOVE_CURSE non-Ghost (CurseStats) source model", () => {
  it("replays AnimTask_SwayMon (3 sways, period 1536, +-10 by side) and the BlendColorCycle fade schedule", () => {
    expect(curseSwayEndRow("player")).toBe(64);
    expect(curseSwayEndRow("opponent")).toBe(64);
    // Sin(): (amplitude * sine) >> 8 is an arithmetic shift, so the opponent's negated amplitude floors one further.
    expect([curseSwayAtStep("player", 6, 10).x2, curseSwayAtStep("opponent", 6, 10).x2]).toEqual([9, -10]);
    expect(curseSwayAtStep("player", 6, 64)).toMatchObject({ x2: 0, done: true });
    const schedule = [...curseBlendCycleSchedule(79, 159).values()];
    expect(schedule.slice(0, 6)).toEqual([0, 2, 4, 6, 8, 10]);
    expect(schedule.at(-1)).toBe(0);
  });
});

describe("curse-live: MOVE_CURSE live adapter (174)", () => {
  it("registers the 176-row stats body (gAnimMoveTurn & 1) with the activation shadow row; the Ghost branch declines", () => {
    expect(LIVE_MOVE_ANIMATION_IDS).toContain(174);
    expect(LIVE_MOVE_OPPONENT_SHADOW_ROW[174]).toBe(0);
    for (const a of [0, 1] as const) {
      expect(liveMoveAnimationDuration(request(a))).toBe(CURSE_STATS_ROWS);
      expect(liveMoveAnimationDuration(request(a, { turn: 0 }))).toBeNull();
    }
    const field = displayed("SNORLAX", "GOLBAT");
    expect(liveMoveAnimationPresentation(request(0), field, 90, undefined, undefined, knownOrder())?.config.move).toBe("CURSE");
    expect(liveMoveAnimationPresentation(request(0, { turn: 0 }), field, 90, undefined, undefined, knownOrder())).toBeNull();
  });

  it("declines without a known order lend, for shiny battlers and for a non-zero idle rest", () => {
    const field = displayed("SNORLAX", "GOLBAT");
    expect(liveMoveAnimationPresentation(request(0), field, 90)).toBeNull();
    const shiny = ((416_049_562 >>> 16) ^ (416_049_562 & 0xffff)) << 16 >>> 0;
    expect(liveMoveAnimationPresentation(request(0), displayed("SNORLAX", "GOLBAT", shiny), 90, undefined, undefined, knownOrder())).toBeNull();
    // ONIX's front idle rest is x2 = 1 (speciesIdleAnim): an opponent ONIX ATTACKER declines (unproven); an ONIX TARGET is exact
    // (docs/live-species-audit-6.md: RATTATA / ONIX targets 176/176, 0 px) and engages.
    expect(liveMoveAnimationPresentation(request(1), displayed("GOLEM", "ONIX"), 90, undefined, undefined, knownOrder())).toBeNull();
    expect(liveMoveAnimationPresentation(request(0), displayed("GOLEM", "ONIX"), 90, undefined, undefined, knownOrder())).not.toBeNull();
  });

  it("builds every consumed input of the retained accepted corpora from production inputs (both orientations)", () => {
    for (const [name, path] of [
      ["stats-player-snorlax-opponent-magikarp", "tools/compare/evidence/curse-stats-player-dense-state.json.gz"],
      ["stats-opponent-snorlax-player-magikarp", "tools/compare/evidence/curse-stats-opponent-dense-state.json.gz"],
    ] as const) {
      const rows = corpus(path), f = fixture(name);
      expect(rows).toHaveLength(CURSE_STATS_ROWS);
      const exact = { oam: 0, tasks: 0, bbg: 0, pal: 0, regs: 0 };
      for (let age = 0; age < rows.length; age += 1) {
        const inputs = inputsAt(f, age), row = rows[age]!;
        const tasks = row.tasks.map((t: Json) => ({ slot: t.slot, callback: t.func?.symbol ?? "", data: t.data }));
        if (age === 0 || JSON.stringify(inputs.buffers.hardwareOam) === JSON.stringify(row.hardwareOam)) exact.oam += 1;
        if (JSON.stringify(inputs.liveTasks) === JSON.stringify(tasks)) exact.tasks += 1;
        if (JSON.stringify(inputs.battleBg) === JSON.stringify(row.battleBg)) exact.bbg += 1;
        if (JSON.stringify(consumed(inputs.palette.hardware)) === JSON.stringify(consumed(row.hardwarePalette))) exact.pal += 1;
        if (JSON.stringify(inputs.registers) === JSON.stringify(row.registers)) exact.regs += 1;
      }
      // Row 0 registers: the post-Splash WIN0H/WIN0V host leftover (0/0 vs the first-body S0 240/161), read by no renderer path.
      expect(exact).toEqual({ oam: 176, tasks: 176, bbg: 176, pal: 176, regs: 175 });
    }
  });

  // orderConsumerRouteScan.ts CURSE 174: first-body player Curse on generated rentals (MUK seed 28, FLAREON seed 47).
  it.each([[28, 28, 0], [47, 28, 0]] as const)("route %i/%i slot %i: first-body stats Curse active every age, prompt reached, ON/OFF parity",
    (seed, streak, slot) => {
      const on = generatedCommandAnimationReplay(seed, "on", [slot], streak);
      const off = generatedCommandAnimationReplay(seed, "off", [slot], streak);
      expect(on.requests[0]).toMatchObject({ moveId: 174, attacker: 0, turn: 1 });
      const bodies = on.animations.filter(a => a.moveId === 174 && a.attacker === 0);
      expect(bodies.map(b => b.ages.length)).toEqual([176 + iu120Extra(174)]);
      expect(bodies[0]!.ages).toEqual(iu120Ages(174, 176));
      expect(bodies[0]!.adapterActive.every(Boolean)).toBe(true);
      expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
      expect(on.stalled).toBe(off.stalled);
      expect(off.boundaries).toHaveLength(on.boundaries.length);
      for (let i = 0; i < on.boundaries.length; i += 1) {
        expect(rulesWithoutSceneMarker(on.boundaries[i]!)).toEqual(rulesWithoutSceneMarker(off.boundaries[i]!));
        expect(on.boundaries[i]!.rng).toEqual(off.boundaries[i]!.rng);
        expect(on.boundaries[i]!.boundary).toEqual(off.boundaries[i]!.boundary);
      }
    }, 240000);

  // The only Factory Ghost-type Curse user (DUSCLOPS, set 666): the Ghost body declines to the bounded scene-off pause.
  it("route 143/42 slot 2 DUSCLOPS: the Ghost Curse body declines cleanly, prompt reached, ON/OFF parity", () => {
    const on = generatedCommandAnimationReplay(143, "on", [2], 42);
    const off = generatedCommandAnimationReplay(143, "off", [2], 42);
    const ghost = on.requests.filter(q => q.moveId === 174 && q.attacker === 0);
    expect(ghost).toHaveLength(1);
    expect(ghost[0]!.turn & 1).toBe(0);
    const bodies = on.animations.filter(a => a.moveId === 174 && a.attacker === 0);
    expect(bodies.every(b => b.adapterActive.every(active => !active))).toBe(true);
    expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    expect(on.stalled).toBe(off.stalled);
    expect(off.boundaries).toHaveLength(on.boundaries.length);
    for (let i = 0; i < on.boundaries.length; i += 1) {
      expect(rulesWithoutSceneMarker(on.boundaries[i]!)).toEqual(rulesWithoutSceneMarker(off.boundaries[i]!));
      expect(on.boundaries[i]!.rng).toEqual(off.boundaries[i]!.rng);
      expect(on.boundaries[i]!.boundary).toEqual(off.boundaries[i]!.boundary);
    }
  }, 240000);
});
