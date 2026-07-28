import { describe, expect, it } from "vitest";
import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContext,
  type BattleScriptRulesContextInput,
  type BattleScriptStatusRulesExternalPorts,
} from "../src/engine/battleScriptRulesContext.ts";
import {
  acknowledgeBattleScriptMachineController,
  createBattleScriptRngState,
  createBattleScriptSchedulerState,
  stepBattleScriptMachine,
  type BattleScriptMachineState,
} from "../src/engine/battleScriptMachine.ts";
import {
  loadBattleScriptProgram,
  resolveBattleScriptLabel,
} from "../src/engine/battleScriptProgram.ts";
import { runBattleEndTurnOrchestration } from "../src/engine/battleEndTurnOrchestration.ts";
import {
  createFactoryFullTurnBattleState,
  submitFactoryFullTurnDecision,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";

const FOLLOW_ME = 266;
const FUTURE_SIGHT = 248;
const TACKLE = 33;
const SIDE_STATUS_FUTUREATTACK = 1 << 6;
const FACTORY_TRAINER = (1 << 19) | (1 << 3);
const GANLON_BERRY = 169;
const program = loadBattleScriptProgram();
const instruction = program.instructions.find(
  (candidate) => candidate.opcodeName === "B_SCR_OP_SETFORCEDTARGET",
)!;

function battler(
  changes: Partial<BattleScriptRulesBattler> = {},
): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 140,
    maxHP: changes.maxHP ?? 140,
    moves: changes.moves ?? ([FOLLOW_ME, 0, 0, 0] as const),
    pp: changes.pp ?? ([20, 0, 0, 0] as const),
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
    usedDisabledMove: changes.usedDisabledMove ?? 0,
    tauntTimer: changes.tauntTimer ?? 0,
    usedTauntedMove: changes.usedTauntedMove ?? 0,
    usedImprisonedMove: changes.usedImprisonedMove ?? 0,
    item: changes.item ?? 0,
    statStages: changes.statStages
      ?? ([6, 6, 6, 6, 6, 6, 6, 6] as const),
    types: changes.types ?? (["TYPE_NORMAL", "TYPE_NORMAL"] as const),
    species: changes.species ?? 35,
    personality: changes.personality ?? 1,
    attack: changes.attack ?? 50,
    defense: changes.defense ?? 100,
    spAttack: changes.spAttack ?? 50,
    spDefense: changes.spDefense ?? 100,
    speed: changes.speed ?? 100,
    level: changes.level ?? 50,
    friendship: changes.friendship ?? 70,
    partyIndex: changes.partyIndex ?? 0,
  }) as BattleScriptRulesBattler;
}

function rules(
  changes: Partial<BattleScriptRulesContextInput> = {},
): BattleScriptRulesContext {
  return createBattleScriptRulesContext({
    battlers: [
      battler(),
      battler({ side: 1, species: 242 }),
      battler(),
      battler({ side: 1, species: 242 }),
    ],
    selectorRoles: {
      attacker: 0,
      target: 0,
      effectBattler: 0,
      fainted: null,
    },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: FOLLOW_ME,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
    party: {
      player: [{ species: 35, hp: 140 }, {}, {}, {}, {}, {}],
      opponent: [{ species: 242, hp: 140 }, {}, {}, {}, {}, {}],
    },
    battleTopology: {
      battlersCount: 2,
      battleTypeFlags: FACTORY_TRAINER,
      battlerPositions: [0, 1, 2, 3],
    },
    ...changes,
  });
}

function ports(): BattleScriptStatusRulesExternalPorts {
  return Object.freeze({
    isControllerIdle: (context) =>
      context.state.scheduler.pendingControllerBattlers.length === 0,
    prepareMessage: (_context, operand) =>
      operand.expression.startsWith("STRINGID_")
        ? Object.freeze({
          kind: "message" as const,
          messageId: operand.expression,
          substitutions: Object.freeze([]),
        })
        : null,
    prepareSelectionMessage: () => null,
    prepareSelectionMessageFromTable: () => null,
    resolveAttackerBattler: (context) =>
      context.state.rulesContext.selectorRoles.attacker,
    resolveBattlerAtPosition: () => null,
    resolveHalfwordOperand: (_context, operand) =>
      operand.expression === "B_WAIT_TIME_LONG" ? 64 : null,
    resolveByteOperand: () => null,
  });
}

