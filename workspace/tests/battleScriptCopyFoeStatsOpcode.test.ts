import { describe, expect, it } from "vitest";
import {
  createBattleScriptCopyFoeStatsOpcodeHandlers,
} from "../src/engine/battleScriptCopyFoeStatsOpcode.ts";
import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContext,
  type BattleScriptRulesContextInput,
  type BattleScriptStatStages,
  type BattleScriptStatusRulesExternalPorts,
} from "../src/engine/battleScriptRulesContext.ts";
import {
  acknowledgeBattleScriptMachineController,
  createBattleScriptMachine,
  stepBattleScriptMachine,
  type BattleScriptMachineState,
} from "../src/engine/battleScriptMachine.ts";
import {
  loadBattleScriptProgram,
  type BattleScriptProgram,
} from "../src/engine/battleScriptProgram.ts";

const MOVE_CURSE = 174;
const MOVE_PSYCH_UP = 244;
const STATUS1_BURN = 1 << 4;
const STATUS1_POISON = 1 << 3;
const STATUS2_CURSED = 1 << 28;
const NEUTRAL = Object.freeze([6, 6, 6, 6, 6, 6, 6, 6]) as BattleScriptStatStages;
const CURSE_STAGES = Object.freeze([6, 7, 7, 5, 6, 6, 6, 6]) as BattleScriptStatStages;
const program = loadBattleScriptProgram();
const copyInstruction = program.instructions.find(
  (instruction) => instruction.opcodeName === "B_SCR_OP_COPYFOESTATS",
)!;

function battler(
  changes: Partial<BattleScriptRulesBattler> = {},
): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 100,
    maxHP: changes.maxHP ?? changes.hp ?? 100,
    moves: changes.moves ?? Object.freeze([MOVE_PSYCH_UP, 0, 0, 0]),
    pp: changes.pp ?? Object.freeze([10, 0, 0, 0]),
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
    statStages: changes.statStages ?? NEUTRAL,
    types: changes.types ?? (["TYPE_PSYCHIC", "TYPE_PSYCHIC"] as const),
    species: changes.species ?? 96,
    attack: changes.attack ?? 100,
    defense: changes.defense ?? 100,
    spAttack: changes.spAttack ?? 100,
    spDefense: changes.spDefense ?? 100,
    level: changes.level ?? 50,
    friendship: changes.friendship ?? 70,
    partyIndex: changes.partyIndex ?? 0,
  });
}

function context(
  targetStages: BattleScriptStatStages,
  attackerStages: BattleScriptStatStages = NEUTRAL,
  changes: Partial<BattleScriptRulesContextInput> = {},
): BattleScriptRulesContext {
  return createBattleScriptRulesContext({
    battlers: [
      battler({
        side: 0,
        hp: 235,
        moves: [MOVE_CURSE, 0, 0, 0],
        pp: [9, 0, 0, 0],
        statStages: targetStages,
        status1: STATUS1_BURN,
      }),
      battler({
        side: 1,
        hp: 135,
        statStages: attackerStages,
        status1: STATUS1_POISON,
        status2: STATUS2_CURSED,
      }),
      battler({ side: 0 }),
      battler({ side: 1 }),
    ],
    selectorRoles: { attacker: 1, target: 0, effectBattler: 0 },
    scriptingBattler: 1,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: MOVE_PSYCH_UP,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
    ...changes,
  });
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
      operand.expression === "B_WAIT_TIME_LONG" ? 64 : null,
    resolveByteOperand: () => null,
  });
}

function directOpcodeState(rules: BattleScriptRulesContext) {
  const initial = createBattleScriptMachine(
    program,
    "BattleScript_EffectPsychUp",
    rules,
    0x1234_5678,
  );
  return Object.freeze({
    ...initial,
    programCounter: copyInstruction.programCounter,
  });
}

function acknowledgeAllPending(
  state: BattleScriptMachineState<BattleScriptRulesContext>,
): BattleScriptMachineState<BattleScriptRulesContext> {
  let next = state;
  for (const battler of state.scheduler.pendingControllerBattlers) {
    next = acknowledgeBattleScriptMachineController(next, battler);
  }
  return next;
}

function runToTerminal(
  targetStages: BattleScriptStatStages,
  attackerStages: BattleScriptStatStages = NEUTRAL,
) {
  const execution = createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_EffectPsychUp",
    context(targetStages, attackerStages, { animArg1: 0x1234 }),
    0x1234_5678,
    externalPorts(),
  );
  let state = execution.state;
  for (let guard = 0; guard < 500; guard += 1) {
    const result = stepBattleScriptMachine(program, state, execution.handlers);
    if (result.kind === "blocked") {
      state = acknowledgeAllPending(result.state);
      continue;
    }
    state = result.state;
    if (result.kind === "halted") {
      expect(state.haltReason).toMatchObject({
        kind: "terminal",
        opcodeName: "B_SCR_OP_END",
      });
      return state;
    }
  }
  throw new Error("BattleScript_EffectPsychUp did not reach its own END");
}

