import { describe, expect, it } from "vitest";
import {
  BATTLE2_ACTION_MENU_MODEL,
} from "../src/engine/battle2ActionMenu.ts";
import {
  BATTLE_COMMAND_ACTION_LABELS,
  BattleCommandPresentationError,
  createBattleCommandPresentation,
  type BattleCommandPresentationState,
} from "../src/engine/battleCommandPresentation.ts";
import type {
  BattleCommandRequest,
} from "../src/engine/battleDecisionBoundary.ts";
import {
  CLOSED_FIGHT_SUBMENU_STATE,
} from "../src/engine/battleMenu.ts";
import {
  createBattleScriptRulesContext,
  type BattleScriptPartyMemberInput,
  type BattleScriptRulesContext,
} from "../src/engine/battleScriptRulesContext.ts";
import {
  createFactoryFullTurnBattleState,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";
import { rentalMoveset } from "../src/engine/battleSetup.ts";

const ONIX_PERSONALITY = 1_205_102_525;
const MAGBY_PERSONALITY = 1_534_575_931;
const KABUTO_PERSONALITY = 50;
const PIKACHU_PERSONALITY = 255;
const ONIX_MOVES = rentalMoveset("ONIX");
const KABUTO_MOVES = Object.freeze([72, 246, 28, 182] as const);
const KABUTO_PP = Object.freeze([10, 5, 15, 10] as const);

function bench(
  species: number,
  personality: number,
  hp: number,
  moves: readonly [number, number, number, number],
  pp: readonly [number, number, number, number],
): BattleScriptPartyMemberInput {
  return Object.freeze({
    species,
    personality,
    level: 50,
    hp,
    maxHP: hp,
    moves,
    pp,
  });
}

function canonicalBoundary(): Readonly<{
  request: BattleCommandRequest;
  rules: BattleScriptRulesContext;
}> {
  const state = createFactoryFullTurnBattleState({
    requestId: 27,
    rngSeed: 0x1234_5678,
    player: {
      species: 95,
      personality: ONIX_PERSONALITY,
      moveId: ONIX_MOVES.moveIds[0],
      moves: ONIX_MOVES.moveIds,
      pp: ONIX_MOVES.maxPP,
      attack: 51,
      defense: 187,
      spAttack: 36,
      spDefense: 72,
      speed: 76,
      hp: 117,
      maxHp: 117,
      types: ["TYPE_ROCK", "TYPE_GROUND"],
    },
    playerBenchHp: [138, 153],
    playerBenchOverride: [
      bench(240, MAGBY_PERSONALITY, 138, [7, 108, 109, 123], [15, 20, 10, 20]),
      bench(153, 1_550_278_706, 153, [75, 92, 219, 113], [25, 10, 25, 30]),
    ],
    trainer: {
      species: 140,
      personality: KABUTO_PERSONALITY,
      moveId: KABUTO_MOVES[0],
      moves: KABUTO_MOVES,
      pp: KABUTO_PP,
      attack: 118,
      defense: 96,
      spAttack: 93,
      spDefense: 51,
      speed: 61,
      hp: 91,
      maxHp: 91,
      types: ["TYPE_ROCK", "TYPE_WATER"],
    },
    trainerBenchHp: [45, 60],
    trainerBenchOverride: [
      bench(1, 250, 45, [33, 45, 73, 74], [35, 40, 10, 15]),
      bench(25, PIKACHU_PERSONALITY, 60, [85, 98, 86, 104], [15, 30, 20, 15]),
    ],
  });
  if (state.boundary.kind !== "decision-required" || state.boundary.request.kind !== "command") {
    throw new Error("canonical command fixture did not publish a command request");
  }
  return Object.freeze({
    request: state.boundary.request,
    rules: state.rules.rulesContext,
  });
}

function projectPresentation(state: BattleCommandPresentationState) {
  return {
    field: state.field,
    promptBattler: state.field.player.name,
    actionLabels: BATTLE_COMMAND_ACTION_LABELS,
    actionCursor: state.actionCursor,
    moveIds: state.field.player.moveIds,
    currentPP: state.field.player.currentPP,
    legalMoveSlots: state.legalMoveBySlot.map((decision) =>
      decision === null ? null : [decision.moveSlot, decision.targetBattler]
    ),
    legalSwitchPartyIndexes: state.legalSwitchPartyIndexes,
    lifecycle: state.lifecycle,
    fightCursor: state.fightCursor,
    fightDisplayCursor: state.fightDisplayCursor,
    pendingDecision: state.pendingDecision,
  };
}

describe("battle-command presentation state construction", () => {
  it("is deeply structurally equivalent to the canonical Battle-2 action/FIGHT handoff", () => {
    const { request, rules } = canonicalBoundary();
    const state = createBattleCommandPresentation(request, rules);
    const oldProjection = {
      field: {
        player: {
          side: "player",
          battler: 0,
          partyIndex: rules.battlers[0].partyIndex,
          ...BATTLE2_ACTION_MENU_MODEL.player,
          status: "none",
          moveIds: ONIX_MOVES.moveIds,
          currentPP: ONIX_MOVES.maxPP,
          ppBonuses: rules.party.player[0].ppBonuses,
        },
        opponent: {
          side: "trainer",
          battler: 1,
          partyIndex: rules.battlers[1].partyIndex,
          ...BATTLE2_ACTION_MENU_MODEL.opponent,
          status: "none",
          moveIds: rules.battlers[1].moves,
          currentPP: rules.battlers[1].pp,
          ppBonuses: rules.party.opponent[0].ppBonuses,
        },
      },
      promptBattler: BATTLE2_ACTION_MENU_MODEL.promptBattler,
      actionLabels: Object.freeze([...BATTLE2_ACTION_MENU_MODEL.options]),
      actionCursor: BATTLE2_ACTION_MENU_MODEL.cursor,
      moveIds: CLOSED_FIGHT_SUBMENU_STATE.activeMonMoveset.moveIds,
      currentPP: CLOSED_FIGHT_SUBMENU_STATE.activeMonMoveset.maxPP,
      legalMoveSlots: request.legalDecisions
        .filter((decision) => decision.kind === "use-move")
        .map((decision) => [decision.moveSlot, decision.targetBattler]),
      legalSwitchPartyIndexes: Object.freeze(
        request.legalDecisions.flatMap((decision) =>
          decision.kind === "switch" ? [decision.partyIndex] : []
        ),
      ),
      lifecycle: { phase: "action-enter", phaseElapsed: 0 },
      fightCursor: CLOSED_FIGHT_SUBMENU_STATE.cursor,
      fightDisplayCursor: CLOSED_FIGHT_SUBMENU_STATE.displayCursor,
      pendingDecision: null,
    };

    expect(projectPresentation(state)).toEqual(oldProjection);
    expect(Object.isFrozen(state)).toBe(true);
    expect(Object.isFrozen(state.request)).toBe(true);
    expect(Object.isFrozen(state.request.legalDecisions)).toBe(true);
    expect(Object.isFrozen(state.lifecycle)).toBe(true);
    expect(Object.isFrozen(state.field)).toBe(true);
    expect(Object.isFrozen(state.field.player)).toBe(true);
    expect(Object.isFrozen(state.field.player.moveIds)).toBe(true);
    expect(Object.isFrozen(state.field.player.currentPP)).toBe(true);
    expect(Object.isFrozen(state.legalMoveBySlot)).toBe(true);
    expect(Object.isFrozen(state.legalSwitchPartyIndexes)).toBe(true);
  });

  it("adapts a noncanonical live field, party indexes, statuses, PP, and sparse exact legal decisions", () => {
    const canonical = canonicalBoundary();
    const player = canonical.rules.battlers[0];
    const opponent = canonical.rules.battlers[1];
    const rules = createBattleScriptRulesContext({
      ...canonical.rules,
      battlers: [
        {
          ...player,
          partyIndex: 1,
          species: 240,
          personality: MAGBY_PERSONALITY,
          hp: 37,
          maxHP: 138,
          status1: 1 << 4,
          moves: [52, 109, 123, 7],
          pp: [8, 7, 6, 5],
        },
        {
          ...opponent,
          partyIndex: 2,
          species: 25,
          personality: PIKACHU_PERSONALITY,
          hp: 19,
          maxHP: 60,
          status1: 1 << 6,
          moves: [85, 98, 86, 104],
          pp: [12, 29, 18, 14],
        },
        canonical.rules.battlers[2],
        canonical.rules.battlers[3],
      ],
    });
    const request: BattleCommandRequest = Object.freeze({
      kind: "command",
      requestId: 91,
      side: "player",
      battler: 0,
      legalDecisions: Object.freeze([
        Object.freeze({ kind: "use-move", moveSlot: 1, targetBattler: 0 }),
        Object.freeze({ kind: "use-move", moveSlot: 3, targetBattler: 1 }),
        Object.freeze({ kind: "switch", partyIndex: 2 }),
      ] as const),
    });

    const state = createBattleCommandPresentation(request, rules);
    expect(state.field).toMatchObject({
      player: {
        partyIndex: 1,
        species: 240,
        name: "MAGBY",
        hp: 37,
        maxHP: 138,
        status: "burn",
        moveIds: [52, 109, 123, 7],
        currentPP: [8, 7, 6, 5],
      },
      opponent: {
        partyIndex: 2,
        species: 25,
        name: "PIKACHU",
        hp: 19,
        maxHP: 60,
        status: "paralysis",
        moveIds: [85, 98, 86, 104],
        currentPP: [12, 29, 18, 14],
      },
    });
    expect(state.legalMoveBySlot).toEqual([
      null,
      { kind: "use-move", moveSlot: 1, targetBattler: 0 },
      null,
      { kind: "use-move", moveSlot: 3, targetBattler: 1 },
    ]);
    expect(state.legalSwitchPartyIndexes).toEqual([2]);
    expect(state.legalMoveBySlot[1]).not.toBe(request.legalDecisions[0]);
    expect(state.legalMoveBySlot[1]?.targetBattler).toBe(0);
  });

  it("rejects non-player, non-singles, and mismatched active-party identity", () => {
    const { request, rules } = canonicalBoundary();
    expect(() => createBattleCommandPresentation({
      ...request,
      side: "trainer",
      battler: 1,
    }, rules)).toThrow(BattleCommandPresentationError);
    expect(() => createBattleCommandPresentation(request, {
      ...rules,
      battleTopology: { ...rules.battleTopology, battlersCount: 4 },
    })).toThrow(/requires singles topology/);
    expect(() => createBattleCommandPresentation(request, {
      ...rules,
      battlers: [
        { ...rules.battlers[0], personality: 0 },
        rules.battlers[1],
        rules.battlers[2],
        rules.battlers[3],
      ],
    })).toThrow(/does not match party identity/);
  });
});