function atOpcode(
  rulesContext: BattleScriptRulesContext,
  seed = 0x1234_5678,
) {
  const execution = createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_EffectFollowMe",
    rulesContext,
    seed,
    ports(),
  );
  return Object.freeze({
    ...execution,
    state: Object.freeze({
      ...execution.state,
      programCounter: instruction.programCounter,
      callStack: Object.freeze([]),
      scheduler: createBattleScriptSchedulerState(),
      rng: createBattleScriptRngState(seed),
      events: Object.freeze([]),
    }),
  });
}

function stepOpcode(
  rulesContext: BattleScriptRulesContext,
  seed = 0x1234_5678,
) {
  const execution = atOpcode(rulesContext, seed);
  const result = stepBattleScriptMachine(
    program,
    execution.state,
    execution.handlers,
  );
  if (result.kind !== "advanced") {
    throw new Error(`setforcedtarget stopped at ${result.kind}`);
  }
  return result.state;
}

function withAttacker(
  source: BattleScriptRulesContext,
  attacker: 0 | 1 | 2 | 3,
): BattleScriptRulesContext {
  return Object.freeze({
    ...source,
    selectorRoles: Object.freeze({
      ...source.selectorRoles,
      attacker,
      effectBattler: attacker,
    }),
    scriptingBattler: attacker,
  });
}

function endTurn(
  rulesContext: BattleScriptRulesContext,
  seed = 0x1234_5678,
) {
  const execution = createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_HandleFaintedMon",
    rulesContext,
    seed,
    ports(),
  );
  return runBattleEndTurnOrchestration(
    program,
    execution.handlers,
    execution.state,
  );
}

