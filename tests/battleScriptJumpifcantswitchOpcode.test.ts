import { describe, expect, it } from "vitest";
import {
  createBattleScriptJumpifcantswitchOpcodeHandlers,
} from "../src/engine/battleScriptJumpifcantswitchOpcode.ts";
import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  BATTLE_SCRIPT_BATTLE_TYPE_DOUBLE,
  BATTLE_SCRIPT_BATTLE_TYPE_FACTORY,
  BATTLE_SCRIPT_BATTLE_TYPE_TRAINER,
  type BattleScriptPartyMemberInput,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContext,
  type BattleScriptRulesContextInput,
  type BattleScriptStatusRulesExternalPorts,
} from "../src/engine/battleScriptRulesContext.ts";
import {
  acknowledgeBattleScriptMachineController,
  createBattleScriptMachine,
  createBattleScriptSchedulerState,
  stepBattleScriptMachine,
  type BattleScriptMachineState,
} from "../src/engine/battleScriptMachine.ts";
import {
  loadBattleScriptProgram,
  resolveBattleScriptLabel,
  type BattleScriptInstruction,
  type BattleScriptProgram,
} from "../src/engine/battleScriptProgram.ts";
import { BATTLE_SCRIPT_STATUS2_WRAPPED_MASK } from "../src/engine/battleScriptSourceConstants.ts";

const MOVE_BATON_PASS = 226;
const MOVE_RESULT_FAILED = 1 << 5;
const STATUS2_ESCAPE_PREVENTION = 1 << 26;
const STATUS3_ROOTED = 1 << 10;
const NEUTRAL_STAGES = Object.freeze([6, 6, 6, 6, 6, 6, 6, 6]);
const RAISED_STAGES = Object.freeze([6, 7, 8, 9, 5, 4, 3, 2]);
const program = loadBattleScriptProgram();
const starts = program.instructions.filter(
  (instruction) => instruction.opcodeName === "B_SCR_OP_JUMPIFCANTSWITCH",
);
const batonStart = starts.find(
  (instruction) => instruction.source.label === "BattleScript_EffectBatonPass",
)!;
const faintedStart = starts.find(
  (instruction) => instruction.source.label === "BattleScript_FaintedMonTryChoose",
)!;

function battler(
  side: 0 | 1,
  changes: Partial<BattleScriptRulesBattler> = {},
): BattleScriptRulesBattler {
  return Object.freeze({
    side,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 100,
    maxHP: changes.maxHP ?? changes.hp ?? 100,
    moves: changes.moves ?? Object.freeze([MOVE_BATON_PASS, 0, 0, 0]),
    pp: changes.pp ?? Object.freeze([40, 0, 0, 0]),
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
    statStages: changes.statStages ?? NEUTRAL_STAGES,
    types: changes.types ?? (["TYPE_BUG", "TYPE_FLYING"] as const),
    species: changes.species ?? (side === 0 ? 165 : 129),
    personality: changes.personality ?? 1,
    attack: changes.attack ?? 100,
    defense: changes.defense ?? 100,
    spAttack: changes.spAttack ?? 100,
    spDefense: changes.spDefense ?? 100,
    speed: changes.speed ?? 100,
    level: changes.level ?? 50,
    friendship: changes.friendship ?? 70,
    partyIndex: changes.partyIndex ?? 0,
  });
}

function partyMember(
  species: number,
  hp: number,
  changes: Partial<BattleScriptPartyMemberInput> = {},
): BattleScriptPartyMemberInput {
  return Object.freeze({
    species,
    hp,
    isEgg: changes.isEgg ?? false,
    status1: changes.status1 ?? 0,
    moves: changes.moves ?? ([33, 0, 0, 0] as const),
  });
}

const EMPTY_PARTY = Object.freeze([
  partyMember(0, 0),
  partyMember(0, 0),
  partyMember(0, 0),
  partyMember(0, 0),
  partyMember(0, 0),
  partyMember(0, 0),
]);

