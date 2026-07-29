import { describe, expect, it } from "vitest";
import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContext,
  type BattleScriptRulesContextInput,
  type BattleScriptStatusRulesExternalPorts,
} from "../src/engine/battleScriptRulesContext.ts";
import { loadBattleScriptProgram, resolveBattleScriptLabel, type BattleScriptInstruction, type BattleScriptOperand } from "../src/engine/battleScriptProgram.ts";
import {
  acknowledgeBattleScriptMachineController,
  stepBattleScriptMachine,
  type BattleScriptMachineState,
} from "../src/engine/battleScriptMachine.ts";
import {
  createJumpifcantmakeasleepOpcodeHandler,
  createJumpifsideaffectingOpcodeHandler,
  createJumpifstatusOpcodeHandler,
  createJumpiftypeOpcodeHandler,
} from "../src/engine/battleScriptStatusPrimaryOpcode.ts";

const program = loadBattleScriptProgram();
const TACKLE = 33;
const THUNDER_WAVE = 86; // EFFECT_PARALYZE, 100 acc, TYPE_ELECTRIC
const BODY_SLAM = 34; // EFFECT_PARALYZE_HIT, 30% secondary chance
const SLEEP_POWDER = 79; // EFFECT_SLEEP, 75 acc, TYPE_GRASS
const TOXIC = 92; // EFFECT_TOXIC, 85 acc, TYPE_POISON
const POISON_POWDER = 77; // EFFECT_POISON, 75 acc, TYPE_POISON
const CONFUSE_RAY = 109; // EFFECT_CONFUSE, 100 acc, TYPE_GHOST
const WILL_O_WISP = 261; // EFFECT_WILL_O_WISP, 75 acc, TYPE_FIRE
const STATUS1_PARALYSIS = 1 << 6;
const STATUS1_POISON = 1 << 3;
const STATUS1_TOXIC_POISON = 1 << 7;
const STATUS1_BURN = 1 << 4;
const STATUS2_CONFUSION_MASK = 0x7;
const SIDE_STATUS_SAFEGUARD = 1 << 5;
const ABILITY_LIMBER = 7;
const ABILITY_IMMUNITY = 17;
const ABILITY_OWN_TEMPO = 20;
const ABILITY_SOUNDPROOF = 43;
const ABILITY_INSOMNIA = 15;
const ABILITY_VITAL_SPIRIT = 72;
const ABILITY_WATER_VEIL = 41;

function battler(changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 100,
    maxHP: changes.maxHP ?? 100,
    moves: changes.moves ?? Object.freeze([TACKLE, 0, 0, 0]),
    pp: changes.pp ?? Object.freeze([35, 0, 0, 0]),
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
    statStages: changes.statStages ?? [6, 6, 6, 6, 6, 6, 6, 6],
    protected: changes.protected,
    ppNotAffectedByPressure: changes.ppNotAffectedByPressure,
    types: changes.types ?? (["TYPE_NORMAL", "TYPE_NORMAL"] as const),
    species: changes.species ?? 0,
    attack: changes.attack ?? 0,
    defense: changes.defense ?? 0,
    spAttack: changes.spAttack ?? 0,
    spDefense: changes.spDefense ?? 0,
    level: changes.level ?? 50,
    friendship: changes.friendship ?? 0,
    partyIndex: changes.partyIndex ?? 0,
    endured: changes.endured,
    helpingHand: changes.helpingHand,
    turnOrderNum: changes.turnOrderNum,
    wrappedMove: changes.wrappedMove,
    wrappedBy: changes.wrappedBy,
  });
}

function context(
  attacker: 0 | 1,
  attackerChanges: Partial<BattleScriptRulesBattler> = {},
  contextChanges: Partial<BattleScriptRulesContextInput> = {},
  targetChanges: Partial<BattleScriptRulesBattler> = {},
): BattleScriptRulesContext {
  const target = (attacker ^ 1) as 0 | 1;
  const battlers: BattleScriptRulesBattler[] = [
    battler({ side: 0 }),
    battler({ side: 1 }),
    battler({ side: 0 }),
    battler({ side: 1 }),
  ];
  battlers[attacker] = battler({ side: attacker, ...attackerChanges });
  battlers[target] = battler({ side: target, ...targetChanges });
  return createBattleScriptRulesContext({
    battlers,
    selectorRoles: { attacker, target, effectBattler: target },
    scriptingBattler: attacker,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: TACKLE,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
    ...contextChanges,
  });
}