describe("source-complete B_SCR_OP_SETFORCEDTARGET registration", () => {
  it("pins the sole operandless one-byte 0xca instruction and complete Follow Me effect order", () => {
    expect(program.instructions.filter(
      (candidate) => candidate.opcodeName === "B_SCR_OP_SETFORCEDTARGET",
    )).toHaveLength(1);
    expect(instruction).toMatchObject({
      opcodeId: 0xca,
      dispatcher: "Cmd_setforcedtarget",
      operands: [],
      source: { label: "BattleScript_EffectFollowMe" },
    });
    expect(1 + instruction.operands.reduce(
      (length, operand) => length + operand.widthBytes,
      0,
    )).toBe(1);
    const entry = resolveBattleScriptLabel(
      program,
      "BattleScript_EffectFollowMe",
    )!;
    expect(program.instructions.slice(
      entry.programCounter,
      entry.programCounter + 9,
    ).map(({ opcodeName }) => opcodeName)).toEqual([
      "B_SCR_OP_ATTACKCANCELER",
      "B_SCR_OP_ATTACKSTRING",
      "B_SCR_OP_PPREDUCE",
      "B_SCR_OP_SETFORCEDTARGET",
      "B_SCR_OP_ATTACKANIMATION",
      "B_SCR_OP_WAITANIMATION",
      "B_SCR_OP_PRINTSTRING",
      "B_SCR_OP_WAITMESSAGE",
      "B_SCR_OP_GOTO",
    ]);
  });

  it("advances exactly one byte, writes only the attacker's side, and owns no RNG, failure, event, HP, role, stat, or lock change", () => {
    const before = rules({
      battlers: [
        battler({ hp: 131 }),
        battler({ side: 1, hp: 132 }),
        battler({ hp: 133 }),
        battler({ side: 1, hp: 134 }),
      ],
      selectorRoles: {
        attacker: 2,
        target: 1,
        effectBattler: 3,
        fainted: null,
      },
      sideTimers: [
        {
          reflectTimer: 4,
          reflectBattlerId: 2,
          lightscreenTimer: 3,
          lightscreenBattlerId: 0,
          safeguardTimer: 2,
          safeguardBattlerId: 2,
          mistBattlerId: 0,
          followmeTimer: 9,
          followmeTarget: 0,
        },
        {
          reflectTimer: 7,
          reflectBattlerId: 3,
          lightscreenTimer: 6,
          lightscreenBattlerId: 1,
          safeguardTimer: 5,
          safeguardBattlerId: 3,
          mistBattlerId: 1,
          followmeTimer: 8,
          followmeTarget: 3,
        },
      ],
      lockedMoves: [11, 12, 13, 14],
      moveResultFlags: 0xa5,
      statChanger: 0x21,
    });
    const after = stepOpcode(before);

    expect(after.programCounter).toBe(instruction.programCounter + 1);
    expect(after.rulesContext.sideTimers[0]).toEqual({
      ...before.sideTimers[0],
      followmeTimer: 1,
      followmeTarget: 2,
    });
    expect(after.rulesContext.sideTimers[1]).toBe(before.sideTimers[1]);
    expect(after.rulesContext.battlers).toBe(before.battlers);
    expect(after.rulesContext.selectorRoles).toBe(before.selectorRoles);
    expect(after.rulesContext.lockedMoves).toBe(before.lockedMoves);
    expect(after.rulesContext.moveResultFlags).toBe(0xa5);
    expect(after.rulesContext.statChanger).toBe(0x21);
    expect(after.rng).toEqual(createBattleScriptRngState(0x1234_5678));
    expect(after.events).toEqual([]);
  });

  it("selects either side and later same-side users overwrite the stored target while preserving the opposite side", () => {
    const initial = rules({
      sideTimers: [
        {
          reflectTimer: 5,
          reflectBattlerId: 2,
          followmeTimer: 4,
          followmeTarget: 1,
        },
        {
          lightscreenTimer: 3,
          lightscreenBattlerId: 3,
          followmeTimer: 6,
          followmeTarget: 0,
        },
      ],
    });
    const firstSameSide = stepOpcode(withAttacker(initial, 2));
    expect(firstSameSide.rulesContext.sideTimers[0]).toMatchObject({
      reflectTimer: 5,
      reflectBattlerId: 2,
      followmeTimer: 1,
      followmeTarget: 2,
    });
    expect(firstSameSide.rulesContext.sideTimers[1]).toBe(initial.sideTimers[1]);

    const overwritten = stepOpcode(withAttacker(
      firstSameSide.rulesContext,
      0,
    ));
    expect(overwritten.rulesContext.sideTimers[0]).toMatchObject({
      reflectTimer: 5,
      reflectBattlerId: 2,
      followmeTimer: 1,
      followmeTarget: 0,
    });
    expect(overwritten.rulesContext.sideTimers[1]).toBe(
      firstSameSide.rulesContext.sideTimers[1],
    );

    const opposite = stepOpcode(withAttacker(
      overwritten.rulesContext,
      3,
    ));
    expect(opposite.rulesContext.sideTimers[0]).toBe(
      overwritten.rulesContext.sideTimers[0],
    );
    expect(opposite.rulesContext.sideTimers[1]).toMatchObject({
      lightscreenTimer: 3,
      lightscreenBattlerId: 3,
      followmeTimer: 1,
      followmeTarget: 3,
    });
    expect(opposite.rng.calls).toBe(0);
  });

  it("spends PP before the timer write in the ordinary effect program", () => {
    const before = rules({
      sideTimers: [
        { followmeTimer: 7, followmeTarget: 2 },
        { followmeTimer: 8, followmeTarget: 3 },
      ],
    });
    const execution = createBattleScriptStatusRulesExecution(
      program,
      "BattleScript_EffectFollowMe",
      before,
      99,
      ports(),
    );
    let state: BattleScriptMachineState<BattleScriptRulesContext> =
      execution.state;
    for (let budget = 0; budget < 64; budget += 1) {
      if (state.programCounter === instruction.programCounter) break;
      const result = stepBattleScriptMachine(
        program,
        state,
        execution.handlers,
      );
      if (result.kind === "blocked") {
        state = result.state.scheduler.pendingControllerBattlers.reduce(
          (current, battlerId) =>
            acknowledgeBattleScriptMachineController(current, battlerId),
          result.state,
        );
      } else if (result.kind === "advanced") {
        state = result.state;
      } else {
        throw new Error(`Follow Me prefix stopped at ${result.kind}`);
      }
    }
    expect(state.programCounter).toBe(instruction.programCounter);
    expect(state.rulesContext.battlers[0].pp[0]).toBe(19);
    expect(state.rulesContext.sideTimers[0]).toMatchObject({
      followmeTimer: 7,
      followmeTarget: 2,
    });

    const written = stepBattleScriptMachine(
      program,
      state,
      execution.handlers,
    );
    expect(written.kind).toBe("advanced");
    expect(written.state.rulesContext.battlers[0].pp[0]).toBe(19);
    expect(written.state.rulesContext.sideTimers[0]).toMatchObject({
      followmeTimer: 1,
      followmeTarget: 0,
    });
    expect(written.state.rng.calls).toBe(0);
  });
});

