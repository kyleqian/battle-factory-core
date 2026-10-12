import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { BattleMoveAnimationRequest } from "../src/engine/battleMoveAnimation.ts";
import type { BattleResolutionDisplayedField } from "../src/engine/battleResolutionPresentation.ts";
import { createBattleCommandFieldArtView } from "../src/engine/battleCommandFieldArt.ts";
import { createBattleResolutionPresentationRenderView } from "../src/engine/battleResolutionPresentationRender.ts";
import {
  LIVE_SUBSTITUTE_DOLL_DEFENDER_CELLS, liveBattlerAnchors, liveMoveAnimationDuration, liveMoveAnimationPresentation,
  liveMoveSubstituteDollDeclines,
} from "../src/engine/liveMoveAnimation.ts";
import { applySpriteOrderPresentationEvent, createSpriteOrderTracker, spriteOrderTrackerLend } from "../src/engine/spriteOrderEventTransform.ts";
import { knownEntrySpriteOrderState } from "../src/engine/spriteOrderProvider.ts";
import { dolldefRowSha, dolldefView, type DolldefFixture } from "../tools/integration/dolldefLiveCheck.ts";
import { generatedCommandAnimationReplay } from "../tools/integration/generatedCommandAnimationReplay.ts";
import { iu120Extra } from "./helpers/iu120Rows.ts";

// S10A Substitute, DEFENDER shown as the doll (docs/next-adapters-prep38.md; tools/integration/fixtures/dolldef-live-receipt.json):
// proven (move, attacker side) cells run live on the doll; every other defender-doll body declines.
const mon = (species: number, battler: 0 | 1, doll = false) => ({
  species, name: "MON", side: battler === 0 ? "player" as const : "trainer" as const, battler, partyIndex: 0 as const, level: 50,
  hp: 100, maxHP: 100, gender: "male" as const, status: "none" as const, moveIds: [0, 0, 0, 0] as const,
  currentPP: [0, 0, 0, 0] as const, ppBonuses: 0, ...(doll ? { substituteDoll: true as const } : {}),
});
// PERSIAN (53) player, SLOWBRO (80) opponent (the prep38 pair); GOLBAT (42) is elevated, ONIX (95) rests at x2 = +1.
const field = (playerDoll: boolean, opponentDoll: boolean, opponent = 80): BattleResolutionDisplayedField =>
  ({ player: mon(53, 0, playerDoll), opponent: mon(opponent, 1, opponentDoll) }) as unknown as BattleResolutionDisplayedField;
const req = (moveId: number, attacker: 0 | 1): BattleMoveAnimationRequest =>
  ({ moveId, attacker, target: attacker === 0 ? 1 : 0, turn: 0, power: 0, damage: 0, friendship: 70, multihit: 0 }) as BattleMoveAnimationRequest;
const defenderDoll = (attacker: 0 | 1) => (attacker === 0 ? field(false, true) : field(true, false));
const FIXTURES = "tools/integration/fixtures/dolldef-live";
const fixture = (stem: string) => JSON.parse(readFileSync(`${FIXTURES}/${stem}.json`, "utf8")) as DolldefFixture;

