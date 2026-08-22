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
 * ISSUES #101: `STRINGID_PKMNTOOKAIM` (Lock-On/Mind Reader's only
 * printstring, `BattleScript_EffectLockOn`,
 * data/battle_scripts_1.s:1286-1297) had no `messageLines` case at all,
 * crashing the soak driver's `winning`-policy seed 90 via the FATAL
 * completeness guard (ISSUES #72 user decision). `Cmd_setalwayshitflag`
 * (battleScriptSetalwayshitflagOpcode.ts) confirms the whole EFFECT_LOCK_ON
 * script is executable -- attackcanceler, accuracycheck, and
 * setalwayshitflag all run and none reassign gBattlerAttacker/gBattlerTarget
 * -- so this is a pure missing-case gap, same shape as
 * STRINGID_PKMNIDENTIFIED (BattleScript_EffectForesight), not an unmodeled
 * effect.
 */

const LOCK_ON = 199;
const SPLASH = 150;

const SPECIES_WOBBUFFET = 202; // pure Psychic -- arbitrary neutral filler.

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

describe("presentation-string ISSUES #101 -- Lock-On's STRINGID_PKMNTOOKAIM", () => {
  it("names the attacker and defender (real player LOCK ON, guaranteed-hit accuracy path)", () => {
    const config: FactoryFullTurnConfig = Object.freeze({
      requestId: 1,
      rngSeed: 1,
      player: wobbuffetConfig(LOCK_ON, { speed: 200 }),
      trainer: wobbuffetConfig(SPLASH, { speed: 1 }),
    });
    const { messageIds, lines, field } = runFullTurn(config, AT(1), AT(1));
    expect(messageIds).toContain("STRINGID_PKMNTOOKAIM");
    expect(lines).toContainEqual([`${field.player.name} took aim`, `at Foe ${field.opponent.name}!`]);
  });
});