function context(
  changes: Partial<BattleScriptRulesContextInput> = {},
): BattleScriptRulesContext {
  return createBattleScriptRulesContext({
    battlers: [
      battler(0),
      battler(1),
      battler(0),
      battler(1),
    ],
    selectorRoles: { attacker: 0, target: 1, effectBattler: 1 },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: MOVE_BATON_PASS,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
    chosenMove: MOVE_BATON_PASS,
    battleTopology: {
      battlersCount: 2,
      battleTypeFlags:
        BATTLE_SCRIPT_BATTLE_TYPE_TRAINER | BATTLE_SCRIPT_BATTLE_TYPE_FACTORY,
      battlerPositions: [0, 1, 0xff, 0xff],
    },
    party: {
      player: Object.freeze([
        partyMember(165, 115, { moves: [60, 97, 226, 113] }),
        partyMember(1, 120),
        partyMember(0, 0),
        partyMember(0, 0),
        partyMember(0, 0),
        partyMember(0, 0),
      ]),
      opponent: Object.freeze([
        partyMember(129, 95),
        partyMember(187, 110),
        partyMember(0, 0),
        partyMember(0, 0),
        partyMember(0, 0),
        partyMember(0, 0),
      ]),
    },
    ...changes,
  });
}

function directState(
  instruction: BattleScriptInstruction,
  rules: BattleScriptRulesContext,
) {
  const initial = createBattleScriptMachine(
    program,
    instruction.source.label,
    rules,
    0x1234_5678,
    createBattleScriptSchedulerState({
      messageDisplayActive: true,
      pauseCounterBattle: 7,
      activeBattler: 3,
      pendingControllerBattlers: [1],
    }),
  );
  return Object.freeze({ ...initial, programCounter: instruction.programCounter });
}

function externalPorts(): BattleScriptStatusRulesExternalPorts {
  return Object.freeze({
    isControllerIdle: () => true,
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
    resolveAttackerBattler: () => null,
    resolveBattlerAtPosition: () => null,
    resolveHalfwordOperand: (_context, operand) =>
      operand.expression === "B_WAIT_TIME_SHORT"
        ? 32
        : operand.expression === "B_WAIT_TIME_LONG"
          ? 64
          : null,
    resolveByteOperand: () => null,
  });
}

function acknowledgeAllPending(
  state: BattleScriptMachineState<BattleScriptRulesContext>,
): BattleScriptMachineState<BattleScriptRulesContext> {
  let next = state;
  for (const battlerId of state.scheduler.pendingControllerBattlers) {
    next = acknowledgeBattleScriptMachineController(next, battlerId);
  }
  return next;
}

function runBatonPassToTerminal(
  rules: BattleScriptRulesContext,
): BattleScriptMachineState<BattleScriptRulesContext> {
  const execution = createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_EffectBatonPass",
    rules,
    0x1234_5678,
    externalPorts(),
  );
  let state = execution.state;
  for (let guard = 0; guard < 600; guard += 1) {
    const result = stepBattleScriptMachine(program, state, execution.handlers);
    state = result.state;
    if (result.kind === "blocked") {
      state = acknowledgeAllPending(state);
      continue;
    }
    if (result.kind === "halted") {
      expect(state.haltReason).toMatchObject({
        kind: "terminal",
        opcodeName: "B_SCR_OP_END",
      });
      return state;
    }
  }
  throw new Error("BattleScript_EffectBatonPass did not reach its real END");
}

function replaceStart(
  target: BattleScriptInstruction,
  changes: Partial<BattleScriptInstruction>,
): BattleScriptProgram {
  return Object.freeze({
    ...program,
    instructions: Object.freeze(program.instructions.map((instruction) =>
      instruction === target
        ? Object.freeze({ ...instruction, ...changes })
        : instruction
    )),
  }) as BattleScriptProgram;
}

