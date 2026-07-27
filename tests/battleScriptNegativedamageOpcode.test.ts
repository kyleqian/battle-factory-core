import { describe, expect, it } from "vitest";
import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContext,
  type BattleScriptRulesContextInput,
  type BattleScriptStatusRulesExternalPorts,
} from "../src/engine/battleScriptRulesContext.ts";
import { loadBattleScriptProgram } from "../src/engine/battleScriptProgram.ts";
import {
  acknowledgeBattleScriptMachineController,
  stepBattleScriptMachine,
  type BattleScriptMachineState,
} from "../src/engine/battleScriptMachine.ts";

const program = loadBattleScriptProgram();
const MEGA_DRAIN = 72; // EFFECT_ABSORB, 40 power, TYPE_GRASS, 100 accuracy
const DREAM_EATER = 138; // EFFECT_DREAM_EATER, 100 power, TYPE_PSYCHIC, 100 accuracy

function battler(changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 100,
    maxHP: changes.maxHP ?? changes.hp ?? 100,
    moves: changes.moves ?? Object.freeze([MEGA_DRAIN, 0, 0, 0]),
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
    attack: changes.attack ?? 100,
    defense: changes.defense ?? 50,
    spAttack: changes.spAttack ?? 100,
    spDefense: changes.spDefense ?? 50,
    level: changes.level ?? 50,
    friendship: changes.friendship ?? 0,
    partyIndex: changes.partyIndex ?? 0,
  });
}

function context(
  attacker: 0 | 1,
  currentMove: number,
  attackerChanges: Partial<BattleScriptRulesBattler> = {},
  targetChanges: Partial<BattleScriptRulesBattler> = {},
  contextChanges: Partial<BattleScriptRulesContextInput> = {},
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
    currentMove,
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
  const B_WAIT_TIME_LONG = 64;
  const B_WAIT_TIME_SHORT = 32;
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
    resolveHalfwordOperand: (_context, operand) => {
      if (operand.expression === "B_WAIT_TIME_LONG") return B_WAIT_TIME_LONG;
      if (operand.expression === "B_WAIT_TIME_SHORT") return B_WAIT_TIME_SHORT;
      return null;
    },
    resolveByteOperand: () => null,
    ...overrides,
  });
}

function ackAllPending(
  state: BattleScriptMachineState<BattleScriptRulesContext>,
): BattleScriptMachineState<BattleScriptRulesContext> {
  let next = state;
  for (const battlerId of state.scheduler.pendingControllerBattlers) {
    next = acknowledgeBattleScriptMachineController(next, battlerId);
  }
  return next;
}

/** Drives scheduler-progressed/blocked states transparently, exactly like battleScriptProtectlikeOpcode.test.ts's own step(). */
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

const NEGATIVEDAMAGE_PC = program.instructions.find(
  (instruction) => instruction.opcodeName === "B_SCR_OP_NEGATIVEDAMAGE",
)!.programCounter;

describe("production negativedamage (Cmd_negativedamage) dispatch", () => {
  it("registers B_SCR_OP_NEGATIVEDAMAGE", () => {
    expect(program.instructions.find((i) => i.opcodeName === "B_SCR_OP_NEGATIVEDAMAGE")).toBeDefined();
  });

  function stepAtNegativedamage(hpDealt: number) {
    const rc = context(0, MEGA_DRAIN, {}, {}, { hpDealt });
    const execution = createBattleScriptStatusRulesExecution(
      program,
      "BattleScript_EffectAbsorb",
      rc,
      1,
      externalPorts(),
    );
    const patched = Object.freeze({ ...execution.state, programCounter: NEGATIVEDAMAGE_PC });
    return stepBattleScriptMachine(program, patched, execution.handlers);
  }

  it("even gHpDealt halves exactly: 40 -> -20", () => {
    const result = stepAtNegativedamage(40);
    if (result.kind !== "advanced") throw new Error(`did not advance: ${result.kind}`);
    expect(result.state.rulesContext.battleMoveDamage).toBe(-20);
  });

  it("odd gHpDealt truncates toward zero before negation: 5 -> floor(5/2)=2 -> -2", () => {
    const result = stepAtNegativedamage(5);
    if (result.kind !== "advanced") throw new Error(`did not advance: ${result.kind}`);
    expect(result.state.rulesContext.battleMoveDamage).toBe(-2);
  });

  it("gHpDealt == 1 halves to 0, then the (gBattleMoveDamage == 0) guard forces -1, not a 0 HP no-op heal", () => {
    const result = stepAtNegativedamage(1);
    if (result.kind !== "advanced") throw new Error(`did not advance: ${result.kind}`);
    expect(result.state.rulesContext.battleMoveDamage).toBe(-1);
  });

  it("gHpDealt == 0 also forces the minimum-1 drain via the same guard", () => {
    const result = stepAtNegativedamage(0);
    if (result.kind !== "advanced") throw new Error(`did not advance: ${result.kind}`);
    expect(result.state.rulesContext.battleMoveDamage).toBe(-1);
  });

  it("large even gHpDealt halves exactly: 101 -> floor(101/2)=50 -> -50", () => {
    const result = stepAtNegativedamage(101);
    if (result.kind !== "advanced") throw new Error(`did not advance: ${result.kind}`);
    expect(result.state.rulesContext.battleMoveDamage).toBe(-50);
  });

  it("draws no RNG and consumes the instruction's own zero operands", () => {
    const result = stepAtNegativedamage(40);
    if (result.kind !== "advanced") throw new Error(`did not advance: ${result.kind}`);
    expect(result.state.rng.calls).toBe(0);
  });
});

