import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import plans from "../../tools/integration/fixtures/prep12-random2/plans.json" with { type: "json" };
import lovelyKissAsset from "../../src/animation/assets/lovely-kiss.json" with { type: "json" };
import octazookaAsset from "../../src/animation/assets/octazooka.json" with { type: "json" };
import spikesAsset from "../../src/animation/assets/spikes.json" with { type: "json" };
import { lovelyKissAtAge } from "../../src/animation/lovelyKiss.ts";
import { sceneOnLovelyKissView } from "../../src/animation/sceneOnPresentation.ts";
import {
  LIVE_FAITHFUL_RANDOM_MOVE_ANIMATION_IDS, LIVE_MOVE_RANDOM2_PLANS, liveMovePresentationRngBodyKey,
} from "../../src/engine/liveMovePresentationRng.ts";
import {
  LIVE_MOVE_ANIMATION_IDS, LIVE_MOVE_OPPONENT_SHADOW_ROW, liveMoveAnimationDuration, liveMoveAnimationPresentation,
} from "../../src/engine/liveMoveAnimation.ts";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { signalBeamOrbSlots } from "../../src/engine/liveProfileMoves.ts";
import { presentationRngBodyWords } from "../../src/engine/presentationRngHost.ts";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import { fixturePresentationRng, liveView, type Fixture } from "../../tools/integration/liveAdapterFramebuffer.ts";
import { generatedCommandAnimationReplay } from "../../tools/integration/generatedCommandAnimationReplay.ts";
import { random2Route } from "../../tools/integration/random2R1/routeHarness.ts";
import { iu120Ages, iu120EffectAges } from "../helpers/iu120Rows.ts";

// docs/next-adapters-prep22.md s0.1-0.3 / B.1-B.5 (authoritative): Lovely Kiss (142, faithful-random: 4 Random2 words, one frame at age
// +120), Spikes (191) and Octazooka (190) (exact, no Random2) through the shared profile builder (src/engine/liveProfileMoves.ts).
// Dense framebuffer proofs: tools/integration/fixtures/r3-profile-live/*.json (receipt r3-profile-live-receipt.json).
const DIR = "tools/integration/fixtures/r3-profile-live";
const fixtureAt = (name: string) => JSON.parse(readFileSync(`${DIR}/${name}.json`, "utf8")) as Fixture;
const NAMES = readdirSync(DIR).filter((n) => n.endsWith(".json")).map((n) => n.slice(0, -5)).sort();
const IDS = { LOVELY_KISS: 142, SPIKES: 191, OCTAZOOKA: 190, SIGNAL_BEAM: 324 } as const;
const ROWS = { 142: 152, 191: 113, 190: 79 } as const;
const rowsOf = (f: Fixture) => IDS[f.move as keyof typeof IDS] === 324 ? (f.attacker.geometry.side === "player" ? 145 : 144) : ROWS[IDS[f.move as keyof typeof IDS] as 142 | 191 | 190];
const key = liveMovePresentationRngBodyKey({ resolutionId: { requestId: 0 }, segmentIndex: 0, commandIndex: 0 });
const viewOf = (f: Fixture, age: number) => {
  const view = liveView(f, age);
  return { view, effect: view.effect as unknown as { request: BattleMoveAnimationRequest; spriteOrderInput: never; presentationRng: never } };
};
const configOf = (f: Fixture, age = 0) => {
  const { view, effect } = viewOf(f, age);
  return liveMoveAnimationPresentation(effect.request, view.field, age, undefined, undefined, effect.spriteOrderInput, effect.presentationRng);
};
const withValue = (f: Fixture, value: number): Fixture => ({ ...f, presentationRngActivation: { value, source: "test" } });
const profileOf = (f: Fixture) => (configOf(f)!.config as any).animationProfile;
const hashRender = (f: Fixture, age: number): string => {
  const view = liveView(f, age);
  const fb = new Uint8Array(240 * 160 * 4);
  renderBattleResolutionLiveView(fb, view);
  const again = new Uint8Array(240 * 160 * 4);
  renderBattleResolutionLiveView(again, view);
  expect(Buffer.from(fb).equals(Buffer.from(again))).toBe(true);
  return createHash("sha256").update(fb).digest("hex");
};
const rulesWithoutSceneMarker = (v: { rules: any }) => {
  const rc = v.rules.rulesContext;
  return { ...v.rules, rulesContext: { ...rc, hitMarker: rc.hitMarker & ~0x80 } };
};
const bgr = (c: { r: number; g: number; b: number }) => (c.r >> 3) | (c.g >> 3) << 5 | (c.b >> 3) << 10;
const objBank = (palette: readonly number[], bank: number) => palette.slice((16 + bank) * 16, (16 + bank) * 16 + 16);
const assetBank = (p: readonly { r: number; g: number; b: number }[]) => p.map(bgr);
const FIRST_FREE = [3, 4, 5, 7, 9];

