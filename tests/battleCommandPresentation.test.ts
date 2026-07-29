import { describe, expect, it } from "vitest";
import {
  BATTLE2_ACTION_MENU_MODEL,
} from "../src/engine/battle2ActionMenu.ts";
import {
  BATTLE_COMMAND_ACTION_ENTER_DELAY,
  BATTLE_COMMAND_ACTION_LABELS,
  BattleCommandPresentationError,
  advanceBattleCommandPresentation,
  createBattleCommandPresentation,
  moveBattleCommandActionCursor,
  returnBattleCommandPartySelection,
  submitBattleCommandPresentationDecision,
  type BattleCommandPresentationState,
} from "../src/engine/battleCommandPresentation.ts";
import {
  createBattleCommandPresentationRenderView,
  renderBattleCommandPresentation,
  type BattleCommandPresentationRenderView,
} from "../src/engine/battleCommandPresentationRender.ts";
import type {
  BattleDecisionReducer,
  BattleCommandRequest,
  BattleState,
} from "../src/engine/battleDecisionBoundary.ts";
import {
  CLOSED_FIGHT_SUBMENU_STATE,
  FIGHT_SUBMENU_CLOSE_DELAY,
  FIGHT_SUBMENU_OPEN_DELAY,
} from "../src/engine/battleMenu.ts";
import {
  createBattleScriptRulesContext,
  type BattleScriptPartyMemberInput,
  type BattleScriptRulesContext,
} from "../src/engine/battleScriptRulesContext.ts";
import {
  createFactoryFullTurnBattleState,
  type FactoryFullTurnDecisionRules,
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
  battleState: BattleState<FactoryFullTurnDecisionRules>;
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
    battleState: state,
    request: state.boundary.request,
    rules: state.rules.rulesContext,
  });
}

