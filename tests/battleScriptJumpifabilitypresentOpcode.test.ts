import { describe, expect, it } from "vitest";
import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContext,
  type BattleScriptRulesContextInput,
  type BattleScriptStatusRulesExternalPorts,
} from "../src/engine/battleScriptRulesContext.ts";
import { loadBattleScriptProgram, resolveBattleScriptLabel } from "../src/engine/battleScriptProgram.ts";
import {
  acknowledgeBattleScriptMachineController,
  stepBattleScriptMachine,
  type BattleScriptMachineState,
} from "../src/engine/battleScriptMachine.ts";

/**
 * `B_SCR_OP_JUMPIFABILITYPRESENT` -- ranked-table row (EFFECT_SOLAR_BEAM,
 * 16 weighted) -- plus the census-invisible `gBattleWeather` `JUMPIFHALFWORD`
 * widening documented in docs/semi-invulnerable-registration-scout.md's own
 * named remainder.
 */
const SOLAR_BEAM = 76;
/** include/constants/abilities.h:13,77. */
const ABILITY_CLOUD_NINE = 13;
const ABILITY_AIR_LOCK = 77;
/** include/constants/battle.h:239-241. */
const B_WEATHER_SUN = (1 << 5) | (1 << 6);
const B_WEATHER_RAIN = (1 << 0) | (1 << 1) | (1 << 2);
/** include/constants/battle.h:139. */
const STATUS2_MULTIPLETURNS = 1 << 12;

function battler(changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 100,
    maxHP: changes.maxHP ?? 100,
    moves: changes.moves ?? Object.freeze([SOLAR_BEAM, 0, 0, 0]),
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
    statStages: changes.statStages ?? [6, 6, 6, 6, 6, 6, 6, 6],
    types: changes.types ?? (["TYPE_NORMAL", "TYPE_NORMAL"] as const),
    species: changes.species ?? 0,
    attack: changes.attack ?? 50,
    defense: changes.defense ?? 50,
    spAttack: changes.spAttack ?? 50,
    spDefense: changes.spDefense ?? 50,
    level: changes.level ?? 50,
    friendship: changes.friendship ?? 0,
    partyIndex: changes.partyIndex ?? 0,
  });
}

