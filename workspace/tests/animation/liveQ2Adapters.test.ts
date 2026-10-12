import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS } from "../../src/engine/liveMoveTimingPolicy.ts";
import { gunzipSync } from "node:zlib";
import snoreAsset from "../../src/animation/assets/snore.json" with { type: "json" };
import paletteData from "../../src/data/gen/live-animation-palette-resources.json" with { type: "json" };
import {
  LIVE_MOVE_ANIMATION_IDS, LIVE_MOVE_OPPONENT_SHADOW_ROW, liveMoveAnimationDuration, liveMoveAnimationPresentation,
} from "../../src/engine/liveMoveAnimation.ts";
import { liveHyperVoiceInputs, liveSandTombProfile, liveSkyAttackInputs, liveSmogInputs, liveSnoreInputs } from "../../src/engine/liveQ2Moves.ts";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import { liveView, type Fixture } from "../../tools/integration/liveAdapterFramebuffer.ts";
import { generatedCommandAnimationReplay } from "../../tools/integration/generatedCommandAnimationReplay.ts";
import { hyperVoiceInputsFor } from "../../tools/compare/verifyHyperVoiceReducer.ts";
import { smogInputsFor } from "../../tools/compare/verifySmogReducer.ts";
import { sandTombProfileFor } from "../../tools/compare/sandTombReducer.ts";
import { skyAttackInputsFor } from "../../tools/compare/verifySkyAttackReducer.ts";
import { snoreInputsFor } from "../../tools/compare/verifySnoreReducer.ts";
import { iu120Ages } from "../helpers/iu120Rows.ts";

// docs/next-adapters-prep25.md s0.2 / B.4 / B.5 / C (authoritative): the zero-Random2 Q2 bodies through src/engine/liveQ2Moves.ts.
// Dense framebuffer proofs: tools/integration/fixtures/q2-live/*.json (receipt q2-live-adapter-receipt.json).
const DIR = "tools/integration/fixtures/q2-live";
const fixtureAt = (name: string) => JSON.parse(readFileSync(`${DIR}/${name}.json`, "utf8")) as Fixture;
const NAMES = readdirSync(DIR).filter((n) => n.endsWith(".json")).map((n) => n.slice(0, -5)).sort();
const IDS = { HYPER_VOICE: 304, SMOG: 123, SAND_TOMB: 328, SKY_ATTACK: 143, SNORE: 173 } as const;
const ROWS = { 304: 104, 123: 305, 328: 123, 143: 148, 173: 69 } as const;
const idOf = (f: Fixture) => IDS[f.move as keyof typeof IDS];
const rowsOf = (name: string, f: Fixture) => name.endsWith("-strike") ? 180 : ROWS[idOf(f)];
const effectOf = (f: Fixture, age = 0) => {
  const view = liveView(f, age);
  return { view, effect: view.effect as unknown as { request: BattleMoveAnimationRequest; spriteOrderInput: never } };
};
const configOf = (f: Fixture, age = 0, mutate?: (r: BattleMoveAnimationRequest) => BattleMoveAnimationRequest) => {
  const { view, effect } = effectOf(f, age);
  return liveMoveAnimationPresentation(mutate ? mutate(effect.request) : effect.request, view.field, age, undefined, undefined, effect.spriteOrderInput);
};

