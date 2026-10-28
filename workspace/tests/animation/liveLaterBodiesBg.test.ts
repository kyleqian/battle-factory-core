import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { SceneOnMovePresentationState } from "../../src/animation/sceneOnPresentation.ts";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import type { BattleResolutionDisplayedField } from "../../src/engine/battleResolutionPresentation.ts";
import { renderSceneOnMovePresentation } from "../../src/engine/battleScene.ts";
// apx219: these gate pins read the proven body (an unknown order / allocator history is drawn approximately by the production
// liveMoveAnimationPresentation; tests/apx219SpriteOrderAllocatorApproximate.test.ts).
import { liveMoveAnimationDuration, liveMoveAnimationPresentationProven as liveMoveAnimationPresentation } from "../../src/engine/liveMoveAnimation.ts";
import { prepareLiveMoveSpriteOrder, type LiveMoveSpriteOrderInput } from "../../src/engine/liveMoveSpriteAllocator.ts";
import { knownEntrySpriteOrderState } from "../../src/engine/spriteOrderProvider.ts";
import speciesStats from "../../src/data/gen/species-stats.json" with { type: "json" };
import { generatedCommandAnimationReplay } from "../../tools/integration/generatedCommandAnimationReplay.ts";
import { iu120Ages } from "../helpers/iu120Rows.ts";

// Later bodies of Silver Wind (318, both sides) and Psych Up (244, player): the gate is a known order lend (Overheat 315 keeps
// `firstBody`). Dense proof: tools/integration/fixtures/later-bodies-bg/*.json (receipt later-bodies-bg-receipt.json).
const request = (moveId: number, attacker: 0 | 1): BattleMoveAnimationRequest => ({
  moveId, attacker, target: attacker === 0 ? 1 : 0, turn: 0, power: 0, damage: 0, friendship: 70, multihit: 0,
});
function displayed(player: string, opponent: string): BattleResolutionDisplayedField {
  const mon = (name: string) => ({
    species: speciesStats.species.find(s => s.name === `SPECIES_${name}`)!.id, speciesSymbol: name, name, level: 50,
    hp: 100, maxHP: 100, gender: "male", status: "none",
  });
  return { player: mon(player), opponent: mon(opponent) } as unknown as BattleResolutionDisplayedField;
}
const entry = () => prepareLiveMoveSpriteOrder(knownEntrySpriteOrderState("ordinary-factory"), request(315, 0)).input!;
const firstOrder = (): LiveMoveSpriteOrderInput => ({ ...entry(), firstBody: true });
const laterOrder = (): LiveMoveSpriteOrderInput => entry();
const cfg = (f: BattleResolutionDisplayedField, req: BattleMoveAnimationRequest, order?: LiveMoveSpriteOrderInput) =>
  liveMoveAnimationPresentation(req, f, 0, undefined, undefined, order) as unknown as SceneOnMovePresentationState | null;

const S0 = { dispcnt: 0xbf40, bg0cnt: 0x9800, bg1cnt: 0x9c00, bg2cnt: 0x5e00, bg3cnt: 0x5a0b, bg0hofs: 0, bg0vofs: 0, bg1hofs: 0,
  bg1vofs: 0, bg2hofs: 0, bg2vofs: 0, bg3hofs: 0, bg3vofs: 0, win0h: 240, win0v: 161, winin: 0x3f3f, winout: 0x3f3f, mosaic: 0,
  bldcnt: 0, bldalpha: 0, bldy: 0 };