describe(
  "EFFECT_ABSORB / EFFECT_DREAM_EATER: full committed script, the census's top blocker "
    + "before this registration (B_SCR_OP_NEGATIVEDAMAGE, 49 weighted)",
  () => {
    function runToTerminal(
      entryLabel: string,
      rc: BattleScriptRulesContext,
      rngSeed: number,
    ) {
      const execution = createBattleScriptStatusRulesExecution(program, entryLabel, rc, rngSeed, externalPorts());
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

    it("EFFECT_ABSORB drains exactly floor(hpDealt/2) from target to attacker end to end, clamped to the target's remaining HP (currentHp <= damage) so hpDealt is deterministic regardless of the raw roll", () => {
      // Target at 5 HP: MEGA DRAIN (40 power, level 50, atk 100 vs def 50) unambiguously exceeds
      // 5 raw damage, so Cmd_datahpupdate's own currentHp<=damage clip fires: gHpDealt = 5 exactly,
      // pinning the odd-halving rounding (floor(5/2)=2) inside a genuine full-script run.
      const rc = context(
        0,
        MEGA_DRAIN,
        { hp: 50, maxHP: 100 },
        { hp: 5, maxHP: 100, defense: 50 },
      );
      const result = runToTerminal("BattleScript_EffectAbsorb", rc, 12345);
      expect(result.state.rulesContext.battlers[1]!.hp).toBe(0); // target drained to 0 (dealt == its own remaining HP)
      expect(result.state.rulesContext.battlers[0]!.hp).toBe(52); // attacker healed by floor(5/2) = 2
      expect(result.state.rulesContext.hpDealt).toBe(5);
      expect(result.state.rulesContext.battleMoveDamage).toBe(-2);
    });

    it("EFFECT_ABSORB clamps the heal at the attacker's own maxHP", () => {
      const rc = context(
        0,
        MEGA_DRAIN,
        { hp: 99, maxHP: 100 },
        { hp: 5, maxHP: 100, defense: 50 },
      );
      const result = runToTerminal("BattleScript_EffectAbsorb", rc, 12345);
      expect(result.state.rulesContext.battlers[0]!.hp).toBe(100); // 99 + 2 would be 101, clamped to maxHP
    });

    it("EFFECT_DREAM_EATER drains from a sleeping target end to end (BattleScript_DreamEaterWorked)", () => {
      const rc = context(
        0,
        DREAM_EATER,
        { hp: 50, maxHP: 100 },
        { hp: 7, maxHP: 100, defense: 50, status1: 3 /* STATUS1_SLEEP_TURN(3) */ },
      );
      const result = runToTerminal("BattleScript_EffectDreamEater", rc, 999);
      expect(result.state.rulesContext.battlers[1]!.hp).toBe(0); // target's remaining 7 HP clips gHpDealt to 7
      expect(result.state.rulesContext.battlers[0]!.hp).toBe(53); // healed by floor(7/2) = 3
      expect(result.state.rulesContext.hpDealt).toBe(7);
    });

    it("EFFECT_DREAM_EATER against an awake target fails before ever reaching negativedamage (BattleScript_DreamEaterNoEffect), no HP change either side", () => {
      const rc = context(
        0,
        DREAM_EATER,
        { hp: 50, maxHP: 100 },
        { hp: 60, maxHP: 100, status1: 0 },
      );
      const result = runToTerminal("BattleScript_EffectDreamEater", rc, 1);
      expect(result.state.rulesContext.battlers[0]!.hp).toBe(50); // attacker: no heal, negativedamage never reached
      expect(result.state.rulesContext.battlers[1]!.hp).toBe(60); // target: no damage, WasntAffected branch
    });
  },
);
