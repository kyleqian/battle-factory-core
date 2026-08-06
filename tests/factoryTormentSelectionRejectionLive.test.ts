import { describe, expect, it } from "vitest";
import {
  REJECTION_MESSAGE_FIRST_GLYPH_AT,
  REJECTION_MESSAGE_HOLD_AT,
  REJECTION_MESSAGE_REOPEN_FRAMES,
  advanceBattleCommandPresentation,
  createBattleCommandPresentation,
  submitBattleCommandPresentationDecision,
  type BattleCommandPresentationState,
} from "../src/engine/battleCommandPresentation.ts";
import {
  createBattleCommandPresentationRenderView,
} from "../src/engine/battleCommandPresentationRender.ts";
import type { BattleCommandRequest, BattleState } from "../src/engine/battleDecisionBoundary.ts";
import type { BattleScriptRulesContext } from "../src/engine/battleScriptRulesContext.ts";
import {
  createFactoryFullTurnBattleState,
  reduceFactoryFullTurnDecision,
  type FactoryFullTurnDecisionRules,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";
import { BATTLE_SCRIPT_STATUS2_MASKS } from "../src/engine/battleScriptSourceConstants.ts";

// ISSUES #81 live bind: a Tormented slot's commit enters the button-gated
// rejection-message phase (docs/torment-selection-rejection-ground-truth.md
// §2/§6). Same MURKROW/four-slot-TORMENT shape as
// `tests/murkrowTormentSubjectedPresentationRepro.test.ts`; BUTTERFREE is
// the fixture's own legal frontier lead.
const TOTAL_GLYPHS = 29 + 33; // "BUTTERFREE can't use the same" + "move in a row due to the TORMENT!"

function tormentBoundary(): Readonly<{
  battleState: BattleState<FactoryFullTurnDecisionRules>;
  request: BattleCommandRequest;
  rules: BattleScriptRulesContext;
}> {
  const state = createFactoryFullTurnBattleState({
    requestId: 1,
    rngSeed: 1,
    player: {
      species: 12,
      moveId: 33,
      moves: [33, 16, 0, 0] as const,
      pp: [35, 35, 0, 0] as const,
      attack: 65,
      defense: 70,
      spAttack: 100,
      spDefense: 100,
      speed: 90,
      hp: 135,
      maxHp: 135,
      types: ["TYPE_BUG", "TYPE_FLYING"],
      // Fixture's turn-2 checkpoint: MURKROW's turn-1 TORMENT landed on the
      // player (`status2 |= STATUS2_TORMENT`) and TACKLE is the banned last
      // move (`gLastMoves[0] = TACKLE`).
      status2: BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_TORMENT,
      lastMove: 33,
    },
    trainer: {
      species: 198,
      moveId: 259,
      moves: [259, 259, 259, 259] as const,
      pp: [15, 15, 15, 15] as const,
      attack: 105,
      defense: 62,
      spAttack: 105,
      spDefense: 62,
      speed: 111,
      hp: 135,
      maxHp: 135,
      types: ["TYPE_DARK", "TYPE_FLYING"],
    },
  });
  if (state.boundary.kind !== "decision-required" || state.boundary.request.kind !== "command") {
    throw new Error("torment fixture did not publish a player command request");
  }
  return {
    battleState: state,
    request: state.boundary.request,
    rules: state.rules.rulesContext,
  };
}

/** The fixture's turn-2 checkpoint: the move menu open with the cursor on `slot`. */
function fightMenuAt(slot: 0 | 1 | 2 | 3): BattleCommandPresentationState {
  const canonical = tormentBoundary();
  const presentation = createBattleCommandPresentation(canonical.request, canonical.rules, slot);
  let state: BattleCommandPresentationState = Object.freeze({
    ...presentation,
    lifecycle: Object.freeze({ phase: "action-menu" as const, phaseElapsed: 0 }),
  });
  state = advance(state, new Set(["A"]));
  for (let frame = 0; frame < 10; frame += 1) {
    if (state.lifecycle.phase === "fight-menu") return state;
    state = advance(state);
  }
  throw new Error("fight menu did not open");
}

function advance(
  state: BattleCommandPresentationState,
  presses: ReadonlySet<string> = new Set(),
): BattleCommandPresentationState {
  return advanceBattleCommandPresentation(
    state,
    presses as ReadonlySet<"A" | "B" | "RIGHT" | "LEFT" | "UP" | "DOWN">,
  );
}

describe("ISSUES #81 live Torment selection rejection", () => {
  it("flags slot 0 as tormented and keeps the legal GUST decision legal", () => {
    const canonical = tormentBoundary();
    const presentation = createBattleCommandPresentation(canonical.request, canonical.rules);
    expect(presentation.rejectionReasonBySlot[0]).toMatchObject({
      cause: "tormented",
      stringId: "STRINGID_PKMNCANTUSEMOVETORMENT",
      moveSlot: 0,
    });
    expect(presentation.rejectionReasonBySlot[1]).toBeNull();
    expect(presentation.legalMoveBySlot[1]).toMatchObject({ moveSlot: 1 });
  });

  it("committing the rejected slot does not submit and enters the rejection message phase", () => {
    const canonical = tormentBoundary();
    const menu = fightMenuAt(0);
    const rejected = advance(menu, new Set(["A"]));
    expect(rejected.lifecycle.phase).toBe("rejection-message");
    expect(rejected.rejectedSlot).toBe(0);
    expect(rejected.pendingDecision).toBeNull();
    expect(
      submitBattleCommandPresentationDecision(
        canonical.battleState,
        rejected,
        () => {
          throw new Error("rejection commit must never cross the kernel boundary");
        },
      ),
    ).toBeNull();
  });

  it("types the resolver's two lines at 1 glyph/frame with the first glyph +3 and no box text before it", () => {
    expect(REJECTION_MESSAGE_FIRST_GLYPH_AT).toBe(3);
    let state = advance(fightMenuAt(0), new Set(["A"]));
    // The two pre-typing frames expose zero glyphs; the first glyph lands at
    // +3 (oracle 767->770) and then one glyph per frame through the 62nd.
    for (let frame = 0; frame < REJECTION_MESSAGE_HOLD_AT; frame += 1) {
      if (frame > 0) state = advance(state);
      const message = createBattleCommandPresentationRenderView(state).rejectionMessage;
      expect(message).not.toBeNull();
      expect(message!.lines).toEqual([
        "BUTTERFREE can’t use the same",
        "move in a row due to the TORMENT!",
      ]);
      const glyphs = frame <= 2 ? 0 : Math.min(TOTAL_GLYPHS, frame - 2);
      expect(message!.visibleCharacters).toBe(glyphs);
      expect(message!.waitCursorAge).toBeNull();
    }
  });

  it("holds button-gated with no auto-advance for 137+ frames and only then shows the wait cursor", () => {
    expect(REJECTION_MESSAGE_HOLD_AT).toBe(66);
    let state = advance(fightMenuAt(0), new Set(["A"]));
    for (let frame = 0; frame < 66 + 137; frame += 1) {
      if (frame > 0) state = advance(state);
      expect(state.lifecycle.phase).toBe("rejection-message");
      expect(createBattleCommandPresentationRenderView(state).rejectionMessage!.waitCursorAge)
        .toBe(frame >= 66 ? frame - 66 : null);
    }
  });

  it.each([["A"], ["B"]] as const)(
    "dismisses on %s and reopens the byte-identical move menu +9 frames after the press frame",
    (button) => {
      expect(REJECTION_MESSAGE_REOPEN_FRAMES).toBe(9);
      const menu = fightMenuAt(0);
      const prePressView = createBattleCommandPresentationRenderView(menu);
      let state = advance(menu, new Set(["A"]));
      for (let frame = 0; frame < REJECTION_MESSAGE_HOLD_AT + 10; frame += 1) {
        state = advance(state);
      }
      const dismissed = advance(state, new Set([button]));
      expect(dismissed.lifecycle.phase).toBe("rejection-reopen");
      expect(dismissed.rejectedSlot).toBe(0);
      // The reopen span freezes the fully-typed text with the wait cursor
      // held at its dismiss-frame age (oracle 968-977 all one sha).
      const frozen = createBattleCommandPresentationRenderView(dismissed);
      expect(frozen.rejectionMessage!.visibleCharacters).toBe(TOTAL_GLYPHS);
      expect(frozen.rejectionMessage!.waitCursorAge).toBe(11);
      let frozenState = dismissed;
      for (let frame = 1; frame < REJECTION_MESSAGE_REOPEN_FRAMES; frame += 1) {
        frozenState = advance(frozenState);
        expect(frozenState.lifecycle.phase).toBe("rejection-reopen");
      }
      const reopened = advance(frozenState);
      expect(reopened.lifecycle.phase).toBe("fight-menu");
      expect(reopened.fightCursor).toBe(0);
      expect(reopened.fightDisplayCursor).toBe(0);
      expect(reopened.rejectedSlot).toBeNull();
      expect(createBattleCommandPresentationRenderView(reopened)).toEqual(prePressView);
    },
  );

  it("submits a legal move normally after a dismissed rejection", () => {
    const canonical = tormentBoundary();
    let state = advance(fightMenuAt(0), new Set(["A"]));
    for (let frame = 0; frame < REJECTION_MESSAGE_HOLD_AT + 10; frame += 1) {
      state = advance(state);
    }
    state = advance(state, new Set(["A"]));
    for (let frame = 0; frame < REJECTION_MESSAGE_REOPEN_FRAMES; frame += 1) {
      state = advance(state);
    }
    expect(state.lifecycle.phase).toBe("fight-menu");
    // RIGHT to the legal GUST slot, then commit.
    state = advance(state, new Set(["RIGHT"]));
    expect(state.fightCursor).toBe(1);
    const legal = advance(state, new Set(["A"]));
    expect(legal.lifecycle.phase).toBe("submitting");
    expect(legal.pendingDecision).toMatchObject({ kind: "use-move", moveSlot: 1 });
    expect(
      submitBattleCommandPresentationDecision(
        canonical.battleState,
        legal,
        reduceFactoryFullTurnDecision,
      ),
    ).not.toBeNull();
  });
});