describe("live Q2 registration", () => {
  // d4later: Sky Attack (143) moved to faithful timing (the strike's optional lag at 161, an 18 : 18 tie -> 180 rows, unchanged).
  it("Smog, Sand Tomb, Snore are scoped-exact (Hyper Voice: faithful timing, #151; Sky Attack: faithful timing, d4later); durations are the prep25 constants", () => {
    for (const id of [304, 123, 328, 143, 173]) {
      expect(LIVE_MOVE_ANIMATION_IDS as readonly number[]).toContain(id === 304 || id === 143 ? 123 : id);
      expect(LIVE_MOVE_OPPONENT_SHADOW_ROW[id]).toBe(0);
    }
    for (const id of [304, 143]) {
      expect(LIVE_MOVE_ANIMATION_IDS as readonly number[]).not.toContain(id);
      expect(LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS).toContain(id);
    }
    for (const attacker of [0, 1] as const) {
      const base = { attacker, target: (1 - attacker) as 0 | 1, power: 0, damage: 0, friendship: 70, multihit: 0 };
      expect(liveMoveAnimationDuration({ ...base, moveId: 304, turn: 0 })).toBe(104);
      expect(liveMoveAnimationDuration({ ...base, moveId: 123, turn: 0 })).toBe(305);
      expect(liveMoveAnimationDuration({ ...base, moveId: 328, turn: 0 })).toBe(123);
      expect(liveMoveAnimationDuration({ ...base, moveId: 143, turn: 0 })).toBe(148);
      expect(liveMoveAnimationDuration({ ...base, moveId: 143, turn: 1 })).toBe(180);
      expect(liveMoveAnimationDuration({ ...base, moveId: 173, turn: 0 })).toBe(69);
    }
    const exact = (JSON.parse(readFileSync("docs/animation-integration-live-status.json", "utf8")).implementedAdapters as { id: number }[]).map((e) => e.id);
    expect(exact).toEqual(expect.arrayContaining([123, 328, 173]));
    expect(exact).not.toContain(304);
    expect(exact).not.toContain(143);
  });

  it("covers 45 dense fixtures (accepted, prep25 alternate, GOLBAT-elevated / SNORLAX-large extras) x both orientations; windows start at activation", () => {
    expect(NAMES).toHaveLength(45);
    for (const name of NAMES) {
      const f = fixtureAt(name);
      expect(f.denseWindow!.endFrame - f.denseWindow!.startFrame + 1).toBe(rowsOf(name, f));
    }
    for (const move of ["hyper-voice", "smog", "sand-tomb", "sky-attack", "snore"]) {
      const bodies = move === "sky-attack" ? 2 : 1; // charge + strike
      expect(NAMES.filter((n) => n.startsWith(`${move}-`) && !n.includes("-alt-") && !n.includes("-extra-"))).toHaveLength(2 * bodies);
      expect(NAMES.filter((n) => n.startsWith(`${move}-alt-`))).toHaveLength(2 * bodies);
      expect(NAMES.filter((n) => n.startsWith(`${move}-extra-`)).length).toBeGreaterThanOrEqual(2);
    }
    const receipt = JSON.parse(readFileSync("tools/integration/fixtures/q2-live-adapter-receipt.json", "utf8"));
    expect(receipt.summary).toMatchObject({ fixtures: 45, allExactTwiceFresh: true });
  });
});

