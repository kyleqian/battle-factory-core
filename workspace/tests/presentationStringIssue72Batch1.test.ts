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
 * ISSUES #72 batch 1: the Taunt-pair idiom (PROGRESS 893,
 * tests/presentationStringTaunt.test.ts) extended to the top-ranked REACHABLE
 * printstring STRINGIDs from docs/issue72-reachability-triage.md -- the
 * "already status" family (all pure jumpifstatus(2) BS_TARGET generic
 * opcodes, zero TS references) plus a few standalone defender-only ids and
 * the ability-blocks-the-move's-own-target-effect cluster. Each `it` red-
 * verifies via `git stash -- src/engine/battleResolutionPresentation.ts
 * src/engine/factoryBattleScriptFullTurnDecision.ts` (throws the exact
 * completeness-guard error pre-fix).
 */

const SPLASH = 150;
const THUNDER_WAVE = 86;
const CONFUSE_RAY = 109;
const SPORE = 147;
const TOXIC = 92;
const WILL_O_WISP = 261;
const EMBER = 52;
const ATTRACT = 213;
const GROWL = 45;

const SPECIES_WOBBUFFET = 202; // pure Psychic -- immune to none of Electric/Ghost/Poison/Fire/Grass status moves.
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
    opponentTrainer: null,
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

// The target's own move never matters for these scenarios (it's always the
// trainer's action that emits the id under test), so it's pinned to the
// harmless self-targeting Splash.
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

const ATTACKER = (moveId: number): FactoryFullTurnBattlerConfig =>
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
  });

describe("presentation-string ISSUES #72 batch 1 -- already-status family", () => {
  it("STRINGID_PKMNISALREADYPARALYZED resolves the already-paralyzed target's own name", () => {
    const config: FactoryFullTurnConfig = Object.freeze({
      requestId: 1,
      rngSeed: 1,
      player: statusedTargetConfig({ status1: 1 << 6 }),
      trainer: ATTACKER(THUNDER_WAVE),
    });
    const { messageIds, lines, field } = runFullTurn(config, AT(0), AT(0));
    expect(messageIds).toContain("STRINGID_PKMNISALREADYPARALYZED");
    expect(lines).toContainEqual([`${field.player.name} is`, "already paralyzed!"]);
  });

  it("STRINGID_PKMNALREADYCONFUSED resolves the already-confused target's own name", () => {
    const config: FactoryFullTurnConfig = Object.freeze({
      requestId: 1,
      rngSeed: 1,
      player: statusedTargetConfig({ status2: 2 }),
      trainer: ATTACKER(CONFUSE_RAY),
    });
    const { messageIds, lines, field } = runFullTurn(config, AT(0), AT(0));
    expect(messageIds).toContain("STRINGID_PKMNALREADYCONFUSED");
    expect(lines).toContainEqual([`${field.player.name} is`, "already confused!"]);
  });

  it("STRINGID_PKMNALREADYASLEEP resolves the already-asleep target's own name", () => {
    const config: FactoryFullTurnConfig = Object.freeze({
      requestId: 1,
      rngSeed: 1,
      player: statusedTargetConfig({ status1: 1 }),
      trainer: ATTACKER(SPORE),
    });
    const { messageIds, lines, field } = runFullTurn(config, AT(0), AT(0));
    expect(messageIds).toContain("STRINGID_PKMNALREADYASLEEP");
    expect(lines).toContainEqual([`${field.player.name} is`, "already asleep!"]);
  });

  it("STRINGID_PKMNALREADYPOISONED resolves the already-poisoned target's own name", () => {
    const config: FactoryFullTurnConfig = Object.freeze({
      requestId: 1,
      rngSeed: 1,
      player: statusedTargetConfig({ status1: 1 << 3 }),
      trainer: ATTACKER(TOXIC),
    });
    const { messageIds, lines, field } = runFullTurn(config, AT(0), AT(0));
    expect(messageIds).toContain("STRINGID_PKMNALREADYPOISONED");
    expect(lines).toContainEqual([`${field.player.name} is already`, "poisoned."]);
  });

  it("STRINGID_PKMNALREADYHASBURN resolves the already-burned target's own name", () => {
    const config: FactoryFullTurnConfig = Object.freeze({
      requestId: 1,
      rngSeed: 1,
      player: statusedTargetConfig({ status1: 1 << 4 }),
      trainer: ATTACKER(WILL_O_WISP),
    });
    const { messageIds, lines, field } = runFullTurn(config, AT(0), AT(0));
    expect(messageIds).toContain("STRINGID_PKMNALREADYHASBURN");
    expect(lines).toContainEqual([`${field.player.name} already`, "has a burn."]);
  });
});

