import { describe, expect, it } from "vitest";
import type { BattleMoveAnimationRequest } from "../src/engine/battleMoveAnimation.ts";
import type { BattleResolutionDisplayedField } from "../src/engine/battleResolutionPresentation.ts";
import { createBattleResolutionPresentationRenderView } from "../src/engine/battleResolutionPresentationRender.ts";
import { liveMoveAnimationDuration, liveMoveSubstituteDollUnproven } from "../src/engine/liveMoveAnimation.ts";
import {
  LIVE_SUBSTITUTE_SWAP_BODY_CELLS, LIVE_SUBSTITUTE_SWAP_BODY_FRAMING, LIVE_SUBSTITUTE_SWAP_BODY_IDS, liveSubstituteSwapView,
  substituteSwapTailFieldArt, substituteSwapTailX2,
} from "../src/engine/liveSubstituteSwap.ts";
import { createBattleCommandFieldArtView } from "../src/engine/battleCommandFieldArt.ts";
import { generatedCommandAnimationReplay } from "../tools/integration/generatedCommandAnimationReplay.ts";

// S10A attacker-doll widening (docs/next-adapters-prep40.md s1; tools/integration/fixtures/attdoll-live-receipt.json): the subbed
// ATTACKER's body is presented with SUBSTITUTE_TO_MON / MON_TO_SUBSTITUTE only for the proven (move, attacker side) cells.
const mon = (species: number, battler: 0 | 1, doll = false) => ({
  species, name: "MON", side: battler === 0 ? "player" as const : "trainer" as const, battler, partyIndex: 0 as const, level: 50,
  hp: 100, maxHP: 100, gender: "male" as const, status: "none" as const, moveIds: [0, 0, 0, 0] as const,
  currentPP: [0, 0, 0, 0] as const, ppBonuses: 0, ...(doll ? { substituteDoll: true as const } : {}),
});
// PERSIAN (53) <-> SLOWBRO (80), the prep40 pair.
const field = (playerDoll: boolean, opponentDoll: boolean): BattleResolutionDisplayedField =>
  ({ player: mon(53, 0, playerDoll), opponent: mon(80, 1, opponentDoll) }) as unknown as BattleResolutionDisplayedField;
const req = (moveId: number, attacker: 0 | 1, extra: Partial<BattleMoveAnimationRequest> = {}): BattleMoveAnimationRequest =>
  ({ moveId, attacker, target: attacker === 0 ? 1 : 0, turn: 0, power: 0, damage: 0, friendship: 70, multihit: 0, ...extra }) as BattleMoveAnimationRequest;
const SWAPS = { player: 85, opponent: 81 } as const;
// apx215 (liveMovePlayback.ts approximate "substitute-doll"): the duration the PROVEN doll cells give (null outside them, the old static
// hold); outside them the body is drawn approximately (liveSubstituteSwapApplies / liveMoveSubstituteDollDeclines).
const provenDuration = (r: BattleMoveAnimationRequest, f: BattleResolutionDisplayedField) =>
  liveMoveSubstituteDollUnproven(r, f) ? null : liveMoveAnimationDuration(r, f);

