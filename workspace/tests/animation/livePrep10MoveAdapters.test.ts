import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import type { BattleResolutionDisplayedField } from "../../src/engine/battleResolutionPresentation.ts";
import type { BattleResolutionPresentationRenderView } from "../../src/engine/battleResolutionPresentationRender.ts";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
// apx219: these gate pins read the proven body (an unknown order / allocator history is drawn approximately by the production
// liveMoveAnimationPresentation; tests/apx219SpriteOrderAllocatorApproximate.test.ts).
import {
  LIVE_MOVE_ANIMATION_IDS, LIVE_MOVE_OPPONENT_SHADOW_ROW, liveMoveAnimationDuration, liveMoveAnimationPresentationProven as liveMoveAnimationPresentation,
} from "../../src/engine/liveMoveAnimation.ts";
import speciesStats from "../../src/data/gen/species-stats.json" with { type: "json" };
import { prepareLiveMoveSpriteOrder, type LiveMoveSpriteOrderInput } from "../../src/engine/liveMoveSpriteAllocator.ts";
import { knownEntrySpriteOrderState } from "../../src/engine/spriteOrderProvider.ts";
import { generatedCommandAnimationReplay } from "../../tools/integration/generatedCommandAnimationReplay.ts";
import { hpd4BodyRows, iu120Extra } from "../helpers/iu120Rows.ts";

// docs/next-adapters-prep10.md: Magnitude (222), Reversal (179), Pain Split (220), Rock Blast (350), Razor Wind (13),
// Spark (209; both attackers since spark62). The dense framebuffer proofs are tools/integration/fixtures/prep10-live/*.json
// (opponent attacker: tools/integration/fixtures/spark62-live/*.json).
const request = (moveId: number, attacker: 0 | 1, extra: Partial<BattleMoveAnimationRequest> = {}): BattleMoveAnimationRequest => ({
  moveId, attacker, target: attacker === 0 ? 1 : 0, turn: 0, power: 0, damage: 0, friendship: 70, multihit: 0, ...extra,
});
function displayed(player: string, opponent: string): BattleResolutionDisplayedField {
  const mon = (name: string) => ({
    species: speciesStats.species.find(s => s.name === `SPECIES_${name}`)!.id, speciesSymbol: name, name, level: 50,
    hp: 100, maxHP: 100, gender: "male", status: "none",
  });
  return { player: mon(player), opponent: mon(opponent) } as unknown as BattleResolutionDisplayedField;
}
const knownOrder = (): LiveMoveSpriteOrderInput =>
  prepareLiveMoveSpriteOrder(knownEntrySpriteOrderState("ordinary-factory"), request(222, 0)).input!;
function render(field: BattleResolutionDisplayedField, req: BattleMoveAnimationRequest, age: number, order?: LiveMoveSpriteOrderInput): string {
  const view = {
    field, fieldArt: createBattleCommandFieldArtView(field),
    healthboxes: {
      player: { name: field.player.name, level: 50, gender: "male", hpFraction: 1, status: "none", currentHp: 100, maxHp: 100 },
      opponent: { name: field.opponent.name, level: 50, gender: "male", hpFraction: 1, status: "none" },
    },
    message: { lines: ["X used", "A MOVE!"], visibleCharacters: 99 },
    effect: { type: "move", request: req, age, spriteOrderInput: order },
    visibility: { player: { sprite: true, healthbox: true }, opponent: { sprite: true, healthbox: true } },
    waitCursor: null, bottom: "message", confirmHandoff: null, switchIn: null, midBattleSwitchIn: null,
    switchOut: null, partySummary: null, midBattleSwitchFade: null, midBattleSwitchParticles: null, trainerSlide: null,
  } as unknown as BattleResolutionPresentationRenderView;
  const fb = new Uint8Array(240 * 160 * 4);
  renderBattleResolutionLiveView(fb, view);
  return createHash("sha256").update(fb).digest("hex");
}
const cfg = (field: BattleResolutionDisplayedField, req: BattleMoveAnimationRequest, order?: LiveMoveSpriteOrderInput, age = 0) =>
  liveMoveAnimationPresentation(req, field, age, undefined, undefined, order);
const rulesWithoutSceneMarker = (v: { rules: any }) => {
  const rc = v.rules.rulesContext;
  return { ...v.rules, rulesContext: { ...rc, hitMarker: rc.hitMarker & ~0x80 } };
};

