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
  stepBattleScriptMachine,
  type BattleScriptMachineState,
} from "../src/engine/battleScriptMachine.ts";
import {
  loadBattleScriptProgram,
  resolveBattleScriptLabel,
} from "../src/engine/battleScriptProgram.ts";
import {
  BATTLE_SCRIPT_HITMARKER_ATTACKSTRING_PRINTED,
} from "../src/engine/battleScriptRulesContext.ts";
import {
  BATTLE_SCRIPT_HITMARKER_NO_PPDEDUCT,
  BATTLE_SCRIPT_STATUS3_IMPRISONED_OTHERS,
} from "../src/engine/battleScriptSourceConstants.ts";
import {
  createFactoryFullTurnBattleState,
  submitFactoryFullTurnDecision,
  type FactoryFullTurnConfig,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";

const NONE = 0;
const POUND = 1;
const SCRATCH = 10;
const TACKLE = 33;
const GROWL = 45;
const COUNTER = 68;
const FLY = 19;
const MIRROR_MOVE = 119;
const BIDE = 117;
const METRONOME = 118;
const SPLASH = 150;
const STRUGGLE = 165;
const PROTECT = 182;
const RAZOR_WIND = 13;
const REST = 156;
const SKULL_BASH = 130;
const SKY_ATTACK = 143;
const SOLAR_BEAM = 76;
const SURF = 57;
const FISSURE = 90;
const SLEEP_TALK = 214;
const UPROAR = 253;
const FOCUS_PUNCH = 264;
const ASSIST = 274;
const CHOICE_BAND = 186;
const STATUS1_SLEEP = 0x7;
const STATUS2_TORMENT = (1 << 31) >>> 0;
const HITMARKER_UNRELATED = 1 << 18;

const program = loadBattleScriptProgram();
const tryChooseInstruction = program.instructions.find(
  (instruction) => instruction.opcodeName === "B_SCR_OP_TRYCHOOSESLEEPTALKMOVE",
)!;
const assistSelectInstruction = program.instructions.find(
  (instruction) => instruction.opcodeName === "B_SCR_OP_ASSISTATTACKSELECT",
)!;
const assistJumpTrueInstruction = program.instructions.find(
  (instruction) =>
    instruction.opcodeName === "B_SCR_OP_JUMPTOCALLEDMOVE"
    && instruction.source.label === "BattleScript_EffectAssist",
)!;
const jumpTrueInstruction = program.instructions.find(
  (instruction) =>
    instruction.opcodeName === "B_SCR_OP_JUMPTOCALLEDMOVE"
    && instruction.source.label === "BattleScript_SleepTalkUsingMove",
)!;
const jumpFalseInstruction = program.instructions.find(
  (instruction) =>
    instruction.opcodeName === "B_SCR_OP_JUMPTOCALLEDMOVE"
    && instruction.source.label === "BattleScript_IgnoresAndUsesRandomMove",
)!;

function battler(changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 100,
    maxHP: changes.maxHP ?? changes.hp ?? 100,
    moves: changes.moves ?? ([SLEEP_TALK, FOCUS_PUNCH, UPROAR, FISSURE] as const),
    pp: changes.pp ?? ([10, 20, 10, 5] as const),
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
    encoreTimer: changes.encoreTimer ?? 0,
    encoredMove: changes.encoredMove ?? 0,
    usedDisabledMove: changes.usedDisabledMove ?? 0,
    tauntTimer: changes.tauntTimer ?? 0,
    usedTauntedMove: changes.usedTauntedMove ?? 0,
    usedImprisonedMove: changes.usedImprisonedMove ?? 0,
    item: changes.item ?? 0,
    statStages: changes.statStages ?? [6, 6, 6, 6, 6, 6, 6, 6],
    types: changes.types ?? (["TYPE_WATER", "TYPE_GROUND"] as const),
    species: changes.species ?? 340,
    personality: changes.personality ?? 1,
    attack: changes.attack ?? 100,
    defense: changes.defense ?? 100,
    spAttack: changes.spAttack ?? 100,
    spDefense: changes.spDefense ?? 100,
    level: changes.level ?? 50,
    friendship: changes.friendship ?? 70,
    partyIndex: changes.partyIndex ?? 0,
    speed: changes.speed ?? 100,
  });
}