const ABSURD = Object.fromEntries(Object.keys(S0).map((k, i) => [k, (0x1357 * (i + 3)) & 0xffff]));
type Variant = { registers: Record<string, number>; splitBg1Cnt?: number; initialBgCnt?: number; scroll?: { x: number; y: number } };
/** docs/bg-register-history.md §0.1/§0.5 rule rows (activation signature after the named predecessor) + an absurd control. */
const VARIANTS: Record<string, Record<string, Variant>> = {
  "318/opponent": {
    afterTackle: { registers: { ...S0, bg1cnt: 0x5c02, win0h: 0, win0v: 0 }, splitBg1Cnt: 0x5c01 },
    afterSplash: { registers: { ...S0, win0h: 0, win0v: 0 }, splitBg1Cnt: 0x9c01 },
    absurd: { registers: ABSURD, splitBg1Cnt: 0x1c03 },
  },
  "318/player": {
    afterOwnSilverWindAndTackle: { registers: { ...S0, bg1cnt: 0x5c01, bg2cnt: 0x5e02, win0h: 0, win0v: 0 } },
    absurd: { registers: ABSURD },
  },
  "244/player": {
    afterTackle: { registers: { ...S0, bg2cnt: 0x5e02, win0h: 0, win0v: 0 }, initialBgCnt: 0x5e02 },
    absurd: { registers: ABSURD, initialBgCnt: 0x5e03, scroll: { x: 77, y: 33 } },
  },
  "315/player": {
    afterSplash: { registers: { ...S0, dispcnt: 0x3f40, bg1cnt: 0x1c00, bg1vofs: 509, win0h: 0, win0v: 0 } },
    absurd: { registers: ABSURD },
  },
};
function withVariant(state: SceneOnMovePresentationState, v: Variant): SceneOnMovePresentationState {
  const inputs = structuredClone((state.config as { animationInputs: any }).animationInputs);
  if (state.config.move === "SILVER_WIND") {
    inputs.background.registers = v.registers;
    if (v.splitBg1Cnt !== undefined) inputs.background.monbg.splitBg1Cnt = v.splitBg1Cnt;
  } else if (state.config.move === "PSYCH_UP") {
    inputs.registers = { bldcnt: v.registers.bldcnt, bldalpha: v.registers.bldalpha, bldy: v.registers.bldy };
    if (v.initialBgCnt !== undefined) inputs.monBg.initialBgCnt = v.initialBgCnt;
    if (v.scroll !== undefined) inputs.monBg.initialHardwareScroll = v.scroll;
  } else inputs.registers = v.registers;
  return { ...state, config: { ...state.config, animationInputs: inputs } as never };
}
const frame = (state: SceneOnMovePresentationState, age: number): string => {
  const fb = new Uint8Array(240 * 160 * 4);
  renderSceneOnMovePresentation(fb, { ...state, age }, true);
  return createHash("sha256").update(fb).digest("hex");
};

