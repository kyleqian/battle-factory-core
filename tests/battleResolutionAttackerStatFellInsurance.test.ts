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
 * Tier-1 insurance for docs/silverwind-allstatsup-crash-scout.md's §5 step 4
 * "same-root-cause sweep": the missing branch that crashed on Silver Wind's
 * STRINGID_ATTACKERSSTATROSE banners also blocks every other
 * MOVE_EFFECT_AFFECTS_USER stat change, including stat-FALLs. Superpower's
 * own unconditional Attack/Defense self-drop
 * (reference/pokeemerald/data/battle_scripts_1.s:3624-3641,
 * BattleScript_AtkDefDown) is a real, deterministic (accuracy 100,
 * MOVE_EFFECT_CERTAIN -- no RNG-gated proc) STRINGID_ATTACKERSSTATFELL
 * source. This drives it through the real production kernel
 * (createFactoryFullTurnBattleState/submitFactoryFullTurnDecision) and the
 * real production presentation entry point
 * (createBattleResolutionPresentation) and asserts the resolved banner text.
 */
const SCENARIO: FactoryFullTurnConfig = Object.freeze({
  requestId: 1,
  rngSeed: 1,
  player: Object.freeze({
    species: 95, // ONIX
    moveId: 276, // SUPERPOWER
    moves: [276, 0, 0, 0] as const,
    pp: [5, 0, 0, 0] as const,
    ability: 0,
    item: 0,
    friendship: 0,
    attack: 90,
    defense: 130,
    spAttack: 55,
    spDefense: 65,
    speed: 100,
    hp: 150,
    maxHp: 150,
    types: ["TYPE_ROCK", "TYPE_GROUND"] as const,
  }),
  trainer: Object.freeze({
    species: 19, // RATTATA
    moveId: 33, // TACKLE
    moves: [33, 0, 0, 0] as const,
    pp: [35, 0, 0, 0] as const,
    ability: 0,
    item: 0,
    friendship: 0,
    attack: 56,
    defense: 35,
    spAttack: 25,
    spDefense: 35,
    speed: 50,
    hp: 999,
    maxHp: 999,
    types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
  }),
});

describe("Superpower self-drop ATTACKERSSTATFELL presentation (docs/silverwind-allstatsup-crash-scout.md §5 step 4)", () => {
  it("resolves both self-inflicted Attack/Defense stat-fall banners through the production resolution presentation path", () => {
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
    expect(messageIds.filter((id) => id === "STRINGID_ATTACKERSSTATFELL")).toHaveLength(2);

    const command = createBattleCommandPresentation(
      initial.boundary.request as BattleCommandRequest,
      initial.rules.rulesContext,
      0,
    );

    // Throws before the fix: "battleStringResolver: STRINGID_ATTACKERSSTATFELL
    // references placeholder {B_BUFF1} with no resolver supplied" -- the same
    // missing-branch gap as the Silver Wind rise-banner crash, mirrored for
    // the fall variant.
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

    expect(lines).toContainEqual(["ONIX’s attack", "fell!"]);
    expect(lines).toContainEqual(["ONIX’s defense", "fell!"]);
  });
});