function rules(
  attackerChanges: Partial<BattleScriptRulesBattler> = {},
  targetChanges: Partial<BattleScriptRulesBattler> = {},
  changes: Partial<BattleScriptRulesContextInput> = {},
): BattleScriptRulesContext {
  return createBattleScriptRulesContext({
    battlers: [
      battler({ side: 0, ...attackerChanges }),
      battler({ side: 1, species: 47, types: ["TYPE_BUG", "TYPE_GRASS"], ...targetChanges }),
      battler({ side: 0, hp: 0 }),
      battler({ side: 1, hp: 0 }),
    ],
    selectorRoles: { attacker: 0, target: 1, effectBattler: 0, fainted: null },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: SLEEP_TALK,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: HITMARKER_UNRELATED,
    multiHitCounter: 0,
    chosenMove: SLEEP_TALK,
    party: {
      player: [
        { species: 340, hp: 100, moves: [SLEEP_TALK, FOCUS_PUNCH, UPROAR, FISSURE] },
        {}, {}, {}, {}, {},
      ],
      opponent: [
        { species: 47, hp: 100, moves: [NONE, NONE, NONE, NONE] },
        {}, {}, {}, {}, {},
      ],
    },
    ...changes,
  });
}

function externalPorts(): BattleScriptStatusRulesExternalPorts {
  return Object.freeze({
    isControllerIdle: () => true,
    prepareMessage: (_context, operand) => Object.freeze({
      kind: "message" as const,
      messageId: operand.expression,
      substitutions: Object.freeze([]),
    }),
    prepareSelectionMessage: () => null,
    prepareSelectionMessageFromTable: () => null,
    resolveAttackerBattler: () => 0 as const,
    resolveBattlerAtPosition: () => null,
    resolveHalfwordOperand: (_context, operand) => {
      if (operand.expression === "B_WAIT_TIME_LONG") return 64;
      if (operand.expression === "B_WAIT_TIME_SHORT") return 32;
      return null;
    },
    resolveByteOperand: () => null,
  });
}

function executionAt(
  instruction: typeof tryChooseInstruction,
  source: BattleScriptRulesContext,
  seed = 2,
  callStack: readonly number[] = [],
) {
  const execution = createBattleScriptStatusRulesExecution(
    program,
    instruction.source.label,
    source,
    seed,
    externalPorts(),
  );
  return {
    ...execution,
    state: Object.freeze({
      ...execution.state,
      programCounter: instruction.programCounter,
      callStack: Object.freeze([...callStack]),
    }),
  };
}

function stepAt(
  instruction: typeof tryChooseInstruction,
  source: BattleScriptRulesContext,
  seed = 2,
  callStack: readonly number[] = [],
) {
  const execution = executionAt(instruction, source, seed, callStack);
  const result = stepBattleScriptMachine(program, execution.state, execution.handlers);
  if (result.kind !== "advanced") throw new Error(`${instruction.opcodeName} did not advance: ${result.kind}`);
  return result;
}

function acknowledgePending(
  state: BattleScriptMachineState<BattleScriptRulesContext>,
): BattleScriptMachineState<BattleScriptRulesContext> {
  let next = state;
  for (const battlerId of state.scheduler.pendingControllerBattlers) {
    next = acknowledgeBattleScriptMachineController(next, battlerId);
  }
  return next;
}

function runToTerminal(source: BattleScriptRulesContext, seed: number) {
  const execution = createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_EffectSleepTalk",
    source,
    seed,
    externalPorts(),
  );
  let state = execution.state;
  for (let guard = 0; guard < 5000; guard += 1) {
    const result = stepBattleScriptMachine(program, state, execution.handlers);
    if (result.kind === "halted") return result.state;
    if (result.kind === "unsupported") {
      throw new Error(`unexpected unsupported ${result.instruction.opcodeName}`);
    }
    state = result.kind === "blocked"
      ? acknowledgePending(result.state)
      : result.state;
  }
  throw new Error("BattleScript_EffectSleepTalk did not reach a terminal");
}

function runAssistToTerminal(source: BattleScriptRulesContext, seed: number) {
  const execution = createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_EffectAssist",
    source,
    seed,
    externalPorts(),
  );
  let state = execution.state;
  for (let guard = 0; guard < 5000; guard += 1) {
    const result = stepBattleScriptMachine(program, state, execution.handlers);
    if (result.kind === "halted") return result.state;
    if (result.kind === "unsupported") {
      throw new Error(`unexpected unsupported ${result.instruction.opcodeName}`);
    }
    state = result.kind === "blocked"
      ? acknowledgePending(result.state)
      : result.state;
  }
  throw new Error("BattleScript_EffectAssist did not reach a terminal");
}

