import { describe, it, expect } from "vitest";
import {
  createFactoryFullTurnBattleState,
  submitFactoryFullTurnDecision,
  type FactoryFullTurnConfig,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";
import { createBattleCommandPresentation } from "../src/engine/battleCommandPresentation.ts";
import { createBattleResolutionPresentation } from "../src/engine/battleResolutionPresentation.ts";
import type { BattleCommandDecision, BattleCommandRequest } from "../src/engine/battleDecisionBoundary.ts";

/**
 * ISSUES #72 batch 9: the final REACHABLE id, STRINGID_MAGNITUDESTRENGTH
 * (BattleScript_EffectMagnitude, data/battle_scripts_1.s:1683-1692).
 * `magnitudedamagecalculation` (Cmd_magnitudedamagecalculation,
 * battle_script_commands.c:8670-8710) rolls the 4-10 tier and prints it
 * BEFORE the hit lands (`printstring` precedes the goto into
 * BattleScript_HitsAllWithUndergroundBonusLoop). The kernel already
 * captures the roll (magnitudeHandler, battleScriptRankedBatch1Opcode.ts:130,
 * `battleTextBuff1ByteNumber: selected.magnitude`); this batch only wires
 * the presentation-side resolver, the same battleTextBuff1ByteNumber
 * number-buffer idiom STOCKPILE/PERISHCOUNTFELL already use.
 * Red-verified via `git stash -- src/engine/battleResolutionPresentation.ts
 * src/engine/factoryBattleScriptFullTurnDecision.ts` (throws the exact
 * completeness-guard error pre-fix).
 */

const MAGNITUDE = 222; // real L50 carriers: Diglett/Barboach/Geodude/Numel/Graveler/Camerupt.
const SPLASH = 150;

const SPECIES_DIGLETT = 50;
const SPECIES_WOBBUFFET = 202; // pure Psychic -- arbitrary neutral filler.

const AT = (battler: 0 | 1): BattleCommandDecision =>
  Object.freeze({ kind: "use-move", moveSlot: 0, targetBattler: battler });

describe("presentation-string ISSUES #72 batch 9 -- Magnitude", () => {
  it("STRINGID_MAGNITUDESTRENGTH resolves the rolled magnitude tier (real Magnitude use, kernel-captured roll)", () => {
    const config: FactoryFullTurnConfig = Object.freeze({
      requestId: 1,
      rngSeed: 1,
      player: {
        species: SPECIES_WOBBUFFET, moveId: SPLASH,
        attack: 60, defense: 60, spAttack: 60, spDefense: 90, speed: 60, hp: 200, maxHp: 200,
      },
      trainer: {
        species: SPECIES_DIGLETT, moveId: MAGNITUDE,
        attack: 60, defense: 60, spAttack: 60, spDefense: 60, speed: 91, hp: 190, maxHp: 190,
      },
    });

    const initial = createFactoryFullTurnBattleState(config);
    if (initial.boundary.kind !== "decision-required") {
      throw new Error("expected the player's command boundary");
    }
    const afterPlayer = submitFactoryFullTurnDecision(initial, {
      requestId: 1,
      side: "player",
      decision: AT(0),
    });
    if (afterPlayer.kind !== "decision-required") {
      throw new Error("expected the trainer's command boundary");
    }
    const transition = submitFactoryFullTurnDecision(afterPlayer.state, {
      requestId: 2,
      side: "trainer",
      decision: AT(0),
    });

    const command = createBattleCommandPresentation(
      initial.boundary.request as BattleCommandRequest,
      initial.rules.rulesContext,
      0,
    );
    const resolution = createBattleResolutionPresentation({
      sourceRequest: initial.boundary.request as BattleCommandRequest,
      sourceDecision: AT(0),
      beforeRules: initial.rules,
      transition,
      fieldBoundary: command.field,
      confirmHandoff: {
        fightDisplayCursor: command.fightDisplayCursor,
        idleBounceElapsed: command.idleBounceElapsed,
      },
      opponentTrainer: Object.freeze({ className: "COOLTRAINER", name: "REY", speechLose: ["", ""] as const }),
    });

    const messageIds = transition.events
      .filter((event) => event.payload.kind === "message")
      .map((event) => (event.payload as { messageId: string }).messageId);
    const lines = resolution.segments
      .flatMap((segment) => segment.commands)
      .filter((cmd): cmd is Extract<typeof cmd, { type: "message" }> => cmd.type === "message")
      .map((cmd) => cmd.lines);

    expect(messageIds).toContain("STRINGID_MAGNITUDESTRENGTH");
    const rolledMagnitude = transition.state.rules.rulesContext.battleTextBuff1ByteNumber;
    expect(rolledMagnitude).not.toBeNull();
    expect(lines).toContainEqual([`MAGNITUDE ${rolledMagnitude}!`]);
  });
});