describe("defender shown as the Substitute doll: proven cells live, everything else declines", () => {
  it("the proven-cell allowlist is exactly the prep38 v1 batch (27 cells + doll81/land82 Leaf Blade, ThunderPunch + doll90 Psych Up)", () => {
    const cells = [...LIVE_SUBSTITUTE_DOLL_DEFENDER_CELLS].flatMap(([id, sides]) => sides.map((s) => `${id}:${s}`)).sort();
    expect(cells).toEqual([
      "157:opponent", "188:opponent", "188:player", "213:opponent", "213:player", "242:opponent", "242:player", "247:player",
      "25:opponent", "25:player", "280:opponent", "280:player", "332:player", "34:opponent", "34:player", "38:opponent",
      "44:opponent", "44:player", "53:opponent", "53:player", "57:opponent", "57:player", "89:opponent", "89:player",
      "94:opponent", "94:player", "98:opponent",
      // Order-dependent cells, exact with the Substitute body's order-neutral lend (Giga Drain, Mud-Slap D3).
      "189:opponent", "189:player", "202:opponent", "202:player",
      // Renderer-local art lookups routed to the doll (Ice Beam, Thunderbolt; Megahorn D4 + the doll palette bank).
      "58:opponent", "58:player", "85:opponent", "85:player", "224:opponent", "224:player",
      // land82 (doll81): Leaf Blade, ThunderPunch, both sides.
      "348:opponent", "348:player", "9:opponent", "9:player",
      // doll90: Psych Up, both sides (the doll sheet + the doll palette bank).
      "244:opponent", "244:player",
      // stf115 / sdl119: Struggle, both sides (the doll-aware art lookup + the doll palette bank).
      "165:opponent", "165:player",
    ].sort());
  });
  it("a proven cell keeps its doll-free duration; unproven orientations / moves and both-doll bodies decline", () => {
    for (const [moveId, sides] of LIVE_SUBSTITUTE_DOLL_DEFENDER_CELLS) for (const side of sides) {
      const attacker = side === "player" ? 0 : 1;
      expect(liveMoveSubstituteDollDeclines(req(moveId, attacker), defenderDoll(attacker))).toBe(false);
      expect(liveMoveAnimationDuration(req(moveId, attacker), defenderDoll(attacker)))
        .toBe(liveMoveAnimationDuration(req(moveId, attacker), field(false, false)));
      expect(liveMoveAnimationDuration(req(moveId, attacker), field(true, true))).toBeNull();
    }
    // Unproven orientations (residuals: Aerial Ace / Shadow Ball opponent = the doll-free control's, Quick Attack / Double-Edge player
    // unresolved) and unmeasured moves (Headbutt, Leech Seed) decline.
    for (const [moveId, attacker] of [[332, 1], [247, 1], [98, 0], [38, 0], [29, 0], [29, 1], [73, 0], [73, 1]] as const) {
      expect(liveMoveAnimationDuration(req(moveId, attacker), field(false, false))).not.toBeNull();
      expect(liveMoveSubstituteDollDeclines(req(moveId, attacker), defenderDoll(attacker))).toBe(true);
      expect(liveMoveAnimationDuration(req(moveId, attacker), defenderDoll(attacker))).toBeNull();
      expect(liveMoveAnimationPresentation(req(moveId, attacker), defenderDoll(attacker), 0)).toBeNull();
    }
  });
  it("doll anchors: hit / effect anchors on the species corner (elevation included), the OBJ at the doll corner, idle rest 0", () => {
    const golbat = createBattleCommandFieldArtView(field(false, true, 42)), plainGolbat = createBattleCommandFieldArtView(field(false, false, 42));
    const doll = liveBattlerAnchors("opponent", golbat), mon = liveBattlerAnchors("opponent", plainGolbat);
    expect(doll.picOffsetPoint).toEqual(mon.picOffsetPoint);
    expect(doll.spriteCenter).toEqual({ x: 176, y: 56 });
    expect(mon.spriteCenter).not.toEqual(doll.spriteCenter);
    const onix = liveBattlerAnchors("opponent", createBattleCommandFieldArtView(field(false, false, 95)));
    expect(onix.frontIdleRest).not.toEqual({ x2: 0, y2: 0 });
    expect(liveBattlerAnchors("opponent", createBattleCommandFieldArtView(field(false, true, 95))).frontIdleRest).toEqual({ x2: 0, y2: 0 });
    const player = liveBattlerAnchors("player", createBattleCommandFieldArtView(field(true, false)));
    expect(player.picOffsetPoint).toEqual(liveBattlerAnchors("player", createBattleCommandFieldArtView(field(false, false))).picOffsetPoint);
    expect(player.spriteCenter).toEqual({ x: 72, y: 97 });
    // The presentation battler: the doll OBJ corner, the species animation center, rest 0.
    const state = liveMoveAnimationPresentation(req(89, 0), field(false, true, 95), 0)!;
    const target = (state.config as unknown as { target: { geometry: { spriteCorner: unknown; animationCenter: unknown }; liveIdleRest?: unknown } }).target;
    expect(target.geometry.spriteCorner).toEqual({ x: 144, y: 24 });
    expect(target.geometry.animationCenter).toEqual(liveBattlerAnchors("opponent", createBattleCommandFieldArtView(field(false, false, 95))).picOffsetPoint);
    expect(target.liveIdleRest).toEqual({ x2: 0, y2: 0 });
  });
});

describe("the Substitute body is order-neutral in the sprite-order tracker", () => {
  it("Move_SUBSTITUTE (no createsprite) applies its empty EXACT plan: the lend after it equals the lend before; Transform still refuses", () => {
    const known = createSpriteOrderTracker(knownEntrySpriteOrderState("ordinary-factory"));
    for (const side of ["player", "opponent"] as const) {
      const after = applySpriteOrderPresentationEvent(known, { kind: "move-animation", moveId: 164, attackerSide: side });
      expect(after.cursor.order.known).toBe(true);
      expect(spriteOrderTrackerLend(after)).toEqual(spriteOrderTrackerLend(known));
      expect(applySpriteOrderPresentationEvent(known, { kind: "move-animation", moveId: 144, attackerSide: side }).cursor.order.known).toBe(false);
    }
  });
  it("a defender-first Giga Drain / Mud-Slap after [Substitute] gets the production order lend (no withheld order input)", () => {
    for (const stem of ["prep38-df-giga-drain-player", "prep38-df-giga-drain-opponent", "prep38-df-mud-slap-player", "prep38-df-mud-slap-opponent"]) {
      const f = fixture(stem);
      expect(f.precedingBodies).toEqual([{ moveId: 164, side: f.target.geometry.side }]);
      const v = dolldefView(f, 0);
      expect((v.effect as { spriteOrderInput?: unknown }).spriteOrderInput, stem).toBeDefined();
    }
  });
});