function externalPorts(
  overrides: Partial<BattleScriptStatusRulesExternalPorts> = {},
): BattleScriptStatusRulesExternalPorts {
  return Object.freeze({
    isControllerIdle: () => true,
    prepareMessage: (_context, operand) =>
      operand.expression.startsWith("STRINGID_")
        ? Object.freeze({ kind: "message" as const, messageId: operand.expression, substitutions: Object.freeze([]) })
        : null,
    prepareSelectionMessage: () => null,
    prepareSelectionMessageFromTable: () => null,
    resolveAttackerBattler: () => null,
    resolveBattlerAtPosition: () => null,
    resolveHalfwordOperand: (_context, operand) =>
      operand.expression === "B_WAIT_TIME_LONG" || operand.expression === "B_WAIT_TIME_SHORT" ? 1 : null,
    resolveByteOperand: () => null,
    ...overrides,
  });
}

function labelPc(label: string): number {
  const entry = resolveBattleScriptLabel(program, label);
  if (!entry) throw new Error(`committed Battle Script program does not define label ${label}`);
  return entry.programCounter;
}

function ackAllPending(
  state: BattleScriptMachineState<BattleScriptRulesContext>,
): BattleScriptMachineState<BattleScriptRulesContext> {
  let next = state;
  for (const b of state.scheduler.pendingControllerBattlers) {
    next = acknowledgeBattleScriptMachineController(next, b);
  }
  return next;
}

/** Runs a real committed script from its literal entry to a target label, acking any pending controller battlers between steps (attackanimation/waitanimation). */
function runUntilLabel(
  entryLabel: string,
  targetLabel: string,
  rulesContext: BattleScriptRulesContext,
  rngSeed = 1,
  ports = externalPorts(),
  budget = 80,
) {
  const execution = createBattleScriptStatusRulesExecution(program, entryLabel, rulesContext, rngSeed, ports);
  const targetPc = labelPc(targetLabel);
  let result = stepBattleScriptMachine(program, execution.state, execution.handlers);
  let steps = 1;
  while (result.kind === "advanced" && result.state.programCounter !== targetPc && steps < budget) {
    result = stepBattleScriptMachine(program, ackAllPending(result.state), execution.handlers);
    steps++;
  }
  return { execution, result, steps };
}

