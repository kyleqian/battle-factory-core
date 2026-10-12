import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import type { BattleResolutionDisplayedField } from "../../src/engine/battleResolutionPresentation.ts";
import type { BattleResolutionPresentationRenderView } from "../../src/engine/battleResolutionPresentationRender.ts";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import {
  LIVE_MOVE_ANIMATION_IDS, LIVE_MOVE_OPPONENT_SHADOW_ROW, liveMoveAnimationDuration, liveMoveAnimationPresentation,
} from "../../src/engine/liveMoveAnimation.ts";
import { prepareLiveMoveSpriteOrder, type LiveMoveSpriteOrderInput } from "../../src/engine/liveMoveSpriteAllocator.ts";
import {
  initSpriteOrderState, knownEntrySpriteOrderState, spriteOrderForSlots,
} from "../../src/engine/spriteOrderProvider.ts";
import speciesStats from "../../src/data/gen/species-stats.json" with { type: "json" };
import { grudgeConfigFor, grudgeRowsFor } from "../../tools/compare/grudgeFramebuffer.ts";
import { generatedCommandAnimationReplay } from "../../tools/integration/generatedCommandAnimationReplay.ts";
import { predictLentOrders } from "../../tools/integration/orderCrossBodyRouteScan.ts";
import { fixtureSpriteOrder, type Fixture } from "../../tools/integration/liveAdapterFramebuffer.ts";
import { healBellNotesInPainterOrder, HEAL_BELL_REUSED_ORDER_SLOTS } from "../../src/animation/healBell.ts";
import { leafBladeDisplayedOamOrderAtAge, LEAF_BLADE_OAM_ORDER_SLOTS } from "../../src/animation/leafBlade.ts";
import { perishSongNoteOrderFromFree } from "../../src/animation/perishSong.ts";
import moveData from "../../src/data/gen/moves.json" with { type: "json" };
import { iu120Ages } from "../helpers/iu120Rows.ts";

// docs/order-consumer-prep.md §0/§1/§4/§5: Grudge (288) is READY-WITH-PROVIDER for the battle's first move body;
// window 66..274 / 70..278 (209 rows, shadow row 0); seed = F before the six-flame window filtered to [3,4,5,7,9,10].
function displayed(player: string, opponent: string): BattleResolutionDisplayedField {
  const mon = (name: string) => ({
    species: speciesStats.species.find(s => s.name === `SPECIES_${name}`)!.id, speciesSymbol: name, name, level: 50,
    hp: 100, maxHP: 100, gender: "male", status: "none",
  });
  return { player: mon(player), opponent: mon(opponent) } as unknown as BattleResolutionDisplayedField;
}
const request = (attacker: 0 | 1): BattleMoveAnimationRequest => ({
  moveId: 288, attacker, target: attacker === 0 ? 1 : 0, turn: 0, power: 0, damage: 0, friendship: 70, multihit: 0,
});
const knownOrder = (): LiveMoveSpriteOrderInput =>
  prepareLiveMoveSpriteOrder(knownEntrySpriteOrderState("ordinary-factory"), request(0)).input!;