describe("presentation-string ISSUES #72 batch 1 -- standalone defender-only ids", () => {
  it("STRINGID_PKMNWASDEFROSTED resolves the thawed target's own name", () => {
    const config: FactoryFullTurnConfig = Object.freeze({
      requestId: 1,
      rngSeed: 1,
      player: statusedTargetConfig({ status1: 1 << 5 }),
      trainer: ATTACKER(EMBER),
    });
    const { messageIds, lines, field } = runFullTurn(config, AT(0), AT(0));
    expect(messageIds).toContain("STRINGID_PKMNWASDEFROSTED");
    expect(lines).toContainEqual([`${field.player.name} was`, "defrosted!"]);
  });

  it("STRINGID_PKMNFELLINLOVE resolves the attracted target's own name (Nidoran pair, known-good Attract staging)", () => {
    const config: FactoryFullTurnConfig = Object.freeze({
      requestId: 1,
      rngSeed: 0,
      player: {
        species: 29, // Nidoran-F: fixed female
        moveId: SPLASH,
        attack: 100,
        defense: 100,
        spAttack: 80,
        spDefense: 100,
        // Faster than the trainer, so the player's own Splash fully resolves
        // before the trainer's Attract lands -- this turn never re-enters the
        // separate in-love admission check (STRINGID_PKMNINLOVE, itself a
        // pending generic-fallback gap outside this batch's scope) on the
        // player's own already-completed action.
        speed: 100,
        hp: 500,
      },
      trainer: {
        species: 32, // Nidoran-M: fixed male
        moveId: ATTRACT,
        attack: 80,
        defense: 100,
        spAttack: 80,
        spDefense: 100,
        speed: 50,
        hp: 500,
      },
    });
    const { messageIds, lines, field } = runFullTurn(config, AT(0), AT(0));
    expect(messageIds).toContain("STRINGID_PKMNFELLINLOVE");
    expect(lines).toContainEqual([`${field.player.name}`, "fell in love!"]);
  });
});

describe("presentation-string ISSUES #72 batch 1 -- ability-blocks-the-move's-own-target-effect cluster", () => {
  it("STRINGID_PKMNPREVENTSCONFUSIONWITH resolves the target's own name and Own Tempo", () => {
    const config: FactoryFullTurnConfig = Object.freeze({
      requestId: 1,
      rngSeed: 1,
      player: statusedTargetConfig({ ability: 20 }),
      trainer: ATTACKER(CONFUSE_RAY),
    });
    const { messageIds, lines, field } = runFullTurn(config, AT(0), AT(0));
    expect(messageIds).toContain("STRINGID_PKMNPREVENTSCONFUSIONWITH");
    expect(lines).toContainEqual([`${field.player.name}’s OWN TEMPO`, "prevents confusion!"]);
  });

  it("STRINGID_PKMNPREVENTSROMANCEWITH resolves the target's own name and Oblivious", () => {
    const config: FactoryFullTurnConfig = Object.freeze({
      requestId: 1,
      rngSeed: 1,
      player: statusedTargetConfig({ ability: 12 }),
      trainer: ATTACKER(ATTRACT),
    });
    const { messageIds, lines, field } = runFullTurn(config, AT(0), AT(0));
    expect(messageIds).toContain("STRINGID_PKMNPREVENTSROMANCEWITH");
    expect(lines).toContainEqual([`${field.player.name}’s OBLIVIOUS`, "prevents romance!"]);
  });

  it("STRINGID_PKMNPREVENTSSTATLOSSWITH resolves the target's own name and Clear Body", () => {
    const config: FactoryFullTurnConfig = Object.freeze({
      requestId: 1,
      rngSeed: 1,
      player: statusedTargetConfig({ ability: 29 }),
      trainer: ATTACKER(GROWL),
    });
    const { messageIds, lines, field } = runFullTurn(config, AT(0), AT(0));
    expect(messageIds).toContain("STRINGID_PKMNPREVENTSSTATLOSSWITH");
    expect(lines).toContainEqual([`${field.player.name}’s CLEAR BODY`, "prevents stat loss!"]);
  });

  it("STRINGID_PKMNSXCUREDITSYPROBLEM resolves the cured battler's own name, Water Veil, and its burn", () => {
    const config: FactoryFullTurnConfig = Object.freeze({
      requestId: 1,
      rngSeed: 1,
      player: statusedTargetConfig({ ability: 41, status1: 1 << 4 }),
      trainer: ATTACKER(SPLASH),
    });
    // The trainer's own move is also self-targeting Splash here (battler1).
    const { messageIds, lines, field } = runFullTurn(config, AT(0), AT(1));
    expect(messageIds).toContain("STRINGID_PKMNSXCUREDITSYPROBLEM");
    expect(lines).toContainEqual([`${field.player.name}’s WATER VEIL`, "cured its burn problem!"]);
  });
});