describe("live later-body Silver Wind / Psych Up (BG-register history not consumed)", () => {
  it("gates Silver Wind and Psych Up (player) on a known lend with the known-entry occupancy; Overheat both sides and the opponent Psych Up follow (lb21)", () => {
    const sw = displayed("BUTTERFREE", "ONIX"), pu = displayed("JUMPLUFF", "SHUCKLE"), oh = displayed("SOLROCK", "SHUCKLE");
    for (const [f, id, a] of [[sw, 318, 0], [displayed("ONIX", "BUTTERFREE"), 318, 1], [pu, 244, 0]] as const) {
      expect(cfg(f, request(id, a), laterOrder())).not.toBeNull();
      expect(cfg(f, request(id, a))).toBeNull();
      expect(cfg(f, request(id, a), { known: false } as never)).toBeNull();
      // A lend whose free set is not the known-entry complement (a slot taken) declines.
      expect(cfg(f, request(id, a), { known: true, free: laterOrder().free.slice(1) })).toBeNull();
    }
    // lb21 (later-bodies-bg-2): Overheat (both sides) and Psych Up (opponent attacker too) are gated on a known lend as well.
    for (const [f, id, a] of [[oh, 315, 0], [displayed("SHUCKLE", "SOLROCK"), 315, 1], [displayed("GOLEM", "JUMPLUFF"), 244, 1]] as const) {
      expect(cfg(f, request(id, a), firstOrder())).not.toBeNull();
      expect(cfg(f, request(id, a), laterOrder())).not.toBeNull();
      expect(cfg(f, request(id, a))).toBeNull();
      expect(cfg(f, request(id, a), { known: false } as never)).toBeNull();
    }
    expect(liveMoveAnimationDuration(request(244, 1))).toBe(179);
  });

  // Experiment (b): the production move compositor (renderSceneOnMovePresentation, live field) renders every age identically with
  // the first-body S0 inputs, the bg-register rule's later-body inputs and an absurd override. Silver Wind reads only bldcnt/bldy
  // (always rewritten), bg3hofs (rewritten from age 31, drawn from 32) and the monbg BG's cnt priority (= splitBg1/2Cnt while the
  // monbg draws; the opponent reads bg2cnt, never splitBg1Cnt); Psych Up reads bldalpha only from age 8 (rewritten from 7), never
  // bgCnt/hardwareScroll; Overheat reads bldalpha only (rewritten every age).
  it.each([
    ["318/opponent", displayed("ONIX", "BUTTERFREE"), request(318, 1)],
    ["318/player", displayed("BUTTERFREE", "ONIX"), request(318, 0)],
    ["244/player", displayed("JUMPLUFF", "SHUCKLE"), request(244, 0)],
    ["315/player", displayed("SOLROCK", "SHUCKLE"), request(315, 0)],
  ] as const)("%s pixels are independent of the activation BG registers at every age", (key, f, req) => {
    const base = cfg(f, req, firstOrder())!;
    const ages = liveMoveAnimationDuration(req)!;
    const variants = Object.entries(VARIANTS[key]!).map(([name, v]) => [name, withVariant(base, v)] as const);
    for (let age = 0; age < ages; age += 1) {
      const reference = frame(base, age);
      for (const [name, state] of variants) expect(`${name}@${age}:${frame(state, age)}`).toBe(`${name}@${age}:${reference}`);
    }
  }, 240000);

  it("control: a field the Silver Wind compositor does read (the player monbg BG1 priority) moves pixels", () => {
    const req = request(318, 0), base = cfg(displayed("BUTTERFREE", "ONIX"), req, firstOrder())!;
    const moved = withVariant(base, { registers: S0, splitBg1Cnt: 0x5c03 });
    const ages = Array.from({ length: liveMoveAnimationDuration(req)! }, (_, age) => age);
    expect(ages.some(age => frame(moved, age) !== frame(base, age))).toBe(true);
  }, 240000);

  // Ordinary routes: later Silver Wind bodies after known-plan predecessors are live every age and reach the next prompt.
  const routes = [
    { name: "106/0 player SILVER_WIND after foe Fury Swipes x2", seed: 106, slots: [0] as const, attacker: 0, index: 2, active: true },
    { name: "160/0 foe SILVER_WIND after the player's Silver Wind", seed: 160, slots: [0] as const, attacker: 1, index: 1, active: true },
    // Later body after Sand-Attack (no production order plan -> order unknown): the proven body declines; apx219: drawn approximately
    // with the known-entry first-action order (approx:sprite-order-unknown), every age.
    { name: "9/0 player SILVER_WIND after foe Sand-Attack", seed: 9, slots: [0] as const, attacker: 0, index: 1, active: true },
  ];
  it.each(routes)("ordinary route $name: ON/OFF rules and RNG unchanged", r => {
    const on = generatedCommandAnimationReplay(r.seed, "on", r.slots, 0);
    const off = generatedCommandAnimationReplay(r.seed, "off", r.slots, 0);
    const body = on.animations[r.index]!;
    expect([body.moveId, body.attacker]).toEqual([318, r.attacker]);
    expect(body.ages).toEqual(iu120Ages(318, r.attacker === 0 ? 193 : 196, r.attacker === 0 ? "player" : "opponent"));
    expect(body.adapterActive.every(Boolean)).toBe(r.active);
    expect(body.adapterActive.some(Boolean)).toBe(r.active);
    expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    expect(on.stalled).toBe(off.stalled);
    expect(off.boundaries).toHaveLength(on.boundaries.length);
    for (let i = 0; i < on.boundaries.length; i += 1) {
      const strip = (v: { rules: any }) => ({ ...v.rules, rulesContext: { ...v.rules.rulesContext, hitMarker: v.rules.rulesContext.hitMarker & ~0x80 } });
      expect(strip(on.boundaries[i]!)).toEqual(strip(off.boundaries[i]!));
      expect(on.boundaries[i]!.rng).toEqual(off.boundaries[i]!.rng);
      expect(on.boundaries[i]!.boundary).toEqual(off.boundaries[i]!.boundary);
    }
  }, 240000);

  it("pins the later-body dense receipt: every relied-on fixture 0 px twice fresh, >= 3 predecessors per live orientation", () => {
    const receipt = JSON.parse(readFileSync("tools/integration/fixtures/later-bodies-bg-receipt.json", "utf8"));
    const dir = "tools/integration/fixtures/later-bodies-bg";
    const files = readdirSync(dir).filter(name => name.endsWith(".json")).map(name => name.replace(/\.json$/, "")).sort();
    expect(Object.keys(receipt.fixtures).sort()).toEqual(files);
    const predecessors: Record<string, Set<string>> = {};
    for (const [name, row] of Object.entries(receipt.fixtures) as [string, any][]) {
      const fixture = JSON.parse(readFileSync(`${dir}/${name}.json`, "utf8"));
      expect(fixture.precedingBodies.length).toBeGreaterThan(0);
      expect(row.freshRuns).toHaveLength(2);
      for (const run of row.freshRuns) expect([run.exactRows, run.residualPixels]).toEqual([row.rows, 0]);
      expect(row.freshRuns[0].digest).toBe(row.freshRuns[1].digest);
      expect(row.rows).toBe(row.expectedDuration);
      const last = fixture.precedingBodies.at(-1);
      (predecessors[`${fixture.move}/${fixture.attacker.geometry.side}`] ??= new Set()).add(`${last.moveId}:${last.side}`);
    }
    for (const key of ["SILVER_WIND/player", "SILVER_WIND/opponent", "PSYCH_UP/player"]) {
      expect(predecessors[key]!.size).toBeGreaterThanOrEqual(3);
    }
  });
});