function render(field: BattleResolutionDisplayedField, attacker: 0 | 1, age: number, order?: LiveMoveSpriteOrderInput): string {
  const view = {
    field, fieldArt: createBattleCommandFieldArtView(field),
    healthboxes: {
      player: { name: field.player.name, level: 50, gender: "male", hpFraction: 1, status: "none", currentHp: 100, maxHp: 100 },
      opponent: { name: field.opponent.name, level: 50, gender: "male", hpFraction: 1, status: "none" },
    },
    message: { lines: ["X used", "GRUDGE!"], visibleCharacters: 99 },
    effect: { type: "move", request: request(attacker), age, spriteOrderInput: order },
    visibility: { player: { sprite: true, healthbox: true }, opponent: { sprite: true, healthbox: true } },
    waitCursor: null, bottom: "message", confirmHandoff: null, switchIn: null, midBattleSwitchIn: null,
    switchOut: null, partySummary: null, midBattleSwitchFade: null, midBattleSwitchParticles: null, trainerSlide: null,
  } as unknown as BattleResolutionPresentationRenderView;
  const fb = new Uint8Array(240 * 160 * 4);
  renderBattleResolutionLiveView(fb, view);
  return createHash("sha256").update(fb).digest("hex");
}
const rulesWithoutSceneMarker = (v: { rules: any }) => {
  const rc = v.rules.rulesContext;
  return { ...v.rules, rulesContext: { ...rc, hitMarker: rc.hitMarker & ~0x80 } };
};
function expectRulesEqual(on: ReturnType<typeof generatedCommandAnimationReplay>,
  off: ReturnType<typeof generatedCommandAnimationReplay>): void {
  expect(on.boundaries.length).toBeGreaterThan(0);
  expect(off.boundaries).toHaveLength(on.boundaries.length);
  for (let i = 0; i < on.boundaries.length; i += 1) {
    expect(rulesWithoutSceneMarker(on.boundaries[i]!)).toEqual(rulesWithoutSceneMarker(off.boundaries[i]!));
    expect(on.boundaries[i]!.rng).toEqual(off.boundaries[i]!.rng);
    expect(on.boundaries[i]!.boundary).toEqual(off.boundaries[i]!.boundary);
  }
}

