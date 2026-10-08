import { describe, expect, it } from "vitest";
import type { BattleMoveAnimationRequest } from "../src/engine/battleMoveAnimation.ts";
import type { BattleResolutionDisplayedField } from "../src/engine/battleResolutionPresentation.ts";
import { liveMoveAnimationDuration } from "../src/engine/liveMoveAnimation.ts";
import {
  LIVE_SUBSTITUTE_SWAP_BODY_CELLS, LIVE_SUBSTITUTE_SWAP_BODY_FRAMING, LIVE_SUBSTITUTE_SWAP_BODY_IDS, liveSubstituteSwapView,
} from "../src/engine/liveSubstituteSwap.ts";

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
        const subbed = liveMoveAnimationDuration(req(moveId, attacker), field(side === "player", side === "opponent"));
        if (sides.includes(side)) expect(subbed).toBe(plain! + SWAPS[side]);
        else expect(subbed).toBeNull();
      }
    }
    // Aerial Ace opponent: the doll-free control's own 1 px is not an accepted scope, so the subbed opponent still declines.
    expect(liveMoveAnimationDuration(req(332, 1), field(false, false))).toBe(50);
    expect(liveMoveAnimationDuration(req(332, 1), field(false, true))).toBeNull();
    // Rock Slide: no player adapter at all.
    expect(liveMoveAnimationDuration(req(157, 0), field(false, false))).toBeNull();
    // Multi-hit, both dolls and unproven bodies keep declining.
    expect(liveMoveAnimationDuration(req(57, 0, { multihit: 2 }), field(true, false))).toBeNull();
    expect(liveMoveAnimationDuration(req(57, 0), field(true, true))).toBeNull();
    expect(liveMoveAnimationDuration(req(98, 0), field(true, false))).toBeNull(); // Quick Attack: pair residual
  });
  it("rung b: framed bodies end at the ROM body's first inactive row and show adapter age row + shift", () => {
    // [move, adapter duration, ROM rows (activation .. first inactive), shift, sides]; prep40 s1: every window 0 px framed this way.
    const framed: [number, number, number, number, ("player" | "opponent")[]][] = [
      [89, 198, 208, 0, ["player", "opponent"]], [94, 140, 145, -5, ["player"]], [188, 160, 169, -4, ["player", "opponent"]],
      [53, 115, 210, -15, ["player", "opponent"]], [92, 219, 231, -7, ["player", "opponent"]], [44, 26, 41, -10, ["player", "opponent"]],
      [7, 101, 102, 0, ["player", "opponent"]], [153, 212, 217, -4, ["player", "opponent"]],
    ];
    expect([...LIVE_SUBSTITUTE_SWAP_BODY_FRAMING.keys()].sort((a, b) => a - b)).toEqual(framed.map((f) => f[0]).sort((a, b) => a - b));
    for (const [moveId, adapter, rows, shift, sides] of framed) {
      expect(LIVE_SUBSTITUTE_SWAP_BODY_FRAMING.get(moveId)).toEqual({ rows, shift });
      expect([...LIVE_SUBSTITUTE_SWAP_BODY_CELLS.get(moveId)!]).toEqual(sides);
      for (const side of ["player", "opponent"] as const) {
        const attacker = side === "player" ? 0 : 1;
        expect(liveMoveAnimationDuration(req(moveId, attacker), field(false, false))).toBe(adapter);
        const subbed = field(side === "player", side === "opponent");
        // prep40 window rows: swap-in 42 / 40 + idle + ROM body + swap-back + first inactive.
        expect(liveMoveAnimationDuration(req(moveId, attacker), subbed)).toBe(sides.includes(side) ? rows + SWAPS[side] : null);
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
    expect(liveMoveAnimationDuration(req(94, 1), field(false, true))).toBeNull();
  });
});