describe("Follow Me lifetime through the generic end-turn seam", () => {
  it("matches the entry-and-tail TurnValuesCleanUp calls idempotently: both timers stay zero, targets inert, all other side fields preserved, zero RNG", () => {
    const before = rules({
      sideTimers: [
        {
          reflectTimer: 4,
          reflectBattlerId: 2,
          safeguardTimer: 3,
          safeguardBattlerId: 0,
          followmeTimer: 1,
          followmeTarget: 2,
        },
        {
          lightscreenTimer: 2,
          lightscreenBattlerId: 3,
          mistBattlerId: 1,
          followmeTimer: 9,
          followmeTarget: 3,
        },
      ],
    });
    const result = endTurn(before);
    expect(result.kind).toBe("next-turn");
    expect(result.state.rulesContext.sideTimers).toEqual([
      { ...before.sideTimers[0], followmeTimer: 0 },
      { ...before.sideTimers[1], followmeTimer: 0 },
    ]);
    expect(result.state.rulesContext.sideTimers[0].followmeTarget).toBe(2);
    expect(result.state.rulesContext.sideTimers[1].followmeTarget).toBe(3);
    expect(result.state.rng.calls).toBe(0);

    const repeated = endTurn(result.state.rulesContext);
    expect(repeated.kind).toBe("next-turn");
    expect(repeated.state.rulesContext.sideTimers).toEqual(
      result.state.rulesContext.sideTimers,
    );
  });

  it("clears at entry before a nonterminal battler-case barrier can return, retaining inert targets and every unrelated side field", () => {
    const before = rules({
      battlers: [
        battler(),
        battler({ side: 1, item: GANLON_BERRY }),
        battler(),
        battler({ side: 1 }),
      ],
      sideTimers: [
        {
          reflectTimer: 4,
          reflectBattlerId: 2,
          followmeTimer: 7,
          followmeTarget: 2,
        },
        {
          lightscreenTimer: 3,
          lightscreenBattlerId: 3,
          followmeTimer: 8,
          followmeTarget: 3,
        },
      ],
    });
    const result = endTurn(before);
    expect(result.kind).toBe("case-barrier");
    if (result.kind !== "case-barrier") {
      throw new Error("expected the ENDTURN_ITEMS1 case barrier");
    }
    expect(result.caseName).toBe("ENDTURN_ITEMS1");
    expect(result.state.rulesContext.sideTimers).toEqual([
      { ...before.sideTimers[0], followmeTimer: 0 },
      { ...before.sideTimers[1], followmeTimer: 0 },
    ]);
  });

  it("clears at entry before the post-faint Wish/Perish positional phase, then repeats the idempotent clear at the tail", () => {
    const before = rules({
      currentMove: TACKLE,
      sideStatuses: [0, SIDE_STATUS_FUTUREATTACK],
      sideTimers: [
        { followmeTimer: 1, followmeTarget: 2, reflectTimer: 4 },
        { followmeTimer: 1, followmeTarget: 3, lightscreenTimer: 3 },
      ],
      futureSightCounter: [0, 1, 0, 0],
      futureSightMove: [0, FUTURE_SIGHT, 0, 0],
      futureSightAttacker: [0, 0, 0, 0],
      futureSightDmg: [0, 40, 0, 0],
    });
    const result = endTurn(before, 19);
    expect(result.kind).toBe("next-turn");
    expect(result.state.rulesContext.futureSightCounter[1]).toBe(0);
    expect(result.state.rulesContext.battlers[1].hp).toBeLessThan(140);
    expect(result.state.events).toContainEqual(expect.objectContaining({
      kind: "message",
      messageId: "STRINGID_PKMNTOOKATTACK",
    }));
    expect(result.state.rulesContext.sideTimers).toEqual([
      { ...before.sideTimers[0], followmeTimer: 0 },
      { ...before.sideTimers[1], followmeTimer: 0 },
    ]);
    expect(result.state.rulesContext.sideTimers[0].followmeTarget).toBe(2);
    expect(result.state.rulesContext.sideTimers[1].followmeTarget).toBe(3);
  });
});