describe("live r3 profile registration", () => {
  it("Lovely Kiss is faithful-random (plan == prep22 plans.json, 4 words at +120), Spikes / Octazooka exact; shadow rows are activation-aligned", () => {
    const entry = (plans as unknown as { moves: Record<string, { entries: { draws: { ageOffset: number; count: number }[] }[] }> }).moves["lovely-kiss"];
    if (entry) expect(LIVE_MOVE_RANDOM2_PLANS[142]).toEqual(entry.entries[0]!.draws.map(({ ageOffset, count }) => ({ ageOffset, count })));
    expect(LIVE_MOVE_RANDOM2_PLANS[142]).toEqual([{ ageOffset: 120, count: 4 }]);
    expect(LIVE_FAITHFUL_RANDOM_MOVE_ANIMATION_IDS).toContain(142);
    expect(LIVE_MOVE_ANIMATION_IDS as readonly number[]).not.toContain(142);
    for (const id of [191, 190, 324]) {
      expect(LIVE_MOVE_ANIMATION_IDS as readonly number[]).toContain(id);
      expect(LIVE_FAITHFUL_RANDOM_MOVE_ANIMATION_IDS).not.toContain(id);
    }
    for (const id of [142, 191, 190, 324] as const) {
      expect(LIVE_MOVE_OPPONENT_SHADOW_ROW[id]).toBe(0);
      for (const attacker of [0, 1] as const) {
        expect(liveMoveAnimationDuration({ moveId: id, attacker, target: (1 - attacker) as 0 | 1, turn: 0, power: 0, damage: 0, friendship: 70, multihit: 0 }))
          .toBe(id === 324 ? (attacker === 0 ? 145 : 144) : ROWS[id]);
      }
    }
    const status = JSON.parse(readFileSync("docs/animation-integration-live-status.json", "utf8"));
    expect((status.faithfulRandomAdapters as { id: number }[]).map((e) => e.id)).toContain(142);
    const exact = (status.implementedAdapters as { id: number }[]).map((e) => e.id);
    expect(exact).toEqual(expect.arrayContaining([191, 190, 324]));
    expect(exact).not.toContain(142);
  });

  it("covers 32 dense fixtures: 4 moves x (accepted, prep22 alternate, GOLBAT-elevated, SNORLAX-large) x both orientations", () => {
    expect(NAMES).toHaveLength(32);
    for (const move of ["lovely-kiss", "spikes", "octazooka", "signal-beam"]) {
      for (const kind of ["alt", "extra"]) expect(NAMES.filter((n) => n.startsWith(`${move}-${kind}-`))).toHaveLength(move === "lovely-kiss" || kind === "extra" ? (kind === "extra" ? 4 : 2) : 2);
      expect(NAMES.filter((n) => n.startsWith(`${move}-`) && !n.includes("-alt-") && !n.includes("-extra-"))).toHaveLength(2);
    }
    for (const name of NAMES) {
      const f = fixtureAt(name);
      expect(f.denseWindow!.endFrame - f.denseWindow!.startFrame + 1).toBe(rowsOf(f));
      expect(f.presentationRngActivation !== undefined).toBe(f.move === "LOVELY_KISS");
    }
  });
});