function eventReceipts(
  state: BattleScriptMachineState<BattleScriptRulesContext>,
) {
  return state.events.map((event) => ({
    sequence: event.sequence,
    kind: event.kind,
    sourceLabel: event.provenance.sourceLabel,
    opcodeName: event.provenance.opcodeName,
    battler: "battler" in event ? event.battler : null,
    detail: event.kind === "message"
      ? event.messageId
      : event.kind === "set-battler-pp-data"
        ? event.pp
        : event.kind === "animation"
          ? event.animationId
          : event.kind === "set-battler-sprite-visibility"
            ? event.invisible
            : null,
  }));
}

const PSYCH_UP_EVENT_SEQUENCE = Object.freeze([
  {
    sequence: 1,
    kind: "message",
    sourceLabel: "BattleScript_EffectPsychUp",
    opcodeName: "B_SCR_OP_ATTACKSTRING",
    battler: null,
    detail: "STRINGID_USEDMOVE",
  },
  {
    sequence: 2,
    kind: "set-battler-pp-data",
    sourceLabel: "BattleScript_EffectPsychUp",
    opcodeName: "B_SCR_OP_PPREDUCE",
    battler: 1,
    detail: 9,
  },
  {
    sequence: 3,
    kind: "animation",
    sourceLabel: "BattleScript_EffectPsychUp",
    opcodeName: "B_SCR_OP_ATTACKANIMATION",
    battler: 1,
    detail: "MOVE_ANIMATION",
  },
  {
    sequence: 4,
    kind: "message",
    sourceLabel: "BattleScript_EffectPsychUp",
    opcodeName: "B_SCR_OP_PRINTSTRING",
    battler: null,
    detail: "STRINGID_PKMNCOPIEDSTATCHANGES",
  },
  {
    sequence: 5,
    kind: "set-battler-sprite-visibility",
    sourceLabel: "BattleScript_MoveEnd",
    opcodeName: "B_SCR_OP_MOVEEND",
    battler: 1,
    detail: false,
  },
  {
    sequence: 6,
    kind: "set-battler-sprite-visibility",
    sourceLabel: "BattleScript_MoveEnd",
    opcodeName: "B_SCR_OP_MOVEEND",
    battler: 0,
    detail: false,
  },
]);