describe("live order-consumer adapters: Grudge (while the tracked order is known)", () => {
  it("registers Grudge with the accepted duration and #142 shadow row", () => {
    expect(LIVE_MOVE_ANIMATION_IDS).toContain(288);
    for (const a of [0, 1] as const) expect(liveMoveAnimationDuration(request(a))).toBe(209);
    expect(LIVE_MOVE_OPPONENT_SHADOW_ROW[288]).toBe(0);
  });

  it("derives the accepted staged config from production anchors and the provider order (both orientations)", () => {
    for (const orientation of ["player-back", "opponent-front"] as const) {
      const accepted = grudgeConfigFor(orientation, grudgeRowsFor(orientation));
      const attacker = orientation === "player-back" ? 0 : 1;
      const field = attacker === 0 ? displayed("HAUNTER", "ONIX") : displayed("ONIX", "HAUNTER");
      const live = liveMoveAnimationPresentation(request(attacker), field, 0, undefined, undefined, knownOrder())!.config as
        typeof accepted;
      expect(live.attacker).toEqual(accepted.attacker);
      expect(live.target).toEqual(accepted.target);
      // animationRngSeed is a state-only diagnostic of grudge.ts (no pixel consumer).
      const { animationRngSeed: _live, ...liveProfile } = live.animationProfile;
      const { animationRngSeed: _accepted, ...acceptedProfile } = accepted.animationProfile;
      expect(liveProfile).toEqual(acceptedProfile);
      expect(live.animationProfile.spriteOrderSeed).toEqual([4, 3, 5, 10, 9, 7]);
    }
  });

  it("refuses an unknown order (bounded scene-off fallback) and never guesses one", () => {
    const field = displayed("HAUNTER", "ONIX");
    expect(liveMoveAnimationPresentation(request(0), field, 0)).toBeNull();
    // After the first body the host order is invalid and lends nothing.
    const consumed = prepareLiveMoveSpriteOrder(knownEntrySpriteOrderState("ordinary-factory"), request(0)).next;
    expect(prepareLiveMoveSpriteOrder(consumed, request(0)).input).toBeUndefined();
    expect(liveMoveAnimationPresentation(request(0), field, 0, undefined, undefined,
      prepareLiveMoveSpriteOrder(consumed, request(0)).input)).toBeNull();
    // A different known order is consumed as given (the provider, not a literal, owns the seed).
    const identity = prepareLiveMoveSpriteOrder(initSpriteOrderState(), request(0)).input!;
    const config = liveMoveAnimationPresentation(request(0), field, 0, undefined, undefined, identity)!.config as any;
    expect(config.animationProfile.flameSlots).toEqual([0, 1, 2, 3, 4, 5]);
    expect(config.animationProfile.spriteOrderSeed).toEqual(spriteOrderForSlots(initSpriteOrderState(), [0, 1, 2, 3, 4, 5]));
  });

  it("renders an alternate carrier (NINETALES) in both orientations without fixture-species throws", () => {
    for (const a of [0, 1] as const) {
      const field = a === 0 ? displayed("NINETALES", "ONIX") : displayed("ONIX", "NINETALES");
      expect(liveMoveAnimationPresentation(request(a), field, 0, undefined, undefined, knownOrder())).not.toBeNull();
      expect(new Set([0, 60, 104, 208].map(age => render(field, a, age, knownOrder()))).size).toBeGreaterThan(1);
    }
  });

  it("plays ordinary Grudge as the battle's first body (seed 57, slot 3, Haunter) with the adapter active every age", () => {
    const on = generatedCommandAnimationReplay(57, "on", [3], 0);
    const off = generatedCommandAnimationReplay(57, "off", [3], 0);
    const firstBody = on.commands.find(row => row.type === "move-animation")!;
    expect((firstBody.command as { animation: { moveId: number } }).animation.moveId).toBe(288);
    expect(firstBody.spriteOrderInput).toBeDefined();
    const body = on.animations.find(a => a.moveId === 288 && a.attacker === 0)!;
    expect(body.player).toBe("HAUNTER");
    expect(body.ages).toEqual(iu120Ages(288, 209));
    expect(body.adapterActive.every(Boolean)).toBe(true);
    expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    expectRulesEqual(on, off);
  }, 120000);

  it("renders Grudge as a LATER body after a modelled opponent Light Screen with the tracked order (seed 16, slot 3)", () => {
    const on = generatedCommandAnimationReplay(16, "on", [3], 0);
    const off = generatedCommandAnimationReplay(16, "off", [3], 0);
    expect(on.requests.map(q => [q.moveId, q.attacker])).toEqual([[113, 1], [288, 0]]);
    const body = on.animations.find(a => a.moveId === 288 && a.attacker === 0)!;
    expect(body.ages).toEqual(iu120Ages(288, 209));
    expect(body.adapterActive.every(Boolean)).toBe(true);
    const moves = on.commands.filter(row => row.type === "move-animation");
    const predicted = predictLentOrders(on, true);
    expect(moves.map(row => row.spriteOrderInput ?? null))
      .toEqual(moves.map(row => predicted.get((row.command as { eventSequence: number }).eventSequence)));
    expect(moves.map(row => row.spriteOrderInput !== undefined)).toEqual([true, true]);
    expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    expectRulesEqual(on, off);
  }, 120000);

  // Before prep43 the Confuse Ray confusion status unit before Grudge had no EXACT plan and Grudge declined here; STATUS_CONFUSION is EXACT
  // now (host == pure transform on this route: tests/liveSpriteOrderHost.test.ts). The decline gate itself: liveSpriteOrderHost.test.ts (Giga Drain).
  it("renders live once the earlier confusion unit is planned (seed 16, slots [1, 3]; declined before prep43)", () => {
    const on = generatedCommandAnimationReplay(16, "on", [1, 3], 0);
    const off = generatedCommandAnimationReplay(16, "off", [1, 3], 0);
    const body = on.animations.find(a => a.moveId === 288 && a.attacker === 0)!;
    expect(body.ages).toEqual(iu120Ages(288, 209));
    expect(body.adapterActive.some(Boolean)).toBe(true);
    const grudge = on.commands.find(row => row.type === "move-animation"
      && (row.command as { animation?: { moveId: number } }).animation?.moveId === 288)!;
    expect(grudge.spriteOrderInput).toBeDefined();
    expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    expectRulesEqual(on, off);
  }, 120000);
});