describe("dense direct-mGBA windows through the production live renderer (committed ROM RGB sha256 per row)", () => {
  it("every committed fixture is a defender-doll TEST body of a proven cell", () => {
    const stems = readdirSync(FIXTURES).filter((n) => n.endsWith(".json"));
    expect(stems.length).toBeGreaterThanOrEqual(53);
    for (const n of stems) {
      const f = fixture(n.replace(/\.json$/, ""));
      expect(f.defenderDoll).toBe(true);
      expect(LIVE_SUBSTITUTE_DOLL_DEFENDER_CELLS.get(f.moveId)).toContain(f.attacker.geometry.side);
    }
  });
  // Documented residuals that are not the doll's (docs/next-adapters-prep38.md s1), by live age: the PERSIAN player Shadow Ball's
  // doll-free control residual (ages 64..94, the adapter's PERSIAN pair) + the 156-row tail phase (132..147; the accepted pair is
  // SABLEYE -> MAGNETON, exact); the elevated HAUNTER attacker's shadow on the pre-activation row; the Quick Attack PERSIAN pair's
  // 1 px, equal to its doll-free control.
  const RESIDUAL: Readonly<Record<string, readonly number[]>> = {
    "prep38-shadow-ball-player": [64, 66, 68, ...Array.from({ length: 25 }, (_, i) => 70 + i), ...Array.from({ length: 16 }, (_, i) => 132 + i)],
    "prep38-df-psychic-haunter-kadabra-opponent": [-5],
    "prep38-quick-attack-opponent": [9],
  };
  it.each(readdirSync(FIXTURES).filter((n) => n.endsWith(".json")).map((n) => n.replace(/\.json$/, "")))(
    "%s: every row of the window equals the ROM frame (documented non-doll residuals only)", (stem) => {
      const f = fixture(stem);
      const mismatched = f.rows.filter(([age, , sha]) => dolldefRowSha(f, age) !== sha).map(([age]) => age);
      expect(mismatched).toEqual(RESIDUAL[stem] ?? []);
    }, 120000);
});

const rulesWithoutSceneMarker = (v: { rules: any }) => {
  const rc = v.rules.rulesContext;
  return { ...v.rules, rulesContext: { ...rc, hitMarker: rc.hitMarker & ~0x80 } };
};

describe("ordinary route: a live move hits the subbed defender", () => {
  it("MEGANIUM 103/28 [Substitute, Substitute]: the opponent's Earthquake live on the player's doll every age, next prompt with the doll, Scene ON/OFF parity", () => {
    const seen = { ages: 0, live: 0, duration: null as number | null };
    const on = generatedCommandAnimationReplay(103, "on", [1, 1], 28, true, true, (state) => {
      const r = state.battleResolutionPresentation;
      if (r?.lifecycle.phase !== "presenting") return;
      const command = r.segments[r.segmentIndex]!.commands[r.commandIndex];
      if (command?.type !== "move-animation" || command.animation?.moveId !== 89) return;
      const view = createBattleResolutionPresentationRenderView(r);
      expect(view.field.player.substituteDoll).toBe(true);
      seen.duration = liveMoveAnimationDuration(command.animation, view.field);
      const e = view.effect?.type === "move" ? view.effect : null;
      if (e && liveMoveAnimationPresentation(e.request, view.field, e.age, e.paletteInput, e.spriteAllocatorInput, e.spriteOrderInput,
        e.presentationRng, e.battlerX2Input) !== null) seen.live += 1;
      seen.ages += 1;
    });
    const off = generatedCommandAnimationReplay(103, "off", [1, 1], 28, true, true);
    expect(on.requests.map((q) => `${q.moveId}:${q.attacker}->${q.target}`)).toEqual(["164:0->0", "248:1->0", "89:1->0"]);
    expect(seen.duration).toBe(198);
    // iu120: + the opponent Earthquake's P pre rows (age 0, live); the body duration is unchanged.
    expect(seen.ages).toBe(198 + iu120Extra(89, "opponent"));
    expect(seen.live).toBe(198 + iu120Extra(89, "opponent"));
    expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    expect(on.state.battleCommandPresentation?.field.player.substituteDoll).toBe(true);
    expect(off.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    expect(on.stalled).toBe(off.stalled);
    expect(off.boundaries).toHaveLength(on.boundaries.length);
    for (let i = 0; i < on.boundaries.length; i += 1) {
      expect(rulesWithoutSceneMarker(on.boundaries[i]!)).toEqual(rulesWithoutSceneMarker(off.boundaries[i]!));
      expect(on.boundaries[i]!.rng).toEqual(off.boundaries[i]!.rng);
      expect(on.boundaries[i]!.boundary).toEqual(off.boundaries[i]!.boundary);
    }
    expect(on.state.facilityState).toEqual(off.state.facilityState);
    expect(on.state.round.rules.rngValue).toBe(off.state.round.rules.rngValue);
  }, 240000);
});
