/**
 * ISSUES #115 -- a message printed AFTER a forced send-out's switch-in, in
 * the SAME resolution segment, named the pre-switch (fainted) battler
 * instead of the incoming one. Live shape: soak `full` policy seed 108,
 * battle 1 turn 8 -- after CHARMELEON faints and BUTTERFREE is sent out, the
 * segment's own end-turn sandstorm tick printed "CHARMELEON is buffeted by
 * the sandstorm!" while the HP delta it announces actually lands on
 * BUTTERFREE.
 *
 * Source of truth: `BufferStringBattle` (battle_message.c) reads a name
 * placeholder from `gBattlerPartyIndexes[battler]` AT PRINT TIME, which
 * `Cmd_getswitchedmondata` already committed before the switch-in's own
 * STRINGID_SWITCHINMON print (data/battle_scripts_1.s:1707-1711). This
 * engine's `projectBattleResolutionCommands` (battleResolutionPresentation.ts)
 * instead resolved every {B_ATK/DEF/SCR_ACTIVE/EFF_NAME_WITH_PREFIX} from
 * `field`, ONE frozen pre-resolution snapshot for the whole segment, so any
 * name print after a switch-in kept naming the mon that just left.
 */
import { describe, expect, it } from "vitest";
import { createBattleCommandPresentation } from "../src/engine/battleCommandPresentation.ts";
import {
  createBattleResolutionPresentation,
  type CreateBattleResolutionPresentationInput,
} from "../src/engine/battleResolutionPresentation.ts";
import {
  createBattleState,
  type BattleBoundary,
  type BattleDecisionTransitionResult,
  type BattleKernelSemanticEvent,
} from "../src/engine/battleDecisionBoundary.ts";
import {
  createFactoryFullTurnBattleState,
  type FactoryFullTurnDecisionRules,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";

function initialBattle() {
  return createFactoryFullTurnBattleState({
    requestId: 1,
    rngSeed: 7,
    player: {
      // ONIX -- ROCK/GROUND, sand-immune, so its own fainting is unrelated
      // to sandstorm; only the incoming bench mon below takes the chip.
      species: 95,
      moveId: 157,
      moves: [157, 20, 225, 201],
      pp: [10, 20, 20, 10],
      ability: 5,
      item: 0,
      friendship: 0,
      attack: 51,
      defense: 187,
      spAttack: 36,
      spDefense: 72,
      speed: 76,
      hp: 40,
      maxHp: 40,
      types: ["TYPE_ROCK", "TYPE_GROUND"],
    },
    trainer: {
      species: 140,
      moveId: 72,
      moves: [72, 246, 28, 182],
      pp: [10, 5, 15, 10],
      ability: 4,
      item: 0,
      friendship: 0,
      attack: 118,
      defense: 96,
      spAttack: 93,
      spDefense: 51,
      speed: 61,
      hp: 91,
      maxHp: 91,
      types: ["TYPE_ROCK", "TYPE_WATER"],
    },
    // MACHOP -- FIGHTING, not sand-immune, in bench slot 1 (the forced
    // send-out's only legal replacement below).
    playerBenchHp: [80, 0],
    playerBenchOverride: [{
      species: 66,
      personality: 9,
      level: 50,
      hp: 80,
      maxHP: 80,
      moves: [67, 2, 43, 116],
      pp: [20, 15, 30, 30],
    }, undefined],
  });
}

const PROVENANCE = Object.freeze({
  programCounter: 1,
  opcodeId: 1,
  opcodeName: "test",
  dispatcher: "test",
  sourceLabel: "BattleScript_Test",
  sourceStatementLine: 1,
  instructionExecution: 1,
});

function event(
  sequence: number,
  payload: BattleKernelSemanticEvent["payload"],
  instructionExecution = 1,
): BattleKernelSemanticEvent {
  return Object.freeze({
    sequence,
    payload: Object.freeze(payload),
    provenance: Object.freeze({ ...PROVENANCE, instructionExecution }),
  });
}

function nextState(
  rules: FactoryFullTurnDecisionRules,
  boundary: BattleBoundary,
) {
  if (boundary.kind === "machine-barrier" || boundary.kind === "terminal") {
    throw new Error("test fixture only builds decision-required boundaries");
  }
  return createBattleState({ rules, rngSeed: 9, request: boundary.request });
}

function inputFor(events: readonly BattleKernelSemanticEvent[], boundary: BattleBoundary): CreateBattleResolutionPresentationInput {
  if (boundary.kind === "machine-barrier" || boundary.kind === "terminal") {
    throw new Error("test fixture only builds decision-required boundaries");
  }
  const initial = initialBattle();
  if (
    initial.boundary.kind !== "decision-required"
    || initial.boundary.request.kind !== "command"
  ) throw new Error("fixture has no source command");
  const state = nextState(initial.rules, boundary);
  const transition = Object.freeze({
    kind: "decision-required",
    state,
    events: Object.freeze(events),
    nextRequest: boundary.request,
  }) as BattleDecisionTransitionResult<FactoryFullTurnDecisionRules>;
  return {
    sourceRequest: initial.boundary.request,
    sourceDecision: { kind: "use-move", moveSlot: 0, targetBattler: 1 },
    beforeRules: initial.rules,
    transition,
    fieldBoundary: createBattleCommandPresentation(
      initial.boundary.request,
      initial.rules.rulesContext,
    ).field,
    confirmHandoff: { fightDisplayCursor: 0, idleBounceElapsed: 0 },
  };
}

const FORCED_SWITCH: BattleBoundary = Object.freeze({
  kind: "decision-required",
  request: Object.freeze({
    kind: "forced-switch",
    requestId: 3,
    side: "player",
    battler: 0,
    faintedPartyIndex: 0,
    legalPartyIndexes: Object.freeze([1 as const]),
  }),
});

describe("ISSUES #115 -- a post-switch-in message names the CURRENT battler, not the one it replaced", () => {
  it("an end-turn sandstorm tick after a forced send-out names the incoming mon, not the fainted one", () => {
    const resolution = createBattleResolutionPresentation(inputFor([
      event(0, { kind: "health-bar-update", battler: 0, healthValue: 0 }),
      event(1, { kind: "hp-change", battler: 0, from: 40, to: 0 }),
      event(2, { kind: "faint-animation", battler: 0 }),
      event(3, { kind: "message", messageId: "STRINGID_ATTACKERFAINTED", substitutions: [] }),
      event(4, { kind: "switch", side: "player", fromPartyIndex: 0, toPartyIndex: 1 }),
      event(5, { kind: "message", messageId: "STRINGID_SWITCHINMON", substitutions: [] }),
      event(6, { kind: "switch-in-animation", battler: 0, partyIndex: 1 }),
      // The segment's own end-turn sandstorm tick, printed for the battler
      // 0 SLOT after its switch-in already committed -- BS_ATTACKER is 0
      // (copyarraywithindex's own per-loop write), same as production.
      event(7, {
        kind: "message",
        messageId: "STRINGID_PKMNBUFFETEDBYSANDSTORM",
        substitutions: [],
        actionSnapshot: { attacker: 0, currentMove: 0, currentMovePosition: 0 },
      }),
      event(8, { kind: "health-bar-update", battler: 0, healthValue: 75 }),
      event(9, { kind: "hp-change", battler: 0, from: 80, to: 75 }),
    ], FORCED_SWITCH));

    const messages = resolution.segments
      .flatMap((segment) => segment.commands)
      .filter((cmd): cmd is Extract<typeof cmd, { type: "message" }> => cmd.type === "message");

    expect(messages).toContainEqual(
      expect.objectContaining({ lines: ["Go! MACHOP!"] }),
    );
    // Pre-fix this read ["ONIX is buffeted", "by the sandstorm!"] -- the
    // segment's pre-switch snapshot, not the mon the HP delta above
    // actually lands on.
    expect(messages).toContainEqual(
      expect.objectContaining({ lines: ["MACHOP is buffeted", "by the sandstorm!"] }),
    );
  });
});
