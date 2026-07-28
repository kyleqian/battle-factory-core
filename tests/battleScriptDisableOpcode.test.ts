import { describe, expect, it } from "vitest";
import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContextInput,
  type BattleScriptStatusRulesExternalPorts,
} from "../src/engine/battleScriptRulesContext.ts";
import {
  stepBattleScriptMachine,
} from "../src/engine/battleScriptMachine.ts";
import { loadBattleScriptProgram } from "../src/engine/battleScriptProgram.ts";
import { runBattleEndTurnOrchestration } from "../src/engine/battleEndTurnOrchestration.ts";
import {
  createFactoryFullTurnBattleState,
  submitFactoryFullTurnDecision,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";

const DISABLE = 50;
const TACKLE = 33;
const STRUGGLE = 165;
const MULTI_TURN = 1 << 12;
const FACTORY = (1 << 19) | (1 << 3);
const program = loadBattleScriptProgram();
const instruction = program.instructions.find(
  (candidate) => candidate.opcodeName === "B_SCR_OP_DISABLELASTUSEDATTACK",
)!;

function battler(changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return {
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 100,
    maxHP: changes.maxHP ?? 100,
    moves: changes.moves ?? [TACKLE, 0, 0, 0],
    pp: changes.pp ?? [35, 0, 0, 0],
    status1: changes.status1 ?? 0,
    status2: changes.status2 ?? 0,
    status3: changes.status3 ?? 0,
    substituteHP: changes.substituteHP ?? 0,
    rolloutTimer: changes.rolloutTimer ?? 0,
    furyCutterCounter: changes.furyCutterCounter ?? 0,
    truantCounter: changes.truantCounter ?? 0,
    rechargeTimer: changes.rechargeTimer ?? 0,
    flinchImmobility: changes.flinchImmobility ?? 0,
    disabledMove: changes.disabledMove ?? 0,
    disableTimer: changes.disableTimer,
    disableTimerStartValue: changes.disableTimerStartValue,
    usedDisabledMove: changes.usedDisabledMove ?? 0,
    tauntTimer: changes.tauntTimer ?? 0,
    usedTauntedMove: changes.usedTauntedMove ?? 0,
    usedImprisonedMove: changes.usedImprisonedMove ?? 0,
    encoreTimer: changes.encoreTimer,
    encoredMove: changes.encoredMove,
    item: changes.item ?? 0,
    statStages: changes.statStages ?? [6, 6, 6, 6, 6, 6, 6, 6],
    types: changes.types ?? ["TYPE_NORMAL", "TYPE_NORMAL"],
    species: changes.species ?? 1,
    personality: changes.personality ?? 1,
    attack: changes.attack ?? 100,
    defense: changes.defense ?? 100,
    spAttack: changes.spAttack ?? 100,
    spDefense: changes.spDefense ?? 100,
    speed: changes.speed ?? 100,
    level: changes.level ?? 50,
    friendship: changes.friendship ?? 70,
    partyIndex: changes.partyIndex ?? 0,
  };
}

function rules(changes: Partial<BattleScriptRulesContextInput> = {}) {
  return createBattleScriptRulesContext({
    battlers: changes.battlers ?? [
      battler({ side: 0, moves: [DISABLE, 0, 0, 0], pp: [20, 0, 0, 0] }),
      battler({ side: 1 }),
      battler({ side: 0, hp: 0 }),
      battler({ side: 1, hp: 0 }),
    ],
    selectorRoles: changes.selectorRoles ?? {
      attacker: 0,
      target: 1,
      effectBattler: 1,
      fainted: null,
    },
    scriptingBattler: changes.scriptingBattler ?? 0,
    atkCancelerTracker: changes.atkCancelerTracker ?? 0,
    battleOutcome: changes.battleOutcome ?? 0,
    currentMove: changes.currentMove ?? DISABLE,
    currentMovePosition: changes.currentMovePosition ?? 0,
    moveResultFlags: changes.moveResultFlags ?? 0,
    dmgMultiplier: changes.dmgMultiplier ?? 1,
    critMultiplier: changes.critMultiplier ?? 1,
    moveEffectByte: changes.moveEffectByte ?? 0,
    missType: changes.missType ?? 0,
    hitMarker: changes.hitMarker ?? 0,
    multiHitCounter: changes.multiHitCounter ?? 0,
    moveHistory: changes.moveHistory ?? { lastMoves: [0, TACKLE, 0, 0] },
    party: changes.party ?? {
      player: [{ species: 1, hp: 100 }, {}, {}, {}, {}, {}],
      opponent: [{ species: 1, hp: 100 }, {}, {}, {}, {}, {}],
    },
    battleTopology: changes.battleTopology ?? {
      battlersCount: 2,
      battleTypeFlags: FACTORY,
      battlerPositions: [0, 1, 0xff, 0xff],
    },
  });
}

function ports(): BattleScriptStatusRulesExternalPorts {
  return {
    isControllerIdle: (context) =>
      context.state.scheduler.pendingControllerBattlers.length === 0,
    prepareMessage: (_context, operand) => operand.expression.startsWith("STRINGID_")
      ? { kind: "message", messageId: operand.expression, substitutions: [] }
      : null,
    prepareSelectionMessage: () => null,
    prepareSelectionMessageFromTable: () => null,
    resolveAttackerBattler: (context) =>
      context.state.rulesContext.selectorRoles.attacker,
    resolveBattlerAtPosition: () => null,
    resolveHalfwordOperand: (_context, operand) =>
      operand.expression === "B_WAIT_TIME_LONG" ? 64 : null,
    resolveByteOperand: () => null,
  };
}

function atOpcode(source = rules(), seed = 1) {
  const execution = createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_EffectDisable",
    source,
    seed,
    ports(),
  );
  return {
    ...execution,
    state: Object.freeze({
      ...execution.state,
      programCounter: instruction.programCounter,
    }),
  };
}