describe("source-complete B_SCR_OP_JUMPIFCANTSWITCH registration", () => {
  it("pins exactly the two assembled six-byte starts and operand shapes", () => {
    expect(starts).toHaveLength(2);
    expect(starts.map((instruction) => ({
      opcodeId: instruction.opcodeId,
      dispatcher: instruction.dispatcher,
      label: instruction.source.label,
      line: instruction.source.statementLine,
      operands: instruction.operands.map((operand) => [
        operand.widthBytes,
        operand.expression,
      ]),
    }))).toEqual([
      {
        opcodeId: 79,
        dispatcher: "Cmd_jumpifcantswitch",
        label: "BattleScript_EffectBatonPass",
        line: 1699,
        operands: [
          [1, "SWITCH_IGNORE_ESCAPE_PREVENTION | BS_ATTACKER"],
          [4, "BattleScript_ButItFailed"],
        ],
      },
      {
        opcodeId: 79,
        dispatcher: "Cmd_jumpifcantswitch",
        label: "BattleScript_FaintedMonTryChoose",
        line: 2853,
        operands: [
          [1, "BS_PLAYER1"],
          [4, "BattleScript_FaintedMonSendOutNew"],
        ],
      },
    ]);
    expect(batonStart.operands.reduce((bytes, operand) => bytes + operand.widthBytes, 1))
      .toBe(6);
  });

  it("strictly rejects missing, duplicate, unknown-selector, wrong-width, pointer, and source shapes", () => {
    const without = Object.freeze({
      ...program,
      instructions: Object.freeze(program.instructions.filter(
        (instruction) => instruction !== batonStart,
      )),
    }) as BattleScriptProgram;
    expect(() => createBattleScriptJumpifcantswitchOpcodeHandlers(without))
      .toThrow(/requires exactly 2 concrete starts, got 1/);
    const duplicated = Object.freeze({
      ...program,
      instructions: Object.freeze([...program.instructions, batonStart]),
    }) as BattleScriptProgram;
    expect(() => createBattleScriptJumpifcantswitchOpcodeHandlers(duplicated))
      .toThrow(/requires exactly 2 concrete starts, got 3/);
    expect(() => createBattleScriptJumpifcantswitchOpcodeHandlers(
      replaceStart(batonStart, {
        operands: Object.freeze([
          { ...batonStart.operands[0]!, expression: "BS_TARGET" },
          batonStart.operands[1]!,
        ]),
      }),
    )).toThrow(/invalid B_SCR_OP_JUMPIFCANTSWITCH shape/);
    expect(() => createBattleScriptJumpifcantswitchOpcodeHandlers(
      replaceStart(faintedStart, {
        operands: Object.freeze([
          { ...faintedStart.operands[0]!, widthBytes: 2 },
          faintedStart.operands[1]!,
        ]),
      }),
    )).toThrow(/invalid B_SCR_OP_JUMPIFCANTSWITCH shape/);
    expect(() => createBattleScriptJumpifcantswitchOpcodeHandlers(
      replaceStart(faintedStart, {
        operands: Object.freeze([
          faintedStart.operands[0]!,
          {
            ...faintedStart.operands[1]!,
            expression: "BattleScript_FaintedMonEnd",
          },
        ]),
      }),
    )).toThrow(/invalid B_SCR_OP_JUMPIFCANTSWITCH shape/);
    expect(() => createBattleScriptJumpifcantswitchOpcodeHandlers(
      replaceStart(batonStart, {
        dispatcher: "Cmd_openpartyscreen",
      }),
    )).toThrow(/invalid B_SCR_OP_JUMPIFCANTSWITCH shape/);
  });

  it.each([
    ["wrapped", BATTLE_SCRIPT_STATUS2_WRAPPED_MASK, 0],
    ["escape prevention", STATUS2_ESCAPE_PREVENTION, 0],
    ["rooted", 0, STATUS3_ROOTED],
  ])("branches through the exact pointer for ordinary %s", (_name, status2, status3) => {
    const rules = context({
      battlers: [
        battler(0, { status2, status3 }),
        battler(1),
        battler(0),
        battler(1),
      ],
    });
    const state = directState(faintedStart, rules);
    const result = stepBattleScriptMachine(
      program,
      state,
      createBattleScriptJumpifcantswitchOpcodeHandlers(program),
    );
    expect(result.state.programCounter).toBe(
      resolveBattleScriptLabel(program, "BattleScript_FaintedMonSendOutNew")!
        .programCounter,
    );
    expect(result.state.scheduler).toEqual({
      ...state.scheduler,
      activeBattler: 0,
    });
    expect(result.state.rulesContext).toBe(rules);
    expect(result.state.rng).toBe(state.rng);
    expect(result.state.events).toBe(state.events);
  });

  it.each([
    ["player", 0 as const],
    ["trainer", 1 as const],
  ])("Baton Pass masks bit 7 and bypasses all volatile gates for the %s side", (_name, attacker) => {
    const rules = context({
      selectorRoles: { attacker, target: attacker === 0 ? 1 : 0 },
      battlers: [
        battler(0, {
          status2: BATTLE_SCRIPT_STATUS2_WRAPPED_MASK | STATUS2_ESCAPE_PREVENTION,
          status3: STATUS3_ROOTED,
        }),
        battler(1, {
          status2: BATTLE_SCRIPT_STATUS2_WRAPPED_MASK | STATUS2_ESCAPE_PREVENTION,
          status3: STATUS3_ROOTED,
        }),
        battler(0),
        battler(1),
      ],
    });
    const state = directState(batonStart, rules);
    const result = stepBattleScriptMachine(
      program,
      state,
      createBattleScriptJumpifcantswitchOpcodeHandlers(program),
    );
    expect(result.state.programCounter).toBe(batonStart.programCounter + 1);
    expect(result.state.scheduler.activeBattler).toBe(attacker);
    expect(result.state.rulesContext).toBe(rules);
    expect(result.state.rng).toBe(state.rng);
    expect(result.state.events).toBe(state.events);
  });

  it("scans all six selected-side slots, excluding empty, egg, fainted, and the active index", () => {
    const noBenchPlayer = Object.freeze([
      partyMember(165, 115),
      partyMember(0, 100),
      partyMember(1, 100, { isEgg: true }),
      partyMember(4, 0),
      partyMember(0, 0),
      partyMember(0, 0),
    ]);
    const blockedRules = context({
      battlers: [
        battler(0, { partyIndex: 0 }),
        battler(1),
        battler(0),
        battler(1),
      ],
      party: { player: noBenchPlayer, opponent: EMPTY_PARTY },
    });
    const blocked = stepBattleScriptMachine(
      program,
      directState(faintedStart, blockedRules),
      createBattleScriptJumpifcantswitchOpcodeHandlers(program),
    );
    expect(blocked.state.programCounter).toBe(
      resolveBattleScriptLabel(program, "BattleScript_FaintedMonSendOutNew")!
        .programCounter,
    );

    const eligibleRules = context({
      battlers: [
        battler(0, { partyIndex: 0 }),
        battler(1),
        battler(0),
        battler(1),
      ],
      party: {
        player: Object.freeze([
          ...noBenchPlayer.slice(0, 5),
          partyMember(7, 1),
        ]),
        opponent: EMPTY_PARTY,
      },
    });
    const eligible = stepBattleScriptMachine(
      program,
      directState(faintedStart, eligibleRules),
      createBattleScriptJumpifcantswitchOpcodeHandlers(program),
    );
    expect(eligible.state.programCounter).toBe(faintedStart.programCounter + 1);
  });

  it("resolves BS_PLAYER1 independently of attacker and scans trainer parties for a trainer attacker", () => {
    const rules = context({
      selectorRoles: { attacker: 1, target: 0 },
      party: {
        player: Object.freeze([
          partyMember(165, 115),
          partyMember(1, 120),
          ...EMPTY_PARTY.slice(2),
        ]),
        opponent: Object.freeze([
          partyMember(129, 95),
          partyMember(187, 110),
          ...EMPTY_PARTY.slice(2),
        ]),
      },
    });
    const faded = stepBattleScriptMachine(
      program,
      directState(faintedStart, rules),
      createBattleScriptJumpifcantswitchOpcodeHandlers(program),
    );
    expect(faded.state.scheduler.activeBattler).toBe(0);
    expect(faded.state.programCounter).toBe(faintedStart.programCounter + 1);
    const trainer = stepBattleScriptMachine(
      program,
      directState(batonStart, rules),
      createBattleScriptJumpifcantswitchOpcodeHandlers(program),
    );
    expect(trainer.state.scheduler.activeBattler).toBe(1);
    expect(trainer.state.programCounter).toBe(batonStart.programCounter + 1);
  });

  it("reaches the one named non-singles topology barrier with source active-battler ownership", () => {
    const rules = context({
      battleTopology: {
        battlersCount: 4,
        battleTypeFlags:
          BATTLE_SCRIPT_BATTLE_TYPE_DOUBLE
          | BATTLE_SCRIPT_BATTLE_TYPE_TRAINER
          | BATTLE_SCRIPT_BATTLE_TYPE_FACTORY,
        battlerPositions: [0, 1, 2, 3],
      },
    });
    const result = stepBattleScriptMachine(
      program,
      directState(batonStart, rules),
      createBattleScriptJumpifcantswitchOpcodeHandlers(program),
    );
    expect(result.state.haltReason).toMatchObject({
      kind: "unsupported-branch",
      opcodeName: "B_SCR_OP_JUMPIFCANTSWITCH",
      sourceFile: "battle_script_commands.c",
      sourceLine: 4714,
      sourceConstruct: expect.stringContaining(
        "battle_script_commands.c:4714-4848",
      ),
    });
    expect(result.state.scheduler.activeBattler).toBe(0);
    expect(result.state.rulesContext).toBe(rules);
    expect(result.state.rng.calls).toBe(0);
    expect(result.state.events).toHaveLength(0);
  });
});

