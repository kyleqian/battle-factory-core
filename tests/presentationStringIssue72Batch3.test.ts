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
 * ISSUES #72 batch 3: the Taunt-pair idiom (PROGRESS 896/897/batches 1-2)
 * continued down the ranked REACHABLE list's plain-idiom tail starting at
 * STRINGID_PKMNLAIDCURSE (the 3 documented hard cases -- PKMNHUNGONWITHX,
 * PKMNPROTECTEDBY, PKMNREGAINEDHEALTH -- stay deferred, unlanded). Each `it`
 * red-verifies via `git stash -- src/engine/battleResolutionPresentation.ts
 * src/engine/factoryBattleScriptFullTurnDecision.ts` (throws the exact
 * completeness-guard error pre-fix).
 */

const SPLASH = 150;
const GROWL = 45;
const PSYCH_UP = 244;
const YAWN = 281;

const SPECIES_WOBBUFFET = 202; // pure Psychic -- arbitrary neutral filler.
const SPECIES_MURKROW = 198; // Dark/Flying, arbitrary attacker.

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

const ATTACKER = (moveId: number, overrides: Partial<FactoryFullTurnBattlerConfig> = {}): FactoryFullTurnBattlerConfig =>
  Object.freeze({
    species: SPECIES_MURKROW,
    moveId,
    attack: 60,
    defense: 60,
    spAttack: 85,
    spDefense: 60,
    speed: 91,
    hp: 190,
    maxHp: 190,
    ...overrides,
  });

describe("presentation-string ISSUES #72 batch 3 -- Psych Up's stat-copy", () => {
  it("STRINGID_PKMNCOPIEDSTATCHANGES resolves the move's own attacker/defender pair", () => {
    const config: FactoryFullTurnConfig = Object.freeze({
      requestId: 1,
      rngSeed: 1,
      player: {
        species: SPECIES_WOBBUFFET, moveId: PSYCH_UP,
        attack: 60, defense: 60, spAttack: 60, spDefense: 90, speed: 91, hp: 200, maxHp: 200,
      },
      trainer: statusedTargetConfig({ species: SPECIES_MURKROW, statStages: [6, 12, 6, 6, 6, 6, 6, 6] }),
    });
    const { messageIds, lines, field } = runFullTurn(config, AT(1), AT(1));
    expect(messageIds).toContain("STRINGID_PKMNCOPIEDSTATCHANGES");
    expect(lines).toContainEqual([
      `${field.player.name} copied`,
      `Foe ${field.opponent.name}’s stat changes!`,
    ]);
  });
});

describe("presentation-string ISSUES #72 batch 3 -- Yawn's own success tail", () => {
  it("STRINGID_PKMNWASMADEDROWSY resolves the move's own attacker/defender pair", () => {
    const config: FactoryFullTurnConfig = Object.freeze({
      requestId: 1,
      rngSeed: 1,
      player: statusedTargetConfig(),
      trainer: ATTACKER(YAWN),
    });
    const { messageIds, lines, field } = runFullTurn(config, AT(0), AT(0));
    expect(messageIds).toContain("STRINGID_PKMNWASMADEDROWSY");
    expect(lines).toContainEqual([
      `Foe ${field.opponent.name} made`,
      `${field.player.name} drowsy!`,
    ]);
  });
});

describe("presentation-string ISSUES #72 batch 3 -- Soundproof blocks a sound move", () => {
  it("STRINGID_PKMNSXBLOCKSY resolves the Soundproof target, Soundproof, and the blocked move", () => {
    const config: FactoryFullTurnConfig = Object.freeze({
      requestId: 1,
      rngSeed: 1,
      player: statusedTargetConfig({ ability: 43 /* ABILITY_SOUNDPROOF */ }),
      trainer: ATTACKER(GROWL),
    });
    const { messageIds, lines, field } = runFullTurn(config, AT(0), AT(0));
    expect(messageIds).toContain("STRINGID_PKMNSXBLOCKSY");
    expect(lines).toContainEqual([
      `${field.player.name}’s SOUNDPROOF`,
      "blocks GROWL!",
    ]);
  });
});

describe("presentation-string ISSUES #72 batch 3 -- Yawn vs. a sleep-immune ability", () => {
  it("STRINGID_PKMNSXMADEITINEFFECTIVE resolves the Insomnia holder via the shared scriptingBattler fallthrough", () => {
    const config: FactoryFullTurnConfig = Object.freeze({
      requestId: 1,
      rngSeed: 1,
      player: statusedTargetConfig({ ability: 15 /* ABILITY_INSOMNIA */ }),
      trainer: ATTACKER(YAWN),
    });
    const { messageIds, lines, field } = runFullTurn(config, AT(0), AT(0));
    expect(messageIds).toContain("STRINGID_PKMNSXMADEITINEFFECTIVE");
    expect(lines).toContainEqual([
      `${field.player.name}’s INSOMNIA`,
      "made it ineffective!",
    ]);
  });
});
