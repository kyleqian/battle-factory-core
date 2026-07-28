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
 * `B_SCR_OP_RECOVERBASEDONSUNLIGHT` -- ranked-table row (3 effects / 16
 * weighted): EFFECT_MORNING_SUN/EFFECT_SYNTHESIS/EFFECT_MOONLIGHT all share
 * one identical script (`data/battle_scripts_1.s:1731-1738`).
 */
const MORNING_SUN = 234;
const SYNTHESIS = 235;
const MOONLIGHT = 236;
/** include/constants/abilities.h:13. */
const ABILITY_CLOUD_NINE = 13;
/** include/constants/battle.h:239-244. */
const B_WEATHER_SUN = (1 << 5) | (1 << 6);
const B_WEATHER_RAIN = (1 << 0) | (1 << 1) | (1 << 2);
const B_WEATHER_SANDSTORM = (1 << 3) | (1 << 4);

function battler(changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 50,
    maxHP: changes.maxHP ?? 100,
    moves: changes.moves ?? Object.freeze([MORNING_SUN, 0, 0, 0]),
    pp: changes.pp ?? Object.freeze([5, 0, 0, 0]),
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
  move = MORNING_SUN,
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
    currentMove: move,
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
      return null;
    },
    resolveByteOperand: () => null,
  });
}

function labelPc(label: string): number {
  const entry = resolveBattleScriptLabel(program, label);
  if (!entry) throw new Error(`committed Battle Script program does not define label ${label}`);
  return entry.programCounter;
}

const RECOVERBASEDONSUNLIGHT_PC = program.instructions.find(
  (instruction) => instruction.opcodeName === "B_SCR_OP_RECOVERBASEDONSUNLIGHT",
)!.programCounter;

function stepAtRecoverbasedonsunlight(rc: BattleScriptRulesContext, label: string) {
  const execution = createBattleScriptStatusRulesExecution(program, label, rc, 1, externalPorts());
  const patched = Object.freeze({ ...execution.state, programCounter: RECOVERBASEDONSUNLIGHT_PC });
  return stepBattleScriptMachine(program, patched, execution.handlers);
}

describe("production recoverbasedonsunlight (Cmd_recoverbasedonsunlight) dispatch", () => {
  it("registers B_SCR_OP_RECOVERBASEDONSUNLIGHT at its one concrete call site", () => {
    expect(program.instructions.filter((i) => i.opcodeName === "B_SCR_OP_RECOVERBASEDONSUNLIGHT")).toHaveLength(1);
  });

  it("no weather (gBattleWeather == 0): heals floor(maxHP/2), reassigns target to attacker", () => {
    const rc = context({ hp: 10, maxHP: 101 }, { weather: 0 });
    const result = stepAtRecoverbasedonsunlight(rc, "BattleScript_EffectMorningSun");
    if (result.kind !== "advanced") throw new Error(`did not advance: ${result.kind}`);
    expect(result.state.rulesContext.selectorRoles.target).toBe(0);
    expect(result.state.rulesContext.battleMoveDamage).toBe(-50); // floor(101/2)
    expect(result.state.rng.calls).toBe(0);
  });

  it("sun (gBattleWeather & B_WEATHER_SUN): heals floor(20*maxHP/30) (2/3)", () => {
    const rc = context({ hp: 10, maxHP: 100 }, { weather: B_WEATHER_SUN });
    const result = stepAtRecoverbasedonsunlight(rc, "BattleScript_EffectMorningSun");
    if (result.kind !== "advanced") throw new Error(`did not advance: ${result.kind}`);
    expect(result.state.rulesContext.battleMoveDamage).toBe(-66); // floor(20*100/30) = 66
  });

  it("other weather (rain, not sun): heals floor(maxHP/4)", () => {
    const rc = context({ hp: 10, maxHP: 100 }, { weather: B_WEATHER_RAIN });
    const result = stepAtRecoverbasedonsunlight(rc, "BattleScript_EffectMorningSun");
    if (result.kind !== "advanced") throw new Error(`did not advance: ${result.kind}`);
    expect(result.state.rulesContext.battleMoveDamage).toBe(-25); // floor(100/4)
  });

  it("other weather (sandstorm): heals floor(maxHP/4)", () => {
    const rc = context({ hp: 10, maxHP: 100 }, { weather: B_WEATHER_SANDSTORM });
    const result = stepAtRecoverbasedonsunlight(rc, "BattleScript_EffectMorningSun");
    if (result.kind !== "advanced") throw new Error(`did not advance: ${result.kind}`);
    expect(result.state.rulesContext.battleMoveDamage).toBe(-25);
  });

  it("Cloud Nine on the field nullifies WEATHER_HAS_EFFECT even under sun: falls back to the maxHP/2 branch", () => {
    const rc = context({ hp: 10, maxHP: 100 }, { weather: B_WEATHER_SUN }, MORNING_SUN, { ability: ABILITY_CLOUD_NINE });
    const result = stepAtRecoverbasedonsunlight(rc, "BattleScript_EffectMorningSun");
    if (result.kind !== "advanced") throw new Error(`did not advance: ${result.kind}`);
    expect(result.state.rulesContext.battleMoveDamage).toBe(-50); // floor(100/2), not the sun fraction
  });

  it("1-HP-max heals 1 (min-1 clamp) when not full", () => {
    const rc = context({ hp: 0, maxHP: 1 }, { weather: 0 });
    const result = stepAtRecoverbasedonsunlight(rc, "BattleScript_EffectMorningSun");
    if (result.kind !== "advanced") throw new Error(`did not advance: ${result.kind}`);
    expect(result.state.rulesContext.battleMoveDamage).toBe(-1);
  });

  it("full HP jumps to BattleScript_AlreadyAtFullHp, battleMoveDamage left untouched", () => {
    const rc = context({ hp: 100, maxHP: 100 }, { weather: B_WEATHER_SUN, battleMoveDamage: 7 });
    const result = stepAtRecoverbasedonsunlight(rc, "BattleScript_EffectMorningSun");
    if (result.kind !== "advanced") throw new Error(`did not advance: ${result.kind}`);
    expect(result.state.programCounter).toBe(labelPc("BattleScript_AlreadyAtFullHp"));
    expect(result.state.rulesContext.battleMoveDamage).toBe(7); // untouched, unlike Cmd_tryhealhalfhealth's own unconditional write
  });
});