describe("live r3 profile builder (production-derivable inputs)", () => {
  it.each(NAMES.filter((n) => !n.startsWith("signal-beam")))("%s: slots = lowest free, target subpriority, attr2 and palette snapshots from the production sources", (name) => {
    const f = fixtureAt(name);
    const p = profileOf(f);
    const targetSub = f.target.geometry.side === "player" ? 30 : 40;
    const palettes = (id: "unfaded" | "faded") => (id === "unfaded" ? p.palette.unfadedAtAge0 : p.palette.fadedAtAge0) as number[];
    // the assets-only composite: BG banks 2/3/4 and OBJ 0/1 (the two battler palettes) are untouched by the move's own bank writes
    for (const bank of [16, 17]) expect(palettes("unfaded").slice(bank * 16, bank * 16 + 16).some((c) => c !== 0)).toBe(true);
    if (f.move === "SPIKES") {
      expect(p.spriteSlots).toEqual(FIRST_FREE.slice(0, 3));
      expect(p.targetSubpriority).toBe(targetSub - 2);
      expect(p.oam.spikeAttr2).toBe((7 << 12) | (2 << 10) | 305);
      expect(objBank(p.palette.unfadedAfterLoad, 7)).toEqual(assetBank(spikesAsset.spike.palette));
      expect(objBank(p.palette.unfadedAfterMonbg, 7)).toEqual(assetBank(spikesAsset.spike.palette));
      expect(objBank(p.palette.unfadedAtAge0, 7)).not.toEqual(assetBank(spikesAsset.spike.palette));
    } else if (f.move === "OCTAZOOKA") {
      expect(p.ballSpriteSlot).toBe(3);
      expect(p.smokeSpriteSlots).toEqual(FIRST_FREE.slice(0, 4));
      expect(p.targetSubpriority).toBe(targetSub - 2);
      expect(p.oam).toEqual({ ballAttr2: (8 << 12) | (2 << 10) | 305, smokeAttr2: (7 << 12) | (2 << 10) | 537 });
      expect(objBank(p.palette.unfadedAfterGraySmokeLoad, 7)).toEqual(assetBank(octazookaAsset.graySmoke.palette));
      expect(objBank(p.palette.fadedAfterBlackBallLoad, 8)).toEqual(assetBank(octazookaAsset.blackBall.palette));
      expect(objBank(p.palette.unfadedAfterGraySmokeLoad, 8)).not.toEqual(assetBank(octazookaAsset.blackBall.palette));
    } else {
      expect(p.devilSpriteSlot).toBe(3);
      expect(p.heartSpriteSlots).toEqual(FIRST_FREE.slice(0, 4));
      expect(p.targetSubpriority).toBe(targetSub);
      expect(objBank(p.palette.unfadedAfterPinkHeartLoad, 7)).toEqual(assetBank(lovelyKissAsset.pinkHeart.palette));
      expect(objBank(p.palette.fadedAfterDevilLoad, 8)).toEqual(assetBank(lovelyKissAsset.devil.palette));
      expect(p.animationRngAtAge0).toBe(f.presentationRngActivation!.value);
    }
  });

  it("every profile equals the measured prep22 receipt constants (battler subpriority 30 / 40; first-sheet bank 7 tile 305, second sheet bank 8)", () => {
    const rows = JSON.parse(readFileSync("tools/integration/fixtures/prep22/moves/spikes.json", "utf8")).rows as { battlerSub: number[] }[];
    for (const r of rows) expect(r.battlerSub).toEqual([30, 40]);
  });
});