describe("attacker-doll swap cells (prep40)", () => {
  it("rung a: the one-batch bodies are presented with the swaps at their own adapter length, per proven side", () => {
    const oneBatch: [number, ("player" | "opponent")[]][] = [
      [8, ["player", "opponent"]], [25, ["player", "opponent"]], [38, ["player", "opponent"]], [56, ["player", "opponent"]],
      [57, ["player", "opponent"]], [86, ["player", "opponent"]], [109, ["player", "opponent"]], [157, ["opponent"]],
      [213, ["player", "opponent"]], [242, ["player", "opponent"]], [263, ["player", "opponent"]], [280, ["player", "opponent"]],
      [317, ["player", "opponent"]], [332, ["player"]],
    ];
    for (const [moveId, sides] of oneBatch) {
      expect(LIVE_SUBSTITUTE_SWAP_BODY_IDS.has(moveId)).toBe(true);
      expect([...LIVE_SUBSTITUTE_SWAP_BODY_CELLS.get(moveId)!]).toEqual(sides);
      for (const side of ["player", "opponent"] as const) {
        const attacker = side === "player" ? 0 : 1;
        const plain = liveMoveAnimationDuration(req(moveId, attacker), field(false, false));
        const subbed = provenDuration(req(moveId, attacker), field(side === "player", side === "opponent"));
        if (sides.includes(side)) expect(subbed).toBe(plain! + SWAPS[side]);
        else expect(subbed).toBeNull();
      }
    }
    // Aerial Ace opponent: the doll-free control's own 1 px is not an accepted scope, so the subbed opponent still declines.
    expect(liveMoveAnimationDuration(req(332, 1), field(false, false))).toBe(50);
    expect(provenDuration(req(332, 1), field(false, true))).toBeNull();
    // Rock Slide: the plain player attacker is live (S10A sides, 138 rows); a subbed player attacker is not a proven swap cell.
    expect(liveMoveAnimationDuration(req(157, 0), field(false, false))).toBe(138);
    expect(provenDuration(req(157, 0), field(true, false))).toBeNull();
    // Multi-hit, both dolls and unproven bodies keep declining.
    expect(provenDuration(req(57, 0, { multihit: 2 }), field(true, false))).toBeNull();
    expect(provenDuration(req(57, 0), field(true, true))).toBeNull();
    expect(provenDuration(req(98, 0), field(true, false))).toBeNull(); // Quick Attack: pair residual
    // apx215: outside the proven cells the swaps run around the doll-free body (approximate); a multi-hit earlier hit still declines.
    expect(liveMoveAnimationDuration(req(98, 0), field(true, false))).toBe(liveMoveAnimationDuration(req(98, 0), field(false, false))! + 85);
    expect(liveMoveAnimationDuration(req(57, 0, { multihit: 2 }), field(true, false))).toBeNull();
  });
  it("rung b: framed bodies end at the ROM body's first inactive row and show adapter age row + shift", () => {
    // [move, adapter duration, ROM rows (activation .. first inactive), shift, sides]; prep40 s1: every window 0 px framed this way.
    const framed: [number, number, number, number, ("player" | "opponent")[]][] = [
      [89, 208, 208, 0, ["player", "opponent"]], [94, 140, 145, -5, ["player"]], [188, 165, 169, -4, ["player", "opponent"]],
      [53, 192, 210, -15, ["player", "opponent"]], [92, 219, 231, -7, ["player", "opponent"]], [44, 31, 41, -10, ["player", "opponent"]],
      [7, 101, 102, 0, ["player", "opponent"]], [153, 212, 217, -4, ["player", "opponent"]],
      // land82 (doll81)
      [142, 152, 153, 0, ["player", "opponent"]], [320, 225, 221, 0, ["player", "opponent"]], // ctl95: opponent widened
      // doll90: Double Team (self-target), the doll-free controls' calibrated shift -1
      [104, 239, 159, -1, ["player", "opponent"]], // tmr136: adapter 230 + 9 tail rows; the framed ROM body is unchanged
      // ctl95: Recover (self-target), the accepted window's age 0 = the first orb (activation + 10)
      [105, 169, 184, -10, ["player", "opponent"]],
    ];
    // Sing (47): geometry-derived rows since doll90 (liveSingBodyRows; tests/doll90DollCells.test.ts), its table entry is the fallback.
    expect([...LIVE_SUBSTITUTE_SWAP_BODY_FRAMING.keys()].filter((id) => id !== 47).sort((a, b) => a - b)).toEqual(framed.map((f) => f[0]).sort((a, b) => a - b));
    for (const [moveId, adapter, rows, shift, sides] of framed) {
      expect(LIVE_SUBSTITUTE_SWAP_BODY_FRAMING.get(moveId)).toEqual({ rows, shift });
      expect([...LIVE_SUBSTITUTE_SWAP_BODY_CELLS.get(moveId)!]).toEqual(sides);
      for (const side of ["player", "opponent"] as const) {
        const attacker = side === "player" ? 0 : 1;
        // land82: the adapter figure is the framed side's (Sing opponent's doll-free body is 248; GrassWhistle's differs too).
        if (sides.includes(side)) expect(liveMoveAnimationDuration(req(moveId, attacker), field(false, false))).toBe(adapter);
        const subbed = field(side === "player", side === "opponent");
        // prep40 window rows: swap-in 42 / 40 + idle + ROM body + swap-back + first inactive.
        expect(provenDuration(req(moveId, attacker), subbed)).toBe(sides.includes(side) ? rows + SWAPS[side] : null);
        if (!sides.includes(side)) continue;
        const view = (age: number) => liveSubstituteSwapView({ healthboxes: {}, message: null, visibility: {}, waitCursor: null,
          field: subbed, effect: { type: "move", request: req(moveId, attacker), age } } as never);
        const bodyStart = side === "player" ? 43 : 41;
        // body age 0 still shows the swap-in tail; body row r >= 1 (through the first inactive row, rows - 1) is adapter age
        // r + shift; then the swap-back rows (the settled mon first: the 2-row display latch), the composite's last row the doll.
        expect(view(bodyStart)!.kind).toBe("swap");
        expect(view(bodyStart + 1)!.view.effect).toMatchObject({ age: 1 + shift });
        expect(view(bodyStart + rows - 1)!.view.effect).toMatchObject({ age: rows - 1 + shift });
        expect(view(bodyStart + rows)!.kind).toBe("swap");
        expect(view(bodyStart + rows)!.view.fieldArt[side].substituteDoll).toBeUndefined();
        expect(view(rows + SWAPS[side] - 1)!.view.fieldArt[side].substituteDoll).toBe(true);
      }
    }
    // Shadow Ball (ROM body 154 / 155 rows between windows) and Swagger / Faint Attack / Psychic opponent (pair residuals) decline.
    for (const moveId of [247, 207, 185]) expect(LIVE_SUBSTITUTE_SWAP_BODY_IDS.has(moveId)).toBe(false);
    expect(provenDuration(req(94, 1), field(false, true))).toBeNull();
  });
  it("rung d: order-dependent bodies (the Substitute body is order-neutral) are presented at their own adapter length", () => {
    for (const [moveId, adapter] of [[58, 203], [85, 237], [202, 230], [315, 230], [69, 228], [224, 177]] as const) {
      expect([...LIVE_SUBSTITUTE_SWAP_BODY_CELLS.get(moveId)!]).toEqual(["player", "opponent"]);
      expect(LIVE_SUBSTITUTE_SWAP_BODY_FRAMING.has(moveId)).toBe(false);
      expect(liveMoveAnimationDuration(req(moveId, 0, { damage: 50 }), field(true, false))).toBe(adapter + 85);
      expect(liveMoveAnimationDuration(req(moveId, 1, { damage: 50 }), field(false, true))).toBe(adapter + 81);
    }
    // Mud-Slap needs the first-body order lend (not production's): declined.
    expect(liveMoveAnimationDuration(req(189, 0), field(false, false))).toBe(51);
    expect(provenDuration(req(189, 0), field(true, false))).toBeNull();
  });
  it("rung c: the tail row latches the doll at the swap-back's last moving x2 (-5 / +5), not a longer composite", () => {
    expect(substituteSwapTailX2("player")).toBe(-5);
    expect(substituteSwapTailX2("opponent")).toBe(5);
    const art = createBattleCommandFieldArtView(field(true, false));
    expect(substituteSwapTailFieldArt(art, "player").player.origin).toEqual({ x: art.player.origin.x - 5, y: art.player.origin.y });
    expect(substituteSwapTailFieldArt(art, "player").opponent).toBe(art.opponent);
    // The composite length is unchanged (swap-in + idle + body + swap-back + its first inactive row).
    expect(liveMoveAnimationDuration(req(57, 0), field(true, false))).toBe(144 + 85);
  });
});