describe("BattleScript_EffectBatonPass genuine terminal walks", () => {
  it("runs a pre-resolved legal switch to END with PP, transferred volatile state, switch provenance, and no local RNG", () => {
    const transferableStatus2 = STATUS2_ESCAPE_PREVENTION | (1 << 20);
    const state = runBatonPassToTerminal(context({
      battlers: [
        battler(0, {
          hp: 115,
          species: 165,
          statStages: RAISED_STAGES,
          status2: transferableStatus2,
        }),
        battler(1, { hp: 95, species: 129 }),
        battler(0),
        battler(1),
      ],
      monToSwitchIntoId: [1, 6, 6, 6],
    }));
    expect(state.rulesContext.battlers[0]).toMatchObject({
      species: 1,
      partyIndex: 1,
      hp: 120,
      pp: [39, 0, 0, 0],
      statStages: RAISED_STAGES,
      status2: transferableStatus2,
    });
    expect(state.rulesContext.party.player[0].moves).toEqual([60, 97, 226, 113]);
    expect(state.rng).toEqual({
      value: 0x1234_5678,
      calls: 0,
      ledger: [],
    });
    const ppEvent = state.events.find((event) => event.kind === "set-battler-pp-data");
    expect(ppEvent).toMatchObject({
      kind: "set-battler-pp-data",
      battler: 0,
      movePosition: 0,
      pp: 39,
      provenance: {
        sourceLabel: "BattleScript_EffectBatonPass",
        opcodeName: "B_SCR_OP_PPREDUCE",
      },
    });
    const switchEvent = state.events.find((event) => event.kind === "switch");
    expect(switchEvent).toMatchObject({
      kind: "switch",
      side: "player",
      fromPartyIndex: 0,
      toPartyIndex: 1,
      provenance: {
        sourceLabel: "BattleScript_EffectBatonPass",
        opcodeName: "B_SCR_OP_GETSWITCHEDMONDATA",
      },
    });
    expect(Object.isFrozen(state)).toBe(true);
    expect(Object.isFrozen(state.rulesContext)).toBe(true);
    expect(Object.isFrozen(state.rulesContext.battlers[0])).toBe(true);
    expect(Object.isFrozen(state.events)).toBe(true);
  });

  it("branches to the real BattleScript_ButItFailed and terminates without a bench or switch", () => {
    const state = runBatonPassToTerminal(context({
      party: {
        player: Object.freeze([
          partyMember(165, 115, { moves: [60, 97, 226, 113] }),
          ...EMPTY_PARTY.slice(1),
        ]),
        opponent: EMPTY_PARTY,
      },
    }));
    expect(state.rulesContext.battlers[0]).toMatchObject({
      species: 165,
      partyIndex: 0,
      pp: [39, 0, 0, 0],
    });
    expect(state.rulesContext.moveResultFlags & MOVE_RESULT_FAILED).toBe(
      MOVE_RESULT_FAILED,
    );
    expect(state.events.some((event) => event.kind === "switch")).toBe(false);
    expect(state.events.find((event) =>
      event.kind === "message" && event.messageId === "STRINGID_BUTITFAILED"
    )?.provenance).toMatchObject({
      sourceLabel: "BattleScript_ButItFailed",
      opcodeName: "B_SCR_OP_RESULTMESSAGE",
    });
    expect(state.rng.calls).toBe(0);
  });
});