describe("live r3 profile gates", () => {
  const spikesAccepted = "spikes-player-qwilfish-opponent-onix";
  it.each([spikesAccepted, "octazooka-alt-player-kingler-golem", "lovely-kiss-player-jynx-opponent-onix"])(
    "%s declines (scene-off fallback) without the tracker lend, with an unknown order, and for a shiny battler", (name) => {
      const f = fixtureAt(name);
      const { view, effect } = viewOf(f, 0);
      const call = (order: unknown, rng: unknown = effect.presentationRng, field = view.field) =>
        liveMoveAnimationPresentation(effect.request, field, 0, undefined, undefined, order as never, rng as never);
      expect(call(effect.spriteOrderInput)).not.toBeNull();
      expect(call(undefined)).toBeNull();
      expect(call({ known: false })).toBeNull();
      // GET_SHINY_VALUE(otId 416049562, personality) < 8: personality low half = otHi ^ otLo, high half 0
      const ot = 416049562, shiny = ((ot >>> 16) ^ (ot & 0xffff)) >>> 0;
      for (const side of ["player", "opponent"] as const) {
        expect(call(effect.spriteOrderInput, effect.presentationRng, { ...view.field, [side]: { ...view.field[side], personality: shiny } })).toBeNull();
      }
    });

  it("Lovely Kiss declines without its activated host body (no host, other key, no plan words); Spikes / Octazooka never read a host", () => {
    const f = fixtureAt("lovely-kiss-player-jynx-opponent-onix");
    const { view, effect } = viewOf(f, 0);
    const call = (rng: unknown) => liveMoveAnimationPresentation(effect.request, view.field, 0, undefined, undefined, effect.spriteOrderInput, rng as never);
    expect(call(undefined)).toBeNull();
    expect(call({ host: (effect.presentationRng as any).host, key: liveMovePresentationRngBodyKey({ resolutionId: { requestId: 9 }, segmentIndex: 0, commandIndex: 0 }) })).toBeNull();
    expect(call({ host: null, key })).toBeNull();
    for (const name of [spikesAccepted, "octazooka-alt-player-kingler-golem"]) {
      const g = viewOf(fixtureAt(name), 0);
      expect(liveMoveAnimationPresentation(g.effect.request, g.view.field, 0, undefined, undefined, g.effect.spriteOrderInput)).not.toBeNull();
    }
  });

  it("the order lend of later bodies (accepted Octazooka / prep22 Spikes alternates: a Tackle ran first) is a known tracker lend, not the first body", () => {
    for (const name of ["octazooka-player-octillery-opponent-onix", "spikes-alt-player-forretress-golem"]) {
      const f = fixtureAt(name);
      expect(f.precedingBodies).toEqual([{ moveId: 33, side: f.attacker.geometry.side === "player" ? "opponent" : "player" }]);
      expect(configOf(f)).not.toBeNull();
    }
  });
});