describe("live prep10 move adapters", () => {
  it("registers the six moves with the accepted durations and shadow rows (Spark: window starts 9 rows after activation, no row)", () => {
    for (const id of [222, 179, 220, 350, 13, 209]) expect(LIVE_MOVE_ANIMATION_IDS).toContain(id);
    for (const id of [222, 179, 220, 350, 13]) expect(LIVE_MOVE_OPPONENT_SHADOW_ROW[id]).toBe(0);
    expect(LIVE_MOVE_OPPONENT_SHADOW_ROW[209]).toBeUndefined();
    for (const a of [0, 1] as const) {
      // mxp1: the window is the ROM's gAnimScriptActive length + 1, 118 + 8 * floor(power / 10) (+ 1): 175 at 70, 207 at 110, 143 at 30.
      expect(liveMoveAnimationDuration(request(222, a, { power: 70 }))).toBe(175);
      expect(liveMoveAnimationDuration(request(222, a, { power: 110 }))).toBe(207);
      expect(liveMoveAnimationDuration(request(222, a, { power: 30 }))).toBe(143);
      expect(liveMoveAnimationDuration(request(179, a, { power: 20 }))).toBe(173);
      expect(liveMoveAnimationDuration(request(220, a))).toBe(81);
      expect(liveMoveAnimationDuration(request(350, a, { turn: 2, multihit: 1 }))).toBe(89);
      expect(liveMoveAnimationDuration(request(13, a, { turn: 0 }))).toBe(45);
      expect(liveMoveAnimationDuration(request(13, a, { turn: 1 }))).toBe(72);
    }
    expect(liveMoveAnimationDuration(request(209, 0))).toBe(115);
    expect(liveMoveAnimationDuration(request(209, 1))).toBe(115); // spark62
    // A Magnitude request that never saw a damagecalc carries the static table power 1: no adapter, no invented body.
    expect(liveMoveAnimationDuration(request(222, 0, { power: 1 }))).toBeNull();
  });

  it("gates Magnitude, Rock Blast and Spark on the lent order; Reversal, Pain Split and Razor Wind are order-independent", () => {
    const order = knownOrder();
    const f = displayed("ONIX", "GROVYLE");
    for (const [req, gated] of [
      [request(222, 0, { power: 70 }), true], [request(350, 0, { multihit: 3 }), true], [request(209, 0), true],
      [request(179, 0, { power: 20 }), false], [request(220, 0), false], [request(13, 0), false], [request(13, 1, { turn: 1 }), false],
    ] as const) {
      expect(cfg(f, req, order), String(req.moveId)).not.toBeNull();
      expect(cfg(f, req, { known: false } as never) === null, String(req.moveId)).toBe(gated);
      expect(cfg(f, req) === null, String(req.moveId)).toBe(gated);
    }
  });

  it("derives the configs from the request and the production anchors (prep10 s3)", () => {
    const order = knownOrder();
    const magnitude = (power: number) =>
      (cfg(displayed("GRAVELER", "ONIX"), request(222, 0, { power }), order)!.config as any).animationInputs;
    expect(magnitude(70)).toMatchObject({ movePower: 70, attackerSide: "player", targetSide: "opponent", initialPlatformX: 0,
      battlerSpriteSlots: { player: 6, opponent: 8 } });
    expect(magnitude(110).movePower).toBe(110);
    expect(magnitude(70).spriteOrder).toHaveLength(64);
    // Reversal: amplitude = clamp(floor(power / 12), 1, 16): the ROM's ShakeTargetBasedOnMovePowerOrDmg.
    const amp = (power: number) =>
      (cfg(displayed("VIGOROTH", "DELCATTY"), request(179, 0, { power }))!.config as any).resolvedShake.amplitude;
    expect([20, 40, 80, 100, 150, 200].map(amp)).toEqual([1, 3, 6, 8, 12, 16]);
    // Pain Split: the species pic-coords yOffset per side (MISDREAVUS back 10, GENGAR front 5; DUSCLOPS back 8).
    const pain = (p: string, o: string, a: 0 | 1) => (cfg(displayed(p, o), request(220, a))!.config as any).pictureYOffsets;
    expect(pain("MISDREAVUS", "GENGAR", 0)).toEqual({ attacker: 10, target: 5 });
    expect(pain("DUSCLOPS", "GENGAR", 0)).toEqual({ attacker: 8, target: 5 });
    expect(pain("GENGAR", "MISDREAVUS", 1)).toEqual({ attacker: 12, target: 9 });
    // Rock Blast: one body per hit with the known-entry allocator constants.
    const rb = (cfg(displayed("RHYHORN", "ONIX"), request(350, 0, { turn: 1, multihit: 2 }), order)!.config as any).bodies;
    expect(rb).toHaveLength(1);
    expect(rb[0].animationProfile.allocator).toEqual({ lungeSlot: 3, rockSlot: 4, hitsplatSlot: 3, fragmentSlots: [4, 5, 7, 9], shakeTaskSlot: 0 });
    // Razor Wind: the body is selected by request.turn.
    expect((cfg(displayed("NUZLEAF", "ONIX"), request(13, 0, { turn: 0 }))!.config as any).body).toBe("setup");
    expect((cfg(displayed("NUZLEAF", "ONIX"), request(13, 0, { turn: 1 }))!.config as any).body).toBe("unleash");
  });

  const cases: { id: number; req: (a: 0 | 1) => BattleMoveAnimationRequest; alt: [string, string]; attackers: (0 | 1)[] }[] = [
    { id: 222, req: a => request(222, a, { power: 110 }), alt: ["CAMERUPT", "ONIX"], attackers: [0, 1] },
    { id: 179, req: a => request(179, a, { power: 40 }), alt: ["MEDICHAM", "DELCATTY"], attackers: [0, 1] },
    { id: 220, req: a => request(220, a), alt: ["DUSCLOPS", "GENGAR"], attackers: [0, 1] },
    { id: 350, req: a => request(350, a, { turn: 1, multihit: 2 }), alt: ["OCTILLERY", "SHUCKLE"], attackers: [0, 1] },
    { id: 13, req: a => request(13, a, { turn: 1 }), alt: ["ABSOL", "ONIX"], attackers: [0, 1] },
    { id: 209, req: a => request(209, a), alt: ["CHINCHOU", "SHUCKLE"], attackers: [0, 1] },
  ];
  it.each(cases)("renders move $id with an alternate carrier in the evidenced orientations", c => {
    for (const a of c.attackers) {
      const field = a === 0 ? displayed(c.alt[0], c.alt[1]) : displayed(c.alt[1], c.alt[0]);
      const req = c.req(a), order = knownOrder(), duration = liveMoveAnimationDuration(req)!;
      expect(cfg(field, req, order), `${c.id} ${a}`).not.toBeNull();
      expect(new Set([0, Math.floor(duration / 4), Math.floor(duration / 2), duration - 1].map(age => render(field, req, age, order))).size)
        .toBeGreaterThan(1);
    }
  }, 240000);

  // route = ordinary-input replay (seed / move slot pressed per turn / streak, tools/integration/prep10Routes.ts seeds).
  const routes: { move: string; id: number; seed: number; moves: (0 | 1 | 2 | 3)[]; streak: number; bodies: number[]; power?: number }[] = [
    { move: "MAGNITUDE", id: 222, seed: 182, moves: [0], streak: 0, bodies: [191], power: 70 },
    { move: "REVERSAL", id: 179, seed: 3, moves: [1], streak: 28, bodies: [173], power: 20 },
    { move: "REVERSAL (second body, 40)", id: 179, seed: 367, moves: [1], streak: 14, bodies: [173], power: 40 },
    { move: "PAIN_SPLIT", id: 220, seed: 178, moves: [0], streak: 21, bodies: [81] },
    { move: "ROCK_BLAST", id: 350, seed: 68, moves: [0], streak: 0, bodies: [89, 89, 89] },
    { move: "RAZOR_WIND", id: 13, seed: 131, moves: [2], streak: 0, bodies: [45, 72] },
    { move: "SPARK", id: 209, seed: 17, moves: [0], streak: 0, bodies: [115] },
  ];
  it.each(routes)("completes ordinary $move and preserves ON/OFF rules and RNG", r => {
    const on = generatedCommandAnimationReplay(r.seed, "on", r.moves, r.streak);
    const off = generatedCommandAnimationReplay(r.seed, "off", r.moves, r.streak);
    const bodies = on.animations.filter(a => a.moveId === r.id && a.attacker === 0);
    // mxp1: Magnitude's 191 rows are its 175-row window + lead 10 + shape-A tail 6 (ROM lab mxp1-mag-p9, exact). lse4: Razor Wind's charge turn presents lead 1 + tail 4 (gap-print class), its unleash lead 5 + tail 4; the helper default is the unleash.
    expect(bodies.map(b => b.ages.length)).toEqual(r.bodies.map((n, i) => r.id === 222 ? n : n + iu120Extra(r.id) + (r.id === 13 && i === 0 ? 5 : hpd4BodyRows(r.id))));
    for (const body of bodies) {
      expect(body.ages).toEqual(Array.from({ length: body.ages.length }, (_, age) => age));
      expect(body.adapterActive.every(Boolean)).toBe(true);
    }
    const requests = on.commands.filter(row => row.type === "move-animation")
      .map(row => (row.command as { animation: BattleMoveAnimationRequest }).animation)
      .filter(a => a.moveId === r.id && a.attacker === 0);
    // The request carries gBattleMovePower: never the static table power 1 for Magnitude / Reversal.
    if (r.power !== undefined) expect(requests[0]!.power).toBe(r.power);
    if (r.id === 350) expect(requests.map(q => [q.turn, q.multihit])).toEqual([[0, 3], [1, 2], [2, 1]]);
    if (r.id === 13) expect(requests.map(q => q.turn)).toEqual([0, 1]);
    expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    expect(on.stalled).toBe(off.stalled);
    expect(on.boundaries.length).toBeGreaterThan(0);
    expect(off.boundaries).toHaveLength(on.boundaries.length);
    for (let i = 0; i < on.boundaries.length; i += 1) {
      expect(rulesWithoutSceneMarker(on.boundaries[i]!)).toEqual(rulesWithoutSceneMarker(off.boundaries[i]!));
      expect(on.boundaries[i]!.rng).toEqual(off.boundaries[i]!.rng);
    }
  }, 240000);
});