function advanceFrames(
  state: BattleCommandPresentationState,
  frames: number,
  keys: ReadonlySet<"A" | "B" | "LEFT" | "RIGHT" | "UP" | "DOWN"> = new Set(),
): BattleCommandPresentationState {
  let next = state;
  for (let frame = 0; frame < frames; frame += 1) {
    next = advanceBattleCommandPresentation(next, keys);
  }
  return next;
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

describe("battle-command phase-relative lifecycle", () => {
  it.each([
    [0, "LEFT", 0],
    [0, "RIGHT", 1],
    [0, "UP", 0],
    [0, "DOWN", 2],
    [1, "LEFT", 0],
    [1, "RIGHT", 1],
    [1, "UP", 1],
    [1, "DOWN", 3],
    [2, "LEFT", 2],
    [2, "RIGHT", 3],
    [2, "UP", 0],
    [2, "DOWN", 2],
    [3, "LEFT", 2],
    [3, "RIGHT", 3],
    [3, "UP", 1],
    [3, "DOWN", 3],
  ] as const)(
    "moves action cursor %i %s to %i with the source 2x2 no-wrap rule",
    (cursor, direction, expected) => {
      expect(moveBattleCommandActionCursor(cursor, direction)).toBe(expected);
    },
  );

  it("navigates all four action positions, leaves BAG/RUN as chrome, and returns FIGHT B to the same cursor/request", () => {
    const { request, rules } = canonicalBoundary();
    let state = advanceFrames(
      createBattleCommandPresentation(request, rules),
      BATTLE_COMMAND_ACTION_ENTER_DELAY,
    );

    state = advanceBattleCommandPresentation(state, new Set(["RIGHT"] as const));
    expect(state.actionCursor).toBe(1);
    state = advanceBattleCommandPresentation(state, new Set(["A"] as const));
    expect(state.lifecycle.phase).toBe("action-menu");
    expect(state.pendingDecision).toBeNull();

    state = advanceBattleCommandPresentation(state, new Set(["DOWN"] as const));
    expect(state.actionCursor).toBe(3);
    state = advanceBattleCommandPresentation(state, new Set(["A"] as const));
    expect(state.lifecycle.phase).toBe("action-menu");
    expect(state.pendingDecision).toBeNull();

    state = advanceBattleCommandPresentation(state, new Set(["LEFT"] as const));
    expect(state.actionCursor).toBe(2);
    state = advanceBattleCommandPresentation(state, new Set(["UP"] as const));
    expect(state.actionCursor).toBe(0);
    state = advanceBattleCommandPresentation(state, new Set(["A"] as const));
    state = advanceFrames(state, FIGHT_SUBMENU_OPEN_DELAY);
    state = advanceBattleCommandPresentation(state, new Set(["B"] as const));
    state = advanceFrames(state, FIGHT_SUBMENU_CLOSE_DELAY);
    expect(state.lifecycle).toEqual({ phase: "action-menu", phaseElapsed: 0 });
    expect(state.actionCursor).toBe(0);
    expect(state.request).toEqual(request);
  });

  it("hands POKéMON the request-owned legal indexes and submits only an exact returned switch", () => {
    const canonical = canonicalBoundary();
    const request: BattleCommandRequest = {
      ...canonical.request,
      requestId: 92,
      legalDecisions: [
        { kind: "use-move", moveSlot: 0, targetBattler: 1 },
        { kind: "switch", partyIndex: 1 },
        { kind: "switch", partyIndex: 2 },
      ],
    };
    let state = advanceFrames(
      createBattleCommandPresentation(request, canonical.rules),
      BATTLE_COMMAND_ACTION_ENTER_DELAY,
    );
    state = advanceBattleCommandPresentation(state, new Set(["DOWN"] as const));
    expect(state.actionCursor).toBe(2);
    state = advanceBattleCommandPresentation(state, new Set(["A"] as const));
    expect(state.lifecycle).toEqual({ phase: "party-handoff", phaseElapsed: 0 });
    expect(state.legalSwitchPartyIndexes).toEqual([1, 2]);
    expect(state.pendingDecision).toBeNull();

    const beforeReturn = state;
    state = returnBattleCommandPartySelection(state, 0);
    expect(state).toBe(beforeReturn);
    state = returnBattleCommandPartySelection(state, 2);
    expect(state.lifecycle).toEqual({ phase: "submitting", phaseElapsed: 0 });
    expect(state.pendingDecision).toEqual({ kind: "switch", partyIndex: 2 });
  });

  it("advances relative clocks, opens FIGHT, applies source 2x2 JOY_NEW navigation with display lag, and preserves the cursor across B-close/reopen", () => {
    const { request, rules } = canonicalBoundary();
    let state = createBattleCommandPresentation(request, rules);

    state = advanceFrames(state, BATTLE_COMMAND_ACTION_ENTER_DELAY - 1);
    expect(state.lifecycle).toEqual({
      phase: "action-enter",
      phaseElapsed: BATTLE_COMMAND_ACTION_ENTER_DELAY - 1,
    });
    state = advanceBattleCommandPresentation(state, new Set());
    expect(state.lifecycle).toEqual({ phase: "action-menu", phaseElapsed: 0 });

    state = advanceBattleCommandPresentation(state, new Set(["A"] as const));
    expect(state.lifecycle).toEqual({ phase: "fight-opening", phaseElapsed: 0 });
    state = advanceFrames(state, FIGHT_SUBMENU_OPEN_DELAY - 1);
    expect(state.lifecycle).toEqual({
      phase: "fight-opening",
      phaseElapsed: FIGHT_SUBMENU_OPEN_DELAY - 1,
    });
    state = advanceBattleCommandPresentation(state, new Set(["RIGHT"] as const));
    expect(state.lifecycle).toEqual({ phase: "fight-menu", phaseElapsed: 0 });
    expect(state.fightCursor).toBe(1);
    expect(state.fightDisplayCursor).toBe(0);

    state = advanceBattleCommandPresentation(state, new Set());
    expect(state.fightDisplayCursor).toBe(1);
    state = advanceBattleCommandPresentation(state, new Set(["DOWN"] as const));
    expect(state.fightCursor).toBe(3);
    expect(state.fightDisplayCursor).toBe(1);
    state = advanceBattleCommandPresentation(state, new Set(["DOWN"] as const));
    expect(state.fightCursor).toBe(3);
    expect(state.fightDisplayCursor).toBe(3);

    state = advanceBattleCommandPresentation(state, new Set(["B"] as const));
    expect(state.lifecycle).toEqual({ phase: "fight-closing", phaseElapsed: 0 });
    state = advanceFrames(state, FIGHT_SUBMENU_CLOSE_DELAY - 1);
    expect(state.lifecycle.phase).toBe("fight-closing");
    state = advanceBattleCommandPresentation(state, new Set(["A"] as const));
    expect(state.lifecycle).toEqual({ phase: "fight-opening", phaseElapsed: 0 });
    expect(state.fightCursor).toBe(3);
    expect(state.fightDisplayCursor).toBe(3);
    expect(state.request).toEqual(request);

    state = advanceFrames(state, FIGHT_SUBMENU_OPEN_DELAY);
    expect(state.lifecycle).toEqual({ phase: "fight-menu", phaseElapsed: 0 });
    expect(state.fightCursor).toBe(3);
  });

  it("ignores A on a request-illegal move slot and submits slot 3 when that exact slot is legal", () => {
    const canonical = canonicalBoundary();
    const request: BattleCommandRequest = {
      ...canonical.request,
      requestId: 91,
      legalDecisions: [
        { kind: "use-move", moveSlot: 1, targetBattler: 0 },
        { kind: "use-move", moveSlot: 3, targetBattler: 1 },
        { kind: "switch", partyIndex: 2 },
      ],
    };
    let state = createBattleCommandPresentation(request, canonical.rules);
    state = advanceFrames(state, BATTLE_COMMAND_ACTION_ENTER_DELAY);
    state = advanceBattleCommandPresentation(state, new Set(["A"] as const));
    state = advanceFrames(state, FIGHT_SUBMENU_OPEN_DELAY);

    state = advanceBattleCommandPresentation(state, new Set(["A"] as const));
    expect(state.lifecycle.phase).toBe("fight-menu");
    expect(state.pendingDecision).toBeNull();

    state = advanceBattleCommandPresentation(state, new Set(["RIGHT"] as const));
    state = advanceBattleCommandPresentation(state, new Set(["DOWN"] as const));
    expect(state.fightCursor).toBe(3);
    state = advanceBattleCommandPresentation(state, new Set(["A"] as const));
    expect(state.lifecycle).toEqual({ phase: "submitting", phaseElapsed: 0 });
    expect(state.pendingDecision).toEqual({
      kind: "use-move",
      moveSlot: 3,
      targetBattler: 1,
    });
  });
});

describe("battle-command presentation renderer", () => {
  it("selects blank/action/FIGHT layers only from the typed lifecycle and forwards the display cursor", () => {
    const canonical = canonicalBoundary();
    const base = createBattleCommandPresentation(canonical.request, canonical.rules);
    const calls: string[] = [];
    const framebuffer = new Uint8Array(4);
    const assets = {
      drawActionMenu(
        receivedFramebuffer: Uint8Array,
        view: BattleCommandPresentationRenderView,
        revealed: boolean,
      ) {
        expect(receivedFramebuffer).toBe(framebuffer);
        calls.push(`action:${revealed}:${view.field.player.name}`);
      },
      drawFightMenu(
        receivedFramebuffer: Uint8Array,
        view: BattleCommandPresentationRenderView,
      ) {
        expect(receivedFramebuffer).toBe(framebuffer);
        calls.push(
          `fight:${view.fightMenu.displayCursor}:${view.field.player.name}`,
        );
      },
    };
    const at = (
      phase: BattleCommandPresentationState["lifecycle"]["phase"],
      phaseElapsed: number,
      cursors: readonly [0 | 1 | 2 | 3, 0 | 1 | 2 | 3] = [0, 0],
    ): BattleCommandPresentationState => Object.freeze({
      ...base,
      lifecycle: Object.freeze({ phase, phaseElapsed }),
      fightCursor: cursors[0],
      fightDisplayCursor: cursors[1],
    });

    renderBattleCommandPresentation(framebuffer, at("action-enter", 5), assets);
    renderBattleCommandPresentation(framebuffer, at("action-menu", 17), assets);
    renderBattleCommandPresentation(framebuffer, at("fight-opening", 4), assets);
    renderBattleCommandPresentation(framebuffer, at("fight-menu", 8, [3, 1]), assets);
    renderBattleCommandPresentation(framebuffer, at("fight-closing", 5, [3, 3]), assets);

    expect(calls).toEqual([
      "action:false:ONIX",
      "action:true:ONIX",
      "action:true:ONIX",
      "fight:1:ONIX",
      "fight:3:ONIX",
    ]);
  });

  it.each([
    ["poison", "burn"],
    ["burn", "paralysis"],
    ["paralysis", "poison"],
  ] as const)(
    "renders live non-full player %s and opponent %s healthboxes from the field snapshot",
    (playerStatus, opponentStatus) => {
      const canonical = canonicalBoundary();
      const presentation: BattleCommandPresentationState = Object.freeze({
        ...createBattleCommandPresentation(canonical.request, canonical.rules),
        lifecycle: Object.freeze({ phase: "fight-menu", phaseElapsed: 4 }),
        field: Object.freeze({
          player: Object.freeze({
            ...createBattleCommandPresentation(canonical.request, canonical.rules).field.player,
            species: 240,
            name: "MAGBY",
            gender: "female",
            hp: 37,
            maxHP: 138,
            status: playerStatus,
            moveIds: Object.freeze([52, 109, 123, 7] as const),
            currentPP: Object.freeze([8, 7, 6, 5] as const),
            ppBonuses: 0b11_10_01_00,
          }),
          opponent: Object.freeze({
            ...createBattleCommandPresentation(canonical.request, canonical.rules).field.opponent,
            species: 25,
            name: "PIKACHU",
            gender: "male",
            hp: 19,
            maxHP: 60,
            status: opponentStatus,
          }),
        }),
        fightDisplayCursor: 1,
      });
      const calls: BattleCommandPresentationRenderView[] = [];

      renderBattleCommandPresentation(new Uint8Array(4), presentation, {
        drawActionMenu() {
          throw new Error("fight-menu must not dispatch action chrome");
        },
        drawFightMenu(_framebuffer, received) {
          calls.push(received);
        },
      });

      expect(calls).toHaveLength(1);
      const view = calls[0]!;
      expect(view).toEqual(createBattleCommandPresentationRenderView(presentation));
      expect(view.healthboxes).toEqual({
        player: {
          name: "MAGBY",
          level: 50,
          gender: "female",
          hpFraction: 37 / 138,
          status: playerStatus,
          currentHp: 37,
          maxHp: 138,
        },
        opponent: {
          name: "PIKACHU",
          level: 50,
          gender: "male",
          hpFraction: 19 / 60,
          status: opponentStatus,
        },
      });
      expect(view.actionMenu).toEqual({
        prompt: "What will MAGBY do?",
        options: ["FIGHT", "BAG", "POKéMON", "RUN"],
        cursor: 0,
      });
      expect(view.fightMenu.displayCursor).toBe(1);
      expect(view.fightMenu.moveset.map((move) => [
        move.name,
        move.currentPP,
        move.maxPP,
      ])).toEqual([
        ["EMBER", 8, 25],
        ["CONFUSE RAY", 7, 12],
        ["SMOG", 6, 28],
        ["FIRE PUNCH", 5, 24],
      ]);
    },
  );
});

describe("battle-command ordinary submission bridge", () => {
  function stateForRequest(
    battleState: BattleState<FactoryFullTurnDecisionRules>,
    request: BattleCommandRequest,
  ): BattleState<FactoryFullTurnDecisionRules> {
    return {
      ...battleState,
      boundary: { kind: "decision-required", request },
    };
  }

  function terminalRecordingReducer(
    received: { decision: unknown }[],
  ): BattleDecisionReducer<FactoryFullTurnDecisionRules> {
    return (context) => {
      received.push({ decision: context.decision });
      return {
        rules: context.rules,
        events: [],
        boundary: { kind: "terminal", outcome: "player-win" },
      };
    };
  }

  it("returns null before submission, then passes the exact request-owned target through submitBattleDecision without mutating either input", () => {
    const canonical = canonicalBoundary();
    const request: BattleCommandRequest = {
      ...canonical.request,
      requestId: 91,
      legalDecisions: [
        { kind: "use-move", moveSlot: 1, targetBattler: 0 },
        { kind: "use-move", moveSlot: 3, targetBattler: 1 },
      ],
    };
    const battleState = stateForRequest(canonical.battleState, request);
    let presentation = createBattleCommandPresentation(request, canonical.rules);
    const received: { decision: unknown }[] = [];
    const reducer = terminalRecordingReducer(received);

    expect(submitBattleCommandPresentationDecision(
      battleState,
      presentation,
      reducer,
    )).toBeNull();

    presentation = advanceFrames(presentation, BATTLE_COMMAND_ACTION_ENTER_DELAY);
    presentation = advanceBattleCommandPresentation(
      presentation,
      new Set(["A"] as const),
    );
    presentation = advanceFrames(presentation, FIGHT_SUBMENU_OPEN_DELAY);
    presentation = advanceBattleCommandPresentation(
      presentation,
      new Set(["RIGHT"] as const),
    );
    presentation = advanceBattleCommandPresentation(
      presentation,
      new Set(["A"] as const),
    );
    const stateBefore = JSON.stringify(battleState);
    const presentationBefore = JSON.stringify(presentation);
    const result = submitBattleCommandPresentationDecision(
      battleState,
      presentation,
      reducer,
    );

    expect(received).toEqual([{
      decision: { kind: "use-move", moveSlot: 1, targetBattler: 0 },
    }]);
    expect(result?.kind).toBe("terminal");
    expect(JSON.stringify(battleState)).toBe(stateBefore);
    expect(JSON.stringify(presentation)).toBe(presentationBefore);
    expect(battleState.rng).toEqual(canonical.battleState.rng);
  });

  it("lets the kernel reject stale request identity and a forged illegal slot", () => {
    const canonical = canonicalBoundary();
    const request: BattleCommandRequest = {
      ...canonical.request,
      requestId: 91,
      legalDecisions: [
        { kind: "use-move", moveSlot: 3, targetBattler: 1 },
      ],
    };
    const presentation = createBattleCommandPresentation(request, canonical.rules);
    const submittingSlot3: BattleCommandPresentationState = {
      ...presentation,
      lifecycle: { phase: "submitting", phaseElapsed: 0 },
      pendingDecision: presentation.legalMoveBySlot[3],
    };
    const reducer = terminalRecordingReducer([]);

    expect(() => submitBattleCommandPresentationDecision(
      canonical.battleState,
      submittingSlot3,
      reducer,
    )).toThrow(/does not match current request/);

    const forgedIllegal: BattleCommandPresentationState = {
      ...submittingSlot3,
      pendingDecision: { kind: "use-move", moveSlot: 0, targetBattler: 1 },
    };
    expect(() => submitBattleCommandPresentationDecision(
      stateForRequest(canonical.battleState, request),
      forgedIllegal,
      reducer,
    )).toThrow(/not legal for current command request/);
  });

  it("passes a legal slot-3 decision through the kernel with no recorded 0/1/2 allowlist", () => {
    const canonical = canonicalBoundary();
    const request: BattleCommandRequest = {
      ...canonical.request,
      requestId: 92,
      legalDecisions: [
        { kind: "use-move", moveSlot: 3, targetBattler: 1 },
      ],
    };
    let presentation = createBattleCommandPresentation(request, canonical.rules);
    presentation = {
      ...presentation,
      lifecycle: { phase: "submitting", phaseElapsed: 0 },
      pendingDecision: presentation.legalMoveBySlot[3],
    };
    const received: { decision: unknown }[] = [];
    const result = submitBattleCommandPresentationDecision(
      stateForRequest(canonical.battleState, request),
      presentation,
      terminalRecordingReducer(received),
    );

    expect(result?.kind).toBe("terminal");
    expect(received).toEqual([{
      decision: { kind: "use-move", moveSlot: 3, targetBattler: 1 },
    }]);
  });
});