describe("live r3 Lovely Kiss presentation RNG (host words, pinned values)", () => {
  const ACCEPTED = ["lovely-kiss-player-jynx-opponent-onix", "lovely-kiss-opponent-jynx-player-onix",
    "lovely-kiss-alt-player-hypno-golem", "lovely-kiss-alt-opponent-hypno-golem"] as const;
  const probed = JSON.parse(readFileSync("tools/integration/fixtures/prep22/moves/lovely-kiss.json", "utf8")).rows as { scenario: string; rng2AtActivation: number }[];

  it("the four pinned ROM activation values equal the prep22 receipt; the host words (plan {120, 4}) are pinned provenance", () => {
    for (const name of ACCEPTED) {
      const f = fixtureAt(name);
      const row = probed.find((r) => `tools/battle-lab/${r.scenario}.json` === f.scenario)!;
      expect(f.presentationRngActivation!.value).toBe(row.rng2AtActivation);
      const record = presentationRngBodyWords(fixturePresentationRng(f, viewOf(f, 0).effect.request)!.host, key)!;
      expect(record.provenance).toBe("pinned");
      expect(record.activationValue).toBe(row.rng2AtActivation);
      expect(record.draws).toHaveLength(1);
      expect(record.words).toHaveLength(4);
    }
  });

  // Coverage of the four `% 180` heart phases: all-low (< 60), all-mid (60..119), all-high (>= 120) pinned values besides the four ROM ones.
  const VALUES: [number, string][] = [[36, "all < 60"], [46, "all 60..119"], [213, "all >= 120"], [0x808db3eb, "default seed"]];
  it.each(VALUES)("pinned activation value %i (%s): the reducer's heart phases replay the host's four words (animationRng at +120 == host valueAfter)", (value) => {
    const f = withValue(fixtureAt(ACCEPTED[0]), value);
    const record = presentationRngBodyWords(fixturePresentationRng(f, viewOf(f, 0).effect.request)!.host, key)!;
    const profile = profileOf(f);
    expect(profile.animationRngAtAge0).toBe(record.activationValue);
    const state = lovelyKissAtAge(120, "opponent", { x: 176, y: 40 }, profile);
    expect(state.animationRng).toBe(record.valueAfter);
    expect(lovelyKissAtAge(119, "opponent", { x: 176, y: 40 }, profile).animationRng).not.toBe(record.valueAfter);
  });

  it("the pinned values cover the three phase ranges; different values give different hearts (data / x2) and different pixels, the same value identical pixels", () => {
    const ranges = new Set<string>();
    const sigs = new Set<string>();
    for (const [value] of VALUES) {
      const f = withValue(fixtureAt(ACCEPTED[0]), value);
      const record = presentationRngBodyWords(fixturePresentationRng(f, viewOf(f, 0).effect.request)!.host, key)!;
      for (const w of record.words) ranges.add(w % 180 < 60 ? "low" : w % 180 < 120 ? "mid" : "high");
      const state = lovelyKissAtAge(135, "opponent", { x: 176, y: 40 }, profileOf(f));
      sigs.add(JSON.stringify(state.sprites.filter((s) => s.template === "gPinkHeartSpriteTemplate").map((s) => [s.x2, s.y2, s.data])));
    }
    expect([...ranges].sort()).toEqual(["high", "low", "mid"]);
    expect(sigs.size).toBe(VALUES.length);
    const base = fixtureAt(ACCEPTED[0]);
    const a = hashRender(base, 135), b = hashRender(withValue(base, 213), 135);
    expect(hashRender(base, 135)).toBe(a);
    expect(b).not.toBe(a);
  }, 240000);

  it("before the +120 draw frame the pinned value does not change the picture; after it, it does (the words are consumed at one age)", () => {
    const base = fixtureAt(ACCEPTED[0]);
    for (const age of [10, 60, 100]) expect(hashRender(withValue(base, 213), age)).toBe(hashRender(base, age));
    for (const age of [125, 135]) expect(hashRender(withValue(base, 213), age)).not.toBe(hashRender(base, age));
  }, 240000);

  it("sceneOnLovelyKissView keeps the reducer's four hearts at the target", () => {
    const state = configOf(fixtureAt(ACCEPTED[0]), 130)!;
    const view = sceneOnLovelyKissView(state as never);
    expect(view.sprites.filter((s) => s.template === "gPinkHeartSpriteTemplate")).toHaveLength(4);
  });
});