describe("B_SCR_OP_DISABLELASTUSEDATTACK", () => {
  it("registers exact five-byte 0xa3 pointer encoding", () => {
    expect(instruction).toMatchObject({
      opcodeId: 0xa3,
      dispatcher: "Cmd_disablelastusedattack",
      operands: [
        expect.objectContaining({
          widthBytes: 4,
          expression: "BattleScript_ButItFailed",
        }),
      ],
    });
    expect(
      1 + instruction.operands.reduce((sum, operand) => sum + operand.widthBytes, 0),
    ).toBe(5);
  });

  it.each([0, 1] as const)(
    "stores target-owned move/timer for attacker %i with one masked RNG draw and no lock mutation",
    (attacker) => {
      const target = (attacker ^ 1) as 0 | 1;
      const battlers = [
        battler({ side: 0, moves: [DISABLE, 0, 0, 0], pp: [20, 0, 0, 0] }),
        battler({ side: 1, status2: MULTI_TURN }),
        battler({ side: 0, hp: 0 }),
        battler({ side: 1, hp: 0 }),
      ];
      battlers[target] = battler({
        side: target,
        moves: [TACKLE, TACKLE, 0, 0],
        pp: [35, 12, 0, 0],
        status2: MULTI_TURN,
      });
      const source = rules({
        battlers,
        selectorRoles: { attacker, target, effectBattler: target, fainted: null },
        moveHistory: { lastMoves: target === 0 ? [TACKLE, 0, 0, 0] : [0, TACKLE, 0, 0] },
      });
      const execution = atOpcode(source, 7);
      const result = stepBattleScriptMachine(program, execution.state, execution.handlers);
      expect(result.kind).toBe("advanced");
      const installed = result.state.rulesContext.battlers[target];
      expect(installed.disabledMove).toBe(TACKLE);
      expect(installed.disableTimer).toBeGreaterThanOrEqual(2);
      expect(installed.disableTimer).toBeLessThanOrEqual(5);
      expect(installed.disableTimerStartValue).toBe(installed.disableTimer);
      expect(installed.status2).toBe(MULTI_TURN);
      expect(result.state.rulesContext.battlers[attacker === 0 ? 1 : 0])
        .not.toBe(source.battlers[attacker === 0 ? 1 : 0]);
      expect(result.state.rng.calls).toBe(1);
      expect(result.state.rng.ledger[0]!.reason).toBe(
        "Disable duration ((Random() & 3) + 2)",
      );
      expect(Object.isFrozen(installed)).toBe(true);
    },
  );

  it("the first duplicate-id slot owns the zero-PP failure even when a later duplicate has PP", () => {
    const source = rules({
      battlers: [
        battler({ side: 0, moves: [DISABLE, 0, 0, 0], pp: [20, 0, 0, 0] }),
        battler({ side: 1, moves: [TACKLE, TACKLE, 0, 0], pp: [0, 35, 0, 0] }),
        battler({ side: 0, hp: 0 }),
        battler({ side: 1, hp: 0 }),
      ],
    });
    const execution = atOpcode(source, 9);
    const result = stepBattleScriptMachine(program, execution.state, execution.handlers);
    expect(program.instructions[result.state.programCounter]!.source.label)
      .toBe("BattleScript_ButItFailed");
    expect(result.state.rulesContext).toBe(source);
    expect(result.state.rng).toBe(execution.state.rng);
  });

  it.each([
    ["zero", 0, 0],
    ["invalid", 999, 0],
    ["Struggle", STRUGGLE, 0],
    ["unavailable", 0xffff, 0],
    ["already disabled", TACKLE, TACKLE],
  ] as const)("takes %s failure with zero command-local mutation/RNG", (_name, lastMove, disabledMove) => {
    const source = rules({
      battlers: [
        battler({ side: 0, moves: [DISABLE, 0, 0, 0], pp: [20, 0, 0, 0] }),
        battler({
          side: 1,
          moves: [TACKLE, TACKLE, 0, 0],
          pp: [35, 35, 0, 0],
          disabledMove,
          disableTimer: disabledMove === 0 ? 0 : 4,
          disableTimerStartValue: disabledMove === 0 ? 0 : 4,
          encoreTimer: 3,
          encoredMove: TACKLE,
        }),
        battler({ side: 0, hp: 0 }),
        battler({ side: 1, hp: 0 }),
      ],
      moveHistory: { lastMoves: [0, lastMove, 0, 0] },
    });
    const execution = atOpcode(source, 13);
    const result = stepBattleScriptMachine(program, execution.state, execution.handlers);
    expect(program.instructions[result.state.programCounter]!.source.label)
      .toBe("BattleScript_ButItFailed");
    expect(result.state.rulesContext).toBe(source);
    expect(result.state.rng).toBe(execution.state.rng);
  });

  it("validates and freezes both four-bit timer fields", () => {
    const source = rules({
      battlers: [
        battler({ disableTimer: 15, disableTimerStartValue: 15 }),
        battler({ side: 1 }),
        battler(),
        battler({ side: 1 }),
      ],
    });
    expect(source.battlers[0]).toMatchObject({
      disableTimer: 15,
      disableTimerStartValue: 15,
    });
    expect(Object.isFrozen(source.battlers[0])).toBe(true);
    expect(() => rules({
      battlers: [battler({ disableTimer: 16 }), battler(), battler(), battler()],
    })).toThrow("battlers[0].disableTimer must be an unsigned integer <= 15");
    expect(() => rules({
      battlers: [
        battler({ disableTimerStartValue: 16 }),
        battler(),
        battler(),
        battler(),
      ],
    })).toThrow("battlers[0].disableTimerStartValue must be an unsigned integer <= 15");
  });
});

