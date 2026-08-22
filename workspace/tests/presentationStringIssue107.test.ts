import { describe, it, expect } from "vitest";
import {
  createFactoryFullTurnBattleState,
  submitFactoryFullTurnDecision,
  type FactoryFullTurnConfig,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";
import { createBattleCommandPresentation } from "../src/engine/battleCommandPresentation.ts";
import { createBattleResolutionPresentation } from "../src/engine/battleResolutionPresentation.ts";
import {
  BATTLE_SCRIPT_STATUS2_SUBSTITUTE,
  type BattleScriptRulesBattlers,
} from "../src/engine/battleScriptRulesContext.ts";
import type { BattleCommandDecision, BattleCommandRequest } from "../src/engine/battleDecisionBoundary.ts";

/**
 * ISSUES #107: `STRINGID_PKMNSUBSTITUTEFADED` (`"{B_DEF_NAME_WITH_PREFIX}'s
 * SUBSTITUTE faded!"`, `BattleScript_SubstituteFade`,
 * data/battle_scripts_1.s:4257-4260) had no `messageLines` case at all,
 * crashing the soak driver's `winning`-policy seeds 27/29 via the FATAL
 * completeness guard (ISSUES #72 user decision). `Cmd_datahpupdate`'s
 * substitute-HP path (`playanimation BS_TARGET` right before this print)
 * never reassigns `selectorRoles` -- the move's own still-current defender
 * (the Substitute holder) is `BS_TARGET`, same plain idiom
 * `STRINGID_TARGETFAINTED`/`STRINGID_PKMNHUNGONWITHX` already use. Same
 * shape as #100/#101/#105, not an unmodeled effect.
 *
 * Staging a pre-existing Substitute: `FactoryFullTurnBattlerConfig` has no
 * `substituteHP` field (only `status2`, which flags its presence), so the
 * trainer's 1-HP Substitute is patched directly onto the constructed
 * `rulesContext` before the decision is submitted -- the same real-decision
 * pipeline every other house-pattern pin uses from that point on.
 */

const POUND = 1;
const SPLASH = 150;

const SPECIES_WOBBUFFET = 202; // pure Psychic -- arbitrary neutral filler.

const AT = (battler: 0 | 1): BattleCommandDecision =>
  Object.freeze({ kind: "use-move", moveSlot: 0, targetBattler: battler });

function runFullTurn(
  config: FactoryFullTurnConfig,
  playerDecision: BattleCommandDecision,
  trainerDecision: BattleCommandDecision,
) {
  const built = createFactoryFullTurnBattleState(config);
  if (built.boundary.kind !== "decision-required") {
    throw new Error("expected the player's command boundary");
  }
  // Patch a real, persistent 1-HP Substitute onto the trainer (battler 1)
  // straight into the constructed rulesContext -- no config field exposes
  // `substituteHP` yet, and this is not a transient battle-flow value like
  // an event. Explicit 4-tuple reconstruction (not `.map`) keeps
  // `BattleScriptRulesBattlers`' fixed-length type intact.
  const [b0, b1, b2, b3] = built.rules.rulesContext.battlers;
  const initial = Object.freeze({
    ...built,
    boundary: built.boundary,
    rules: Object.freeze({
      ...built.rules,
      rulesContext: Object.freeze({
        ...built.rules.rulesContext,
        battlers: Object.freeze([
          b0,
          Object.freeze({ ...b1, substituteHP: 1 }),
          b2,
          b3,
        ]) as BattleScriptRulesBattlers,
      }),
    }),
  });

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

describe("presentation-string ISSUES #107 -- Substitute's STRINGID_PKMNSUBSTITUTEFADED", () => {
  it("names the Substitute holder (real player attack breaking a real trainer 1-HP Substitute)", () => {
    const config: FactoryFullTurnConfig = Object.freeze({
      requestId: 1,
      rngSeed: 1,
      player: wobbuffetConfig(POUND, { speed: 200 }),
      trainer: wobbuffetConfig(SPLASH, { speed: 1, status2: BATTLE_SCRIPT_STATUS2_SUBSTITUTE }),
    });
    const { messageIds, lines, field } = runFullTurn(config, AT(1), AT(1));
    expect(messageIds).toContain("STRINGID_PKMNSUBSTITUTEFADED");
    expect(lines).toContainEqual([`Foe ${field.opponent.name}’s`, "SUBSTITUTE faded!"]);
  });
});