/** Runs a committed effect entry through its callbacks and MoveEnd to END. */
function runToTerminal(
  entryLabel: string,
  rulesContext: BattleScriptRulesContext,
  rngSeed = 1,
  ports = externalPorts(),
) {
  const execution = createBattleScriptStatusRulesExecution(program, entryLabel, rulesContext, rngSeed, ports);
  let result = stepBattleScriptMachine(program, execution.state, execution.handlers);
  let steps = 1;
  while (result.kind !== "halted" && steps < 1000) {
    result = stepBattleScriptMachine(program, ackAllPending(result.state), execution.handlers);
    steps++;
  }
  if (result.kind !== "halted") {
    throw new Error(`${entryLabel} did not reach END after ${steps} steps at pc ${result.state.programCounter}`);
  }
  expect(result.state.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
  return result;
}

const BASE_STATE = createBattleScriptStatusRulesExecution(
  program,
  "BattleScript_EffectSleep",
  context(0),
  1,
  externalPorts(),
).state;

function operand(expression: string, widthBytes: 1 | 2 | 4 = 1): BattleScriptOperand {
  return Object.freeze({ widthBytes, expression, sourceMacro: "test", sourceMacroLine: 0, wrapperPath: Object.freeze([]) });
}

function fakeInstruction(operands: readonly BattleScriptOperand[]): BattleScriptInstruction {
  return Object.freeze({
    programCounter: BASE_STATE.programCounter,
    opcodeId: 0,
    opcodeName: "TEST",
    dispatcher: "test",
    operands,
    source: Object.freeze({
      label: "test",
      labelLine: 0,
      statementLine: 0,
      invocationMnemonic: "test",
      invocationMacroLine: 0,
      sourceMacro: "test",
      sourceMacroLine: 0,
      wrapperPath: Object.freeze([]),
    }),
  });
}

const resolveTarget = (
  _ctx: unknown,
  op: BattleScriptOperand,
): 0 | 1 | null => (op.expression === "BS_TARGET" ? 1 : op.expression === "BS_ATTACKER" ? 0 : null);

describe("production jumpifstatus (Cmd_jumpifstatus) dispatch", () => {
  const handler = createJumpifstatusOpcodeHandler(resolveTarget);

  it("jumps when the target's status1 has the checked bit set and hp != 0", () => {
    const rulesContext = context(0, {}, {}, { status1: STATUS1_PARALYSIS });
    const state = Object.freeze({ ...BASE_STATE, rulesContext });
    const instr = fakeInstruction([
      operand("BS_TARGET"),
      operand("STATUS1_PARALYSIS", 4),
      operand("BattleScript_AlreadyAsleep", 4),
    ]);
    const transition = handler({ program, instruction: instr, state });
    expect(transition.control).toMatchObject({ kind: "jump", programCounter: labelPc("BattleScript_AlreadyAsleep") });
  });

  it("does not jump when the bit is clear", () => {
    const rulesContext = context(0, {}, {}, { status1: 0 });
    const state = Object.freeze({ ...BASE_STATE, rulesContext });
    const instr = fakeInstruction([
      operand("BS_TARGET"),
      operand("STATUS1_PARALYSIS", 4),
      operand("BattleScript_AlreadyAsleep", 4),
    ]);
    const transition = handler({ program, instruction: instr, state });
    expect(transition.control).toMatchObject({ kind: "advance" });
    expect(transition.rulesContext.aiObservedAbilityIds[1]).toBe(0);
  });

  it("resolves a |-combined mask (the real STATUS1_POISON | STATUS1_BURN | STATUS1_PARALYSIS | STATUS1_TOXIC_POISON call site)", () => {
    const rulesContext = context(0, {}, {}, { status1: STATUS1_TOXIC_POISON });
    const state = Object.freeze({ ...BASE_STATE, rulesContext });
    const instr = fakeInstruction([
      operand("BS_TARGET"),
      operand("STATUS1_POISON | STATUS1_BURN | STATUS1_PARALYSIS | STATUS1_TOXIC_POISON", 4),
      operand("BattleScript_ButItFailed", 4),
    ]);
    const transition = handler({ program, instruction: instr, state });
    expect(transition.control).toMatchObject({ kind: "jump" });
  });

  it("(b) unsupported-branch: a status1 mask outside the registered set halts", () => {
    const rulesContext = context(0);
    const state = Object.freeze({ ...BASE_STATE, rulesContext });
    const instr = fakeInstruction([
      operand("BS_TARGET"),
      operand("STATUS1_NONE", 4),
      operand("BattleScript_ButItFailed", 4),
    ]);
    const transition = handler({ program, instruction: instr, state });
    expect(transition.control).toMatchObject({ kind: "halt", reason: { kind: "unsupported-branch" } });
  });
});

describe("production jumpiftype (Cmd_jumpiftype) dispatch", () => {
  const handler = createJumpiftypeOpcodeHandler(resolveTarget);

  it("jumps when the target is of the checked type", () => {
    const rulesContext = context(0, {}, {}, { types: ["TYPE_POISON", "TYPE_POISON"] });
    const state = Object.freeze({ ...BASE_STATE, rulesContext });
    const instr = fakeInstruction([operand("BS_TARGET"), operand("TYPE_POISON"), operand("BattleScript_NotAffected", 4)]);
    const transition = handler({ program, instruction: instr, state });
    expect(transition.control).toMatchObject({ kind: "jump", programCounter: labelPc("BattleScript_NotAffected") });
  });

  it("does not jump for an unmatched type", () => {
    const rulesContext = context(0, {}, {}, { types: ["TYPE_NORMAL", "TYPE_NORMAL"] });
    const state = Object.freeze({ ...BASE_STATE, rulesContext });
    const instr = fakeInstruction([operand("BS_TARGET"), operand("TYPE_POISON"), operand("BattleScript_NotAffected", 4)]);
    const transition = handler({ program, instruction: instr, state });
    expect(transition.control).toMatchObject({ kind: "advance" });
  });

  it("(b) unsupported-branch: a type token outside the 18-name set halts", () => {
    const rulesContext = context(0);
    const state = Object.freeze({ ...BASE_STATE, rulesContext });
    const instr = fakeInstruction([operand("BS_TARGET"), operand("TYPE_BOGUS"), operand("BattleScript_NotAffected", 4)]);
    const transition = handler({ program, instruction: instr, state });
    expect(transition.control).toMatchObject({ kind: "halt", reason: { kind: "unsupported-branch" } });
  });
});

describe("production jumpifsideaffecting (Cmd_jumpifsideaffecting) dispatch", () => {
  const handler = createJumpifsideaffectingOpcodeHandler(resolveTarget);

  it("jumps when the target's side carries Safeguard", () => {
    const rulesContext = context(0, {}, { sideStatuses: [0, SIDE_STATUS_SAFEGUARD] });
    const state = Object.freeze({ ...BASE_STATE, rulesContext });
    const instr = fakeInstruction([
      operand("BS_TARGET"),
      operand("SIDE_STATUS_SAFEGUARD", 2),
      operand("BattleScript_SafeguardProtected", 4),
    ]);
    const transition = handler({ program, instruction: instr, state });
    expect(transition.control).toMatchObject({ kind: "jump", programCounter: labelPc("BattleScript_SafeguardProtected") });
  });

  it("does not jump when Safeguard is not up", () => {
    const rulesContext = context(0, {}, { sideStatuses: [0, 0] });
    const state = Object.freeze({ ...BASE_STATE, rulesContext });
    const instr = fakeInstruction([
      operand("BS_TARGET"),
      operand("SIDE_STATUS_SAFEGUARD", 2),
      operand("BattleScript_SafeguardProtected", 4),
    ]);
    const transition = handler({ program, instruction: instr, state });
    expect(transition.control).toMatchObject({ kind: "advance" });
  });

  it("(b) unsupported-branch: a side-status value outside the registered set halts", () => {
    const rulesContext = context(0);
    const state = Object.freeze({ ...BASE_STATE, rulesContext });
    const instr = fakeInstruction([
      operand("BS_TARGET"),
      operand("SIDE_STATUS_MIST", 2),
      operand("BattleScript_SafeguardProtected", 4),
    ]);
    const transition = handler({ program, instruction: instr, state });
    expect(transition.control).toMatchObject({ kind: "halt", reason: { kind: "unsupported-branch" } });
  });
});

describe("production jumpifcantmakeasleep (Cmd_jumpifcantmakeasleep) dispatch", () => {
  const handler = createJumpifcantmakeasleepOpcodeHandler();
  const instr = fakeInstruction([operand("BattleScript_CantMakeAsleep", 4)]);

  it("advances (can sleep) when nothing blocks it", () => {
    const rulesContext = context(0);
    const state = Object.freeze({ ...BASE_STATE, rulesContext });
    const transition = handler({ program, instruction: instr, state });
    expect(transition.control).toMatchObject({ kind: "advance" });
  });

  it("jumps, B_MSG_CANT_SLEEP_UPROAR, when the target itself has an active Uproar", () => {
    const rulesContext = context(0, {}, {}, { status2: 1 << 4 }); // STATUS2_UPROAR bit 4
    const state = Object.freeze({ ...BASE_STATE, rulesContext });
    const transition = handler({ program, instruction: instr, state });
    expect(transition.control).toMatchObject({ kind: "jump", programCounter: labelPc("BattleScript_CantMakeAsleep") });
    expect(transition.rulesContext.multistringChooser).toBe(0); // B_MSG_CANT_SLEEP_UPROAR
  });

  it("jumps, B_MSG_UPROAR_KEPT_AWAKE, when a different battler has an active Uproar", () => {
    const rulesContext = context(0, { status2: 1 << 4 }, {}, {});
    const state = Object.freeze({ ...BASE_STATE, rulesContext });
    const transition = handler({ program, instruction: instr, state });
    expect(transition.control).toMatchObject({ kind: "jump" });
    expect(transition.rulesContext.multistringChooser).toBe(1); // B_MSG_UPROAR_KEPT_AWAKE
  });

  it("Soundproof bypasses any Uproar check entirely", () => {
    const rulesContext = context(0, { status2: 1 << 4 }, {}, { ability: ABILITY_SOUNDPROOF });
    const state = Object.freeze({ ...BASE_STATE, rulesContext });
    const transition = handler({ program, instruction: instr, state });
    expect(transition.control).toMatchObject({ kind: "advance" });
  });

  it("jumps for Insomnia, recording lastUsedAbility", () => {
    const rulesContext = context(0, {}, {}, { ability: ABILITY_INSOMNIA });
    const state = Object.freeze({ ...BASE_STATE, rulesContext });
    const transition = handler({ program, instruction: instr, state });
    expect(transition.control).toMatchObject({ kind: "jump" });
    expect(transition.rulesContext.lastUsedAbility).toBe(ABILITY_INSOMNIA);
    expect(transition.rulesContext.aiObservedAbilityIds[1]).toBe(ABILITY_INSOMNIA);
  });

  it("jumps for Vital Spirit", () => {
    const rulesContext = context(0, {}, {}, { ability: ABILITY_VITAL_SPIRIT });
    const state = Object.freeze({ ...BASE_STATE, rulesContext });
    const transition = handler({ program, instruction: instr, state });
    expect(transition.control).toMatchObject({ kind: "jump" });
    expect(transition.rulesContext.aiObservedAbilityIds[1]).toBe(ABILITY_VITAL_SPIRIT);
  });
});

describe("primary status-move opcode cluster: full committed scripts (docs/status-cluster-ground-truth.md)", () => {
  it("Sleep Powder succeeds through BattleScript_MoveEffectSleep to END: drawn turns persist and the fell-asleep message + status icon are emitted with no callback RNG", () => {
    const rc = context(0, { moves: [SLEEP_POWDER, 0, 0, 0] }, { currentMove: SLEEP_POWDER });
    const result = runToTerminal("BattleScript_EffectSleep", rc, 1);
    expect(result.state.rulesContext.battlers[1].status1).toBeGreaterThanOrEqual(2);
    expect(result.state.rulesContext.battlers[1].status1).toBeLessThanOrEqual(5);
    expect(result.state.events).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "message", messageId: "STRINGID_PKMNFELLASLEEP" }),
      expect.objectContaining({ kind: "status-icon-update", battler: 1 }),
    ]));
    expect(result.state.rng.calls).toBe(2);
    expect(result.state.rng.ledger.map((entry) => entry.reason)).toEqual([
      "accuracycheck",
      "SetMoveEffect sleep duration ((Random() & 3) + 2)",
    ]);
  });

  for (const statusCase of [
    {
      name: "Toxic",
      entry: "BattleScript_EffectToxic",
      move: TOXIC,
      status: STATUS1_TOXIC_POISON,
      message: "STRINGID_PKMNBADLYPOISONED",
    },
    {
      name: "Poison Powder",
      entry: "BattleScript_EffectPoison",
      move: POISON_POWDER,
      status: STATUS1_POISON,
      message: "STRINGID_PKMNWASPOISONED",
    },
    {
      name: "Thunder Wave",
      entry: "BattleScript_EffectParalyze",
      move: THUNDER_WAVE,
      status: STATUS1_PARALYSIS,
      message: "STRINGID_PKMNWASPARALYZED",
    },
  ] as const) {
    it(`${statusCase.name} succeeds through its status callback to END with status, message, icon, and RNG ledger intact`, () => {
      const rc = context(0, { moves: [statusCase.move, 0, 0, 0] }, { currentMove: statusCase.move });
      const result = runToTerminal(statusCase.entry, rc, 1);
      expect(result.state.rulesContext.battlers[1].status1).toBe(statusCase.status);
      expect(result.state.events).toEqual(expect.arrayContaining([
        expect.objectContaining({ kind: "message", messageId: statusCase.message }),
        expect.objectContaining({ kind: "status-icon-update", battler: 1, status1: statusCase.status }),
      ]));
      expect(result.state.rng.calls).toBe(1);
      expect(result.state.rng.ledger.map((entry) => entry.reason)).toEqual(["accuracycheck"]);
    });
  }

  it("Immunity prevention executes gEffectBattler <- gBattlerTarget before the shared PSN callback and reaches END without RNG", () => {
    const rc = context(
      0,
      { moves: [TOXIC, 0, 0, 0] },
      { currentMove: TOXIC, selectorRoles: { attacker: 0, target: 1, effectBattler: 0 } },
      { ability: ABILITY_IMMUNITY },
    );
    const result = runToTerminal("BattleScript_EffectToxic", rc);
    expect(result.state.rulesContext.selectorRoles.effectBattler).toBe(1);
    expect(result.state.events).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "message", messageId: "STRINGID_PKMNPREVENTSPOISONINGWITH" }),
    ]));
    expect(result.state.rng.calls).toBe(0);
  });

  it("Limber prevention uses the same real target assignment and PRLZ callback through END", () => {
    const rc = context(
      0,
      { moves: [THUNDER_WAVE, 0, 0, 0] },
      { currentMove: THUNDER_WAVE, selectorRoles: { attacker: 0, target: 1, effectBattler: 0 } },
      { ability: ABILITY_LIMBER },
    );
    const result = runToTerminal("BattleScript_EffectParalyze", rc);
    expect(result.state.rulesContext.selectorRoles.effectBattler).toBe(1);
    expect(result.state.events).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "message", messageId: "STRINGID_PKMNPREVENTSPARALYSISWITH" }),
    ]));
    expect(result.state.rng.calls).toBe(0);
  });

  it("Will-O-Wisp succeeds through the existing primary burn callback to END with one accuracy draw", () => {
    const rc = context(
      0,
      { moves: [WILL_O_WISP, 0, 0, 0], pp: [15, 0, 0, 0] },
      { currentMove: WILL_O_WISP },
    );
    const result = runToTerminal("BattleScript_EffectWillOWisp", rc, 1);
    expect(result.state.rulesContext.battlers[1].status1).toBe(STATUS1_BURN);
    expect(result.state.events).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "message", messageId: "STRINGID_PKMNWASBURNED" }),
      expect.objectContaining({ kind: "status-icon-update", battler: 1, status1: STATUS1_BURN }),
    ]));
    expect(result.state.rng).toMatchObject({
      calls: 1,
      ledger: [expect.objectContaining({ reason: "accuracycheck" })],
    });
  });

  it("Water Veil takes Will-O-Wisp's pre-accuracy immunity branch through END and records the ability with zero draws", () => {
    const rc = context(
      0,
      { moves: [WILL_O_WISP, 0, 0, 0], pp: [15, 0, 0, 0] },
      {
        currentMove: WILL_O_WISP,
        selectorRoles: { attacker: 0, target: 1, effectBattler: 0 },
      },
      { ability: ABILITY_WATER_VEIL },
    );
    const result = runToTerminal("BattleScript_EffectWillOWisp", rc, 1);
    expect(result.state.rulesContext.battlers[1].status1).toBe(0);
    expect(result.state.rulesContext).toMatchObject({
      // The later state-4 immunity scan's common pre-dispatch assignment
      // overwrites this with literal battler 0's ability.
      lastUsedAbility: 0,
      battlerWithAbility: 1,
      selectorRoles: { effectBattler: 1 },
    });
    expect(result.state.events).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "message", messageId: "STRINGID_PKMNSXPREVENTSBURNS" }),
    ]));
    expect(result.state.rng).toEqual({ value: 1, calls: 0, ledger: [] });
  });

  it("Will-O-Wisp fails against an already-statused target before accuracy and reaches END without replacing status", () => {
    const rc = context(
      0,
      { moves: [WILL_O_WISP, 0, 0, 0], pp: [15, 0, 0, 0] },
      { currentMove: WILL_O_WISP },
      { status1: STATUS1_POISON },
    );
    const result = runToTerminal("BattleScript_EffectWillOWisp", rc, 1);
    expect(result.state.rulesContext.battlers[1].status1).toBe(STATUS1_POISON);
    expect(result.state.events).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "message", messageId: "STRINGID_BUTITFAILED" }),
    ]));
    expect(result.state.rng).toEqual({ value: 1, calls: 0, ledger: [] });
  });

  it("the EFFECT_PARALYZE_HIT sibling wrapper reaches the same paralysis message/icon callback through END without the primary-only copyarray prevention branch", () => {
    const rc = context(
      0,
      {
        moves: [BODY_SLAM, 0, 0, 0],
        pp: [15, 0, 0, 0],
        attack: 55,
        level: 50,
      },
      { currentMove: BODY_SLAM },
      { defense: 115, hp: 125, maxHP: 125 },
    );
    const result = runToTerminal("BattleScript_EffectParalyzeHit", rc, 2643437444);
    expect(result.state.rulesContext.battlers[1].status1).toBe(STATUS1_PARALYSIS);
    expect(result.state.events).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "message", messageId: "STRINGID_PKMNWASPARALYZED" }),
      expect.objectContaining({ kind: "status-icon-update", battler: 1, status1: STATUS1_PARALYSIS }),
    ]));
    expect(result.state.rng.calls).toBe(4);
    expect(result.state.rng.ledger.map((entry) => entry.reason)).toEqual([
      "accuracycheck",
      "critcalc",
      "adjustnormaldamage",
      "seteffectwithchance",
    ]);
  });

  it("canonical replays of every restored primary status success are byte-for-byte deterministic in rules, events, and RNG ledgers", () => {
    for (const [entry, move] of [
      ["BattleScript_EffectSleep", SLEEP_POWDER],
      ["BattleScript_EffectToxic", TOXIC],
      ["BattleScript_EffectPoison", POISON_POWDER],
      ["BattleScript_EffectParalyze", THUNDER_WAVE],
      ["BattleScript_EffectWillOWisp", WILL_O_WISP],
    ] as const) {
      const rc = context(0, { moves: [move, 0, 0, 0] }, { currentMove: move });
      const first = runToTerminal(entry, rc, 1).state;
      const replay = runToTerminal(entry, rc, 1).state;
      expect(replay.rulesContext).toEqual(first.rulesContext);
      expect(replay.events).toEqual(first.events);
      expect(replay.rng).toEqual(first.rng);
    }
  });

  it("BattleScript_EffectParalyze (Thunder Wave): status1 gains exactly STATUS1_PARALYSIS, exactly 1 RNG draw (accuracy only)", () => {
    const rc = context(
      0,
      { moves: [THUNDER_WAVE, 0, 0, 0] },
      { currentMove: THUNDER_WAVE, multiHitEffect: 0x55 },
    );
    const { result, steps } = runUntilLabel("BattleScript_EffectParalyze", "BattleScript_MoveEffectParalysis", rc);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battlers[1].status1).toBe(STATUS1_PARALYSIS);
    // SetMoveEffect clears the selector before its pushed callback resumes;
    // primary dispatch does not share the chance opcode's multihit clear.
    expect(result.state.rulesContext.moveEffectByte).toBe(0);
    expect(result.state.rulesContext.multiHitEffect).toBe(0x55);
    expect(result.state.rng.calls).toBe(1);
    expect(steps).toBeLessThan(80);
  });

  it("BattleScript_EffectParalyze: Limber blocks at the script's own jumpifability gate (BattleScript_LimberProtected), reveals the ability", () => {
    const rc = context(0, { moves: [THUNDER_WAVE, 0, 0, 0] }, { currentMove: THUNDER_WAVE }, { ability: ABILITY_LIMBER });
    const { result } = runUntilLabel("BattleScript_EffectParalyze", "BattleScript_LimberProtected", rc);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.programCounter).toBe(labelPc("BattleScript_LimberProtected"));
    expect(result.state.rulesContext.battlers[1].status1).toBe(0);
    expect(result.state.rulesContext.lastUsedAbility).toBe(ABILITY_LIMBER);
    expect(result.state.rulesContext.aiObservedAbilityIds[1]).toBe(ABILITY_LIMBER);
  });

  it("BattleScript_EffectParalyze: already-paralyzed early-out (BattleScript_AlreadyParalyzed), zero RNG", () => {
    const rc = context(0, { moves: [THUNDER_WAVE, 0, 0, 0] }, { currentMove: THUNDER_WAVE }, { status1: STATUS1_PARALYSIS });
    const { result } = runUntilLabel("BattleScript_EffectParalyze", "BattleScript_AlreadyParalyzed", rc);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rng.calls).toBe(0);
  });

  it("BattleScript_EffectParalyze: Safeguard blocks after the accuracy roll (1 RNG draw), status untouched", () => {
    const rc = context(
      0,
      { moves: [THUNDER_WAVE, 0, 0, 0] },
      { currentMove: THUNDER_WAVE, sideStatuses: [0, SIDE_STATUS_SAFEGUARD] },
    );
    const { result } = runUntilLabel("BattleScript_EffectParalyze", "BattleScript_SafeguardProtected", rc);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battlers[1].status1).toBe(0);
    expect(result.state.rng.calls).toBe(1);
  });

  it("BattleScript_EffectSleep (Sleep Powder, hit): status1 == (Random() & 3) + 2, exactly 2 RNG draws (accuracy + duration)", () => {
    const rc = context(0, { moves: [SLEEP_POWDER, 0, 0, 0] }, { currentMove: SLEEP_POWDER });
    const { result } = runUntilLabel("BattleScript_EffectSleep", "BattleScript_MoveEffectSleep", rc, 1);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    const status1 = result.state.rulesContext.battlers[1].status1;
    expect(status1).toBeGreaterThanOrEqual(2);
    expect(status1).toBeLessThanOrEqual(5);
    expect(result.state.rng.calls).toBe(2);
  });

  it("BattleScript_EffectSleep: jumpifcantmakeasleep blocks on an active Uproar before any status write", () => {
    const rc = context(0, { moves: [SLEEP_POWDER, 0, 0, 0] }, { currentMove: SLEEP_POWDER }, { status2: 1 << 4 });
    const { result } = runUntilLabel("BattleScript_EffectSleep", "BattleScript_CantMakeAsleep", rc);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battlers[1].status1).toBe(0);
  });

  it("BattleScript_EffectToxic (hit): status1 gains exactly STATUS1_TOXIC_POISON", () => {
    const rc = context(0, { moves: [TOXIC, 0, 0, 0] }, { currentMove: TOXIC });
    const { result } = runUntilLabel("BattleScript_EffectToxic", "BattleScript_MoveEffectToxic", rc, 1);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battlers[1].status1).toBe(STATUS1_TOXIC_POISON);
  });

  it("BattleScript_EffectToxic: Immunity blocks and reveals the ability", () => {
    const rc = context(0, { moves: [TOXIC, 0, 0, 0] }, { currentMove: TOXIC }, { ability: ABILITY_IMMUNITY });
    const { result } = runUntilLabel("BattleScript_EffectToxic", "BattleScript_ImmunityProtected", rc);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battlers[1].status1).toBe(0);
    expect(result.state.rulesContext.lastUsedAbility).toBe(ABILITY_IMMUNITY);
    expect(result.state.rulesContext.aiObservedAbilityIds[1]).toBe(ABILITY_IMMUNITY);
  });

  it("BattleScript_EffectToxic vs a Poison-type target: jumpiftype redirects to BattleScript_NotAffected before any status write", () => {
    const rc = context(0, { moves: [TOXIC, 0, 0, 0] }, { currentMove: TOXIC }, { types: ["TYPE_POISON", "TYPE_POISON"] });
    const { result } = runUntilLabel("BattleScript_EffectToxic", "BattleScript_NotAffected", rc);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battlers[1].status1).toBe(0);
  });

  it("BattleScript_EffectPoison (hit): status1 gains exactly STATUS1_POISON", () => {
    const rc = context(0, { moves: [POISON_POWDER, 0, 0, 0] }, { currentMove: POISON_POWDER });
    const { result } = runUntilLabel("BattleScript_EffectPoison", "BattleScript_MoveEffectPoison", rc, 1);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battlers[1].status1).toBe(STATUS1_POISON);
  });

  it("BattleScript_EffectConfuse (hit): status2 gains a CONFUSION turn counter (2-5), 2 RNG draws (accuracy + duration)", () => {
    const rc = context(0, { moves: [CONFUSE_RAY, 0, 0, 0] }, { currentMove: CONFUSE_RAY });
    const { result } = runUntilLabel("BattleScript_EffectConfuse", "BattleScript_MoveEffectConfusion", rc, 1);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    const status2 = result.state.rulesContext.battlers[1].status2 & STATUS2_CONFUSION_MASK;
    expect(status2).toBeGreaterThanOrEqual(2);
    expect(status2).toBeLessThanOrEqual(5);
    expect(result.state.rng.calls).toBe(2);
  });

  it("BattleScript_EffectConfuse: Own Tempo blocks and reveals the ability", () => {
    const rc = context(0, { moves: [CONFUSE_RAY, 0, 0, 0] }, { currentMove: CONFUSE_RAY }, { ability: ABILITY_OWN_TEMPO });
    const { result } = runUntilLabel("BattleScript_EffectConfuse", "BattleScript_OwnTempoPrevents", rc);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battlers[1].status2 & STATUS2_CONFUSION_MASK).toBe(0);
    expect(result.state.rulesContext.lastUsedAbility).toBe(ABILITY_OWN_TEMPO);
  });

  it("BattleScript_EffectConfuse: already-confused early-out (BattleScript_AlreadyConfused)", () => {
    const rc = context(0, { moves: [CONFUSE_RAY, 0, 0, 0] }, { currentMove: CONFUSE_RAY }, { status2: 3 });
    const { result } = runUntilLabel("BattleScript_EffectConfuse", "BattleScript_AlreadyConfused", rc);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battlers[1].status2 & STATUS2_CONFUSION_MASK).toBe(3);
  });
});
