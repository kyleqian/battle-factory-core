import { describe, it, expect } from "vitest";
import {
  createFactoryFullTurnBattleState,
  submitFactoryFullTurnDecision,
  type FactoryFullTurnConfig,
  type FactoryFullTurnBattlerConfig,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";
import { createBattleCommandPresentation } from "../src/engine/battleCommandPresentation.ts";
import { createBattleResolutionPresentation } from "../src/engine/battleResolutionPresentation.ts";
import type { BattleCommandDecision, BattleCommandRequest } from "../src/engine/battleDecisionBoundary.ts";

/**
 * ISSUES #72 batch 4: the Taunt-pair idiom (PROGRESS 896/897/batches 1-3)
 * continued down the ranked REACHABLE list's plain-idiom tail, now unblocked
 * by ENDTURN_CURSE's own end-of-turn wiring (battleEndTurnOrchestration.ts).
 * Each `it` red-verifies via `git stash -- src/engine/battleResolutionPresentation.ts
 * src/engine/factoryBattleScriptFullTurnDecision.ts` (throws the exact
 * completeness-guard error pre-fix).
 */

const SPLASH = 150;
const CURSE = 174;

const SPECIES_WOBBUFFET = 202; // pure Psychic -- arbitrary neutral filler.
const SPECIES_DUSCLOPS = 362; // pure Ghost -- the only Ghost-typed Curse carrier within the L50 draft floor.

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
    opponentTrainer: Object.freeze({ className: "COOLTRAINER", name: "REY" }),
  });

  const messageIds = transition.events
    .filter((event) => event.payload.kind === "message")
    .map((event) => (event.payload as { messageId: string }).messageId);
  const lines = resolution.segments
    .flatMap((segment) => segment.commands)
    .filter((cmd): cmd is Extract<typeof cmd, { type: "message" }> => cmd.type === "message")
    .map((cmd) => cmd.lines);

  return { messageIds, lines, field: command.field, transition };
}

function statusedTargetConfig(
  overrides: Partial<FactoryFullTurnBattlerConfig> = {},
): FactoryFullTurnBattlerConfig {
  return Object.freeze({
    species: SPECIES_WOBBUFFET,
    moveId: SPLASH,
    attack: 60,
    defense: 60,
    spAttack: 60,
    spDefense: 90,
    speed: 60,
    hp: 200,
    maxHp: 200,
    ...overrides,
  });
}

describe("presentation-string ISSUES #72 batch 4 -- Ghost Curse's full turn (self-damage + end-of-turn tick)", () => {
  it("STRINGID_PKMNLAIDCURSE resolves the move's own attacker/defender pair on cast", () => {
    const config: FactoryFullTurnConfig = Object.freeze({
      requestId: 1,
      rngSeed: 1,
      player: {
        species: SPECIES_DUSCLOPS, moveId: CURSE, types: ["TYPE_GHOST", "TYPE_GHOST"],
        attack: 60, defense: 90, spAttack: 60, spDefense: 90, speed: 60, hp: 200, maxHp: 200,
      },
      trainer: statusedTargetConfig(),
    });
    const { messageIds, lines, field } = runFullTurn(config, AT(1), AT(1));
    expect(messageIds).toContain("STRINGID_PKMNLAIDCURSE");
    expect(lines).toContainEqual([
      `${field.player.name} cut its own HP and`,
      `laid a CURSE on Foe ${field.opponent.name}!`,
    ]);
  });

  it("the same turn's end-of-turn tick prints STRINGID_PKMNAFFLICTEDBYCURSE against the CURSED TARGET (not the Ghost user who paid the self-damage cost)", () => {
    const config: FactoryFullTurnConfig = Object.freeze({
      requestId: 1,
      rngSeed: 1,
      player: {
        species: SPECIES_DUSCLOPS, moveId: CURSE, types: ["TYPE_GHOST", "TYPE_GHOST"],
        attack: 60, defense: 90, spAttack: 60, spDefense: 90, speed: 60, hp: 200, maxHp: 200,
      },
      trainer: statusedTargetConfig(),
    });
    const { messageIds, lines, field, transition } = runFullTurn(config, AT(1), AT(1));
    expect(messageIds).toContain("STRINGID_PKMNAFFLICTEDBYCURSE");
    expect(lines).toContainEqual([`Foe ${field.opponent.name} is afflicted`, "by the CURSE!"]);
    // cursetarget (BattleScript_DoGhostCurse) curses the TARGET and costs the
    // ATTACKER floor(maxHP/2) as its own self-damage (battleScriptCurseOpcode.ts):
    // DUSCLOPS (attacker) 200 -> 100, WOBBUFFET (cursed target) untouched mid-turn
    // then hit by the end-of-turn tick's floor(maxHP/4): 200 -> 150.
    expect(transition.state.rules.rulesContext.battlers[0]!.hp).toBe(100);
    expect(transition.state.rules.rulesContext.battlers[1]!.hp).toBe(150);
    expect(transition.state.rules.rulesContext.battlers[1]!.status2 & (1 << 28)).not.toBe(0);
  });
});