describe("live r3 profile ordinary routes", () => {
  const SEED_A = 0x1234abcd, SEED_B = 0xfeed0042;
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
  // route = generated rentals, party member 0 knows the move, one turn (tools/integration/r3ProfileRouteSearch.ts: first seeds ascending).
  it.each([
    ["SPIKES 17/21 FORRETRESS", 191, 17, 21, 3 as const, 113],
    ["SPIKES 75/7 QWILFISH", 191, 75, 7, 2 as const, 113],
    ["OCTAZOOKA 116/7 OCTILLERY", 190, 116, 7, 0 as const, 79],
    ["OCTAZOOKA 239/7 OCTILLERY", 190, 239, 7, 0 as const, 79],
  ])("route %s: body reached, adapter active every age, following prompt reached, Scene ON/OFF parity", (_name, id, seed, streak, slot, ages) => {
    const on = generatedCommandAnimationReplay(seed, "on", [slot], streak);
    const off = generatedCommandAnimationReplay(seed, "off", [slot], streak);
    const bodies = on.animations.filter((a) => a.moveId === id && a.attacker === 0);
    expect(bodies).toHaveLength(1);
    expect(bodies[0]!.ages).toEqual(iu120Ages(id, ages));
    expect(bodies[0]!.adapterActive.every(Boolean)).toBe(true);
    parityOf(on, off);
  }, 240000);

  it.each([
    ["LOVELY_KISS 11/21 JYNX", 11, 21, 2 as const],
    ["LOVELY_KISS 11/35 JYNX", 11, 35, 1 as const],
  ])("route %s (faithful-random): active every age with surrogate words; two presentation seeds give different words and identical boundaries / RNG / facility state; Scene ON/OFF parity",
    (_name, seed, streak, slot) => {
      const A = random2Route(seed, "on", [slot], streak, SEED_A), B = random2Route(seed, "on", [slot], streak, SEED_B);
      const off = random2Route(seed, "off", [slot], streak, SEED_A);
      const again = random2Route(seed, "on", [slot], streak, SEED_A);
      const bodies = A.bodies.filter((b) => b.moveId === 142 && b.attacker === 0);
      expect(bodies).toHaveLength(1);
      expect(bodies[0]!.ages).toEqual(iu120EffectAges(142, 152));
      expect(bodies[0]!.active.every(Boolean)).toBe(true);
      expect(bodies[0]!.provenance).toBe("surrogate");
      expect(bodies[0]!.words).toHaveLength(4);
      expect(B.bodies.filter((b) => b.moveId === 142)[0]!.words).not.toEqual(bodies[0]!.words);
      expect(again.bodies.filter((b) => b.moveId === 142)[0]!.frameDigests).toEqual(bodies[0]!.frameDigests);
      expect(A.run.stalled).toBe(false);
      expect(A.run.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
      expect(B.run.boundaries).toEqual(A.run.boundaries);
      expect(B.run.state.facilityState).toEqual(A.run.state.facilityState);
      expect(B.run.state.round.rules.rngValue).toBe(A.run.state.round.rules.rngValue);
      expect(off.bodies).toEqual([]);
      expect(off.run.boundaries).toHaveLength(A.run.boundaries.length);
      for (let i = 0; i < A.run.boundaries.length; i += 1) {
        expect(rulesWithoutSceneMarker(off.run.boundaries[i]!)).toEqual(rulesWithoutSceneMarker(A.run.boundaries[i]!));
        expect(off.run.boundaries[i]!.rng).toEqual(A.run.boundaries[i]!.rng);
        expect(off.run.boundaries[i]!.boundary).toEqual(A.run.boundaries[i]!.boundary);
      }
      expect(off.run.state.round.rules.rngValue).toBe(A.run.state.round.rules.rngValue);
      expect(off.run.state.facilityState).toEqual(A.run.state.facilityState);
    }, 240000);

  // Searched seeds 0..4000 (streak 0..42 step 7, rentals[0] knows the move): LOVELY_KISS 77/35 follows an opponent Fire Punch body, whose
  // gap has no sprite-order plan, so the tracked order is unknown and the adapter declines (scene-off view) on every age.
  it("route LOVELY_KISS 77/35 after an opponent Fire Punch: the unknown lend declines the whole body (gate), logic unchanged", () => {
    const on = generatedCommandAnimationReplay(77, "on", [1], 35);
    const off = generatedCommandAnimationReplay(77, "off", [1], 35);
    const kiss = on.animations.filter((a) => a.moveId === 142);
    expect(kiss).toHaveLength(1);
    expect(kiss[0]!.adapterActive.some(Boolean)).toBe(false);
    expect(on.animations.find((a) => a.moveId === 7)!.adapterActive.every(Boolean)).toBe(true);
    parityOf(on, off);
  }, 240000);
});

describe("live r3 Signal Beam (exact, first body)", () => {
  const SB = NAMES.filter((n) => n.startsWith("signal-beam"));
  it.each(SB)("%s: orb pairs / helper = lowest free over the known-entry set; inputs equal the measured constants", (name) => {
    const f = fixtureAt(name);
    const inputs = (configOf(f)!.config as any).animationInputs;
    const { pairs, helperSlot } = signalBeamOrbSlots();
    expect(inputs.orbPairs).toEqual(pairs);
    expect(inputs.paletteBlendSpriteSlot).toBe(helperSlot);
    expect(inputs.taskSlots).toEqual({ attackerShake: 0, pan: 1, sinTimer: 2, targetShake: 3 });
    expect(inputs.registers).toEqual({ win0h: 240, win0v: 161 });
    expect(inputs.spriteOrder).toHaveLength(64);
    expect(inputs.targetPalette.bank).toBe(f.target.geometry.side === "player" ? 16 : 17);
    expect(inputs.attackerSprite.slot).toBe(f.attacker.geometry.side === "player" ? 6 : 8);
  });

  it("the lowest-free simulation reproduces the ROM pairs of prep22 (23 pairs, helper slot at age 36)", () => {
    const { pairs, helperSlot } = signalBeamOrbSlots();
    expect(pairs).toHaveLength(23);
    expect(pairs[0]).toEqual({ redSlot: 3, greenSlot: 4 });
    expect(helperSlot).toBeGreaterThan(2);
    const check = JSON.parse(readFileSync("tools/integration/fixtures/prep22/signal-beam-check.json", "utf8")) as Record<string, { lowestFreePairsEqualRom: boolean; helperSlotRom: number }>;
    for (const row of Object.values(check)) { expect(row.lowestFreePairsEqualRom).toBe(true); expect(row.helperSlotRom).toBe(helperSlot); }
  });

  // later58 moved this pin: a later body (no firstBody) is live while both species rests are {0,0} and declines with an opponent ONIX
  // (docs/next-adapters-later58.md; tools/integration/fixtures/later58-live-receipt.json).
  it("declines an unknown order and a shiny battler; a later body only on rest-free battlers (later58)", () => {
    const f = fixtureAt("signal-beam-player-ariados-opponent-chansey");
    const { view, effect } = viewOf(f, 0);
    const call = (order: unknown, field = view.field) => liveMoveAnimationPresentation(effect.request, field, 0, undefined, undefined, order as never);
    expect(call(effect.spriteOrderInput)).not.toBeNull();
    expect(call({ ...(effect.spriteOrderInput as object), firstBody: undefined })).not.toBeNull();
    const onix = viewOf({ ...f, target: { ...f.target, species: "ONIX" } }, 0);
    expect(liveMoveAnimationPresentation(onix.effect.request, onix.view.field, 0, undefined, undefined, onix.effect.spriteOrderInput as never)).not.toBeNull();
    expect(liveMoveAnimationPresentation(onix.effect.request, onix.view.field, 0, undefined, undefined,
      { ...(onix.effect.spriteOrderInput as object), firstBody: undefined } as never)).toBeNull();
    expect(call(undefined)).toBeNull();
    expect(call({ known: false })).toBeNull();
    const ot = 416049562, shiny = ((ot >>> 16) ^ (ot & 0xffff)) >>> 0;
    for (const side of ["player", "opponent"] as const) expect(call(effect.spriteOrderInput, { ...view.field, [side]: { ...view.field[side], personality: shiny } })).toBeNull();
  });

  it.each([
    ["SIGNAL_BEAM 8/14 VENOMOTH", 8, 14, 0 as const],
    ["SIGNAL_BEAM 10/0 YANMA", 10, 0, 0 as const],
  ])("route %s: body reached, adapter active every age, following prompt reached, Scene ON/OFF parity", (_name, seed, streak, slot) => {
    const on = generatedCommandAnimationReplay(seed, "on", [slot], streak);
    const off = generatedCommandAnimationReplay(seed, "off", [slot], streak);
    const bodies = on.animations.filter((a) => a.moveId === 324 && a.attacker === 0);
    expect(bodies).toHaveLength(1);
    expect(bodies[0]!.ages).toEqual(iu120Ages(324, 145));
    expect(bodies[0]!.adapterActive.every(Boolean)).toBe(true);
    expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    expect(off.boundaries).toHaveLength(on.boundaries.length);
    for (let i = 0; i < on.boundaries.length; i += 1) {
      expect(rulesWithoutSceneMarker(on.boundaries[i]!)).toEqual(rulesWithoutSceneMarker(off.boundaries[i]!));
      expect(on.boundaries[i]!.rng).toEqual(off.boundaries[i]!.rng);
      expect(on.boundaries[i]!.boundary).toEqual(off.boundaries[i]!.boundary);
    }
    expect(on.state.facilityState).toEqual(off.state.facilityState);
  }, 240000);
});