const rulesWithoutSceneMarker = (v: { rules: any }) => {
  const rc = v.rules.rulesContext;
  return { ...v.rules, rulesContext: { ...rc, hitMarker: rc.hitMarker & ~0x80 } };
};

// sub260 (ISSUES #201): Cmd_datahpupdate now clears HITMARKER_IGNORE_SUBSTITUTE, so the old seed 243 route (whose turn-2 Thunderbolt
// bypassed the doll) breaks the Substitute before Toxic. Seed 862 keeps the doll up at Toxic (tools/integration/substituteToxicRouteScan.ts).
describe("ordinary route: a subbed attacker's framed Toxic with the swaps", () => {
  it("SHUCKLE 862/35 [Substitute, Attract, Toxic, Double Team]: framed composite, tail-row latch, next prompt, Scene ON/OFF parity", () => {
    const seen = { ages: 0, duration: null as number | null, kinds: new Set<string>(), bodyAges: [] as number[], tail: [] as number[] };
    let after: { side: "player"; settledX: number } | null = null;
    const on = generatedCommandAnimationReplay(862, "on", [0, 2], 35, true, true, (state) => {
      const r = state.battleResolutionPresentation;
      if (r?.lifecycle.phase !== "presenting") return;
      const command = r.segments[r.segmentIndex]!.commands[r.commandIndex];
      const view = createBattleResolutionPresentationRenderView(r);
      if (command?.type === "move-animation" && command.animation?.moveId === 92) {
        expect(view.field.player.substituteDoll).toBe(true);
        seen.duration = liveMoveAnimationDuration(command.animation, view.field);
        const swap = liveSubstituteSwapView(view)!;
        seen.kinds.add(swap.kind);
        if (swap.kind === "body") seen.bodyAges.push((swap.view.effect as { age: number }).age);
        seen.ages += 1;
        after = { side: "player", settledX: createBattleCommandFieldArtView(view.field).player.origin.x };
        return;
      }
      if (after !== null && seen.tail.length < 2) {
        // The next command's first two rows: the doll at x2 -5 (tail latch), then settled.
        expect(view.field.player.substituteDoll).toBe(true);
        seen.tail.push(view.fieldArt.player.origin.x - after.settledX);
      }
    });
    const off = generatedCommandAnimationReplay(862, "off", [0, 2], 35, true, true);
    // Toxic's ROM body (activation .. first inactive) 231 rows + the player swaps 85 = 316 (the adapter alone is 219 rows).
    expect(seen.duration).toBe(316);
    expect(seen.ages).toBe(316);
    expect([...seen.kinds].sort()).toEqual(["body", "swap"]);
    // Body rows 1..230 show adapter ages -6..223 (shift -7).
    expect(seen.bodyAges[0]).toBe(-6);
    expect(seen.bodyAges.at(-1)).toBe(223);
    expect(seen.tail).toEqual([-5, 0]);
    expect(on.requests.map((q) => `${q.moveId}:${q.attacker}->${q.target}`)).toContain("92:0->1");
    expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
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