// The builders equal the accepted corpus-built reducer inputs field for field (the corpus is only ever the oracle of this test).
const diff = (a: any, b: any, path = ""): string[] => {
  if (JSON.stringify(a) === JSON.stringify(b)) return [];
  if (a && b && typeof a === "object" && typeof b === "object") {
    return [...new Set([...Object.keys(a), ...Object.keys(b)])].flatMap((k) => diff(a[k], b[k], `${path}/${k}`));
  }
  return [`${path}: built=${JSON.stringify(a)?.slice(0, 60)} corpus=${JSON.stringify(b)?.slice(0, 60)}`];
};
const IGNORE = /gameplay|animationRngSeed|flags|\/data|animNum|animCmdIndex|animDelayCounter|oamY|\/attr:|^\/(attacker|target)(Side|Species|PictureOrigin)|immutable|AnimationRng/;
const anchors = (sprite: any, origin: any) => ({ picOffsetPoint: origin, spriteCenter: { x: sprite.x, y: sprite.y }, frontIdleRest: { x2: sprite.x2, y2: sprite.y2 } });
const ORIENTATIONS = ["player-back", "opponent-front"] as const;
describe("live Q2 builders equal the accepted corpus-built inputs", () => {
  it.each(ORIENTATIONS)("Hyper Voice %s", (o) => {
    const c: any = hyperVoiceInputsFor(o);
    const built = liveHyperVoiceInputs({ attackerSide: c.attackerSide, attacker: anchors(c.attackerSprite, c.attackerPictureOrigin), target: anchors(c.targetSprite, c.targetPictureOrigin),
      palettes: c.palettes, spriteOrder: c.spriteOrder, attackerSpeciesId: 372, thinRingPalette: (paletteData.resources as any).ANIM_TAG_THIN_RING.colors });
    // #151 D4: the live seam passes the policy's palette-upload phase; the dominant (late upload, 16-line band) is the staged default (absent).
    const { paletteUploadLate, ...rest } = built as typeof built & { paletteUploadLate?: boolean };
    expect(paletteUploadLate).toBe(true);
    expect(diff(rest, c).filter((l) => !IGNORE.test(l))).toEqual([]);
  });
  it.each(ORIENTATIONS)("Smog %s", (o) => {
    const rows = JSON.parse(gunzipSync(readFileSync(`tools/compare/evidence/smog-${o === "player-back" ? "player" : "opponent"}-dense-state.json.gz`)).toString()).frames;
    const c: any = smogInputsFor(o, rows);
    const pos = c.targetSide === "opponent" ? { x: 176, y: 40 } : { x: 72, y: 80 };
    const built = liveSmogInputs({ attackerSide: c.attackerSide, attacker: anchors(c.attackerSprite, { x: 0, y: 0 }),
      target: { ...anchors(c.targetSprite, { x: 0, y: 0 }), battlePositionCenter: pos }, palettes: { unfaded: [], faded: [], hardware: [] }, spriteOrder: c.spriteOrder });
    expect(diff(built, c).filter((l) => !IGNORE.test(l))).toEqual([]);
  });
  it.each(ORIENTATIONS)("Sand Tomb %s", (o) => {
    const c: any = sandTombProfileFor(o);
    const player = o === "player-back";
    const attackerKey = c.spriteOrder.initialKeys.find((k: any) => k.slot === (player ? 6 : 8));
    const targetKey = c.spriteOrder.initialKeys.find((k: any) => k.slot === (player ? 8 : 6));
    const built = liveSandTombProfile({ attackerSide: c.attackerSide,
      attacker: { picOffsetPoint: { x: 0, y: 0 }, spriteCenter: { x: 0, y: attackerKey.y + 32 }, frontIdleRest: { x2: 0, y2: 0 } },
      target: { picOffsetPoint: c.target.paletteCenter, spriteCenter: { x: 0, y: targetKey.y + 32 - c.target.initialY2 }, frontIdleRest: { x2: c.target.initialX2, y2: c.target.initialY2 }, battlePositionCenter: c.target.vortexCenter },
      spriteOrder: c.spriteOrder.initialOrder, freeSpriteSlots: c.spriteOrder.freeSpriteSlots });
    expect(diff(built, c).filter((l) => !IGNORE.test(l))).toEqual([]);
  });
  it.each(ORIENTATIONS)("Sky Attack %s (palettes: the asset palettes are the builder's input, the corpus rows hold the ROM bank at row 45)", (o) => {
    const c: any = skyAttackInputsFor(o);
    const built = liveSkyAttackInputs({ attackerSide: c.attackerSide, attacker: anchors(c.attackerSprite, c.attackerPictureOrigin), target: anchors(c.targetSprite, c.targetPictureOrigin),
      palettes: c.palettes, spriteOrder: c.allocator.spriteOrder, firstBody: true, impactPalette: c.resources.impact.palette, birdPalette: c.resources.bird.palette });
    expect(diff(built, c).filter((l) => !IGNORE.test(l))).toEqual([]);
  });
  it.each(ORIENTATIONS)("Snore %s", (o) => {
    const c: any = snoreInputsFor(o);
    const built = liveSnoreInputs({ attackerSide: c.attackerSide, attacker: anchors(c.attackerSprite, c.attackerPictureOrigin), target: anchors(c.targetSprite, c.targetPictureOrigin),
      palettes: c.palettes, spriteOrder: c.allocator.spriteOrder, firstBody: false, snoreZPalette: (snoreAsset as any).snoreZ.palette });
    expect(diff(built, c).filter((l) => !IGNORE.test(l))).toEqual([]);
  });
});