describe("ENDTURN_DISABLE", () => {
  function endTurn(source: ReturnType<typeof rules>) {
    const execution = createBattleScriptStatusRulesExecution(
      program,
      "BattleScript_HandleFaintedMon",
      source,
      1,
      ports(),
    );
    return runBattleEndTurnOrchestration(program, execution.handlers, execution.state);
  }

  it("silently clears a stale move id without decrement/message and retains start value", () => {
    const source = rules({
      battlers: [
        battler({ moves: [DISABLE, 0, 0, 0] }),
        battler({
          side: 1,
          moves: [TACKLE, 0, 0, 0],
          disabledMove: 92,
          disableTimer: 4,
          disableTimerStartValue: 5,
        }),
        battler({ hp: 0 }),
        battler({ side: 1, hp: 0 }),
      ],
    });
    const result = endTurn(source);
    expect(result.kind).toBe("next-turn");
    expect(result.state.rulesContext.battlers[1]).toMatchObject({
      disabledMove: 0,
      disableTimer: 0,
      disableTimerStartValue: 5,
    });
    expect(result.state.events.some(
      (event) => event.kind === "message"
        && event.messageId === "STRINGID_PKMNMOVEDISABLEDNOMORE",
    )).toBe(false);
  });

  it("predecrements in battler order, retaining start value, and emits only on zero", () => {
    const source = rules({
      battlers: [
        battler({ moves: [DISABLE, 0, 0, 0] }),
        battler({
          side: 1,
          moves: [TACKLE, 0, 0, 0],
          disabledMove: TACKLE,
          disableTimer: 2,
          disableTimerStartValue: 2,
        }),
        battler({ hp: 0 }),
        battler({ side: 1, hp: 0 }),
      ],
    });
    const first = endTurn(source);
    expect(first.kind).toBe("next-turn");
    expect(first.state.rulesContext.battlers[1]).toMatchObject({
      disabledMove: TACKLE,
      disableTimer: 1,
      disableTimerStartValue: 2,
    });
    expect(first.state.events.some(
      (event) => event.kind === "message"
        && event.messageId === "STRINGID_PKMNMOVEDISABLEDNOMORE",
    )).toBe(false);
    const second = endTurn(first.state.rulesContext);
    expect(second.kind).toBe("next-turn");
    expect(second.state.rulesContext.battlers[1]).toMatchObject({
      disabledMove: 0,
      disableTimer: 0,
      disableTimerStartValue: 2,
    });
    expect(second.state.events.some(
      (event) => event.kind === "message"
        && event.messageId === "STRINGID_PKMNMOVEDISABLEDNOMORE",
    )).toBe(true);
    expect(second.state.rng.calls).toBe(0);
  });
});

