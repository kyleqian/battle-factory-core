import { describe, expect, it } from "vitest";
import {
  acknowledgeBattleScriptMachineController,
  stepBattleScriptMachine,
  type BattleScriptMachineState,
} from "../src/engine/battleScriptMachine.ts";
import { loadBattleScriptProgram } from "../src/engine/battleScriptProgram.ts";
import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContext,
  type BattleScriptStatusRulesExternalPorts,
} from "../src/engine/battleScriptRulesContext.ts";
import {
  BATTLE_SCRIPT_STATUS3_CHARGED_UP,
  BATTLE_SCRIPT_STATUS3_MUDSPORT,
  BATTLE_SCRIPT_STATUS3_WATERSPORT,
} from "../src/engine/battleScriptChargeSportOpcode.ts";

const program = loadBattleScriptProgram();
const CHARGE = 268;
const TACKLE = 33;
const FLAMETHROWER = 53;
const THUNDERBOLT = 85;
const MUD_SPORT = 300;
const WATER_SPORT = 346;
/** Granbull has Intimidate in both source ability slots, avoiding fixture ambiguity. */
const GRANBULL = 210;
const ABILITY_INTIMIDATE = 22;

function battler(
  side: 0 | 1,
  changes: Partial<BattleScriptRulesBattler> = {},
): BattleScriptRulesBattler {
  return Object.freeze({
    side,
    ability: changes.ability ?? ABILITY_INTIMIDATE,
    hp: changes.hp ?? 200,
    maxHP: changes.maxHP ?? 200,
    moves: changes.moves ?? [CHARGE, THUNDERBOLT, FLAMETHROWER, TACKLE] as const,
    pp: changes.pp ?? [20, 15, 15, 35] as const,
    status1: 0,
    status2: 0,
    status3: changes.status3 ?? 0,
    substituteHP: 0,
    rolloutTimer: 0,
    furyCutterCounter: 0,
    truantCounter: 0,
    rechargeTimer: 0,
    chargeTimer: changes.chargeTimer,
    chargeTimerStartValue: changes.chargeTimerStartValue,
    flinchImmobility: 0,
    disabledMove: 0,
    usedDisabledMove: 0,
    tauntTimer: 0,
    usedTauntedMove: 0,
    usedImprisonedMove: 0,
    item: 0,
    statStages: [6, 6, 6, 6, 6, 6, 6, 6],
    types: changes.types ?? ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
    species: GRANBULL,
    attack: 100,
    defense: 100,
    spAttack: 100,
    spDefense: 100,
    speed: 100,
    level: 50,
    friendship: 70,
    partyIndex: 0,
  });
}

function rules(
  move: number,
  attackerChanges: Partial<BattleScriptRulesBattler> = {},
): BattleScriptRulesContext {
  const active = {
    ...attackerChanges,
    moves: attackerChanges.moves ?? [move, THUNDERBOLT, FLAMETHROWER, TACKLE] as const,
    pp: attackerChanges.pp ?? [20, 15, 15, 35] as const,
  };
  return createBattleScriptRulesContext({
    battlers: [
      battler(0, active),
      battler(1),
      battler(0),
      battler(1),
    ],
    selectorRoles: { attacker: 0, target: 1, effectBattler: 1 },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: move,
    currentMovePosition: 0,
    chosenMove: move,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
    battleTopology: {
      battlersCount: 2,
      battleTypeFlags: 1 << 19,
      battlerPositions: [0, 1, 0xff, 0xff],
    },
  });
}

const ports: BattleScriptStatusRulesExternalPorts = Object.freeze({
  isControllerIdle: () => true,
  prepareMessage: (_context, operand) => Object.freeze({
    kind: "message" as const,
    messageId: operand.expression,
    substitutions: Object.freeze([]),
  }),
  prepareSelectionMessage: () => null,
  prepareSelectionMessageFromTable: () => null,
  resolveAttackerBattler: () => null,
  resolveBattlerAtPosition: () => null,
  resolveHalfwordOperand: (_context, operand) =>
    operand.expression.startsWith("B_WAIT_TIME_") ? 1 : null,
  resolveByteOperand: () => null,
});