function messages(state: BattleScriptMachineState<BattleScriptRulesContext>): string[] {
  return state.events
    .filter((event) => event.kind === "message")
    .map((event) => event.messageId);
}

describe("Sleep Talk opcode encodings and direct dispatch", () => {
  it("pins 0xa9 + pointer and all three 0x63 + byte concrete encodings", () => {
    expect(program.instructions.filter(
      (instruction) => instruction.opcodeName === "B_SCR_OP_TRYCHOOSESLEEPTALKMOVE",
    )).toEqual([tryChooseInstruction]);
    expect(tryChooseInstruction).toMatchObject({
      opcodeId: 0xa9,
      dispatcher: "Cmd_trychoosesleeptalkmove",
      source: { label: "BattleScript_SleepTalkIsAsleep", statementLine: 1324 },
      operands: [{ widthBytes: 4, expression: "BattleScript_SleepTalkUsingMove" }],
    });
    const jumps = program.instructions.filter(
      (instruction) => instruction.opcodeName === "B_SCR_OP_JUMPTOCALLEDMOVE",
    );
    expect(jumps).toHaveLength(3);
    expect(jumps.every((instruction) =>
      instruction.opcodeId === 0x63
      && instruction.dispatcher === "Cmd_jumptocalledmove"
      && instruction.operands.length === 1
      && instruction.operands[0]!.widthBytes === 1
    )).toBe(true);
    expect(jumpTrueInstruction.operands[0]!.expression).toBe("TRUE");
    expect(jumpFalseInstruction.operands[0]!.expression).toBe("FALSE");
    expect(1 + tryChooseInstruction.operands.reduce((sum, operand) => sum + operand.widthBytes, 0)).toBe(5);
    expect(1 + jumpTrueInstruction.operands.reduce((sum, operand) => sum + operand.widthBytes, 0)).toBe(2);
  });

  it("retries Random()%4 exactly, accepts empty-PP Fissure, owns called slot/target, clears only attack-string marker, and takes the selected pointer", () => {
    const source = rules(
      { pp: [10, 20, 10, 0] },
      {},
      { hitMarker: HITMARKER_UNRELATED | BATTLE_SCRIPT_HITMARKER_ATTACKSTRING_PRINTED },
    );
    const result = stepAt(tryChooseInstruction, source, 2);
    expect(result.state.programCounter).toBe(
      resolveBattleScriptLabel(program, "BattleScript_SleepTalkUsingMove")!.programCounter,
    );
    expect(result.state.rulesContext).toEqual({
      ...source,
      calledMove: FISSURE,
      currentMovePosition: 3,
      hitMarker: HITMARKER_UNRELATED,
      selectorRoles: { ...source.selectorRoles, target: 1 },
    });
    expect(result.state.rng.calls).toBe(4);
    expect(result.state.rng.ledger.map(({ reason, randomValue }) => ({ reason, randomValue }))).toEqual([
      { reason: "trychoosesleeptalkmove-slot", randomValue: 33676 }, // slot 0 rejected
      { reason: "trychoosesleeptalkmove-slot", randomValue: 28355 }, // slot 3 accepted
      { reason: "sleep-talk-called-move-target", randomValue: 21356 }, // battler 0 rejected
      { reason: "sleep-talk-called-move-target", randomValue: 3517 }, // battler 1 accepted
    ]);
    expect(result.state.events).toEqual([]);
    expect(result.state.scheduler).toEqual(executionAt(tryChooseInstruction, source).state.scheduler);
  });

  it.each([
    ["MOVE_NONE", NONE],
    ["MOVE_SLEEP_TALK", SLEEP_TALK],
    ["MOVE_ASSIST", ASSIST],
    ["MOVE_MIRROR_MOVE", MIRROR_MOVE],
    ["MOVE_METRONOME", METRONOME],
    ["MOVE_FOCUS_PUNCH", FOCUS_PUNCH],
    ["MOVE_UPROAR", UPROAR],
    ["EFFECT_SKULL_BASH", SKULL_BASH],
    ["EFFECT_RAZOR_WIND", RAZOR_WIND],
    ["EFFECT_SKY_ATTACK", SKY_ATTACK],
    ["EFFECT_SOLAR_BEAM", SOLAR_BEAM],
    ["EFFECT_SEMI_INVULNERABLE", FLY],
    ["EFFECT_BIDE", BIDE],
  ])("all-unusable advances the full five-byte instruction with zero RNG for %s", (_name, move) => {
    const source = rules({ moves: [NONE, NONE, NONE, move] });
    const result = stepAt(tryChooseInstruction, source);
    expect(result.state.programCounter).toBe(tryChooseInstruction.programCounter + 1);
    expect(result.state.rulesContext).toBe(source);
    expect(result.state.rng.calls).toBe(0);
  });

  it.each([
    ["Disable", { disabledMove: FISSURE }, {}, {}],
    ["Torment", { status2: STATUS2_TORMENT }, {}, { moveHistory: { lastMoves: [FISSURE, 0, 0, 0] } }],
    ["Taunt", { moves: [NONE, NONE, NONE, REST], tauntTimer: 2 }, {}, {}],
    ["Imprison", {}, { status3: BATTLE_SCRIPT_STATUS3_IMPRISONED_OTHERS, moves: [FISSURE, NONE, NONE, NONE] }, {}],
    ["Encore", { encoreTimer: 2, encoredMove: REST }, {}, {}],
    ["Choice Band", { item: CHOICE_BAND }, {}, { choicedMove: [REST, 0, 0, 0] }],
  ] as const)("ports CheckMoveLimitations without its PP bit: %s", (_name, attacker, target, context) => {
    const selectedMove = "moves" in attacker ? attacker.moves[3] : FISSURE;
    const source = rules(
      { moves: [NONE, NONE, NONE, selectedMove], ...attacker },
      target,
      context,
    );
    if (_name === "Disable") expect(source.battlers[0].disabledMove).toBe(FISSURE);
    const result = stepAt(tryChooseInstruction, source);
    expect(result.state.programCounter).toBe(tryChooseInstruction.programCounter + 1);
    expect(result.state.rulesContext).toBe(source);
    expect(result.state.rng.calls).toBe(0);
  });

  it("uses source move targeting after selection: REST targets the user and SURF targets the opposing-left battler without target RNG", () => {
    const rest = stepAt(
      tryChooseInstruction,
      rules({ moves: [NONE, NONE, NONE, REST] }),
      2,
    );
    expect(rest.state.rulesContext.calledMove).toBe(REST);
    expect(rest.state.rulesContext.selectorRoles.target).toBe(0);
    expect(rest.state.rng.calls).toBe(2);

    const surf = stepAt(
      tryChooseInstruction,
      rules({ moves: [NONE, NONE, NONE, SURF] }),
      2,
    );
    expect(surf.state.rulesContext.calledMove).toBe(SURF);
    expect(surf.state.rulesContext.selectorRoles.target).toBe(1);
    expect(surf.state.rng.calls).toBe(2);
  });

  it("TRUE preserves chosen Sleep Talk while FALSE replaces it; both directly jump to the called effect without a stack push", () => {
    const source = rules({}, {}, { calledMove: FISSURE });
    const trueResult = stepAt(jumpTrueInstruction, source, 2, [777]);
    expect(trueResult.state.programCounter).toBe(
      resolveBattleScriptLabel(program, "BattleScript_EffectOHKO")!.programCounter,
    );
    expect(trueResult.state.callStack).toEqual([777]);
    expect(trueResult.state.rulesContext).toEqual({
      ...source,
      currentMove: FISSURE,
      currentMoveEffect: 38,
      currentMovePower: 1,
    });
    expect(trueResult.state.rulesContext.chosenMove).toBe(SLEEP_TALK);

    const falseResult = stepAt(jumpFalseInstruction, source, 2, [777]);
    expect(falseResult.state.programCounter).toBe(
      resolveBattleScriptLabel(program, "BattleScript_EffectOHKO")!.programCounter,
    );
    expect(falseResult.state.callStack).toEqual([777]);
    expect(falseResult.state.rulesContext.currentMove).toBe(FISSURE);
    expect(falseResult.state.rulesContext.chosenMove).toBe(FISSURE);
  });
});