describe("live Q2 gates", () => {
  const SAMPLES = ["hyper-voice-alt-player-loudred-golem", "smog-alt-opponent-weezing-golem", "sand-tomb-alt-player-sandslash-golem", "sky-attack-alt-player-pidgeot-golem-charge"];
  it.each(SAMPLES)("%s declines (scene-off fallback) without the tracker lend, with an unknown order, and for a shiny battler", (name) => {
    const f = fixtureAt(name);
    const { view, effect } = effectOf(f);
    const call = (order: unknown, field = view.field) => liveMoveAnimationPresentation(effect.request, field, 0, undefined, undefined, order as never);
    expect(call(effect.spriteOrderInput)).not.toBeNull();
    expect(call(undefined)).toBeNull();
    expect(call({ known: false })).toBeNull();
    const ot = 416049562, shiny = ((ot >>> 16) ^ (ot & 0xffff)) >>> 0;
    for (const side of ["player", "opponent"] as const) expect(call(effect.spriteOrderInput, { ...view.field, [side]: { ...view.field[side], personality: shiny } })).toBeNull();
  });

  // later58 moved this pin: a later charge is live (WIN0 (0, 0), like the strike) while both species rests are {0,0}; with an opponent ONIX it
  // declines (docs/next-adapters-later58.md).
  it("Sky Attack: a later charge needs rest-free battlers and starts with WIN0 (0, 0); the strike (turn bit 1) needs a known lend and starts with WIN0 (0, 0)", () => {
    const f = fixtureAt("sky-attack-alt-player-pidgeot-golem-charge");
    const { view, effect } = effectOf(f);
    const first = effect.spriteOrderInput as { known: true; free: number[]; firstBody?: true };
    const { firstBody: _drop, ...later } = first;
    expect(liveMoveAnimationPresentation(effect.request, view.field, 0, undefined, undefined, first as never)).not.toBeNull();
    const laterCharge = liveMoveAnimationPresentation(effect.request, view.field, 0, undefined, undefined, later as never);
    expect((laterCharge!.config as any).animationInputs.background.registers).toMatchObject({ win0h: 0, win0v: 0 });
    const onix = effectOf({ ...f, target: { ...f.target, species: "ONIX" } });
    expect(liveMoveAnimationPresentation(onix.effect.request, onix.view.field, 0, undefined, undefined, onix.effect.spriteOrderInput as never)).not.toBeNull();
    expect(liveMoveAnimationPresentation(onix.effect.request, onix.view.field, 0, undefined, undefined, later as never)).toBeNull();
    expect(liveMoveAnimationPresentation({ ...effect.request, turn: 1 }, view.field, 0, undefined, undefined, undefined)).toBeNull();
    expect(liveMoveAnimationPresentation({ ...effect.request, turn: 1 }, view.field, 0, undefined, undefined, { known: false } as never)).toBeNull();
    const strike = liveMoveAnimationPresentation({ ...effect.request, turn: 1 }, view.field, 0, undefined, undefined, later as never);
    expect((strike!.config as any).animationInputs.background.registers).toMatchObject({ win0h: 0, win0v: 0 });
    expect((configOf(f)!.config as any).animationInputs.background.registers).toMatchObject({ win0h: 240, win0v: 161 });
  });

  it("Snore needs a known lend (it only exists behind Sleep Powder + the sleep status animations) and declines without one or for a shiny battler", () => {
    const f = fixtureAt("snore-alt-player-snorlax-golem");
    expect(f.precedingBodies).toEqual([{ moveId: 79, side: "opponent" }, { moveId: 0, side: "opponent", statusAnimation: "SLP" }, { moveId: 0, side: "player", statusAnimation: "SLP" }]);
    expect(configOf(f)).not.toBeNull();
    const { view, effect } = effectOf(f);
    expect(liveMoveAnimationPresentation(effect.request, view.field, 0, undefined, undefined, undefined)).toBeNull();
    expect(liveMoveAnimationPresentation(effect.request, view.field, 0, undefined, undefined, { known: false } as never)).toBeNull();
  });

  it("Smog and Hyper Voice stay exact after an earlier body (a known lend is the only history input); the Smog extra after a Tackle is a dense fixture", () => {
    const f = fixtureAt("smog-extra-opponent-weezing-golbat");
    expect(f.precedingBodies).toEqual([{ moveId: 33, side: "player" }]);
    expect(configOf(f)).not.toBeNull();
  });
});