function ack(
  state: BattleScriptMachineState<BattleScriptRulesContext>,
): BattleScriptMachineState<BattleScriptRulesContext> {
  let next = state;
  for (const battlerId of state.scheduler.pendingControllerBattlers) {
    next = acknowledgeBattleScriptMachineController(next, battlerId);
  }
  return next;
}

function runCharge(context: BattleScriptRulesContext): BattleScriptMachineState<BattleScriptRulesContext> {
  const execution = createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_EffectCharge",
    context,
    1,
    ports,
  );
  let result = stepBattleScriptMachine(program, execution.state, execution.handlers);
  for (let steps = 0; result.kind !== "halted" && steps < 500; steps += 1) {
    result = stepBattleScriptMachine(program, ack(result.state), execution.handlers);
  }
  if (result.kind !== "halted") throw new Error(`Charge did not halt: ${result.kind}`);
  expect(result.state.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
  return result.state;
}

function damageFor(
  move: number,
  status3: number,
  statusBattler = 0,
): number {
  const source = rules(move);
  const input = createBattleScriptRulesContext({
    ...source,
    battlers: source.battlers.map((candidate, index) =>
      index === statusBattler ? { ...candidate, status3 } : candidate
    ) as unknown as [BattleScriptRulesBattler, BattleScriptRulesBattler, BattleScriptRulesBattler, BattleScriptRulesBattler],
  });
  const execution = createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_EffectHit",
    input,
    1,
    ports,
  );
  const damagecalc = program.instructions.find(
    ({ opcodeName, source }) =>
      opcodeName === "B_SCR_OP_DAMAGECALC" && source.label === "BattleScript_HitFromCritCalc",
  );
  if (!damagecalc) throw new Error("missing EffectHit damagecalc");
  const result = stepBattleScriptMachine(
    program,
    Object.freeze({ ...execution.state, programCounter: damagecalc.programCounter }),
    execution.handlers,
  );
  if (result.kind !== "advanced") throw new Error(`damagecalc did not advance: ${result.kind}`);
  return result.state.rulesContext.battleMoveDamage;
}