describe("BattleScript_EffectSleepTalk genuine terminal walks", () => {
  it("awake failure spends Sleep Talk PP and reaches the existing failed terminal without choosing a move", () => {
    const state = runToTerminal(rules({ status1: 0 }), 2);
    expect(state.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
    expect(state.rulesContext.battlers[0].pp).toEqual([9, 20, 10, 5]);
    expect(state.rulesContext.calledMove).toBe(NONE);
    expect(state.rulesContext.currentMove).toBe(SLEEP_TALK);
    expect(messages(state)).toEqual(["STRINGID_USEDMOVE", "STRINGID_BUTITFAILED"]);
    expect(state.rng.calls).toBe(0);
  });

  it("asleep all-unusable spends only Sleep Talk PP, runs the pause/failure tail, and never draws RNG", () => {
    const state = runToTerminal(rules({
      status1: STATUS1_SLEEP,
      moves: [SLEEP_TALK, FOCUS_PUNCH, UPROAR, FLY],
    }), 2);
    expect(state.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
    expect(state.rulesContext.battlers[0].pp).toEqual([9, 20, 10, 5]);
    expect(state.rulesContext.calledMove).toBe(NONE);
    expect(messages(state)).toEqual([
      "STRINGID_PKMNFASTASLEEP",
      "STRINGID_USEDMOVE",
      "STRINGID_BUTITFAILED",
    ]);
    expect(state.rng.calls).toBe(0);
  });

  it("asleep Fissure dispatch reaches its called effect's normal terminal: Sleep Talk PP 10→9, Fissure PP stays 5, chosen move stays Sleep Talk, and the target is KO'd", () => {
    const state = runToTerminal(rules({
      status1: STATUS1_SLEEP,
      moves: [SLEEP_TALK, FOCUS_PUNCH, UPROAR, FISSURE],
    }), 5);
    expect(state.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
    expect(state.callStack).toEqual([]);
    expect(state.rulesContext.calledMove).toBe(FISSURE);
    expect(state.rulesContext.currentMove).toBe(FISSURE);
    expect(state.rulesContext.chosenMove).toBe(SLEEP_TALK);
    expect(state.rulesContext.currentMovePosition).toBe(3);
    expect(state.rulesContext.selectorRoles.target).toBe(1);
    expect(state.rulesContext.battlers[0].pp).toEqual([9, 20, 10, 5]);
    expect(state.rulesContext.battlers[1].hp).toBe(0);
    expect(state.rulesContext.hitMarker & BATTLE_SCRIPT_HITMARKER_NO_PPDEDUCT).toBe(0);
    expect(state.rng.ledger.slice(0, 3).map(({ reason }) => reason)).toEqual([
      "trychoosesleeptalkmove-slot",
      "sleep-talk-called-move-target",
      "tryko",
    ]);
    expect(messages(state)).toContain("STRINGID_PKMNFASTASLEEP");
    expect(messages(state).filter((message) => message === "STRINGID_USEDMOVE")).toHaveLength(2);
  });
});

describe("Sleep Talk through the generic full-turn decision seam", () => {
  it("takes a real asleep Whiscash command through called Fissure to player-win without dispatching the slower trainer action", () => {
    const config: FactoryFullTurnConfig = {
      requestId: 1,
      rngSeed: 5,
      player: {
        species: 340,
        moveId: SLEEP_TALK,
        moves: [SLEEP_TALK, FOCUS_PUNCH, UPROAR, FISSURE],
        pp: [10, 20, 10, 5],
        status1: 2,
        attack: 100,
        defense: 100,
        spAttack: 100,
        spDefense: 100,
        speed: 100,
        hp: 100,
        types: ["TYPE_WATER", "TYPE_GROUND"],
      },
      trainer: {
        species: 47,
        moveId: 147,
        moves: [147, 147, 147, 147],
        pp: [15, 15, 15, 15],
        attack: 100,
        defense: 100,
        spAttack: 100,
        spDefense: 100,
        speed: 50,
        hp: 100,
        types: ["TYPE_BUG", "TYPE_GRASS"],
      },
    };
    const initial = createFactoryFullTurnBattleState(config);
    const afterPlayer = submitFactoryFullTurnDecision(initial, {
      requestId: 1,
      side: "player",
      decision: { kind: "use-move", moveSlot: 0, targetBattler: 1 },
    });
    if (afterPlayer.kind !== "decision-required") {
      throw new Error("expected the trainer command request");
    }
    const result = submitFactoryFullTurnDecision(afterPlayer.state, {
      requestId: 2,
      side: "trainer",
      decision: { kind: "use-move", moveSlot: 0, targetBattler: 0 },
    });
    expect(result.kind).toBe("terminal");
    expect(result.state.boundary).toEqual({ kind: "terminal", outcome: "player-win" });
    expect(result.state.rng.calls).toBe(4);
    const final = result.state.rules.rulesContext;
    expect(final.calledMove).toBe(FISSURE);
    expect(final.chosenMove).toBe(SLEEP_TALK);
    expect(final.battlers[0]).toMatchObject({
      hp: 100,
      status1: 1,
      pp: [9, 20, 10, 5],
    });
    expect(final.battlers[1]).toMatchObject({
      hp: 0,
      pp: [15, 15, 15, 15],
    });
    expect(result.events.some(({ payload }) =>
      payload.kind === "set-battler-pp-data"
      && payload.battler === 0
      && payload.movePosition === 0
      && payload.pp === 9
    )).toBe(true);
    expect(result.events.some(({ payload }) =>
      payload.kind === "set-battler-pp-data"
      && payload.battler === 0
      && payload.movePosition === 3
    )).toBe(false);
  });
});

describe("Assist source-complete party scan and called-move dispatch", () => {
  it("pins the opcode shell and its TRUE dynamic dispatch operand", () => {
    expect(assistSelectInstruction).toMatchObject({
      opcodeId: 0xde,
      dispatcher: "Cmd_assistattackselect",
      source: { label: "BattleScript_EffectAssist", statementLine: 2370 },
      operands: [{ widthBytes: 4, expression: "BattleScript_FailedFromPPReduce" }],
    });
    expect(assistJumpTrueInstruction).toMatchObject({
      opcodeId: 0x63,
      operands: [{ widthBytes: 1, expression: "TRUE" }],
      source: { label: "BattleScript_EffectAssist", statementLine: 2375 },
    });
  });

  it("reproduces the OFF receipt's one scaled draw and candidate vector while filtering the active slot, empty/Egg records, and every forbidden class", () => {
    const source = rules(
      { partyIndex: 0, species: 161, moves: [ASSIST, NONE, NONE, NONE] },
      {},
      {
        currentMove: ASSIST,
        chosenMove: ASSIST,
        hitMarker: HITMARKER_UNRELATED | BATTLE_SCRIPT_HITMARKER_ATTACKSTRING_PRINTED,
        party: {
          player: [
            { species: 161, level: 50, hp: 100, moves: [GROWL, GROWL, GROWL, GROWL] },
            { species: 161, level: 50, hp: 100, moves: [TACKLE, SLEEP_TALK, MIRROR_MOVE, METRONOME] },
            { species: 161, level: 50, hp: 100, moves: [GROWL, SCRATCH, POUND, SPLASH] },
            { species: 0, level: 50, hp: 100, moves: [TACKLE, TACKLE, TACKLE, TACKLE] },
            { species: 175, isEgg: true, level: 50, hp: 100, moves: [TACKLE, TACKLE, TACKLE, TACKLE] },
            { species: 161, level: 50, hp: 100, moves: [FOCUS_PUNCH, COUNTER, PROTECT, STRUGGLE] },
          ],
        },
      },
    );
    const result = stepAt(assistSelectInstruction, source, 0x29a7_2072);
    expect(result.state.programCounter).toBe(assistSelectInstruction.programCounter + 1);
    expect(result.state.rulesContext.calledMove).toBe(GROWL);
    expect(result.state.rulesContext.selectorRoles.target).toBe(1);
    expect(result.state.rulesContext.hitMarker).toBe(HITMARKER_UNRELATED);
    expect(result.state.rng.calls).toBe(1);
    expect(result.state.rng.value).toBe(0xb237_ecfd);
    expect(result.state.rng.ledger.map(({ reason, randomValue }) => ({ reason, randomValue }))).toEqual([
      { reason: "assist-scaled-selection", randomValue: 0xb237 },
    ]);
  });

  it("pins party-slot-then-move-slot order without deduplication", () => {
    const source = rules(
      { partyIndex: 0, moves: [ASSIST, NONE, NONE, NONE] },
      {},
      {
        currentMove: ASSIST,
        chosenMove: ASSIST,
        party: {
          player: [
            { species: 340, level: 50, hp: 100, moves: [ASSIST, NONE, NONE, NONE] },
            { species: 161, level: 50, hp: 100, moves: [TACKLE, SCRATCH, POUND, SPLASH] },
            { species: 161, level: 50, hp: 100, moves: [GROWL, SURF, REST, FISSURE] },
            {}, {}, {},
          ],
        },
      },
    );
    const result = stepAt(assistSelectInstruction, source, 0x29a7_2072);
    // low byte 0x37 selects index 1 of eight: SCRATCH only under
    // party-slot-then-move-slot order (move-slot-major would select GROWL).
    expect(result.state.rulesContext.calledMove).toBe(SCRATCH);
    expect(result.state.rng.ledger[0]).toMatchObject({
      reason: "assist-scaled-selection",
      randomValue: 0xb237,
    });
  });

  it("takes the supplied failure pointer with zero draws when every party move is filtered", () => {
    const source = rules(
      { partyIndex: 0, moves: [ASSIST, NONE, NONE, NONE] },
      {},
      {
        currentMove: ASSIST,
        chosenMove: ASSIST,
        party: {
          player: [
            { species: 340, level: 50, hp: 100, moves: [TACKLE, TACKLE, TACKLE, TACKLE] },
            { species: 0, level: 50, hp: 100, moves: [TACKLE, TACKLE, TACKLE, TACKLE] },
            { species: 175, isEgg: true, level: 50, hp: 100, moves: [TACKLE, TACKLE, TACKLE, TACKLE] },
            { species: 161, level: 50, hp: 100, moves: [SLEEP_TALK, ASSIST, MIRROR_MOVE, METRONOME] },
            { species: 161, level: 50, hp: 100, moves: [FOCUS_PUNCH, COUNTER, PROTECT, STRUGGLE] },
            {},
          ],
        },
      },
    );
    const result = stepAt(assistSelectInstruction, source, 0x29a7_2072);
    expect(result.state.programCounter).toBe(
      resolveBattleScriptLabel(program, "BattleScript_FailedFromPPReduce")!.programCounter,
    );
    expect(result.state.rulesContext).toBe(source);
    expect(result.state.rng.calls).toBe(0);
  });

  it("does not inherit Sleep Talk's extra Uproar exclusion beyond Assist's exact forbidden-array bound", () => {
    const source = rules(
      { partyIndex: 0, moves: [ASSIST, NONE, NONE, NONE] },
      {},
      {
        currentMove: ASSIST,
        chosenMove: ASSIST,
        party: {
          player: [
            { species: 340, level: 50, hp: 100, moves: [ASSIST, NONE, NONE, NONE] },
            { species: 161, level: 50, hp: 100, moves: [UPROAR, FOCUS_PUNCH, NONE, NONE] },
            {}, {}, {}, {},
          ],
        },
      },
    );
    const result = stepAt(assistSelectInstruction, source, 0x29a7_2072);
    expect(result.state.rulesContext.calledMove).toBe(UPROAR);
    expect(result.state.rng.calls).toBe(1);
  });

  it("runs the selected move through the existing TRUE path so its target/hit RNG and PP reduction execute while chosen move remains Assist", () => {
    const source = rules(
      { partyIndex: 0, moves: [ASSIST, NONE, NONE, NONE], pp: [10, 0, 0, 0] },
      {},
      {
        currentMove: ASSIST,
        chosenMove: ASSIST,
        party: {
          player: [
            { species: 340, level: 50, hp: 100, moves: [ASSIST, NONE, NONE, NONE], pp: [10, 0, 0, 0] },
            { species: 161, level: 50, hp: 100, moves: [FISSURE, NONE, NONE, NONE], pp: [5, 0, 0, 0] },
            {}, {}, {}, {},
          ],
        },
      },
    );
    const final = runAssistToTerminal(source, 5);
    expect(final.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
    expect(final.rulesContext.calledMove).toBe(FISSURE);
    expect(final.rulesContext.currentMove).toBe(FISSURE);
    expect(final.rulesContext.chosenMove).toBe(ASSIST);
    expect(final.rulesContext.battlers[0].pp).toEqual([9, 0, 0, 0]);
    expect(final.rulesContext.party.player[0].pp).toEqual([9, 0, 0, 0]);
    expect(final.rulesContext.party.player[1].pp).toEqual([5, 0, 0, 0]);
    expect(final.rng.ledger.map(({ reason }) => reason)).toEqual([
      "assist-scaled-selection",
      "assist-called-move-target",
      "tryko",
      "seteffectwithchance",
    ]);
  });
});