describe("live Q2 ordinary routes", () => {
  const rulesWithoutSceneMarker = (v: { rules: any }) => {
    const rc = v.rules.rulesContext;
    return { ...v.rules, rulesContext: { ...rc, hitMarker: rc.hitMarker & ~0x80 } };
  };
  const parityOf = (on: ReturnType<typeof generatedCommandAnimationReplay>, off: ReturnType<typeof generatedCommandAnimationReplay>) => {
    expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    expect(on.stalled).toBe(off.stalled);
    expect(off.boundaries).toHaveLength(on.boundaries.length);
    for (let i = 0; i < on.boundaries.length; i += 1) {
      expect(rulesWithoutSceneMarker(on.boundaries[i]!)).toEqual(rulesWithoutSceneMarker(off.boundaries[i]!));
      expect(on.boundaries[i]!.rng).toEqual(off.boundaries[i]!.rng);
      expect(on.boundaries[i]!.boundary).toEqual(off.boundaries[i]!.boundary);
    }
    expect(on.state.facilityState).toEqual(off.state.facilityState);
    expect(on.state.round.rules.rngValue).toBe(off.state.round.rules.rngValue);
  };
  // route = generated rentals, party member 0 knows the move, one turn (tools/integration/r3ProfileRouteSearch.ts <id> 6 1 4000: first seeds ascending).
  it.each([
    ["HYPER_VOICE 75/21 EXPLOUD", 304, 75, 21, 0 as const, 104],
    ["HYPER_VOICE 141/21 EXPLOUD", 304, 141, 21, 0 as const, 104],
    ["SMOG 29/0 MAGBY", 123, 29, 0, 3 as const, 305],
    ["SMOG 70/0 MAGBY", 123, 70, 0, 3 as const, 305],
    ["SAND_TOMB 345/21 DUGTRIO", 328, 345, 21, 3 as const, 123],
    ["SAND_TOMB 543/21 DUGTRIO", 328, 543, 21, 3 as const, 123],
    ["SKY_ATTACK 244/42 FEAROW charge + strike", 143, 244, 42, 3 as const, 148],
    ["SKY_ATTACK 376/42 FEAROW charge + strike", 143, 376, 42, 3 as const, 148],
  ])("route %s: body reached, adapter active every age, following prompt reached, Scene ON/OFF parity", (_name, id, seed, streak, slot, ages) => {
    const on = generatedCommandAnimationReplay(seed, "on", [slot], streak);
    const off = generatedCommandAnimationReplay(seed, "off", [slot], streak);
    const bodies = on.animations.filter((a) => a.moveId === id && a.attacker === 0);
    // Sky Attack: the charge body and the strike body of the same route (the strike is keyed 10143 in the order host).
    expect(bodies).toHaveLength(id === 143 ? 2 : 1);
    expect(bodies[0]!.ages).toEqual(iu120Ages(id, ages));
    expect(bodies[0]!.adapterActive.every(Boolean)).toBe(true);
    if (id === 143) {
      expect(bodies[1]!.ages).toEqual(iu120Ages(143, 180));
      // 376: Thunder Wave in between (planned) -> known lend -> adapter active every age. 244: Ice Beam after the opponent's Dragon Dance;
      // 349:opponent was NEEDS-KEYS (strike declined every age) and is planned since prep45 (side-keyed), so the strike lends too.
      expect(bodies[1]!.adapterActive.every(Boolean)).toBe(true);
    }
    parityOf(on, off);
  }, 240000);

  // Searched seeds 0..4000 (streak 0..42 step 7, rentals[0] knows the move): HYPER_VOICE 9/21 followed an unplanned predecessor (declined).
  // prep43: the predecessor unit is now planned, so the tracked order is known and the body renders live (ON/OFF parity unchanged).
  it("route HYPER_VOICE 9/21 after a predecessor planned since prep43: the body renders live, logic unchanged", () => {
    const on = generatedCommandAnimationReplay(9, "on", [0], 21);
    const off = generatedCommandAnimationReplay(9, "off", [0], 21);
    const bodies = on.animations.filter((a) => a.moveId === 304 && a.attacker === 0);
    expect(bodies).toHaveLength(1);
    expect(bodies[0]!.adapterActive.some(Boolean)).toBe(true);
    parityOf(on, off);
  }, 240000);
});