function runSport(
  move: typeof MUD_SPORT | typeof WATER_SPORT,
  status3 = 0,
): BattleScriptMachineState<BattleScriptRulesContext> {
  const label = move === MUD_SPORT
    ? "BattleScript_EffectMudSport"
    : "BattleScript_EffectWaterSport";
  const execution = createBattleScriptStatusRulesExecution(
    program,
    label,
    rules(move, { status3 }),
    1,
    ports,
  );
  let result = stepBattleScriptMachine(program, execution.state, execution.handlers);
  for (let steps = 0; result.kind !== "halted" && steps < 500; steps += 1) {
    result = stepBattleScriptMachine(program, ack(result.state), execution.handlers);
  }
  if (result.kind !== "halted") throw new Error(`${label} did not halt: ${result.kind}`);
  expect(result.state.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
  return result.state;
}

describe("source-complete B_SCR_OP_SETCHARGE / EFFECT_CHARGE", () => {
  it("pins the sole source opcode and walks the zero-draw shell to END", () => {
    expect(program.instructions.filter(
      ({ opcodeName }) => opcodeName === "B_SCR_OP_SETCHARGE",
    )).toMatchObject([{
      opcodeId: 0xcb,
      dispatcher: "Cmd_setcharge",
      operands: [],
      source: { label: "BattleScript_EffectCharge" },
    }]);
    const state = runCharge(rules(CHARGE));
    expect(state.rulesContext.battlers[0]).toMatchObject({
      status3: BATTLE_SCRIPT_STATUS3_CHARGED_UP,
      chargeTimer: 2,
      chargeTimerStartValue: 2,
      pp: [19, 15, 15, 35],
    });
    expect(state.rng).toMatchObject({ calls: 0, ledger: [] });
  });

  it("repeat use refreshes both timer fields without RNG", () => {
    const state = runCharge(rules(CHARGE, {
      status3: BATTLE_SCRIPT_STATUS3_CHARGED_UP,
      chargeTimer: 1,
      chargeTimerStartValue: 7,
    }));
    expect(state.rulesContext.battlers[0]).toMatchObject({
      status3: BATTLE_SCRIPT_STATUS3_CHARGED_UP,
      chargeTimer: 2,
      chargeTimerStartValue: 2,
    });
    expect(state.rng.calls).toBe(0);
  });

  it("doubles Electric damage only while the source status bit is live", () => {
    const charged = BATTLE_SCRIPT_STATUS3_CHARGED_UP;
    expect(damageFor(THUNDERBOLT, charged)).toBe(damageFor(THUNDERBOLT, 0) * 2);
    expect(damageFor(FLAMETHROWER, charged)).toBe(damageFor(FLAMETHROWER, 0));
    expect(damageFor(TACKLE, charged)).toBe(damageFor(TACKLE, 0));
  });
});

describe("source-complete B_SCR_OP_SETTYPEBASEDHALVERS / Mud and Water Sport", () => {
  it("pins the shared pointer-bearing opcode", () => {
    expect(program.instructions.filter(
      ({ opcodeName }) => opcodeName === "B_SCR_OP_SETTYPEBASEDHALVERS",
    )).toMatchObject([{
      opcodeId: 0xe8,
      dispatcher: "Cmd_settypebasedhalvers",
      operands: [{ widthBytes: 4, expression: "BattleScript_ButItFailed" }],
      source: { label: "BattleScript_EffectWaterSport" },
    }]);
  });

  it.each([
    [MUD_SPORT, BATTLE_SCRIPT_STATUS3_MUDSPORT, 0, "STRINGID_ELECTRICITYWEAKENED"],
    [WATER_SPORT, BATTLE_SCRIPT_STATUS3_WATERSPORT, 1, "STRINGID_FIREWEAKENED"],
  ] as const)(
    "move %i succeeds through its shared print table to END with zero draws",
    (move, bit, chooser, messageId) => {
      const state = runSport(move);
      expect(state.rulesContext.battlers[0].status3).toBe(bit);
      expect(state.rulesContext.multistringChooser).toBe(chooser);
      expect(state.rulesContext.battlers[0].pp[0]).toBe(19);
      expect(state.events).toContainEqual(expect.objectContaining({ kind: "message", messageId }));
      expect(state.rng).toMatchObject({ calls: 0, ledger: [] });
    },
  );

  it.each([
    [MUD_SPORT, BATTLE_SCRIPT_STATUS3_MUDSPORT],
    [WATER_SPORT, BATTLE_SCRIPT_STATUS3_WATERSPORT],
  ] as const)("move %i repeat use takes BattleScript_ButItFailed to END with zero draws", (move, bit) => {
    const state = runSport(move, bit);
    expect(state.rulesContext.battlers[0].status3).toBe(bit);
    expect(state.rulesContext.battlers[0].pp[0]).toBe(19);
    expect(state.events).toContainEqual(expect.objectContaining({
      kind: "message",
      messageId: "STRINGID_BUTITFAILED",
    }));
    expect(state.rng).toMatchObject({ calls: 0, ledger: [] });
  });

  it("scans either active side before the formula, halves only the matching type, and ignores inactive slots", () => {
    expect(damageFor(THUNDERBOLT, 0)).toBe(43);
    expect(damageFor(THUNDERBOLT, BATTLE_SCRIPT_STATUS3_MUDSPORT, 0)).toBe(22);
    expect(damageFor(THUNDERBOLT, BATTLE_SCRIPT_STATUS3_MUDSPORT, 1)).toBe(22);
    expect(damageFor(THUNDERBOLT, BATTLE_SCRIPT_STATUS3_MUDSPORT, 2)).toBe(43);
    expect(damageFor(FLAMETHROWER, 0)).toBe(43);
    expect(damageFor(FLAMETHROWER, BATTLE_SCRIPT_STATUS3_WATERSPORT, 1)).toBe(22);
    expect(damageFor(THUNDERBOLT, BATTLE_SCRIPT_STATUS3_WATERSPORT, 1)).toBe(43);
    expect(damageFor(FLAMETHROWER, BATTLE_SCRIPT_STATUS3_MUDSPORT, 1)).toBe(43);
    expect(damageFor(TACKLE, BATTLE_SCRIPT_STATUS3_MUDSPORT | BATTLE_SCRIPT_STATUS3_WATERSPORT, 1))
      .toBe(damageFor(TACKLE, 0));
  });
});