describe("EFFECT_MORNING_SUN / EFFECT_SYNTHESIS / EFFECT_MOONLIGHT: full committed script walks", () => {
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
      if (guard > 200) throw new Error("step() did not converge");
      const nextState = result.kind === "blocked" ? ackAllPending(result.state) : result.state;
      result = stepBattleScriptMachine(program, nextState, handlers);
    }
    return result;
  }

  function runToTerminal(rc: BattleScriptRulesContext, label: string, rngSeed = 1) {
    const execution = createBattleScriptStatusRulesExecution(program, label, rc, rngSeed, externalPorts());
    let result = step(execution.state, execution.handlers);
    let steps = 0;
    while (result.kind === "advanced" && steps < 80) {
      steps += 1;
      result = step(result.state, execution.handlers);
    }
    if (result.kind !== "halted") throw new Error(`script did not reach its own end: ${result.kind}`);
    expect(result.state.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
    return result;
  }

  it("EFFECT_MORNING_SUN under clear weather: heals floor(maxHP/2), zero RNG, terminal end", () => {
    const rc = context({ hp: 10, maxHP: 100 }, { weather: 0 });
    const result = runToTerminal(rc, "BattleScript_EffectMorningSun");
    expect(result.state.rulesContext.battlers[0]!.hp).toBe(60);
    expect(result.state.rng.calls).toBe(0);
    expect(result.state.rulesContext.moveendState).toBeDefined();
  });

  it("EFFECT_SYNTHESIS under sun: heals floor(20*maxHP/30) (2/3), zero RNG, terminal end", () => {
    const rc = context({ hp: 10, maxHP: 100 }, { weather: B_WEATHER_SUN }, SYNTHESIS);
    const result = runToTerminal(rc, "BattleScript_EffectSynthesis");
    expect(result.state.rulesContext.battlers[0]!.hp).toBe(76); // 10 + 66
    expect(result.state.rng.calls).toBe(0);
  });

  it("EFFECT_MOONLIGHT under rain (not sun): heals floor(maxHP/4), zero RNG, terminal end", () => {
    const rc = context({ hp: 10, maxHP: 100 }, { weather: B_WEATHER_RAIN }, MOONLIGHT);
    const result = runToTerminal(rc, "BattleScript_EffectMoonlight");
    expect(result.state.rulesContext.battlers[0]!.hp).toBe(35); // 10 + 25
    expect(result.state.rng.calls).toBe(0);
  });

  it("EFFECT_MORNING_SUN fails at full HP end to end via BattleScript_AlreadyAtFullHp (STRINGID_PKMNHPFULL), HP untouched", () => {
    const rc = context({ hp: 100, maxHP: 100 }, { weather: B_WEATHER_SUN });
    const result = runToTerminal(rc, "BattleScript_EffectMorningSun");
    expect(result.state.rulesContext.battlers[0]!.hp).toBe(100);
  });
});