describe("Disable through the generic Factory full-turn seam", () => {
  it("filters every disabled duplicate and completes forced Struggle through the shared recoil route", () => {
    let state = createFactoryFullTurnBattleState({
      requestId: 1,
      rngSeed: 9,
      player: {
        species: 64,
        moveId: DISABLE,
        moves: [93, 272, 248, DISABLE],
        pp: [25, 10, 15, 20],
        ability: 28,
        item: 214,
        friendship: 70,
        attack: 55,
        defense: 90,
        spAttack: 126,
        spDefense: 90,
        speed: 125,
        hp: 147,
        maxHp: 147,
        types: ["TYPE_PSYCHIC", "TYPE_PSYCHIC"],
      },
      trainer: {
        species: 242,
        moveId: TACKLE,
        moves: [TACKLE, TACKLE, TACKLE, TACKLE],
        pp: [35, 35, 35, 35],
        ability: 30,
        attack: 13,
        defense: 13,
        spAttack: 13,
        spDefense: 105,
        speed: 50,
        hp: 362,
        maxHp: 362,
        types: ["TYPE_NORMAL", "TYPE_NORMAL"],
      },
    });

    const submit = (
      side: "player" | "trainer",
      requestId: number,
      moveSlot: 0 | 1 | 2 | 3,
      targetBattler: 0 | 1,
    ) => {
      const result = submitFactoryFullTurnDecision(state, {
        requestId,
        side,
        decision: { kind: "use-move", moveSlot, targetBattler },
      });
      state = result.state;
      return result;
    };

    // Establish the target-owned gLastMoves value through a genuine turn.
    submit("player", 1, 0, 1);
    submit("trainer", 2, 2, 0);
    expect(state.rules.rulesContext.moveHistory.lastMoves[1]).toBe(TACKLE);
    expect(state.rules.rulesContext.battlers[0].pp).toEqual([24, 10, 15, 20]);
    expect(state.rules.rulesContext.battlers[1].pp).toEqual([35, 35, 34, 35]);

    // Kadabra is faster: Disable lands after decisions are collected, so the
    // already-selected Tackle follows CANCELER_DISABLED rather than spending PP.
    submit("player", 3, 3, 1);
    submit("trainer", 4, 0, 0);
    expect(state.rules.rulesContext.battlers[0].pp).toEqual([24, 10, 15, 19]);
    expect(state.rules.rulesContext.battlers[1].pp).toEqual([35, 35, 34, 35]);
    expect(state.rules.rulesContext.battlers[1]).toMatchObject({
      disabledMove: TACKLE,
      disableTimer: 1,
      disableTimerStartValue: 2,
      usedDisabledMove: 0,
    });

    // The next selection sees every duplicate-id slot disabled and exposes
    // exactly one forced Struggle command.
    const afterDuplicatePlayer = submit("player", 5, 3, 1);
    expect(afterDuplicatePlayer.kind).toBe("decision-required");
    if (afterDuplicatePlayer.kind !== "decision-required") {
      throw new Error("expected forced trainer decision");
    }
    if (afterDuplicatePlayer.nextRequest.kind !== "command") {
      throw new Error("expected forced Struggle command");
    }
    expect(afterDuplicatePlayer.nextRequest.legalDecisions).toEqual([
      { kind: "use-move", moveSlot: 0, targetBattler: 0 },
    ]);
    const playerHpBeforeStruggle = state.rules.rulesContext.battlers[0].hp;
    const trainerHpBeforeStruggle = state.rules.rulesContext.battlers[1].hp;
    const completed = submit("trainer", 6, 0, 0);
    expect(completed).toMatchObject({
      kind: "decision-required",
      nextRequest: {
        kind: "command",
        requestId: 7,
        side: "player",
      },
    });
    if (completed.kind !== "decision-required") {
      throw new Error("expected the completed Struggle turn's next command");
    }
    expect(completed.state.boundary).toEqual({
      kind: "decision-required",
      request: completed.nextRequest,
    });
    expect(state.rules.rulesContext.battlers[0].pp).toEqual([24, 10, 15, 18]);
    expect(state.rules.rulesContext.battlers[1].pp).toEqual([35, 35, 34, 35]);
    expect(state.rules.rulesContext.currentMove).toBe(0);
    expect(state.rules.rulesContext.moveHistory.lastMoves[1]).toBe(STRUGGLE);
    expect(state.rules.rulesContext.battlers[1]).toMatchObject({
      disabledMove: 0,
      disableTimer: 0,
    });
    expect(state.rules.rulesContext.battlers[0].hp).toBeLessThan(
      playerHpBeforeStruggle,
    );
    expect(state.rules.rulesContext.battlers[1].hp).toBeLessThan(
      trainerHpBeforeStruggle,
    );
    expect(completed.events.some(({ payload }) =>
      payload.kind === "message"
      && payload.messageId === "STRINGID_PKMNHITWITHRECOIL"
    )).toBe(true);
    expect(completed.events.some(({ payload }) =>
      payload.kind === "game-stat-increment"
    )).toBe(false);
  });
});
