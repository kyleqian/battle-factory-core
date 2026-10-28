import { describe, expect, it } from "vitest";
import type { BattleMoveAnimationRequest } from "../src/engine/battleMoveAnimation.ts";
import type { BattleResolutionDisplayedField } from "../src/engine/battleResolutionPresentation.ts";
import {
  LIVE_SUBSTITUTE_DOLL_DEFENDER_CELLS, liveMoveAnimationDuration, liveMoveSubstituteDollDeclines, liveMoveSubstituteDollUnproven,
} from "../src/engine/liveMoveAnimation.ts";
import {
  LIVE_SUBSTITUTE_SWAP_BODY_CELLS, LIVE_SUBSTITUTE_SWAP_BODY_FRAMING, LIVE_SUBSTITUTE_SWAP_SELF_TARGET_IDS, liveSubstituteSwapApplies,
  liveSubstituteSwapProven,
} from "../src/engine/liveSubstituteSwap.ts";

// land82 (docs/land82-doll-cells.md): the 13 doll81 (move, side) cells. Evidence: tools/integration/fixtures/doll81/,
// tools/integration/fixtures/land82/ (0 px through the production renderer, r1 == r2).
const mon = (species: number, battler: 0 | 1, doll = false) => ({
  species, name: "MON", side: battler === 0 ? "player" as const : "trainer" as const, battler, partyIndex: 0 as const, level: 50,
  hp: 100, maxHP: 100, gender: "male" as const, status: "none" as const, moveIds: [0, 0, 0, 0] as const,
  currentPP: [0, 0, 0, 0] as const, ppBonuses: 0, ...(doll ? { substituteDoll: true as const } : {}),
});
const field = (playerDoll: boolean, opponentDoll: boolean): BattleResolutionDisplayedField =>
  ({ player: mon(53, 0, playerDoll), opponent: mon(80, 1, opponentDoll) }) as unknown as BattleResolutionDisplayedField;
const req = (moveId: number, attacker: 0 | 1, extra: Partial<BattleMoveAnimationRequest> = {}): BattleMoveAnimationRequest =>
  ({ moveId, attacker, target: attacker === 0 ? 1 : 0, turn: 0, power: 0, damage: 0, friendship: 70, multihit: 0, ...extra }) as BattleMoveAnimationRequest;
const attackerDoll = (attacker: 0 | 1) => (attacker === 0 ? field(true, false) : field(false, true));
const defenderDoll = (attacker: 0 | 1) => (attacker === 0 ? field(false, true) : field(true, false));
const BOTH = ["player", "opponent"];

describe("land82: doll81 Substitute-doll cells", () => {
  it("attacker-doll swap cells: sides per move", () => {
    // doll90 widened Sing 47 to both sides (tests/doll90DollCells.test.ts); ctl95 widened GrassWhistle 320 (tests/ctl95DollFreeControls.test.ts).
    const cells: [number, string[]][] = [[138, ["opponent"]], [320, BOTH], [76, BOTH], [142, BOTH], [47, BOTH], [241, BOTH]];
    for (const [id, sides] of cells) expect([...LIVE_SUBSTITUTE_SWAP_BODY_CELLS.get(id)!]).toEqual(sides);
    for (const [id, sides] of cells) for (const side of ["player", "opponent"] as const) {
      const a = side === "player" ? 0 : 1;
      // apx215: the proven rule is liveSubstituteSwapProven; the unproven side is presented approximately with the swaps.
      expect(liveSubstituteSwapProven(req(id, a, id === 241 ? { target: a } : {}), attackerDoll(a))).toBe(sides.includes(side));
      if (!sides.includes(side) && id !== 241) expect(liveMoveSubstituteDollUnproven(req(id, a), attackerDoll(a))).toBe(true);
    }
  });
  it("framings: GrassWhistle 221/0, Lovely Kiss 153/0, Sing 246/0", () => {
    expect(LIVE_SUBSTITUTE_SWAP_BODY_FRAMING.get(320)).toEqual({ rows: 221, shift: 0 });
    expect(LIVE_SUBSTITUTE_SWAP_BODY_FRAMING.get(142)).toEqual({ rows: 153, shift: 0 });
    expect(LIVE_SUBSTITUTE_SWAP_BODY_FRAMING.get(47)).toEqual({ rows: 246, shift: 0 });
  });
  it("self-target id set is {241} + doll90's Double Team 104 + ctl95's Recover 105: Sunny Day swaps", () => {
    // doll90 (docs/doll90-doll-cells.md) added Double Team 104 (pinned in tests/doll90DollCells.test.ts); ctl95 added Recover 105
    // (docs/ctl95-doll-free-controls.md, pinned in tests/ctl95DollFreeControls.test.ts).
    expect([...LIVE_SUBSTITUTE_SWAP_SELF_TARGET_IDS]).toEqual([241, 104, 105]);
    for (const a of [0, 1] as const) {
      expect(liveSubstituteSwapApplies(req(241, a, { target: a }), attackerDoll(a))).toBe(true);
      expect(liveMoveSubstituteDollDeclines(req(241, a, { target: a }), attackerDoll(a))).toBe(false);
      for (const id of [105]) {
        expect(liveSubstituteSwapApplies(req(id, a, { target: a }), attackerDoll(a))).toBe(true);
        expect(liveMoveSubstituteDollDeclines(req(id, a, { target: a }), attackerDoll(a))).toBe(false);
      }
    }
  });
  it("SolarBeam turn gate: the charge turn (t0) swaps, the fire turn (t1) is unproven (apx215: approximate swaps)", () => {
    for (const a of [0, 1] as const) {
      expect(liveSubstituteSwapApplies(req(76, a, { turn: 0 }), attackerDoll(a))).toBe(true);
      expect(liveMoveAnimationDuration(req(76, a, { turn: 0 }), attackerDoll(a))).not.toBeNull();
      expect(liveSubstituteSwapProven(req(76, a, { turn: 1 }), attackerDoll(a))).toBe(false);
      expect(liveMoveSubstituteDollUnproven(req(76, a, { turn: 1 }), attackerDoll(a))).toBe(true);
      expect(liveSubstituteSwapApplies(req(76, a, { turn: 1 }), attackerDoll(a))).toBe(true);
      expect(liveMoveAnimationDuration(req(76, a, { turn: 1 }), attackerDoll(a))).not.toBeNull();
    }
  });
  it("defender-doll cells: Leaf Blade 348 and ThunderPunch 9, both sides, keep the doll-free duration", () => {
    for (const id of [348, 9]) {
      expect(LIVE_SUBSTITUTE_DOLL_DEFENDER_CELLS.get(id)).toEqual(BOTH);
      for (const a of [0, 1] as const) {
        expect(liveMoveSubstituteDollDeclines(req(id, a), defenderDoll(a))).toBe(false);
        expect(liveMoveAnimationDuration(req(id, a), defenderDoll(a))).toBe(liveMoveAnimationDuration(req(id, a), field(false, false)));
        expect(liveMoveAnimationDuration(req(id, a), defenderDoll(a))).not.toBeNull();
      }
    }
  });
});