describe("source-complete B_SCR_OP_COPYFOESTATS registration", () => {
  it("pins the unique five-byte instruction and its deliberately unused failure pointer", () => {
    const instructions = program.instructions.filter(
      (instruction) => instruction.opcodeName === "B_SCR_OP_COPYFOESTATS",
    );
    expect(instructions).toHaveLength(1);
    expect(instructions[0]).toMatchObject({
      opcodeId: 189,
      dispatcher: "Cmd_copyfoestats",
      source: {
        label: "BattleScript_EffectPsychUp",
        statementLine: 1794,
      },
      operands: [{
        widthBytes: 4,
        expression: "BattleScript_ButItFailed",
      }],
    });
  });

  it("rejects missing, duplicate, wrong-dispatch, and wrong-pointer program shapes", () => {
    const without = Object.freeze({
      ...program,
      instructions: Object.freeze(program.instructions.filter(
        (instruction) => instruction !== copyInstruction,
      )),
    }) as BattleScriptProgram;
    expect(() => createBattleScriptCopyFoeStatsOpcodeHandlers(without))
      .toThrow(/requires exactly 1 concrete start, got 0/);

    const duplicated = Object.freeze({
      ...program,
      instructions: Object.freeze([...program.instructions, copyInstruction]),
    }) as BattleScriptProgram;
    expect(() => createBattleScriptCopyFoeStatsOpcodeHandlers(duplicated))
      .toThrow(/requires exactly 1 concrete start, got 2/);

    const replaceInstruction = (
      changes: Partial<typeof copyInstruction>,
    ): BattleScriptProgram => Object.freeze({
      ...program,
      instructions: Object.freeze(program.instructions.map((instruction) =>
        instruction === copyInstruction
          ? Object.freeze({ ...instruction, ...changes })
          : instruction
      )),
    }) as BattleScriptProgram;
    expect(() => createBattleScriptCopyFoeStatsOpcodeHandlers(
      replaceInstruction({ dispatcher: "Cmd_normalisebuffs" }),
    )).toThrow(/invalid B_SCR_OP_COPYFOESTATS shape/);
    expect(() => createBattleScriptCopyFoeStatsOpcodeHandlers(
      replaceInstruction({
        operands: Object.freeze([{
          ...copyInstruction.operands[0]!,
          expression: "BattleScript_MoveEnd",
        }]),
      }),
    )).toThrow(/invalid B_SCR_OP_COPYFOESTATS shape/);
  });

  it("copies all eight target stages to the attacker, preserves animation state, ignores the pointer, and changes nothing else", () => {
    const rules = context(CURSE_STAGES, Object.freeze([0, 1, 2, 3, 4, 5, 6, 7]), {
      animArg1: 0x1234,
    });
    const state = directOpcodeState(rules);
    const result = stepBattleScriptMachine(
      program,
      state,
      createBattleScriptCopyFoeStatsOpcodeHandlers(program),
    );
    expect(result.kind).toBe("advanced");
    expect(program.instructions[result.state.programCounter]?.opcodeName)
      .toBe("B_SCR_OP_ATTACKANIMATION");
    expect(result.state.rulesContext.battlers[1].statStages).toEqual(CURSE_STAGES);
    expect(result.state.rulesContext.battlers[1]).toMatchObject({
      hp: 135,
      status1: STATUS1_POISON,
      status2: STATUS2_CURSED,
      pp: [10, 0, 0, 0],
    });
    expect(result.state.rulesContext.battlers[0]).toBe(rules.battlers[0]);
    expect(result.state.rulesContext.battlers[0].statStages)
      .toBe(rules.battlers[0].statStages);
    expect(result.state.rulesContext.animArg1).toBe(0x1234);
    expect(result.state.rng).toBe(state.rng);
    expect(result.state.events).toBe(state.events);
    expect(result.state.scheduler).toBe(state.scheduler);
    expect(Object.isFrozen(result.state.rulesContext.battlers[1].statStages)).toBe(true);
  });

  it("rejects missing attacker and target roles", () => {
    const handlers = createBattleScriptCopyFoeStatsOpcodeHandlers(program);
    expect(() => stepBattleScriptMachine(
      program,
      directOpcodeState(context(CURSE_STAGES, NEUTRAL, {
        selectorRoles: { attacker: null, target: 0, effectBattler: 0 },
      })),
      handlers,
    )).toThrow(/requires an attacker role/);
    expect(() => stepBattleScriptMachine(
      program,
      directOpcodeState(context(CURSE_STAGES, NEUTRAL, {
        selectorRoles: { attacker: 1, target: null, effectBattler: 0 },
      })),
      handlers,
    )).toThrow(/requires a target role/);
  });
});

describe("BattleScript_EffectPsychUp genuine terminal walks", () => {
  it("copies a non-neutral eight-stage array and reaches END with exact roles, PP, events, preserved animation state, and zero RNG", () => {
    const state = runToTerminal(CURSE_STAGES);
    expect(state.rulesContext.selectorRoles).toEqual({
      attacker: 1,
      target: 0,
      effectBattler: 0,
      fainted: null,
    });
    expect(state.rulesContext.battlers[1]).toMatchObject({
      hp: 135,
      status1: STATUS1_POISON,
      status2: STATUS2_CURSED,
      pp: [9, 0, 0, 0],
      statStages: CURSE_STAGES,
    });
    expect(state.rulesContext.battlers[0]).toMatchObject({
      hp: 235,
      status1: STATUS1_BURN,
      status2: 0,
      pp: [9, 0, 0, 0],
      statStages: CURSE_STAGES,
    });
    expect(state.rulesContext.animArg1).toBe(0x1234);
    expect(state.rng).toEqual({ value: 0x1234_5678, calls: 0, ledger: [] });
    expect(eventReceipts(state)).toEqual(PSYCH_UP_EVENT_SEQUENCE);
  });

  it("copies a neutral array unconditionally, preserving HP/status and the same terminal event/provenance path", () => {
    const state = runToTerminal(NEUTRAL, NEUTRAL);
    expect(state.rulesContext.battlers[1]).toMatchObject({
      hp: 135,
      status1: STATUS1_POISON,
      status2: STATUS2_CURSED,
      pp: [9, 0, 0, 0],
      statStages: NEUTRAL,
    });
    expect(state.rulesContext.battlers[0]).toMatchObject({
      hp: 235,
      status1: STATUS1_BURN,
      status2: 0,
      statStages: NEUTRAL,
    });
    expect(state.rulesContext.animArg1).toBe(0x1234);
    expect(state.rng.calls).toBe(0);
    expect(eventReceipts(state)).toEqual(PSYCH_UP_EVENT_SEQUENCE);
  });
});