describe("Follow Me through the generic Factory singles full-turn seam", () => {
  it("spends each user's PP, reaches the next decision with both timers cleared, and owns no HP/stat/RNG/forced-lock change", () => {
    const initial = createFactoryFullTurnBattleState({
      requestId: 1,
      rngSeed: 0x1234_5678,
      player: {
        species: 35,
        moveId: FOLLOW_ME,
        pp: [20, 0, 0, 0],
        attack: 50,
        defense: 100,
        spAttack: 50,
        spDefense: 100,
        speed: 100,
        hp: 177,
      },
      trainer: {
        species: 242,
        moveId: FOLLOW_ME,
        pp: [20, 0, 0, 0],
        attack: 50,
        defense: 100,
        spAttack: 50,
        spDefense: 100,
        speed: 50,
        hp: 362,
      },
    });
    expect(initial.boundary).toMatchObject({
      kind: "decision-required",
      request: {
        side: "player",
        legalDecisions: [
          { kind: "use-move", moveSlot: 0, targetBattler: 0 },
        ],
      },
    });
    const afterPlayer = submitFactoryFullTurnDecision(initial, {
      requestId: 1,
      side: "player",
      decision: { kind: "use-move", moveSlot: 0, targetBattler: 0 },
    });
    if (afterPlayer.kind !== "decision-required") {
      throw new Error("expected trainer Follow Me command");
    }
    expect(afterPlayer.nextRequest).toMatchObject({
      requestId: 2,
      side: "trainer",
      legalDecisions: [
        { kind: "use-move", moveSlot: 0, targetBattler: 1 },
      ],
    });
    const afterTurn = submitFactoryFullTurnDecision(afterPlayer.state, {
      requestId: 2,
      side: "trainer",
      decision: { kind: "use-move", moveSlot: 0, targetBattler: 1 },
    });
    if (afterTurn.kind !== "decision-required") {
      throw new Error("expected the next player decision");
    }

    const next = afterTurn.state.rules.rulesContext;
    expect(afterTurn.nextRequest).toMatchObject({
      requestId: 3,
      side: "player",
      legalDecisions: [
        { kind: "use-move", moveSlot: 0, targetBattler: 0 },
      ],
    });
    expect(next.battlers[0].pp).toEqual([19, 0, 0, 0]);
    expect(next.battlers[1].pp).toEqual([19, 0, 0, 0]);
    expect(next.sideTimers[0]).toMatchObject({
      followmeTimer: 0,
      followmeTarget: 0,
    });
    expect(next.sideTimers[1]).toMatchObject({
      followmeTimer: 0,
      followmeTarget: 1,
    });
    expect(next.battlers[0].hp).toBe(177);
    expect(next.battlers[1].hp).toBe(362);
    expect(next.battlers[0].statStages).toEqual([6, 6, 6, 6, 6, 6, 6, 6]);
    expect(next.battlers[1].statStages).toEqual([6, 6, 6, 6, 6, 6, 6, 6]);
    expect(next.battlers[0].status2).toBe(0);
    expect(next.battlers[1].status2).toBe(0);
    expect(next.lockedMoves).toEqual([0, 0, 0, 0]);
    expect(afterTurn.state.rng.calls).toBe(0);
  });
});
