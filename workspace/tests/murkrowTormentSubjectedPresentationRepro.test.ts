import { describe, it, expect } from "vitest";
import {
  createFactoryFullTurnBattleState,
  submitFactoryFullTurnDecision,
  type FactoryFullTurnConfig,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";
import { createBattleCommandPresentation } from "../src/engine/battleCommandPresentation.ts";
import { createBattleResolutionPresentation } from "../src/engine/battleResolutionPresentation.ts";
import type { BattleCommandRequest } from "../src/engine/battleDecisionBoundary.ts";

/**
 * ISSUES #68 repro: a same-day user report. Rental BUTTERFREE KO'd GROVYLE,
 * MURKROW (Factory set 184: FAINT_ATTACK/FLY/TORMENT/TAUNT, LAX_INCENSE)
 * switched in, and the very next click threw with error text mentioning
 * torment. The app computes a full turn synchronously at click, so the
 * throw window spans MURKROW's own TORMENT execution. All four opponent
 * slots are TORMENT (AGENTS.md's own constrain-to-one-legal-choice
 * convention) so whichever slot the caller submits is still TORMENT.
 *
 * Root cause (same class as #65, docs/silverwind-allstatsup-crash-scout.md):
 * `BattleScript_EffectTorment`'s own `printstring STRINGID_PKMNSUBJECTEDTOTORMENT`
 * (reference/pokeemerald/data/battle_scripts_1.s:2139-2149) resolves
 * `sText_PkmnSubjectedToTorment` (battle_message.c:223,676:
 * "{B_DEF_NAME_WITH_PREFIX} was subjected\nto TORMENT!") -- but
 * battleResolutionPresentation.ts's messageLines had zero
 * STRINGID_PKMNSUBJECTEDTOTORMENT branches, so the generic fallback (which
 * only ever supplies B_ATK_NAME_WITH_PREFIX/B_EFF_NAME_WITH_PREFIX/
 * B_SCR_ACTIVE_NAME_WITH_PREFIX/B_LAST_ITEM) hit
 * battleStringResolver.ts's "no resolver supplied" completeness guard.
 * `checkBattleScriptMoveLimitations`/`legalMoveDecisions`'s own TORMENT
 * exclusion and the Struggle fallback are already covered by
 * tests/battleScriptSettormentOpcode.test.ts's "Torment through the generic
 * Factory action-admission seam" describe block (never touched the
 * presentation layer, so it never caught this).
 */
const SCENARIO: FactoryFullTurnConfig = Object.freeze({
  requestId: 1,
  rngSeed: 1,
  player: Object.freeze({
    species: 12, // BUTTERFREE
    moveId: 33, // TACKLE
    moves: [33, 16, 0, 0] as const, // TACKLE, GUST
    pp: [35, 35, 0, 0] as const,
    ability: 0,
    item: 0,
    friendship: 0,
    attack: 45,
    defense: 50,
    spAttack: 80,
    spDefense: 80,
    speed: 120, // faster than MURKROW so the player acts first this turn
    hp: 95,
    maxHp: 95,
    types: ["TYPE_BUG", "TYPE_FLYING"] as const,
  }),
  trainer: Object.freeze({
    species: 198, // MURKROW
    moveId: 259, // TORMENT
    moves: [259, 259, 259, 259] as const,
    pp: [16, 16, 16, 16] as const,
    ability: 0,
    item: 0,
    friendship: 0,
    attack: 91,
    defense: 69,
    spAttack: 91,
    spDefense: 69,
    speed: 97,
    hp: 142,
    maxHp: 142,
    types: ["TYPE_DARK", "TYPE_FLYING"] as const,
  }),
});

describe("MURKROW TORMENT subjected-to-torment presentation (ISSUES #68)", () => {
  it("resolves the STRINGID_PKMNSUBJECTEDTOTORMENT banner through the production resolution presentation path instead of throwing", () => {
    const initial = createFactoryFullTurnBattleState(SCENARIO);
    if (initial.boundary.kind !== "decision-required") {
      throw new Error("expected the player's command boundary");
    }
    const afterPlayer = submitFactoryFullTurnDecision(initial, {
      requestId: 1,
      side: "player",
      decision: { kind: "use-move", moveSlot: 0, targetBattler: 1 },
    });
    if (afterPlayer.kind !== "decision-required") {
      throw new Error("expected the trainer's command boundary");
    }
    const transition = submitFactoryFullTurnDecision(afterPlayer.state, {
      requestId: 2,
      side: "trainer",
      decision: { kind: "use-move", moveSlot: 0, targetBattler: 0 },
    });

    const messageIds = transition.events
      .filter((event) => event.payload.kind === "message")
      .map((event) => (event.payload as { messageId: string }).messageId);
    expect(messageIds).toContain("STRINGID_PKMNSUBJECTEDTOTORMENT");

    const command = createBattleCommandPresentation(
      initial.boundary.request as BattleCommandRequest,
      initial.rules.rulesContext,
      0,
    );

    // Throws before the fix: "battleStringResolver:
    // STRINGID_PKMNSUBJECTEDTOTORMENT references placeholder
    // {B_DEF_NAME_WITH_PREFIX} with no resolver supplied".
    const resolution = createBattleResolutionPresentation({
      sourceRequest: initial.boundary.request as BattleCommandRequest,
      sourceDecision: { kind: "use-move", moveSlot: 0, targetBattler: 1 },
      beforeRules: initial.rules,
      transition,
      fieldBoundary: command.field,
      confirmHandoff: {
        fightDisplayCursor: command.fightDisplayCursor,
        idleBounceElapsed: command.idleBounceElapsed,
      },
      opponentTrainer: null,
    });

    const lines = resolution.segments
      .flatMap((segment) => segment.commands)
      .filter((cmd): cmd is Extract<typeof cmd, { type: "message" }> => cmd.type === "message")
      .map((cmd) => cmd.lines);

    // BUTTERFREE (the player, no "Foe "/"Wild " prefix) is TORMENT's target
    // -- MURKROW's own attack targets the opponent, never itself.
    expect(lines).toContainEqual(["BUTTERFREE was subjected", "to TORMENT!"]);
  });

  it("excludes BUTTERFREE's just-used TACKLE from next turn's legal decisions, leaving GUST", () => {
    const initial = createFactoryFullTurnBattleState(SCENARIO);
    if (initial.boundary.kind !== "decision-required") {
      throw new Error("expected the player's command boundary");
    }
    const afterPlayer = submitFactoryFullTurnDecision(initial, {
      requestId: 1,
      side: "player",
      decision: { kind: "use-move", moveSlot: 0, targetBattler: 1 },
    });
    if (afterPlayer.kind !== "decision-required") {
      throw new Error("expected the trainer's command boundary");
    }
    const transition = submitFactoryFullTurnDecision(afterPlayer.state, {
      requestId: 2,
      side: "trainer",
      decision: { kind: "use-move", moveSlot: 0, targetBattler: 0 },
    });

    expect(transition.kind).toBe("decision-required");
    if (transition.kind !== "decision-required" || transition.nextRequest.kind !== "command") {
      throw new Error("expected the next player command boundary");
    }
    expect(transition.nextRequest.side).toBe("player");
    expect(transition.nextRequest.legalDecisions).toEqual([
      { kind: "use-move", moveSlot: 1, targetBattler: 1 },
    ]);

    // The command-presentation surface the FIGHT menu reads: the tormented
    // TACKLE slot is absent (null), matching every other move-limitation
    // type's existing generic "ignores A" mechanism
    // (battleCommandPresentation.ts, tests/battleCommandPresentation.test.ts's
    // "ignores A on a request-illegal move slot").
    const nextCommand = createBattleCommandPresentation(
      transition.nextRequest as BattleCommandRequest,
      transition.state.rules.rulesContext,
      0,
    );
    expect(nextCommand.legalMoveBySlot[0]).toBeNull();
    expect(nextCommand.legalMoveBySlot[1]).toEqual({
      kind: "use-move",
      moveSlot: 1,
      targetBattler: 1,
    });
  });
});