// ---------------------------------------------------------------------------------------------------------------
// Order-consumer batch 2 (docs/order-consumer-prep.md §0/§4/§5): Ember, Dragon Rage, Flamethrower (order-independent),
// Heal Bell, Leaf Blade, Perish Song, Rock Throw, Blaze Kick (provider consumers: while the tracked order is known).
const NEW = { EMBER: 52, DRAGON_RAGE: 82, FLAMETHROWER: 53, HEAL_BELL: 215, LEAF_BLADE: 348, PERISH_SONG: 195, ROCK_THROW: 88, BLAZE_KICK: 299 } as const;
const DURATION: Record<number, number> = { 52: 63, 82: 150, 53: 115, 215: 261, 348: 224, 195: 259, 88: 87, 299: 78 };
const NAME: Record<number, string> = { 52: "EMBER", 82: "DRAGON_RAGE", 53: "FLAMETHROWER", 215: "HEAL_BELL", 348: "LEAF_BLADE", 195: "PERISH_SONG", 88: "ROCK_THROW", 299: "BLAZE_KICK" };
const reqFor = (moveId: number, attacker: 0 | 1): BattleMoveAnimationRequest => ({
  moveId, attacker, target: attacker === 0 ? 1 : 0, turn: 0, power: 0, damage: 0, friendship: 70, multihit: 0,
});
const readJson = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const orderFixture = (stem: string, side: "player" | "opponent"): Fixture =>
  readJson(`tools/integration/fixtures/order-consumer-${stem}-${side}.json`);
const firstBodyOrder = (moveId: number): LiveMoveSpriteOrderInput =>
  prepareLiveMoveSpriteOrder(knownEntrySpriteOrderState("ordinary-factory"), reqFor(moveId, 0)).input!;
const fieldFor = (f: Fixture): BattleResolutionDisplayedField =>
  f.attacker.geometry.side === "player" ? displayed(f.attacker.species, f.target.species) : displayed(f.target.species, f.attacker.species);