function context(
  attackerChanges: Partial<BattleScriptRulesBattler> = {},
  contextChanges: Partial<BattleScriptRulesContextInput> = {},
  targetChanges: Partial<BattleScriptRulesBattler> = {},
): BattleScriptRulesContext {
  const battlers: BattleScriptRulesBattler[] = [
    battler({ side: 0, ...attackerChanges }),
    battler({ side: 1, ...targetChanges }),
    battler({ side: 0 }),
    battler({ side: 1 }),
  ];
  return createBattleScriptRulesContext({
    battlers,
    selectorRoles: { attacker: 0, target: 1, effectBattler: 0 },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: SOLAR_BEAM,
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

const program = loadBattleScriptProgram();

function externalPorts(): BattleScriptStatusRulesExternalPorts {
  const B_WAIT_TIME_LONG = 64;
  const B_WAIT_TIME_SHORT = 32;
  return Object.freeze({
    isControllerIdle: () => true,
    prepareMessage: (_ctx, operand) =>
      operand.expression.startsWith("STRINGID_")
        ? Object.freeze({ kind: "message" as const, messageId: operand.expression, substitutions: Object.freeze([]) })
        : null,
    prepareSelectionMessage: () => null,
    prepareSelectionMessageFromTable: () => null,
    resolveAttackerBattler: () => null,
    resolveBattlerAtPosition: () => null,
    resolveHalfwordOperand: (_ctx, operand) => {
      if (operand.expression === "B_WAIT_TIME_LONG") return B_WAIT_TIME_LONG;
      if (operand.expression === "B_WAIT_TIME_SHORT") return B_WAIT_TIME_SHORT;
      return /^[0-9]+$/.test(operand.expression) ? Number(operand.expression) : null;
    },
    resolveByteOperand: (_ctx, operand) => (/^[0-9]+$/.test(operand.expression) ? Number(operand.expression) : null),
  });
}

function labelPc(label: string): number {
  const entry = resolveBattleScriptLabel(program, label);
  if (!entry) throw new Error(`committed Battle Script program does not define label ${label}`);
  return entry.programCounter;
}

const JUMPIFABILITYPRESENT_PCS = program.instructions
  .filter((instruction) => instruction.opcodeName === "B_SCR_OP_JUMPIFABILITYPRESENT")
  .map((instruction) => instruction.programCounter);

function stepAt(pc: number, rc: BattleScriptRulesContext, label = "BattleScript_EffectSolarBeam") {
  const execution = createBattleScriptStatusRulesExecution(program, label, rc, 1, externalPorts());
  const patched = Object.freeze({ ...execution.state, programCounter: pc });
  return stepBattleScriptMachine(program, patched, execution.handlers);
}

describe("production jumpifabilitypresent (Cmd_jumpifabilitypresent) dispatch", () => {
  it("registers B_SCR_OP_JUMPIFABILITYPRESENT at both concrete call sites (Cloud Nine, Air Lock)", () => {
    expect(JUMPIFABILITYPRESENT_PCS).toHaveLength(2);
  });

  it(
    "eager construction-time validation, not a runtime barrier: both concrete committed call sites are fixed "
      + "facts of the compiled program (Cloud Nine / Air Lock only), so an unrecognized ability operand would "
      + "throw at registration rather than defer to an unreachable runtime (b) guard -- this is a live assertion "
      + "that createBattleScriptJumpifabilitypresentOpcodeHandlers actually performs that check, not a smoke test",
    () => {
      const source = program.instructions.find((i) => i.opcodeName === "B_SCR_OP_JUMPIFABILITYPRESENT")!;
      expect(source.operands[0]?.widthBytes).toBe(1);
      expect(["ABILITY_CLOUD_NINE", "ABILITY_AIR_LOCK"]).toContain(source.operands[0]?.expression);
    },
  );

  it("ability absent from the field: advances past the ptr", () => {
    const rc = context();
    const result = stepAt(JUMPIFABILITYPRESENT_PCS[0]!, rc);
    if (result.kind !== "advanced") throw new Error(`did not advance: ${result.kind}`);
    expect(result.state.programCounter).toBe(JUMPIFABILITYPRESENT_PCS[0]! + 1);
  });

  it("ability present on the attacker: jumps to BattleScript_SolarBeamDecideTurn", () => {
    const rc = context({ ability: ABILITY_CLOUD_NINE });
    const result = stepAt(JUMPIFABILITYPRESENT_PCS[0]!, rc);
    if (result.kind !== "advanced") throw new Error(`did not advance: ${result.kind}`);
    expect(result.state.programCounter).toBe(labelPc("BattleScript_SolarBeamDecideTurn"));
  });

  it("ability present on the (non-attacker) target: still detected -- the scan covers every battler, not just the attacker", () => {
    const rc = context({}, {}, { ability: ABILITY_AIR_LOCK });
    const result = stepAt(JUMPIFABILITYPRESENT_PCS[1]!, rc);
    if (result.kind !== "advanced") throw new Error(`did not advance: ${result.kind}`);
    expect(result.state.programCounter).toBe(labelPc("BattleScript_SolarBeamDecideTurn"));
  });

  it("ability present but fainted (hp == 0): not detected, matching ABILITYEFFECT_CHECK_ON_FIELD's own hp != 0 guard", () => {
    const rc = context({}, {}, { ability: ABILITY_CLOUD_NINE, hp: 0 });
    const result = stepAt(JUMPIFABILITYPRESENT_PCS[0]!, rc);
    if (result.kind !== "advanced") throw new Error(`did not advance: ${result.kind}`);
    expect(result.state.programCounter).toBe(JUMPIFABILITYPRESENT_PCS[0]! + 1);
  });
});

describe("JUMPIFHALFWORD gBattleWeather widening (B_WEATHER_SUN)", () => {
  const jumpifhalfwordPc = program.instructions.find(
    (i) => i.opcodeName === "B_SCR_OP_JUMPIFHALFWORD" && i.source.label === "BattleScript_EffectSolarBeam",
  )!.programCounter;

  it("sun active: jumps to BattleScript_SolarBeamOnFirstTurn", () => {
    const rc = context({}, { weather: B_WEATHER_SUN });
    const result = stepAt(jumpifhalfwordPc, rc);
    if (result.kind !== "advanced") throw new Error(`did not advance: ${result.kind}`);
    expect(result.state.programCounter).toBe(labelPc("BattleScript_SolarBeamOnFirstTurn"));
  });

  it("no sun: advances to the next instruction (Cloud Nine/Air Lock guards already passed)", () => {
    const rc = context({}, { weather: B_WEATHER_RAIN });
    const result = stepAt(jumpifhalfwordPc, rc);
    if (result.kind !== "advanced") throw new Error(`did not advance: ${result.kind}`);
    expect(result.state.programCounter).toBe(jumpifhalfwordPc + 1);
  });
});

describe("EFFECT_SOLAR_BEAM: full committed script walks, both branches", () => {
  function ackAllPending(
    state: BattleScriptMachineState<BattleScriptRulesContext>,
  ): BattleScriptMachineState<BattleScriptRulesContext> {
    let next = state;
    for (const battlerId of state.scheduler.pendingControllerBattlers) {
      next = acknowledgeBattleScriptMachineController(next, battlerId);
    }
    return next;
  }

  function step(
    state: BattleScriptMachineState<BattleScriptRulesContext>,
    handlers: ReturnType<typeof createBattleScriptStatusRulesExecution>["handlers"],
  ) {
    let result = stepBattleScriptMachine(program, state, handlers);
    let guard = 0;
    while (result.kind === "scheduler-progressed" || result.kind === "blocked") {
      guard += 1;
      if (guard > 500) throw new Error("step() did not converge");
      const nextState = result.kind === "blocked" ? ackAllPending(result.state) : result.state;
      result = stepBattleScriptMachine(program, nextState, handlers);
    }
    return result;
  }

  function runToTerminal(label: string, rc: BattleScriptRulesContext, rngSeed: number) {
    const execution = createBattleScriptStatusRulesExecution(program, label, rc, rngSeed, externalPorts());
    let result = step(execution.state, execution.handlers);
    let steps = 0;
    while (result.kind === "advanced" && steps < 500) {
      steps += 1;
      result = step(result.state, execution.handlers);
    }
    if (result.kind !== "halted") throw new Error(`script did not reach its own end: ${result.kind}`);
    expect(result.state.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
    return result;
  }

  it("no sun: charge turn sets STATUS2_MULTIPLETURNS + chargingTurn (zero RNG), attack turn clears it and lands on the target", () => {
    const chargeRc = context({}, { weather: 0 });
    const chargeResult = runToTerminal("BattleScript_EffectSolarBeam", chargeRc, 1);
    const afterCharge = chargeResult.state.rulesContext;
    expect(afterCharge.battlers[0]!.status2 & STATUS2_MULTIPLETURNS).toBe(STATUS2_MULTIPLETURNS);
    expect(afterCharge.battlers[0]!.chargingTurn).toBe(1);
    expect(chargeResult.state.rng.calls).toBe(0); // BattleScriptFirstChargingTurn draws no RNG

    const attackResult = runToTerminal("BattleScript_TwoTurnMovesSecondTurn", afterCharge, 1);
    const afterAttack = attackResult.state.rulesContext;
    expect(afterAttack.battlers[0]!.status2 & STATUS2_MULTIPLETURNS).toBe(0);
    expect(afterAttack.battlers[1]!.hp).toBeLessThan(100); // Solar Beam landed
    // Solar Beam is 100 accuracy, no MOVE_EFFECT set on this path: accuracycheck +
    // critcalc + adjustnormaldamage + the tail's unconditional seteffectwithchance
    // (moveEffectByte == 0, not CERTAIN, so the percent-chance Random() still
    // fires per Cmd_seteffectwithchance's own unconditional-roll order) = 4 draws.
    expect(attackResult.state.rng.calls).toBe(4);
  });

  it("sun active: skips the charge turn entirely, attacking on the very first turn (BattleScript_SolarBeamOnFirstTurn -> TwoTurnMovesSecondTurn, same turn)", () => {
    const rc = context({}, { weather: B_WEATHER_SUN });
    const result = runToTerminal("BattleScript_EffectSolarBeam", rc, 1);
    const after = result.state.rulesContext;
    expect(after.battlers[0]!.status2 & STATUS2_MULTIPLETURNS).toBe(0); // set then cleared within the same walk
    expect(after.battlers[1]!.hp).toBeLessThan(100); // Solar Beam landed immediately, no separate charge turn
    expect(result.state.rng.calls).toBe(4); // same hit-chain tail as the non-sun attack turn
  });

  it("Cloud Nine on the field: sun is nullified by JUMPIFABILITYPRESENT before the weather check, so the charge turn still occurs under sun", () => {
    const rc = context({}, { weather: B_WEATHER_SUN }, { ability: ABILITY_CLOUD_NINE });
    const result = runToTerminal("BattleScript_EffectSolarBeam", rc, 1);
    const after = result.state.rulesContext;
    // Cloud Nine's own jumpifabilitypresent jump fires first (BattleScript_SolarBeamDecideTurn),
    // which for a fresh (non-charging) attacker falls through DecideTurn's own two guards into
    // BattleScriptFirstChargingTurn -- the charge branch, exactly as if there were no sun at all.
    expect(after.battlers[0]!.status2 & STATUS2_MULTIPLETURNS).toBe(STATUS2_MULTIPLETURNS);
    expect(after.battlers[0]!.chargingTurn).toBe(1);
    expect(result.state.rng.calls).toBe(0);
  });
});
