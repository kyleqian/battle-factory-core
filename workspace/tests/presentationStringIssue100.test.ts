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
 * ISSUES #100: `STRINGID_NATUREPOWERTURNEDINTO` had no `{B_CURRENT_MOVE}`
 * resolver in `battleResolutionPresentation.ts`'s `messageLines`, crashing
 * the soak driver's `winning`-policy seed 15 (METRONOME -> NATURE POWER at
 * battle 5 turn 5, frame 120877) via the FATAL completeness guard (ISSUES
 * #72 user decision -- unresolved placeholders throw, not silently blank).
 * Reached directly here with NATURE POWER itself (its own EFFECT_NATURE_POWER
 * runs `BattleScript_EffectNaturePower` regardless of how it was selected),
 * so no METRONOME roll is needed for a deterministic pin.
 *
 * Sibling-gap sweep of this session found one more genuine gap sharing the
 * same shape: `STRINGID_PKMNWASDEFROSTEDBY` (`BattleScript_MoveUsedUnfroze`,
 * gGotDefrostedStringIds row 1 -- a frozen attacker self-thawing via a Thaw
 * Hit move like Flame Wheel) had no `messageLines` case and no
 * `{B_CURRENT_MOVE}` resolver, same as NATURE POWER. Its sibling row,
 * `STRINGID_PKMNWASDEFROSTED2` (the plain 20%-roll natural thaw, no move
 * named), turned out to already work via `messageLines`' generic tail
 * fallback -- pinned below too, as a regression check, not a fix.
 */

const NATURE_POWER = 267;
const FLAME_WHEEL = 172;
const SPLASH = 150;
const STATUS1_FREEZE = 1 << 5;

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

describe("presentation-string ISSUES #100 -- Nature Power's {B_CURRENT_MOVE}", () => {
  it("STRINGID_NATUREPOWERTURNEDINTO names the terrain-selected move, never NATURE POWER itself (real Factory building environment -> SWIFT)", () => {
    const config: FactoryFullTurnConfig = Object.freeze({
      requestId: 1,
      rngSeed: 1,
      player: wobbuffetConfig(NATURE_POWER, { speed: 200 }),
      trainer: wobbuffetConfig(SPLASH, { speed: 1 }),
    });
    const { messageIds, lines, field } = runFullTurn(config, AT(1), AT(1));
    expect(messageIds).toContain("STRINGID_NATUREPOWERTURNEDINTO");
    expect(lines).toContainEqual(["NATURE POWER turned into", "SWIFT!"]);
    expect(messageIds).toContain("STRINGID_USEDMOVE");
    expect(lines).toContainEqual([`${field.player.name} used`, "SWIFT!"]);
  });
});

describe("presentation-string ISSUES #100 sibling gap -- frozen self-thaw", () => {
  it("STRINGID_PKMNWASDEFROSTEDBY names the thawing Thaw Hit move ({B_CURRENT_MOVE} fix, real frozen attacker using FLAME WHEEL, guaranteed thaw path)", () => {
    const config: FactoryFullTurnConfig = Object.freeze({
      requestId: 1,
      rngSeed: 1,
      player: wobbuffetConfig(FLAME_WHEEL, { speed: 200, status1: STATUS1_FREEZE }),
      trainer: wobbuffetConfig(SPLASH, { speed: 1 }),
    });
    const { messageIds, lines, field } = runFullTurn(config, AT(1), AT(1));
    expect(messageIds).toContain("STRINGID_PKMNWASDEFROSTEDBY");
    expect(lines).toContainEqual([`${field.player.name} was`, "defrosted by FLAME WHEEL!"]);
  });

  it("STRINGID_PKMNWASDEFROSTED2 names no move for the plain 20%-roll natural thaw (regression check, not a fix -- generic tail fallback already covered it; real frozen attacker using SPLASH, rngSeed 3 lands the roll)", () => {
    const config: FactoryFullTurnConfig = Object.freeze({
      requestId: 1,
      rngSeed: 3,
      player: wobbuffetConfig(SPLASH, { speed: 200, status1: STATUS1_FREEZE }),
      trainer: wobbuffetConfig(SPLASH, { speed: 1 }),
    });
    const { messageIds, lines, field } = runFullTurn(config, AT(0), AT(1));
    expect(messageIds).toContain("STRINGID_PKMNWASDEFROSTED2");
    expect(lines).toContainEqual([`${field.player.name} was`, "defrosted!"]);
  });
});