describe("live order-consumer adapters: Ember, Dragon Rage, Flamethrower, Heal Bell, Leaf Blade, Perish Song, Rock Throw, Blaze Kick", () => {
  it("registers each id with its accepted duration and #142 shadow row (row 0 only where the window starts at activation)", () => {
    for (const [id, duration] of Object.entries(DURATION)) {
      expect(LIVE_MOVE_ANIMATION_IDS).toContain(Number(id));
      for (const a of [0, 1] as const) expect(liveMoveAnimationDuration(reqFor(Number(id), a))).toBe(duration);
    }
    for (const id of [88, 215, 195, 348]) expect(LIVE_MOVE_OPPONENT_SHADOW_ROW[id]).toBe(0);
    // Ember (-4), Dragon Rage (-7), Flamethrower (-15), Blaze Kick (-10): the window starts after activation, no row.
    for (const id of [52, 82, 53, 299]) expect(LIVE_MOVE_OPPONENT_SHADOW_ROW[id]).toBeUndefined();
  });

  it("every fixture declares its preceding bodies and the harness replays them to the order-consumer-seeds value", () => {
    const expected: Record<string, number> = { ember: 1, flamethrower: 1, "blaze-kick": 1, "rock-throw": 1, "heal-bell": 1, "dragon-rage": 0, "perish-song": 0, "leaf-blade": 0 };
    for (const [stem, count] of Object.entries(expected)) {
      for (const side of ["player", "opponent"] as const) {
        const f = orderFixture(stem, side);
        expect(f.precedingBodies?.length ?? 0).toBe(count);
        // Throws when the plan-replayed free order differs from order-consumer-seeds.json (provider == observed).
        const id = (moveData.moves as { id: number; move: string }[]).find(m => m.move === `MOVE_${f.move}`)!.id;
        expect(fixtureSpriteOrder(f, reqFor(id, side === "player" ? 0 : 1)).order.known).toBe(true);
      }
    }
  });

  it("derives the accepted profiles from production anchors and the provider order (provider == accepted literal)", () => {
    for (const [stem, id] of [["ember", 52], ["flamethrower", 53], ["blaze-kick", 299], ["rock-throw", 88]] as const) {
      for (const side of ["player", "opponent"] as const) {
        const f = orderFixture(stem, side);
        const scenario = f.scenario.replace(/^.*mechanic-/, "").replace(/\.json$/, "");
        const accepted = readJson(`tools/compare/fixtures/${scenario}.json`).animationProfile;
        const attacker = side === "player" ? 0 : 1;
        const order = prepareLiveMoveSpriteOrder(fixtureSpriteOrder(f, reqFor(id, attacker)).order, reqFor(id, attacker)).input;
        const live = liveMoveAnimationPresentation(reqFor(id, attacker), fieldFor(f), 0, undefined, undefined, order)!.config as any;
        expect(live.animationProfile, `${stem} ${side}`).toEqual(id === 88 ? { ...accepted, ...live.animationProfile } : accepted);
        if (id === 88) {
          expect(live.animationProfile.spriteOrderSeed).toEqual(accepted.spriteOrderSeed);
          expect(live.animationProfile.occupiedSpriteSlots).toEqual(accepted.occupiedSpriteSlots);
        }
      }
    }
  });

  it("first-body provider seeds: Heal Bell / Leaf Blade / Perish Song / Blaze Kick / Rock Throw", () => {
    const order = firstBodyOrder(215);
    const seedOf = (id: number, side: 0 | 1, key: string, field: BattleResolutionDisplayedField) =>
      (liveMoveAnimationPresentation(reqFor(id, side), field, 0, undefined, undefined, order)!.config as any)[key];
    const hb = seedOf(215, 0, "noteOrderSeed", displayed("CHIMECHO", "ONIX"));
    expect(hb).toEqual([4, 5, 11, 10, 9, 7]);
    expect(hb).toEqual(spriteOrderForSlots(knownEntrySpriteOrderState("ordinary-factory"), HEAL_BELL_REUSED_ORDER_SLOTS));
    expect(seedOf(348, 0, "oamOrderSeed", displayed("SCEPTILE", "ONIX"))).toEqual([4, 3, 5, 16, 15, 14, 13, 12, 11, 10, 9, 7]);
    const perish = seedOf(195, 0, "noteOrderSeed", displayed("MURKROW", "ONIX"));
    expect(perish).toEqual(perishSongNoteOrderFromFree(order.free));
    expect(perish).toHaveLength(16);
    const bk = (liveMoveAnimationPresentation(reqFor(299, 0), displayed("BLAZIKEN", "ONIX"), 0, undefined, undefined, order)!.config as any).animationProfile;
    expect(bk.spriteSlots).toEqual([3, 4, 5, 7, 9, 10, 11, 12, 13, 14]);
    expect(bk.spriteOrderSeed).toEqual([4, 3, 5, 14, 13, 12, 11, 10, 9, 7]);
    const rt = (liveMoveAnimationPresentation(reqFor(88, 0), displayed("GRAVELER", "ONIX"), 0, undefined, undefined, order)!.config as any).animationProfile;
    expect(rt.spriteOrderSeed).toHaveLength(64);
    expect(rt.spriteOrderSeed.slice(0, 9)).toEqual([62, 60, 0, 63, 1, 61, 6, 8, 2]);
    expect(rt.spriteOrderSeed.slice(9, 14)).toEqual([4, 3, 21, 20, 5]);
  });

  it("provider consumers refuse an unknown order; order-independent moves render without one", () => {
    const fields: Record<number, BattleResolutionDisplayedField> = {
      215: displayed("CHIMECHO", "ONIX"), 348: displayed("SCEPTILE", "ONIX"), 195: displayed("MURKROW", "ONIX"),
      88: displayed("GRAVELER", "ONIX"), 299: displayed("BLAZIKEN", "ONIX"),
      52: displayed("MAGCARGO", "ONIX"), 82: displayed("CHARMELEON", "ONIX"), 53: displayed("ARCANINE", "ONIX"),
    };
    for (const id of [215, 348, 195, 88, 299]) {
      expect(liveMoveAnimationPresentation(reqFor(id, 0), fields[id]!, 0), NAME[id]).toBeNull();
      const consumed = prepareLiveMoveSpriteOrder(knownEntrySpriteOrderState("ordinary-factory"), reqFor(id, 0)).next;
      expect(liveMoveAnimationPresentation(reqFor(id, 0), fields[id]!, 0, undefined, undefined,
        prepareLiveMoveSpriteOrder(consumed, reqFor(id, 0)).input), NAME[id]).toBeNull();
    }
    for (const id of [52, 82, 53]) {
      expect(liveMoveAnimationPresentation(reqFor(id, 0), fields[id]!, 0), NAME[id]).not.toBeNull();
    }
    // Flamethrower: ascending seed without an order, the provider's relative order with one (pixel-neutral, one flame per window).
    const flame = (order?: LiveMoveSpriteOrderInput) =>
      (liveMoveAnimationPresentation(reqFor(53, 0), fields[53]!, 0, undefined, undefined, order)!.config as any).animationProfile;
    expect(flame().spriteOrderSeed).toEqual(flame().flameSpriteSlots);
    expect(flame(firstBodyOrder(53)).flameSpriteSlots).toEqual([3, 4, 5, 7, 9, 10, 11, 12]);
    expect(flame(firstBodyOrder(53)).spriteOrderSeed).toEqual([4, 3, 5, 12, 11, 10, 9, 7]);
  });

  it("staged output is unchanged: the Heal Bell / Leaf Blade initial-order parameters default to the accepted literals", () => {
    const home = { x: 72, y: 95 }, pos = { x: 72, y: 80 };
    for (const age of [0, 40, 120, 200]) {
      expect(healBellNotesInPainterOrder(age, "player", home, pos))
        .toEqual(healBellNotesInPainterOrder(age, "player", home, pos, [4, 5, 7, 9, 10, 11]));
    }
    expect(LEAF_BLADE_OAM_ORDER_SLOTS).toEqual([3, 4, 5, 7, 9, 10, 11, 12, 13, 14, 15, 16]);
    const tp = { pictureOffset: { x: 176, y: 42 }, width: 56, height: 64, subpriority: 40 };
    for (const age of [0, 30, 100, 223]) {
      expect(leafBladeDisplayedOamOrderAtAge(age, "player", "opponent", tp))
        .toEqual(leafBladeDisplayedOamOrderAtAge(age, "player", "opponent", tp, [3, 4, 5, 7, 9, 10, 11, 12, 13, 14, 15, 16]));
    }
  });

  it("renders alternate carriers in both orientations (Ember MAGCARGO, Flamethrower ARCANINE, Dragon Rage CHARMELEON)", () => {
    const cases: [number, string, string][] = [[52, "MAGCARGO", "ONIX"], [53, "ARCANINE", "ONIX"], [82, "CHARMELEON", "ONIX"]];
    for (const [id, atk, tgt] of cases) {
      for (const a of [0, 1] as const) {
        const field = a === 0 ? displayed(atk, tgt) : displayed(tgt, atk);
        const renderAge = (age: number) => {
          const view = {
            field, fieldArt: createBattleCommandFieldArtView(field),
            healthboxes: {
              player: { name: field.player.name, level: 50, gender: "male", hpFraction: 1, status: "none", currentHp: 100, maxHp: 100 },
              opponent: { name: field.opponent.name, level: 50, gender: "male", hpFraction: 1, status: "none" },
            },
            message: { lines: ["X used", "Y!"], visibleCharacters: 99 },
            effect: { type: "move", request: reqFor(id, a), age },
            visibility: { player: { sprite: true, healthbox: true }, opponent: { sprite: true, healthbox: true } },
            waitCursor: null, bottom: "message", confirmHandoff: null, switchIn: null, midBattleSwitchIn: null,
            switchOut: null, partySummary: null, midBattleSwitchFade: null, midBattleSwitchParticles: null, trainerSlide: null,
          } as unknown as BattleResolutionPresentationRenderView;
          const fb = new Uint8Array(240 * 160 * 4);
          renderBattleResolutionLiveView(fb, view);
          return createHash("sha256").update(fb).digest("hex");
        };
        expect(new Set([0, 20, 40, 60].map(renderAge)).size, `${NAME[id]} ${a}`).toBeGreaterThan(1);
      }
    }
  });

  // Ordinary generated-rental routes (docs/order-consumer-prep.md §5; tools/integration/orderConsumerRouteScan.ts).
  const ordinary = (seed: number, streak: number, slot: 0 | 1 | 2 | 3) => ({
    on: generatedCommandAnimationReplay(seed, "on", [slot], streak), off: generatedCommandAnimationReplay(seed, "off", [slot], streak),
  });
  const routes: { name: keyof typeof NEW; seed: number; streak: number; slot: 0 | 1 | 2 | 3; player: string }[] = [
    { name: "EMBER", seed: 4, streak: 7, slot: 1, player: "MAGCARGO" },
    { name: "DRAGON_RAGE", seed: 37, streak: 14, slot: 3, player: "CHARMELEON" },
    { name: "FLAMETHROWER", seed: 22, streak: 21, slot: 0, player: "MAGMAR" },
    { name: "HEAL_BELL", seed: 0, streak: 7, slot: 3, player: "DELCATTY" },
    { name: "LEAF_BLADE", seed: 89, streak: 21, slot: 0, player: "SCEPTILE" },
    { name: "PERISH_SONG", seed: 25, streak: 14, slot: 0, player: "MURKROW" },
    { name: "ROCK_THROW", seed: 33, streak: 0, slot: 1, player: "GRAVELER" },
    { name: "BLAZE_KICK", seed: 322, streak: 28, slot: 0, player: "BLAZIKEN" },
  ];
  for (const route of routes) {
    it(`plays ordinary ${route.name} (seed ${route.seed}, streak ${route.streak}, slot ${route.slot}, ${route.player}) with the adapter active every age`, () => {
      const { on, off } = ordinary(route.seed, route.streak, route.slot);
      const id = NEW[route.name];
      const body = on.animations.find(a => a.moveId === id && a.attacker === 0)!;
      expect(body.player).toBe(route.player);
      expect(body.ages).toEqual(iu120Ages(id, DURATION[id]!));
      expect(body.adapterActive.every(Boolean)).toBe(true);
      // These provider-consumer routes are the battle's first body (later bodies: the cross-body routes below/in
      // tests/liveSpriteOrderHost.test.ts).
      if (![52, 82, 53].includes(id)) {
        const firstBody = on.commands.find(row => row.type === "move-animation")!;
        expect((firstBody.command as { animation: { moveId: number } }).animation.moveId).toBe(id);
        expect(firstBody.spriteOrderInput).toBeDefined();
      }
      expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
      expectRulesEqual(on, off);
    }, 180000);
  }

  it("renders Blaze Kick as a LATER body after a modelled opponent Sunny Day (seed 43, streak 28, slot 0)", () => {
    const { on, off } = ordinary(43, 28, 0);
    expect(on.requests.map(q => [q.moveId, q.attacker])).toEqual([[241, 1], [299, 0]]);
    const body = on.animations.find(a => a.moveId === 299 && a.attacker === 0)!;
    expect(body.ages).toEqual(iu120Ages(299, 78));
    expect(body.adapterActive.every(Boolean)).toBe(true);
    const moves = on.commands.filter(row => row.type === "move-animation");
    const predicted = predictLentOrders(on, true);
    expect(moves.map(row => row.spriteOrderInput ?? null))
      .toEqual(moves.map(row => predicted.get((row.command as { eventSequence: number }).eventSequence)));
    expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    expectRulesEqual(on, off);
  }, 180000);
});
