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
 * ISSUES #105: `STRINGID_PKMNCHANGEDTYPE` (Conversion/Conversion 2/
 * Camouflage's shared printstring -- `BattleScript_EffectConversion`,
 * `BattleScript_EffectConversion2`, `BattleScript_EffectCamouflage`,
 * battle_scripts_1.s:664,1282,2805) had no `messageLines` case at all,
 * crashing the soak driver's `winning`-policy seed 40 via the FATAL
 * completeness guard (ISSUES #72 user decision). All three type-change
 * opcodes (battleScriptTypeChangeOpcode.ts) are already ported and record
 * the chosen type into `rulesContext.battleTextBuff1Type`; none reassign
 * selectorRoles, so BS_ATTACKER stays the move's own still-current user --
 * same shape as #101's STRINGID_PKMNTOOKAIM. This was a pure
 * missing-messageLines-case + missing-substitutions-wiring gap, not an
 * unmodeled effect.
 */

const CONVERSION = 160;
const SPLASH = 150;

const SPECIES_WOBBUFFET = 202; // pure Psychic -- the only legal Conversion type is its own move's (Normal).

const AT = (battler: 0 | 1): BattleCommandDecision =>
  Object.freeze({ kind: "use-move", moveSlot: 0, targetBattler: battler });

function runFullTurn(
  config: FactoryFullTurnConfig,
  playerDecision: BattleCommandDecision,
  trainerDecision: BattleCommandDecision,
) {
  const initial = createFactoryFullTurnBattleState(config);
  if (initial.boundary.kind !== "decision-required") {
    throw new Error("expected the player's command boundary");
  }
  const afterPlayer = submitFactoryFullTurnDecision(initial, {
    requestId: 1,
    side: "player",
    decision: playerDecision,
  });
  if (afterPlayer.kind !== "decision-required") {
    throw new Error("expected the trainer's command boundary");
  }
  const transition = submitFactoryFullTurnDecision(afterPlayer.state, {
    requestId: 2,
    side: "trainer",
    decision: trainerDecision,
  });

  const command = createBattleCommandPresentation(
    initial.boundary.request as BattleCommandRequest,
    initial.rules.rulesContext,
    0,
  );
  const resolution = createBattleResolutionPresentation({
    sourceRequest: initial.boundary.request as BattleCommandRequest,
    sourceDecision: playerDecision,
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

  return { messageIds, lines, field: command.field };
}

function wobbuffetConfig(moveId: number, overrides: Record<string, unknown> = {}) {
  return Object.freeze({
    species: SPECIES_WOBBUFFET,
    moveId,
    attack: 60,
    defense: 60,
    spAttack: 60,
    spDefense: 60,
    speed: 60,
    hp: 200,
    maxHp: 200,
    ...overrides,
  });
}

describe("presentation-string ISSUES #105 -- Conversion's STRINGID_PKMNCHANGEDTYPE", () => {
  it("names the attacker and the newly-adopted type (real player CONVERSION, single-legal-slot draw)", () => {
    const config: FactoryFullTurnConfig = Object.freeze({
      requestId: 1,
      rngSeed: 1,
      player: wobbuffetConfig(CONVERSION, { speed: 200, types: ["TYPE_PSYCHIC", "TYPE_PSYCHIC"] }),
      trainer: wobbuffetConfig(SPLASH, { speed: 1 }),
    });
    const { messageIds, lines, field } = runFullTurn(config, AT(0), AT(1));
    expect(messageIds).toContain("STRINGID_PKMNCHANGEDTYPE");
    expect(lines).toContainEqual([`${field.player.name} transformed`, "into the NORMAL type!"]);
  });
});
