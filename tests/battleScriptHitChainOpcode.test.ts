import { describe, expect, it } from "vitest";
import {
  BATTLE_SCRIPT_BATTLE_TYPE_DOUBLE,
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContext,
  type BattleScriptRulesContextInput,
  type BattleScriptStatusRulesExternalPorts,
} from "../src/engine/battleScriptRulesContext.ts";
import {
  loadBattleScriptProgram,
  resolveBattleScriptLabel,
} from "../src/engine/battleScriptProgram.ts";
import {
  acknowledgeBattleScriptMachineController,
  stepBattleScriptMachine,
  type BattleScriptMachineState,
} from "../src/engine/battleScriptMachine.ts";
import {
  HOLD_EFFECT_ID_FOCUS_BAND,
  SET_MOVE_EFFECT_SUPPORTED_BYTES,
  calculateBattleScriptBaseDamageForCurrentMove,
} from "../src/engine/battleScriptHitChainOpcode.ts";
import frontierMonsData from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };

const program = loadBattleScriptProgram();
const TACKLE = 33; // EFFECT_HIT, power 35, accuracy 95, TYPE_NORMAL
const MOVE_SURF = 57; // EFFECT_HIT, MOVE_TARGET_BOTH -- BattleScript_EffectHit's own underwater-guard move
/** include/constants/battle.h:175. */
const STATUS3_UNDERWATER = 1 << 18;
const SLAM = 21; // EFFECT_HIT, power 80, accuracy 75, TYPE_NORMAL
const ROCK_SLIDE = 157; // EFFECT_FLINCH_HIT, power 75, accuracy 90, MOVE_TARGET_BOTH
const EARTHQUAKE = 89; // EFFECT_EARTHQUAKE, power 100, accuracy 100, MOVE_TARGET_FOES_AND_ALLY
const ABILITY_PRESSURE = 46;
const COUNTER = 68; // EFFECT_COUNTER, power 1, accuracy 100, TYPE_FIGHTING
const MIRROR_COAT = 243; // EFFECT_MIRROR_COAT, power 1, accuracy 100, TYPE_PSYCHIC
const FIRE_PUNCH = 7;
const WATER_GUN = 55;
const SPARK = 209;
const FLAMETHROWER = 53;
const THUNDER_WAVE = 86; // TYPE_ELECTRIC, power 0
const ABILITY_VOLT_ABSORB = 10;
const ABILITY_WATER_ABSORB = 11;
const ABILITY_FLASH_FIRE = 18;
const WEATHER_BALL = 311;
const ABILITY_CLOUD_NINE = 13;
const ABILITY_AIR_LOCK = 77;

function battler(changes: Partial<BattleScriptRulesBattler> & { maxHP?: number } = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 100,
    maxHP: changes.maxHP ?? changes.hp ?? 100,
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
    specialStatus: changes.specialStatus,
    statStages: changes.statStages ?? [6, 6, 6, 6, 6, 6, 6, 6],
    protected: changes.protected,
    ppNotAffectedByPressure: changes.ppNotAffectedByPressure,
    protectPhysicalDmg: changes.protectPhysicalDmg,
    protectPhysicalBattlerId: changes.protectPhysicalBattlerId,
    protectSpecialDmg: changes.protectSpecialDmg,
    protectSpecialBattlerId: changes.protectSpecialBattlerId,
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
    notFirstStrike: changes.notFirstStrike,
    flashFireBoosted: changes.flashFireBoosted,
    turnOrderNum: changes.turnOrderNum,
    wrappedMove: changes.wrappedMove,
    wrappedBy: changes.wrappedBy,
    battlerPreventingEscape: changes.battlerPreventingEscape,
    battlerWithSureHit: changes.battlerWithSureHit,
  });
}

/** Modular inverse of ISO_RANDOMIZE1's multiplier (1103515245) mod 2**32. */
const RNG_MULTIPLIER_INVERSE = 4005161829n;
const RNG_MOD = 1n << 32n;

/**
 * Finds an RNG state whose *next* drawBattleScriptRng call yields exactly
 * targetU16 -- ISO_RANDOMIZE1 is a bijection mod 2**32 (odd multiplier), so
 * this inverts it exactly rather than searching. Lets focused tests
 * reproduce docs/hit-chain-ground-truth.md's pinned u16 rolls precisely
 * without needing the real ROM's frame-0 seed for every scenario.
 */
function rngValueBeforeU16(targetU16: number): number {
  const after = BigInt(targetU16) * 65536n;
  const before = (((after - 24691n) % RNG_MOD + RNG_MOD) % RNG_MOD * RNG_MULTIPLIER_INVERSE) % RNG_MOD;
  return Number(before);
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
    resolveHalfwordOperand: () => null,
    resolveByteOperand: () => null,
    ...overrides,
  });
}

function findPcInLabel(opcodeName: string, sourceLabel: string): number {
  const found = program.instructions.find(
    (instruction) => instruction.opcodeName === opcodeName && instruction.source.label === sourceLabel,
  );
  if (!found) throw new Error(`no matching ${opcodeName} instruction found in ${sourceLabel}`);
  return found.programCounter;
}

function labelPc(label: string): number {
  const entry = resolveBattleScriptLabel(program, label);
  if (!entry) throw new Error(`committed Battle Script program does not define label ${label}`);
  return entry.programCounter;
}

/**
 * The RUNG 1-3 opcodes (attackanimation, hitanimation, healthbarupdate,
 * critmessage, resultmessage) gate on the injected isControllerIdle port, not
 * on BattleScriptSchedulerState.pendingControllerBattlers, so this manual
 * step sequence never acknowledges the battlers they mark pending. That is
 * harmless until Cmd_moveend's controller-delegated states (which reuse the
 * real scheduler gate) are reached, so a real driver -- like
 * factoryBattleScriptDecision.ts's acknowledgePendingControllers -- must
 * acknowledge between steps exactly as it would in production.
 */
function ackAllPending(
  state: BattleScriptMachineState<BattleScriptRulesContext>,
): BattleScriptMachineState<BattleScriptRulesContext> {
  let next = state;
  for (const battler of state.scheduler.pendingControllerBattlers) {
    next = acknowledgeBattleScriptMachineController(next, battler);
  }
  return next;
}

function stepFrom(entryLabel: string, rulesContext: BattleScriptRulesContext, rngSeed = 1, ports = externalPorts()) {
  const execution = createBattleScriptStatusRulesExecution(program, entryLabel, rulesContext, rngSeed, ports);
  return { execution, result: stepBattleScriptMachine(program, execution.state, execution.handlers) };
}

/** Steps `count` opcodes from `entryLabel`, returning the final step result. */
function stepManyFrom(
  entryLabel: string,
  rulesContext: BattleScriptRulesContext,
  count: number,
  rngSeed = 1,
  ports = externalPorts(),
) {
  const execution = createBattleScriptStatusRulesExecution(program, entryLabel, rulesContext, rngSeed, ports);
  let result = stepBattleScriptMachine(program, execution.state, execution.handlers);
  for (let i = 1; i < count; i++) {
    if (result.kind !== "advanced") throw new Error(`step ${i} did not advance: ${result.kind}`);
    result = stepBattleScriptMachine(program, result.state, execution.handlers);
  }
  return { execution, result };
}

/**
 * Jumps straight to the named opcode under BattleScript_HitFromCritCalc,
 * skipping the opcodes before it (critcalc/damagecalc/typecalc all
 * recompute battleMoveDamage from the battlers' raw stats, which a focused
 * single-opcode test does not want to also have to set up realistically).
 * Mirrors the manual programCounter patch already used by RUNG 1's own
 * unsupported-branch tests.
 */
function stepAtOpcode(
  opcodeName: string,
  rulesContext: BattleScriptRulesContext,
  rngSeed = 1,
  ports = externalPorts(),
) {
  const execution = createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_HitFromCritCalc",
    rulesContext,
    rngSeed,
    ports,
  );
  const startPc = labelPc("BattleScript_HitFromCritCalc");
  const found = program.instructions.find(
    (instruction, index) => index >= startPc && instruction.opcodeName === opcodeName,
  );
  if (!found) throw new Error(`no ${opcodeName} found at/after BattleScript_HitFromCritCalc`);
  const patched = Object.freeze({ ...execution.state, programCounter: found.programCounter });
  const result = stepBattleScriptMachine(program, patched, execution.handlers);
  return { execution, result };
}

/**
 * Jumps straight to an arbitrary committed programCounter -- for
 * B_SCR_OP_TRYFAINTMON's several concrete operand spellings
 * (BS_ATTACKER/BS_TARGET/BS_FAINTED x mode FALSE/TRUE), stepAtOpcode's
 * name-only search always lands on the same first occurrence (PC 24, the
 * BattleScript_EffectHit `tryfaintmon BS_TARGET` site); this instead selects
 * a specific instance up front.
 */
function stepAtProgramCounter(
  pc: number,
  rulesContext: BattleScriptRulesContext,
  rngSeed = 1,
  ports = externalPorts(),
) {
  const execution = createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_HitFromCritCalc",
    rulesContext,
    rngSeed,
    ports,
  );
  const patched = Object.freeze({ ...execution.state, programCounter: pc });
  const result = stepBattleScriptMachine(program, patched, execution.handlers);
  return { execution, result };
}

function findTryfaintmonPc(matchOperands: (operands: readonly string[]) => boolean): number {
  const found = program.instructions.find(
    (instruction) =>
      instruction.opcodeName === "B_SCR_OP_TRYFAINTMON"
      && matchOperands(instruction.operands.map((operand) => operand.expression)),
  );
  if (!found) throw new Error("no matching B_SCR_OP_TRYFAINTMON instruction found in the committed program");
  return found.programCounter;
}

describe("production accuracycheck (Cmd_accuracycheck) dispatch", () => {
  it("registers B_SCR_OP_ACCURACYCHECK", () => {
    const instruction = program.instructions.find((i) => i.opcodeName === "B_SCR_OP_ACCURACYCHECK")!;
    expect(instruction).toBeDefined();
  });

  it("hits: advances to attackstring and consumes exactly one RNG call", () => {
    const rc = context(0);
    const { result } = stepFrom("BattleScript_HitFromAccCheck", rc, 1);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.programCounter).toBe(labelPc("BattleScript_HitFromAtkString"));
    expect(result.state.rng.calls).toBe(1);
    expect(result.state.rulesContext.moveResultFlags & 1).toBe(0);
  });

  it("misses: jumps to BattleScript_PrintMoveMissed and sets MOVE_RESULT_MISSED", () => {
    const rc = context(0, {}, { currentMove: SLAM });
    const { result } = stepFrom("BattleScript_HitFromAccCheck", rc, 2);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.programCounter).toBe(labelPc("BattleScript_PrintMoveMissed"));
    expect(result.state.rng.calls).toBe(1);
    expect(result.state.rulesContext.moveResultFlags & 1).toBe(1);
    expect(result.state.rulesContext.missType).toBe(0); // B_MSG_MISSED
  });

  it("an accuracy miss still reveals Levitate/Wonder Guard at CheckWonderGuardAndLevitate's real miss-time call", () => {
    const levitate = stepFrom(
      "BattleScript_HitFromAccCheck",
      context(0, {}, { currentMove: 328 /* MOVE_SAND_TOMB, Ground/70 */ }, {
        ability: ABILITY_LEVITATE,
      }),
      2,
    ).result;
    expect(levitate.kind).toBe("advanced");
    if (levitate.kind !== "advanced") throw new Error("expected advance");
    expect(levitate.state.rulesContext.aiObservedAbilityIds[1]).toBe(ABILITY_LEVITATE);

    const wonderGuard = stepFrom(
      "BattleScript_HitFromAccCheck",
      context(0, {}, { currentMove: SLAM }, { ability: ABILITY_WONDER_GUARD }),
      2,
    ).result;
    expect(wonderGuard.kind).toBe("advanced");
    if (wonderGuard.kind !== "advanced") throw new Error("expected advance");
    expect(wonderGuard.state.rulesContext.aiObservedAbilityIds[1]).toBe(ABILITY_WONDER_GUARD);

    const plainMiss = stepFrom(
      "BattleScript_HitFromAccCheck",
      context(0, {}, { currentMove: SLAM }),
      2,
    ).result;
    expect(plainMiss.kind).toBe("advanced");
    if (plainMiss.kind !== "advanced") throw new Error("expected advance");
    expect(plainMiss.state.rulesContext.aiObservedAbilityIds[1]).toBe(0);
  });

  it("the target Foresight bit makes the shared accuracy path ignore target evasion", () => {
    const target = {
      statStages: [6, 6, 6, 6, 6, 6, 6, 12] as const,
    };
    const without = stepFrom(
      "BattleScript_HitFromAccCheck",
      context(0, {}, {}, target),
      1,
    ).result;
    expect(without.kind).toBe("advanced");
    if (without.kind !== "advanced") throw new Error("expected advance");
    expect(without.state.programCounter).toBe(labelPc("BattleScript_PrintMoveMissed"));

    const withForesight = stepFrom(
      "BattleScript_HitFromAccCheck",
      context(0, {}, {}, {
        ...target,
        status2: 1 << 29,
      }),
      1,
    ).result;
    expect(withForesight.kind).toBe("advanced");
    if (withForesight.kind !== "advanced") throw new Error("expected advance");
    expect(withForesight.state.programCounter).toBe(
      labelPc("BattleScript_HitFromAtkString"),
    );
    expect(withForesight.state.rng.calls).toBe(1);
  });

  it("Protect: jumps to the miss target with zero RNG and B_MSG_PROTECTED", () => {
    const rc = context(0, {}, {}, { protected: 1 });
    const { result } = stepFrom("BattleScript_HitFromAccCheck", rc, 1);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.programCounter).toBe(labelPc("BattleScript_PrintMoveMissed"));
    expect(result.state.rng.calls).toBe(0);
    expect(result.state.rulesContext.missType).toBe(1); // B_MSG_PROTECTED
  });

  it("semi-invulnerable (underground): misses with zero RNG", () => {
    const rc = context(0, {}, {}, { status3: 1 << 7 });
    const { result } = stepFrom("BattleScript_HitFromAccCheck", rc, 1);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.programCounter).toBe(labelPc("BattleScript_PrintMoveMissed"));
    expect(result.state.rng.calls).toBe(0);
  });

  describe("AbilityBattleEffects(ABILITYEFFECT_ABSORBING)", () => {
    it.each([
      [ABILITY_VOLT_ABSORB, SPARK, "BattleScript_MoveHPDrain_PPLoss"],
      [ABILITY_WATER_ABSORB, WATER_GUN, "BattleScript_MoveHPDrain_PPLoss"],
      [ABILITY_FLASH_FIRE, FLAMETHROWER, "BattleScript_FlashFireBoost_PPLoss"],
    ] as const)(
      "ability %i redirects a matching move %i to its source script and records the AI reveal",
      (ability, move, label) => {
        const rc = context(0, {}, { currentMove: move }, { ability, hp: 75, maxHP: 100 });
        const { result } = stepFrom("BattleScript_HitFromAccCheck", rc, 1);
        expect(result.kind).toBe("advanced");
        if (result.kind !== "advanced") throw new Error("expected advance");
        expect(result.state.programCounter).toBe(labelPc(label));
        expect(result.state.rulesContext.lastUsedAbility).toBe(ability);
        expect(result.state.rulesContext.aiObservedAbilityIds[1]).toBe(ability);
        expect(result.state.rng.calls).toBe(1); // ordinary accuracy draw only
      },
    );

    it.each([
      [ABILITY_VOLT_ABSORB, WATER_GUN],
      [ABILITY_WATER_ABSORB, SPARK],
      [ABILITY_FLASH_FIRE, SPARK],
    ] as const)(
      "ability %i ignores a non-matching move %i and continues the ordinary hit chain",
      (ability, move) => {
        const rc = context(0, {}, { currentMove: move }, { ability });
        const { result } = stepFrom("BattleScript_HitFromAccCheck", rc, 1);
        expect(result.kind).toBe("advanced");
        if (result.kind !== "advanced") throw new Error("expected advance");
        expect(result.state.programCounter).toBe(labelPc("BattleScript_HitFromAtkString"));
        expect(result.state.rulesContext.aiObservedAbilityIds[1]).toBe(0);
      },
    );

    it.each([
      [ABILITY_VOLT_ABSORB, SPARK],
      [ABILITY_WATER_ABSORB, WATER_GUN],
    ] as const)(
      "full HP: ability %i takes MonMadeMoveUseless, does not prepare healing damage, and still reveals",
      (ability, move) => {
        const rc = context(
          0,
          {},
          { currentMove: move, battleMoveDamage: 777 },
          { ability, hp: 100, maxHP: 100 },
        );
        const { result } = stepFrom("BattleScript_HitFromAccCheck", rc, 1);
        expect(result.kind).toBe("advanced");
        if (result.kind !== "advanced") throw new Error("expected advance");
        expect(result.state.programCounter).toBe(labelPc("BattleScript_MonMadeMoveUseless_PPLoss"));
        expect(result.state.rulesContext.battleMoveDamage).toBe(777);
        expect(result.state.rulesContext.aiObservedAbilityIds[1]).toBe(ability);
      },
    );

    it("Volt/Water Absorb prepare -max(1, floor(maxHP/4)); the existing HP opcodes cap the actual heal and set DOESNT_AFFECT_FOE", () => {
      const rc = context(
        0,
        { moves: [SPARK, 0, 0, 0], pp: [20, 0, 0, 0] },
        { currentMove: SPARK },
        { ability: ABILITY_VOLT_ABSORB, hp: 90, maxHP: 101 },
      );
      const execution = createBattleScriptStatusRulesExecution(
        program,
        "BattleScript_HitFromAccCheck",
        rc,
        1,
        externalPorts(),
      );
      let result = stepBattleScriptMachine(program, execution.state, execution.handlers); // accuracycheck -> drain
      if (result.kind !== "advanced") throw new Error("accuracycheck did not advance");
      expect(result.state.rulesContext.battleMoveDamage).toBe(-25);
      result = stepBattleScriptMachine(program, result.state, execution.handlers); // ppreduce
      if (result.kind !== "advanced") throw new Error("ppreduce did not advance");
      const healthbar = program.instructions.find(
        (instruction) =>
          instruction.source.label === "BattleScript_MoveHPDrain"
          && instruction.opcodeName === "B_SCR_OP_HEALTHBARUPDATE",
      );
      expect(healthbar).toBeDefined();
      result = stepBattleScriptMachine(
        program,
        Object.freeze({ ...result.state, programCounter: healthbar!.programCounter }),
        execution.handlers,
      );
      if (result.kind !== "advanced") throw new Error("healthbarupdate did not advance");
      result = stepBattleScriptMachine(program, result.state, execution.handlers); // datahpupdate
      if (result.kind !== "advanced") throw new Error("datahpupdate did not advance");
      expect(result.state.rulesContext.battlers[1].hp).toBe(101);
      expect(result.state.rulesContext.party.opponent[0].hp).toBe(101);
      expect(result.state.rulesContext.battlers[0].pp[0]).toBe(19);

      const orbyte = program.instructions.find(
        (instruction) =>
          instruction.source.label === "BattleScript_MoveHPDrain"
          && instruction.opcodeName === "B_SCR_OP_ORBYTE",
      );
      expect(orbyte).toBeDefined();
      const patched = Object.freeze({ ...result.state, programCounter: orbyte!.programCounter });
      const failed = stepBattleScriptMachine(program, patched, execution.handlers);
      expect(failed.kind).toBe("advanced");
      if (failed.kind !== "advanced") throw new Error("orbyte did not advance");
      expect(failed.state.rulesContext.moveResultFlags & (1 << 3)).toBe(1 << 3);
    });

    it("one-max-HP edge uses the source minimum heal of 1", () => {
      const rc = context(
        0,
        {},
        { currentMove: SPARK },
        { ability: ABILITY_VOLT_ABSORB, hp: 0, maxHP: 1 },
      );
      const { result } = stepFrom("BattleScript_HitFromAccCheck", rc, 1);
      expect(result.kind).toBe("advanced");
      if (result.kind !== "advanced") throw new Error("expected advance");
      expect(result.state.rulesContext.battleMoveDamage).toBe(-1);
    });

    it("a matching zero-power Electric move does not activate Volt Absorb", () => {
      const rc = context(0, {}, { currentMove: THUNDER_WAVE }, { ability: ABILITY_VOLT_ABSORB });
      const { result } = stepFrom("BattleScript_HitFromAccCheck", rc, 1);
      expect(result.kind).toBe("advanced");
      if (result.kind !== "advanced") throw new Error("expected advance");
      expect(result.state.programCounter).toBe(labelPc("BattleScript_HitFromAtkString"));
      expect(result.state.rulesContext.aiObservedAbilityIds[1]).toBe(0);
    });

    it("Flash Fire sets the persistent boost/message selector once; repeat activation reports no boost", () => {
      const first = stepFrom(
        "BattleScript_HitFromAccCheck",
        context(0, {}, { currentMove: FLAMETHROWER }, {
          ability: ABILITY_FLASH_FIRE,
          flashFireBoosted: 0,
        }),
        1,
      ).result;
      expect(first.kind).toBe("advanced");
      if (first.kind !== "advanced") throw new Error("expected advance");
      expect(first.state.rulesContext.battlers[1].flashFireBoosted).toBe(1);
      expect(first.state.rulesContext.multistringChooser).toBe(0);

      const repeated = stepFrom(
        "BattleScript_HitFromAccCheck",
        Object.freeze({
          ...first.state.rulesContext,
          hitMarker: 0,
          aiObservedAbilityIds: Object.freeze([0, 0, 0, 0] as const),
        }),
        1,
      ).result;
      expect(repeated.kind).toBe("advanced");
      if (repeated.kind !== "advanced") throw new Error("expected advance");
      expect(repeated.state.rulesContext.battlers[1].flashFireBoosted).toBe(1);
      expect(repeated.state.rulesContext.multistringChooser).toBe(1);
      expect(repeated.state.rulesContext.aiObservedAbilityIds[1]).toBe(ABILITY_FLASH_FIRE);
    });

    it("a frozen Flash Fire target does not activate or reveal", () => {
      const rc = context(
        0,
        {},
        { currentMove: FLAMETHROWER },
        { ability: ABILITY_FLASH_FIRE, status1: 1 << 5 },
      );
      const { result } = stepFrom("BattleScript_HitFromAccCheck", rc, 1);
      expect(result.kind).toBe("advanced");
      if (result.kind !== "advanced") throw new Error("expected advance");
      expect(result.state.programCounter).toBe(labelPc("BattleScript_HitFromAtkString"));
      expect(result.state.rulesContext.battlers[1].flashFireBoosted).toBeUndefined();
      expect(result.state.rulesContext.aiObservedAbilityIds[1]).toBe(0);
    });

    it("notFirstStrike selects the no-PP-loss script on a later target", () => {
      const rc = context(
        0,
        { notFirstStrike: 1 },
        { currentMove: SPARK },
        { ability: ABILITY_VOLT_ABSORB, hp: 75, maxHP: 100 },
      );
      const { result } = stepFrom("BattleScript_HitFromAccCheck", rc, 1);
      expect(result.kind).toBe("advanced");
      if (result.kind !== "advanced") throw new Error("expected advance");
      expect(result.state.programCounter).toBe(labelPc("BattleScript_MoveHPDrain"));
    });
  });

  describe("(b) unsupported-branch barriers", () => {
    it("bare NO_ACC_CALC (Mean Look) advances without RNG and skips the Lock-On identity check", () => {
      const bareNoAccuracy = program.instructions.find(
        (i) => i.opcodeName === "B_SCR_OP_ACCURACYCHECK"
          && i.operands[1]?.expression === "NO_ACC_CALC",
      );
      expect(bareNoAccuracy).toBeDefined();
      const rc = context(0, {}, {}, { status3: 1 << 3 });
      const { execution } = stepFrom("BattleScript_HitFromAccCheck", rc, 1);
      const patched = Object.freeze({ ...execution.state, programCounter: bareNoAccuracy!.programCounter });
      const result = stepBattleScriptMachine(program, patched, execution.handlers);
      expect(result.kind).toBe("advanced");
      if (result.kind !== "advanced") throw new Error("expected advance");
      expect(result.state.programCounter).toBe(bareNoAccuracy!.programCounter + 1);
      expect(result.state.rng.calls).toBe(0);
    });

    it("bit without matching Lock-On ownership still performs the ordinary accuracy draw", () => {
      const rc = context(0, {}, {}, { status3: 1 << 3, battlerWithSureHit: 1 });
      const { result } = stepFrom("BattleScript_HitFromAccCheck", rc, 1);
      expect(result.kind).toBe("advanced");
      expect(result.state.rng.calls).toBe(1);
    });

  });
});

/**
 * `Cmd_accuracycheck`'s `NO_ACC_CALC_CHECK_LOCK_ON` bypass branch
 * (`battle_script_commands.c:1103-1113`, docs/yawn-thrash-endturn-design.md
 * Rung 1 -- newly real, not previously exercised: `BattleScript_EffectYawn`
 * is one of 8 committed sites using this literal). Exercised generically via
 * `BattleScript_EffectRoar`'s own accuracycheck instance (not Yawn's -- that
 * full script is covered separately by tests/battleScriptSetyawnOpcode.test.ts)
 * to prove the opcode-level dispatch, not any one move's script.
 */
describe("production accuracycheck (Cmd_accuracycheck) NO_ACC_CALC_CHECK_LOCK_ON dispatch", () => {
  const noAccCalcPc = findPcInLabel("B_SCR_OP_ACCURACYCHECK", "BattleScript_EffectRoar");

  it("ordinary case: advances with zero RNG, no MOVE_RESULT_MISSED", () => {
    const rc = context(0);
    const { result } = stepAtProgramCounter(noAccCalcPc, rc, 1);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rng.calls).toBe(0);
    expect(result.state.rulesContext.moveResultFlags & 1).toBe(0);
  });

  it("Protect: jumps to the fail label with MOVE_RESULT_MISSED + B_MSG_PROTECTED, zero RNG", () => {
    const rc = context(0, {}, {}, { protected: 1 });
    const { result } = stepAtProgramCounter(noAccCalcPc, rc, 1);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.programCounter).toBe(labelPc("BattleScript_ButItFailed"));
    expect(result.state.rng.calls).toBe(0);
    expect(result.state.rulesContext.moveResultFlags & 1).toBe(1);
    expect(result.state.rulesContext.missType).toBe(1); // B_MSG_PROTECTED
  });

  it("semi-invulnerable (underground): bare jump to the fail label, no MOVE_RESULT_MISSED set, zero RNG", () => {
    const rc = context(0, {}, {}, { status3: 1 << 7 });
    const { result } = stepAtProgramCounter(noAccCalcPc, rc, 1);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.programCounter).toBe(labelPc("BattleScript_ButItFailed"));
    expect(result.state.rng.calls).toBe(0);
    expect(result.state.rulesContext.moveResultFlags & 1).toBe(0);
  });

  it("matching Lock-On ownership directly advances, while bit without identity still checks semi-invulnerability", () => {
    const rc = context(0, {}, {}, { status3: (1 << 3) | (1 << 7), battlerWithSureHit: 0 });
    const { result } = stepAtProgramCounter(noAccCalcPc, rc, 1);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.programCounter).toBe(noAccCalcPc + 1);
    const mismatch = context(0, {}, {}, { status3: (1 << 3) | (1 << 7), battlerWithSureHit: 1 });
    const second = stepAtProgramCounter(noAccCalcPc, mismatch, 1).result;
    if (second.kind !== "advanced") throw new Error("expected advance");
    expect(second.state.programCounter).toBe(labelPc("BattleScript_ButItFailed"));
  });
});

describe("production attackstring (Cmd_attackstring) dispatch", () => {
  it("registers B_SCR_OP_ATTACKSTRING", () => {
    const instruction = program.instructions.find((i) => i.opcodeName === "B_SCR_OP_ATTACKSTRING")!;
    expect(instruction).toBeDefined();
  });

  it("prints the used-move message once and sets HITMARKER_ATTACKSTRING_PRINTED", () => {
    const rc = context(0);
    const { result } = stepFrom("BattleScript_HitFromAtkString", rc, 1);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.events.some((e) => e.kind === "message" && e.messageId === "STRINGID_USEDMOVE")).toBe(true);
    expect(result.state.rulesContext.hitMarker & (1 << 10)).toBe(1 << 10);
    expect(result.state.scheduler.messageDisplayActive).toBe(false);
  });

  it("skips the message when HITMARKER_NO_ATTACKSTRING is set", () => {
    const rc = context(0, {}, { hitMarker: 1 << 9 });
    const { result } = stepFrom("BattleScript_HitFromAtkString", rc, 1);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.events.length).toBe(0);
  });

  it("blocks on a busy controller", () => {
    const rc = context(0);
    const ports = externalPorts({ isControllerIdle: () => false });
    const { result } = stepFrom("BattleScript_HitFromAtkString", rc, 1, ports);
    expect(result.kind).toBe("blocked");
  });
});

function stepTwiceFromAttackstring(rulesContext: BattleScriptRulesContext, rngSeed = 1) {
  const execution = createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_HitFromAtkString",
    rulesContext,
    rngSeed,
    externalPorts(),
  );
  const first = stepBattleScriptMachine(program, execution.state, execution.handlers);
  if (first.kind !== "advanced") throw new Error(`expected attackstring to advance, got ${first.kind}`);
  return stepBattleScriptMachine(program, first.state, execution.handlers);
}

describe("production ppreduce (Cmd_ppreduce) dispatch", () => {
  it("registers B_SCR_OP_PPREDUCE", () => {
    const instruction = program.instructions.find((i) => i.opcodeName === "B_SCR_OP_PPREDUCE")!;
    expect(instruction).toBeDefined();
  });

  it("deducts one PP and emits a controller PP-sync event", () => {
    const rc = context(0, { pp: [35, 0, 0, 0] });
    const result = stepTwiceFromAttackstring(rc);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battlers[0]!.pp[0]).toBe(34);
    expect(result.state.events.some((e) => e.kind === "set-battler-pp-data" && e.pp === 34)).toBe(true);
    expect(result.state.scheduler.pendingControllerBattlers).toContain(0);
  });

  it("does not deduct PP when the slot is already zero", () => {
    const rc = context(0, { pp: [0, 0, 0, 0] });
    const result = stepTwiceFromAttackstring(rc);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battlers[0]!.pp[0]).toBe(0);
    expect(result.state.events.some((e) => e.kind === "set-battler-pp-data")).toBe(false);
  });

  it("deducts two PP when the target has Pressure", () => {
    const rc = context(0, { pp: [35, 0, 0, 0] }, {}, { ability: 46 });
    const result = stepTwiceFromAttackstring(rc);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battlers[0]!.pp[0]).toBe(33);
  });

  it("does not apply Pressure when ppNotAffectedByPressure is set", () => {
    const rc = context(0, { pp: [35, 0, 0, 0], ppNotAffectedByPressure: 1 }, {}, { ability: 46 });
    const result = stepTwiceFromAttackstring(rc);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battlers[0]!.pp[0]).toBe(34);
  });

  // MOVE_TARGET_BOTH (ROCK_SLIDE/SURF-class) -> AbilityBattleEffects(ABILITYEFFECT_COUNT_OTHER_SIDE,
  // ..., ABILITY_PRESSURE, ...) (battle_util.c:3160-3169): sums Pressure across the whole opposing
  // side, not just the direct target. In singles (gBattlersCount == 2) the opposing side is exactly
  // the direct target, so the real loop degenerates to the existing default-branch check; the
  // multi-battler scan only differs from that in doubles (gBattlersCount == 4), proven below by
  // giving the context an explicit doubles battleTopology.
  describe("MOVE_TARGET_BOTH -> ABILITYEFFECT_COUNT_OTHER_SIDE (e.g. ROCK_SLIDE)", () => {
    it("singles: deducts one PP when the opponent has no Pressure", () => {
      const rc = context(0, { pp: [15, 0, 0, 0] }, { currentMove: ROCK_SLIDE });
      const result = stepTwiceFromAttackstring(rc);
      expect(result.kind).toBe("advanced");
      if (result.kind !== "advanced") throw new Error("expected advance");
      expect(result.state.rulesContext.battlers[0]!.pp[0]).toBe(14);
    });

    it("singles: deducts two PP when the direct target has Pressure", () => {
      const rc = context(0, { pp: [15, 0, 0, 0] }, { currentMove: ROCK_SLIDE }, { ability: ABILITY_PRESSURE });
      const result = stepTwiceFromAttackstring(rc);
      expect(result.kind).toBe("advanced");
      if (result.kind !== "advanced") throw new Error("expected advance");
      expect(result.state.rulesContext.battlers[0]!.pp[0]).toBe(13);
    });

    const doublesTopology = Object.freeze({
      battlersCount: 4 as const,
      battleTypeFlags: BATTLE_SCRIPT_BATTLE_TYPE_DOUBLE,
      battlerPositions: [0, 1, 2, 3] as const,
    });

    it("doubles: also counts Pressure on an opposing-side battler that is NOT the direct target", () => {
      const rc = context(0, {}, {
        currentMove: ROCK_SLIDE,
        battleTopology: doublesTopology,
        battlers: [
          battler({ side: 0, pp: [15, 0, 0, 0] }), // attacker
          battler({ side: 1 }), // direct target, no Pressure
          battler({ side: 0 }), // attacker's ally
          battler({ side: 1, ability: ABILITY_PRESSURE }), // opposing side, not the direct target
        ],
      });
      const result = stepTwiceFromAttackstring(rc);
      expect(result.kind).toBe("advanced");
      if (result.kind !== "advanced") throw new Error("expected advance");
      expect(result.state.rulesContext.battlers[0]!.pp[0]).toBe(13);
    });

    it("doubles: does not count Pressure on the attacker's own side", () => {
      const rc = context(0, {}, {
        currentMove: ROCK_SLIDE,
        battleTopology: doublesTopology,
        battlers: [
          battler({ side: 0, pp: [15, 0, 0, 0] }), // attacker
          battler({ side: 1 }), // direct target, no Pressure
          battler({ side: 0, ability: ABILITY_PRESSURE }), // attacker's own side -- must not count
          battler({ side: 1 }),
        ],
      });
      const result = stepTwiceFromAttackstring(rc);
      expect(result.kind).toBe("advanced");
      if (result.kind !== "advanced") throw new Error("expected advance");
      expect(result.state.rulesContext.battlers[0]!.pp[0]).toBe(14);
    });

    it("doubles: sums Pressure from both opposing-side battlers (three total PP)", () => {
      const rc = context(0, {}, {
        currentMove: ROCK_SLIDE,
        battleTopology: doublesTopology,
        battlers: [
          battler({ side: 0, pp: [15, 0, 0, 0] }),
          battler({ side: 1, ability: ABILITY_PRESSURE }),
          battler({ side: 0 }),
          battler({ side: 1, ability: ABILITY_PRESSURE }),
        ],
      });
      const result = stepTwiceFromAttackstring(rc);
      expect(result.kind).toBe("advanced");
      if (result.kind !== "advanced") throw new Error("expected advance");
      expect(result.state.rulesContext.battlers[0]!.pp[0]).toBe(12);
    });
  });

  // MOVE_TARGET_FOES_AND_ALLY (EARTHQUAKE-class) -> AbilityBattleEffects(ABILITYEFFECT_COUNT_ON_FIELD,
  // ..., ABILITY_PRESSURE, ...) (battle_util.c:3182-3191): sums Pressure across every OTHER battler
  // on the field, either side, excluding only the attacker itself. In singles this is exactly "does
  // the one opponent have Pressure" (same as the default branch); doubles is where excluding only
  // the attacker itself (not the whole opposing side) actually matters, proven below.
  describe("MOVE_TARGET_FOES_AND_ALLY -> ABILITYEFFECT_COUNT_ON_FIELD (e.g. EARTHQUAKE)", () => {
    it("singles: deducts one PP when the opponent has no Pressure", () => {
      const rc = context(0, { pp: [10, 0, 0, 0] }, { currentMove: EARTHQUAKE });
      const result = stepTwiceFromAttackstring(rc);
      expect(result.kind).toBe("advanced");
      if (result.kind !== "advanced") throw new Error("expected advance");
      expect(result.state.rulesContext.battlers[0]!.pp[0]).toBe(9);
    });

    it("singles: excludes the attacker's own Pressure from its own count", () => {
      const rc = context(0, { pp: [10, 0, 0, 0], ability: ABILITY_PRESSURE }, { currentMove: EARTHQUAKE });
      const result = stepTwiceFromAttackstring(rc);
      expect(result.kind).toBe("advanced");
      if (result.kind !== "advanced") throw new Error("expected advance");
      expect(result.state.rulesContext.battlers[0]!.pp[0]).toBe(9);
    });

    const doublesTopology = Object.freeze({
      battlersCount: 4 as const,
      battleTypeFlags: BATTLE_SCRIPT_BATTLE_TYPE_DOUBLE,
      battlerPositions: [0, 1, 2, 3] as const,
    });

    it("doubles: counts Pressure on the attacker's own ally, not just the opposing side", () => {
      const rc = context(0, {}, {
        currentMove: EARTHQUAKE,
        battleTopology: doublesTopology,
        battlers: [
          battler({ side: 0, pp: [10, 0, 0, 0] }), // attacker
          battler({ side: 1 }),
          battler({ side: 0, ability: ABILITY_PRESSURE }), // attacker's own ally -- must count
          battler({ side: 1 }),
        ],
      });
      const result = stepTwiceFromAttackstring(rc);
      expect(result.kind).toBe("advanced");
      if (result.kind !== "advanced") throw new Error("expected advance");
      expect(result.state.rulesContext.battlers[0]!.pp[0]).toBe(8);
    });

    it("doubles: sums Pressure across all three other battlers (four total PP)", () => {
      const rc = context(0, {}, {
        currentMove: EARTHQUAKE,
        battleTopology: doublesTopology,
        battlers: [
          battler({ side: 0, pp: [10, 0, 0, 0] }),
          battler({ side: 1, ability: ABILITY_PRESSURE }),
          battler({ side: 0, ability: ABILITY_PRESSURE }),
          battler({ side: 1, ability: ABILITY_PRESSURE }),
        ],
      });
      const result = stepTwiceFromAttackstring(rc);
      expect(result.kind).toBe("advanced");
      if (result.kind !== "advanced") throw new Error("expected advance");
      expect(result.state.rulesContext.battlers[0]!.pp[0]).toBe(6);
    });
  });
});

const STRENGTH = 70; // EFFECT_HIT, power 80, accuracy 100, TYPE_NORMAL
const FALSE_SWIPE = 206; // EFFECT_FALSE_SWIPE, power 40, accuracy 100, TYPE_NORMAL
const ENDEAVOR = 283; // EFFECT_ENDEAVOR, power 1, accuracy 100, TYPE_NORMAL
const ABILITY_BATTLE_ARMOR = 4;
const ABILITY_LEVITATE = 26;
const ABILITY_WONDER_GUARD = 25;
const HOLD_EFFECT_ITEM_FOCUS_BAND = 196; // ITEM_FOCUS_BAND
const HOLD_EFFECT_ITEM_LEFTOVERS = 200; // ITEM_LEFTOVERS -- a real held item, not Focus Band
const MACHOKE_1_FOCUS_BAND_CARRIER = (frontierMonsData.entries as readonly {
  index: number;
  label: string;
  species: string;
  moves: readonly string[];
  itemName: string;
}[]).find(({ index }) => index === 178)!;

describe("production critcalc (Cmd_critcalc) dispatch", () => {
  it("registers B_SCR_OP_CRITCALC", () => {
    const instruction = program.instructions.find((i) => i.opcodeName === "B_SCR_OP_CRITCALC")!;
    expect(instruction).toBeDefined();
  });

  it("crits at 1-in-16 (docs/hit-chain-ground-truth.md crit scenario, u16=3760): critMultiplier=2, 1 roll", () => {
    const rc = context(0);
    const seed = rngValueBeforeU16(3760);
    const { result } = stepFrom("BattleScript_HitFromCritCalc", rc, seed);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rng.calls).toBe(1);
    expect(result.state.rng.ledger[0]!.randomValue).toBe(3760);
    expect(result.state.rulesContext.critMultiplier).toBe(2);
  });

  it("does not crit when the roll misses 1-in-16 (u16=29103, the crit scenario's opponent roll)", () => {
    const rc = context(0);
    const seed = rngValueBeforeU16(29103);
    const { result } = stepFrom("BattleScript_HitFromCritCalc", rc, seed);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.critMultiplier).toBe(1);
  });

  it("Battle Armor: immune, consumes zero RNG (the C && chain short-circuits before Random())", () => {
    const rc = context(0, {}, {}, { ability: ABILITY_BATTLE_ARMOR });
    const seed = rngValueBeforeU16(3760); // would crit if rolled
    const { result } = stepFrom("BattleScript_HitFromCritCalc", rc, seed);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rng.calls).toBe(0);
    expect(result.state.rulesContext.critMultiplier).toBe(1);
  });
});

describe("production damagecalc (Cmd_damagecalc) dispatch", () => {
  const B_WEATHER_RAIN = (1 << 0) | (1 << 1) | (1 << 2);
  const B_WEATHER_SUN = (1 << 5) | (1 << 6);

  it("registers B_SCR_OP_DAMAGECALC", () => {
    const instruction = program.instructions.find((i) => i.opcodeName === "B_SCR_OP_DAMAGECALC")!;
    expect(instruction).toBeDefined();
  });

  it.each([
    ["Fire Punch in rain", FIRE_PUNCH, B_WEATHER_RAIN, 18],
    ["Fire Punch in sun", FIRE_PUNCH, B_WEATHER_SUN, 51],
    ["Water Gun in rain", WATER_GUN, B_WEATHER_RAIN, 27],
    ["Water Gun in sun", WATER_GUN, B_WEATHER_SUN, 10],
  ])("%s carries gBattleWeather into CalculateBaseDamage before +2", (_label, move, weather, expected) => {
    const rc = context(
      0,
      { spAttack: 100, moves: [move, 0, 0, 0] },
      { currentMove: move, weather },
      { spDefense: 100 },
    );
    expect(calculateBattleScriptBaseDamageForCurrentMove(rc)).toBe(expected);
  });

  it.each([
    ["Cloud Nine", ABILITY_CLOUD_NINE, FIRE_PUNCH, B_WEATHER_RAIN, 35],
    ["Cloud Nine", ABILITY_CLOUD_NINE, FIRE_PUNCH, B_WEATHER_SUN, 35],
    ["Cloud Nine", ABILITY_CLOUD_NINE, WATER_GUN, B_WEATHER_RAIN, 19],
    ["Cloud Nine", ABILITY_CLOUD_NINE, WATER_GUN, B_WEATHER_SUN, 19],
    ["Air Lock", ABILITY_AIR_LOCK, FIRE_PUNCH, B_WEATHER_RAIN, 35],
    ["Air Lock", ABILITY_AIR_LOCK, FIRE_PUNCH, B_WEATHER_SUN, 35],
    ["Air Lock", ABILITY_AIR_LOCK, WATER_GUN, B_WEATHER_RAIN, 19],
    ["Air Lock", ABILITY_AIR_LOCK, WATER_GUN, B_WEATHER_SUN, 19],
  ])("%s suppresses weather damage for move %i under weather %#i", (_abilityName, ability, move, weather, expected) => {
    const rc = context(
      0,
      { spAttack: 100, moves: [move, 0, 0, 0] },
      { currentMove: move, weather },
      { spDefense: 100, ability },
    );
    expect(calculateBattleScriptBaseDamageForCurrentMove(rc)).toBe(expected);
  });

  it("uses Weather Ball's resolved Fire type after Water Sport power halving, then applies sun damage before +2", () => {
    const rc = context(
      0,
      {
        spAttack: 100,
        moves: [WEATHER_BALL, 0, 0, 0],
        status3: 1 << 17,
      },
      {
        currentMove: WEATHER_BALL,
        dynamicMoveType: 0x80 | 10,
        weather: B_WEATHER_SUN,
      },
      { spDefense: 100 },
    );
    // Power 50 -> Water Sport 25; raw 11 -> sun floor(11*1.5)=16 -> +2.
    expect(calculateBattleScriptBaseDamageForCurrentMove(rc)).toBe(18);
  });

  it("a fresh crit (roll 3760) doubles the crit scenario's base damage (39 Atk -> 104 Def, Tackle: 7 -> 14)", () => {
    const rc = context(
      0,
      { attack: 39, level: 50, types: ["TYPE_PSYCHIC", "TYPE_PSYCHIC"] },
      {},
      { defense: 104, types: ["TYPE_ELECTRIC", "TYPE_STEEL"] },
    );
    const { result } = stepManyFrom("BattleScript_HitFromCritCalc", rc, 2, rngValueBeforeU16(3760));
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.critMultiplier).toBe(2);
    expect(result.state.rulesContext.battleMoveDamage).toBe(14);
  });

  it("scenario 2's opponent Tackle base (69 Atk -> 71 Def, Tackle: 16), no crit", () => {
    const rc = context(
      0,
      { attack: 69, level: 50, types: ["TYPE_ELECTRIC", "TYPE_STEEL"] },
      { critMultiplier: 1, dmgMultiplier: 1 },
      { defense: 71, types: ["TYPE_PSYCHIC", "TYPE_PSYCHIC"] },
    );
    const { result } = stepManyFrom("BattleScript_HitFromCritCalc", rc, 2, rngValueBeforeU16(29103) /* no crit */);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battleMoveDamage).toBe(16);
  });

  it("KO scenario's killing-hit base (200 Atk -> 50 Def, Strength: 142), no crit", () => {
    const rc = context(
      0,
      { attack: 200, level: 50, types: ["TYPE_NORMAL", "TYPE_NORMAL"] },
      { currentMove: STRENGTH, critMultiplier: 1, dmgMultiplier: 1 },
      { defense: 50, types: ["TYPE_GRASS", "TYPE_GRASS"] },
    );
    const { result } = stepManyFrom("BattleScript_HitFromCritCalc", rc, 2, rngValueBeforeU16(29103));
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battleMoveDamage).toBe(142);
  });
});

describe("production typecalc (Cmd_typecalc) dispatch", () => {
  it("registers B_SCR_OP_TYPECALC", () => {
    const instruction = program.instructions.find((i) => i.opcodeName === "B_SCR_OP_TYPECALC")!;
    expect(instruction).toBeDefined();
  });

  it("crit scenario's full critcalc->damagecalc->typecalc chain (7 -> 14 -> no STAB -> 0.5x NORMAL-vs-STEEL -> 7)", () => {
    const rc = context(
      0,
      { attack: 39, level: 50, types: ["TYPE_PSYCHIC", "TYPE_PSYCHIC"] },
      {},
      { defense: 104, types: ["TYPE_ELECTRIC", "TYPE_STEEL"] },
    );
    const { result } = stepManyFrom("BattleScript_HitFromCritCalc", rc, 3, rngValueBeforeU16(3760));
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battleMoveDamage).toBe(7);
  });

  it("applies STAB (attacker shares the move's type)", () => {
    const rc = context(
      0,
      { types: ["TYPE_NORMAL", "TYPE_NORMAL"] },
      { battleMoveDamage: 10 },
      { types: ["TYPE_NORMAL", "TYPE_NORMAL"] },
    );
    const { result } = stepAtOpcode("B_SCR_OP_TYPECALC", rc);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battleMoveDamage).toBe(15); // trunc(10*15/10)
  });

  it("Levitate vs a Ground move: misses, skips the type loop, clears landed-move history", () => {
    const rc = context(0, {}, { currentMove: 89 /* MOVE_EARTHQUAKE, TYPE_GROUND */, battleMoveDamage: 50 }, {
      ability: ABILITY_LEVITATE,
    });
    const { result } = stepAtOpcode("B_SCR_OP_TYPECALC", rc);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.moveResultFlags & 1).toBe(1); // MOVE_RESULT_MISSED
    expect(result.state.rulesContext.moveResultFlags & (1 << 3)).toBe(1 << 3); // DOESNT_AFFECT_FOE
    expect(result.state.rulesContext.missType).toBe(4); // B_MSG_GROUND_MISS
    expect(result.state.rulesContext.lastUsedAbility).toBe(ABILITY_LEVITATE);
    expect(result.state.rulesContext.aiObservedAbilityIds[1]).toBe(ABILITY_LEVITATE);
  });

  it("Foresight lets Low Kick hit a Ghost target through the shared Fighting type consumer", () => {
    const rc = context(
      0,
      { types: ["TYPE_WATER", "TYPE_WATER"] }, // avoid STAB muddying the pinned 10
      { currentMove: 67 /* MOVE_LOW_KICK, TYPE_FIGHTING */, battleMoveDamage: 10 },
      { types: ["TYPE_GHOST", "TYPE_GHOST"], status2: 1 << 29 },
    );
    const { result } = stepAtOpcode("B_SCR_OP_TYPECALC", rc);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battleMoveDamage).toBe(10); // neutral: immunity entry skipped
    expect(result.state.rulesContext.moveResultFlags & (1 << 3)).toBe(0); // not DOESNT_AFFECT_FOE
  });

  it("Ghost immune to Normal without Foresight (real type-chart immunity)", () => {
    const rc = context(0, {}, { battleMoveDamage: 10 }, { types: ["TYPE_GHOST", "TYPE_GHOST"] });
    const { result } = stepAtOpcode("B_SCR_OP_TYPECALC", rc);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battleMoveDamage).toBe(0);
    expect(result.state.rulesContext.moveResultFlags & (1 << 3)).toBe(1 << 3); // DOESNT_AFFECT_FOE
  });

  it("Wonder Guard blocks a merely-neutral hit (not just literal immunity)", () => {
    const rc = context(0, {}, { battleMoveDamage: 10 }, { ability: ABILITY_WONDER_GUARD });
    const { result } = stepAtOpcode("B_SCR_OP_TYPECALC", rc);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.moveResultFlags & 1).toBe(1); // MOVE_RESULT_MISSED
    expect(result.state.rulesContext.lastUsedAbility).toBe(ABILITY_WONDER_GUARD);
    expect(result.state.rulesContext.aiObservedAbilityIds[1]).toBe(ABILITY_WONDER_GUARD);
  });

  it("Wonder Guard lets a super-effective hit through", () => {
    const rc = context(0, {}, { currentMove: 52 /* MOVE_EMBER, TYPE_FIRE */, battleMoveDamage: 10 }, {
      ability: ABILITY_WONDER_GUARD,
      types: ["TYPE_GRASS", "TYPE_GRASS"],
    });
    const { result } = stepAtOpcode("B_SCR_OP_TYPECALC", rc);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.moveResultFlags & 1).toBe(0);
    expect(result.state.rulesContext.aiObservedAbilityIds[1]).toBe(0);
    expect(result.state.rulesContext.battleMoveDamage).toBe(20); // trunc(10*20/10), super effective
  });

  it("MOVE_STRUGGLE short-circuits: no STAB/type step at all", () => {
    const rc = context(0, {}, { currentMove: 165 /* MOVE_STRUGGLE */, battleMoveDamage: 10 });
    const { result } = stepAtOpcode("B_SCR_OP_TYPECALC", rc);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battleMoveDamage).toBe(10);
  });
});

const SEISMIC_TOSS = 69; // EFFECT_LEVEL_DAMAGE, power 1, accuracy 100, TYPE_FIGHTING
const NIGHT_SHADE = 101; // EFFECT_LEVEL_DAMAGE, power 1, accuracy 100, TYPE_GHOST
const PSYWAVE = 149; // EFFECT_PSYWAVE, power 1, accuracy 80, TYPE_PSYCHIC
const BRICK_BREAK = 280; // EFFECT_BRICK_BREAK, power 75, accuracy 100, TYPE_FIGHTING

describe("production dmgtolevel (Cmd_dmgtolevel) dispatch", () => {
  it("registers B_SCR_OP_DMGTOLEVEL", () => {
    expect(program.instructions.find((i) => i.opcodeName === "B_SCR_OP_DMGTOLEVEL")).toBeDefined();
  });

  it("battleMoveDamage becomes exactly the attacker's level, zero RNG", () => {
    const rc = context(0, { level: 50 }, { battleMoveDamage: 999 });
    const pc = findPcInLabel("B_SCR_OP_DMGTOLEVEL", "BattleScript_EffectLevelDamage");
    const { result } = stepAtProgramCounter(pc, rc);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battleMoveDamage).toBe(50);
    expect(result.state.rng.calls).toBe(0);
  });

  it("Night Shade shares the same opcode body at a different level", () => {
    const rc = context(0, { level: 37 }, { currentMove: NIGHT_SHADE });
    const pc = findPcInLabel("B_SCR_OP_DMGTOLEVEL", "BattleScript_EffectLevelDamage");
    const { result } = stepAtProgramCounter(pc, rc);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battleMoveDamage).toBe(37);
  });

  it(
    "EFFECT_LEVEL_DAMAGE full committed script (Seismic Toss, L50): "
      + "BattleScript_EffectLevelDamage -> BattleScript_HitFromAtkAnimation, damage == level exactly, "
      + "exactly 1 RNG draw so far (accuracycheck; dmgtolevel itself draws none, matching "
      + "docs/fixed-damage-cluster-ground-truth.md §5a's live ledger)",
    () => {
      const rc = context(0, { level: 50 }, { currentMove: SEISMIC_TOSS });
      const { result, steps } = runUntilLabel("BattleScript_EffectLevelDamage", "BattleScript_HitFromAtkAnimation", rc);
      expect(result.kind).toBe("advanced");
      if (result.kind !== "advanced") throw new Error("expected advance");
      expect(result.state.programCounter).toBe(labelPc("BattleScript_HitFromAtkAnimation"));
      expect(result.state.rulesContext.battleMoveDamage).toBe(50);
      expect(result.state.rng.calls).toBe(1);
      expect(steps).toBeLessThan(50);
    },
  );
});

describe("production psywavedamageeffect (Cmd_psywavedamageeffect) dispatch", () => {
  it("registers B_SCR_OP_PSYWAVEDAMAGEEFFECT", () => {
    expect(program.instructions.find((i) => i.opcodeName === "B_SCR_OP_PSYWAVEDAMAGEEFFECT")).toBeDefined();
  });

  it("single accepted draw (rngSeed 1: raw draw 16838, %16 = 6 <= 10, accepted first try) -- "
    + "randDamage=60, level 50 -> damage = trunc(50*(60+50)/100) = 55", () => {
    const rc = context(0, { level: 50 }, { battleMoveDamage: 999 });
    const pc = findPcInLabel("B_SCR_OP_PSYWAVEDAMAGEEFFECT", "BattleScript_EffectPsywave");
    const { result } = stepAtProgramCounter(pc, rc, 1);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battleMoveDamage).toBe(55);
    expect(result.state.rng.calls).toBe(1);
  });

  it("rejection then acceptance (rngSeed 2: raw draws [33676, 28355], first %16 = 12 > 10 "
    + "rejected, second %16 = 3 accepted) -- randDamage=30, level 50 -> "
    + "damage = trunc(50*(30+50)/100) = 40, exactly 2 draws", () => {
    const rc = context(0, { level: 50 }, { battleMoveDamage: 999 });
    const pc = findPcInLabel("B_SCR_OP_PSYWAVEDAMAGEEFFECT", "BattleScript_EffectPsywave");
    const { result } = stepAtProgramCounter(pc, rc, 2);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battleMoveDamage).toBe(40);
    expect(result.state.rng.calls).toBe(2);
  });

  it(
    "EFFECT_PSYWAVE full committed script (L50, rngSeed 1): BattleScript_EffectPsywave -> "
      + "BattleScript_HitFromAtkAnimation, accuracy roll hits (draw 16838 %100 = 38 < 80) then exactly "
      + "1 rejection-sampling draw (draw 44065 %16 = 1, accepted), damage = trunc(50*60/100) = 30, "
      + "total 2 RNG draws (accuracycheck + psywavedamageeffect's own single draw)",
    () => {
      const rc = context(0, { level: 50 }, { currentMove: PSYWAVE });
      const { result, steps } = runUntilLabel("BattleScript_EffectPsywave", "BattleScript_HitFromAtkAnimation", rc, 1);
      expect(result.kind).toBe("advanced");
      if (result.kind !== "advanced") throw new Error("expected advance");
      expect(result.state.programCounter).toBe(labelPc("BattleScript_HitFromAtkAnimation"));
      expect(result.state.rulesContext.battleMoveDamage).toBe(30);
      expect(result.state.rng.calls).toBe(2);
      expect(steps).toBeLessThan(50);
    },
  );

  it(
    "EFFECT_PSYWAVE full committed script, multi-draw case (L50, rngSeed 5): accuracy roll hits "
      + "(draw 18655 %100 = 55 < 80) then exactly 2 rejection-sampling draws (46763 %16 = 11 rejected, "
      + "54501 %16 = 5 accepted), damage = trunc(50*100/100) = 50, total 3 RNG draws",
    () => {
      const rc = context(0, { level: 50 }, { currentMove: PSYWAVE });
      const { result, steps } = runUntilLabel("BattleScript_EffectPsywave", "BattleScript_HitFromAtkAnimation", rc, 5);
      expect(result.kind).toBe("advanced");
      if (result.kind !== "advanced") throw new Error("expected advance");
      expect(result.state.programCounter).toBe(labelPc("BattleScript_HitFromAtkAnimation"));
      expect(result.state.rulesContext.battleMoveDamage).toBe(50);
      expect(result.state.rng.calls).toBe(3);
      expect(steps).toBeLessThan(50);
    },
  );
});

describe("production typecalc2 (Cmd_typecalc2) dispatch -- Counter/Mirror Coat/Brick Break's second-call immunity gate", () => {
  it("registers B_SCR_OP_TYPECALC2", () => {
    expect(program.instructions.find((i) => i.opcodeName === "B_SCR_OP_TYPECALC2")).toBeDefined();
  });

  it("never applies STAB and never scales battleMoveDamage, even on a same-type super-effective hit "
    + "(the load-bearing divergence from Cmd_typecalc)", () => {
    const rc = context(
      0,
      { types: ["TYPE_FIGHTING", "TYPE_FIGHTING"] },
      { currentMove: BRICK_BREAK, battleMoveDamage: 42 },
      { types: ["TYPE_NORMAL", "TYPE_NORMAL"] }, // Normal is weak to Fighting: 2x in a real typecalc call
    );
    const pc = findPcInLabel("B_SCR_OP_TYPECALC2", "BattleScript_BrickBreakDoHit");
    const { result } = stepAtProgramCounter(pc, rc);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battleMoveDamage).toBe(42); // untouched
    expect(result.state.rulesContext.moveResultFlags & (1 << 1)).toBe(0); // SUPER_EFFECTIVE not set on the real flags either
  });

  it("Levitate vs a Ground move: misses, clears landed-move history, same shape as typecalc's own branch", () => {
    const rc = context(0, {}, { currentMove: 89 /* MOVE_EARTHQUAKE, TYPE_GROUND */, battleMoveDamage: 50 }, {
      ability: ABILITY_LEVITATE,
    });
    const pc = findPcInLabel("B_SCR_OP_TYPECALC2", "BattleScript_BrickBreakDoHit");
    const { result } = stepAtProgramCounter(pc, rc);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.moveResultFlags & 1).toBe(1); // MOVE_RESULT_MISSED
    expect(result.state.rulesContext.moveResultFlags & (1 << 3)).toBe(1 << 3); // DOESNT_AFFECT_FOE
    expect(result.state.rulesContext.missType).toBe(4); // B_MSG_GROUND_MISS
    expect(result.state.rulesContext.lastUsedAbility).toBe(ABILITY_LEVITATE);
    expect(result.state.rulesContext.aiObservedAbilityIds[1]).toBe(ABILITY_LEVITATE);
    expect(result.state.rulesContext.battleMoveDamage).toBe(50); // still untouched
  });

  it("real type-chart immunity (Ghost vs Fighting) sets DOESNT_AFFECT_FOE and targetNotAffected on the "
    + "attacker, damage left alone (not zeroed, unlike typecalc)", () => {
    const rc = context(0, {}, { currentMove: BRICK_BREAK, battleMoveDamage: 42 }, { types: ["TYPE_GHOST", "TYPE_GHOST"] });
    const pc = findPcInLabel("B_SCR_OP_TYPECALC2", "BattleScript_BrickBreakDoHit");
    const { result } = stepAtProgramCounter(pc, rc);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.moveResultFlags & (1 << 3)).toBe(1 << 3); // DOESNT_AFFECT_FOE
    expect(result.state.rulesContext.battleMoveDamage).toBe(42);
    expect(result.state.rulesContext.battlers[0]!.targetNotAffected).toBe(1); // attacker, per source
  });

  it("Wonder Guard reads its own LOCAL flags, not the real moveResultFlags -- a stale SUPER_EFFECTIVE "
    + "bit left over from typecalc's own earlier call does not save a target this call finds neutral", () => {
    const rc = context(
      0,
      {},
      {
        currentMove: BRICK_BREAK,
        battleMoveDamage: 42,
        moveResultFlags: 1 << 1, // stale MOVE_RESULT_SUPER_EFFECTIVE from the real typecalc call moments earlier
      },
      { ability: ABILITY_WONDER_GUARD, types: ["TYPE_WATER", "TYPE_WATER"] }, // neutral vs Fighting (not in the type table)
    );
    const pc = findPcInLabel("B_SCR_OP_TYPECALC2", "BattleScript_BrickBreakDoHit");
    const { result } = stepAtProgramCounter(pc, rc);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.moveResultFlags & 1).toBe(1); // MOVE_RESULT_MISSED
    expect(result.state.rulesContext.lastUsedAbility).toBe(ABILITY_WONDER_GUARD);
    expect(result.state.rulesContext.aiObservedAbilityIds[1]).toBe(ABILITY_WONDER_GUARD);
  });

  it("Wonder Guard lets this call's own super-effective hit through", () => {
    const rc = context(0, {}, { currentMove: BRICK_BREAK, battleMoveDamage: 42 }, {
      ability: ABILITY_WONDER_GUARD,
      types: ["TYPE_NORMAL", "TYPE_NORMAL"], // weak to Fighting
    });
    const pc = findPcInLabel("B_SCR_OP_TYPECALC2", "BattleScript_BrickBreakDoHit");
    const { result } = stepAtProgramCounter(pc, rc);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.moveResultFlags & 1).toBe(0); // not MISSED
    expect(result.state.rulesContext.aiObservedAbilityIds[1]).toBe(0);
    expect(result.state.rulesContext.aiObservedAbilityIds[1]).toBe(0);
    expect(result.state.rulesContext.battleMoveDamage).toBe(42); // still never scaled
  });
});

describe("production adjustnormaldamage (Cmd_adjustnormaldamage) dispatch", () => {
  it("registers B_SCR_OP_ADJUSTNORMALDAMAGE", () => {
    const instruction = program.instructions.find((i) => i.opcodeName === "B_SCR_OP_ADJUSTNORMALDAMAGE")!;
    expect(instruction).toBeDefined();
  });

  it("scenario 2's opponent Tackle rand roll (16 -> 97% -> 15, u16=52995)", () => {
    const rc = context(0, {}, { battleMoveDamage: 16 }, { hp: 100 });
    const { result } = stepAtOpcode("B_SCR_OP_ADJUSTNORMALDAMAGE", rc, rngValueBeforeU16(52995));
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battleMoveDamage).toBe(15);
    expect(result.state.rng.calls).toBe(1);
  });

  it("crit scenario's final rand roll (7 -> 90% -> 6, u16=40906)", () => {
    const rc = context(0, {}, { battleMoveDamage: 7 }, { hp: 100 });
    const { result } = stepAtOpcode("B_SCR_OP_ADJUSTNORMALDAMAGE", rc, rngValueBeforeU16(40906));
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battleMoveDamage).toBe(6);
  });

  it("KO scenario's final rand roll (213 -> 96% -> 204, u16=52212)", () => {
    const rc = context(0, {}, { battleMoveDamage: 213 }, { hp: 90 });
    const { result } = stepAtOpcode("B_SCR_OP_ADJUSTNORMALDAMAGE", rc, rngValueBeforeU16(52212));
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battleMoveDamage).toBe(204);
  });

  it("False Swipe clamps lethal damage to hp-1", () => {
    const rc = context(0, {}, { currentMove: FALSE_SWIPE, battleMoveDamage: 999 }, { hp: 10 });
    const { result } = stepAtOpcode("B_SCR_OP_ADJUSTNORMALDAMAGE", rc, rngValueBeforeU16(52212));
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battleMoveDamage).toBe(9);
    expect(result.state.rulesContext.moveResultFlags & (1 << 6)).toBe(0); // not MOVE_RESULT_FOE_ENDURED
  });

  it("Endure clamps lethal damage to hp-1 and sets MOVE_RESULT_FOE_ENDURED", () => {
    const rc = context(0, {}, { battleMoveDamage: 999 }, { hp: 10, endured: 1 });
    const { result } = stepAtOpcode("B_SCR_OP_ADJUSTNORMALDAMAGE", rc, rngValueBeforeU16(52212));
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battleMoveDamage).toBe(9);
    expect(result.state.rulesContext.moveResultFlags & (1 << 6)).toBe(1 << 6); // MOVE_RESULT_FOE_ENDURED
  });

  it("does not clamp a non-lethal hit even with Endure set", () => {
    const rc = context(0, {}, { battleMoveDamage: 5 }, { hp: 100, endured: 1 });
    const { result } = stepAtOpcode("B_SCR_OP_ADJUSTNORMALDAMAGE", rc, rngValueBeforeU16(52212));
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battleMoveDamage).toBe(4); // trunc(5*96/100), not clamped (100 > 4)
    expect(result.state.rulesContext.moveResultFlags & (1 << 6)).toBe(0);
  });

  describe("Focus Band's holder-only post-variance roll", () => {
    it("draws and records a successful roll on a non-lethal hit without clamping or attributing the message item", () => {
      const rc = context(0, {}, { battleMoveDamage: 5 }, { hp: 100, item: HOLD_EFFECT_ITEM_FOCUS_BAND });
      const { result } = stepAtOpcode("B_SCR_OP_ADJUSTNORMALDAMAGE", rc, 53);
      expect(result.kind).toBe("advanced");
      expect(result.state.rulesContext.battleMoveDamage).toBe(4);
      expect(result.state.rulesContext.battlers[1].specialStatus.focusBanded).toBe(1);
      expect(result.state.rulesContext.moveResultFlags & (1 << 7)).toBe(0);
      expect(result.state.rulesContext.lastUsedItem).toBe(0);
      expect(result.state.rulesContext.aiObservedItemEffects[1]).toBe(HOLD_EFFECT_ID_FOCUS_BAND);
      expect(result.state.rng.ledger.map(({ reason, randomValue }) => [reason, randomValue])).toEqual([
        ["adjustnormaldamage", 40462],
        ["adjustnormaldamage-focus-band", 13608],
      ]);
    });

    it("successful lethal roll clamps to 1 HP and attributes HUNG_ON to Focus Band", () => {
      expect(MACHOKE_1_FOCUS_BAND_CARRIER).toEqual({
        index: 178,
        label: "FRONTIER_MON_MACHOKE_1",
        species: "SPECIES_MACHOKE",
        moves: ["MOVE_LOW_KICK", "MOVE_ROCK_TOMB", "MOVE_FORESIGHT", "MOVE_SCARY_FACE"],
        itemTableId: 6,
        itemName: "BATTLE_FRONTIER_ITEM_FOCUS_BAND",
        evSpread: 33,
        evSpreadStats: ["F_EV_SPREAD_SP_DEFENSE", "F_EV_SPREAD_HP"],
        nature: "NATURE_ADAMANT",
      });
      const rc = context(
        0,
        {},
        { battleMoveDamage: 999 },
        {
          hp: 10,
          species: 67,
          moves: [67, 317, 193, 184],
          item: HOLD_EFFECT_ITEM_FOCUS_BAND,
        },
      );
      const { result } = stepAtOpcode("B_SCR_OP_ADJUSTNORMALDAMAGE", rc, 53);
      expect(result.kind).toBe("advanced");
      expect(result.state.rulesContext.battleMoveDamage).toBe(9);
      expect(result.state.rulesContext.moveResultFlags & (1 << 7)).toBe(1 << 7);
      expect(result.state.rulesContext.lastUsedItem).toBe(HOLD_EFFECT_ITEM_FOCUS_BAND);
      expect(result.state.rng.ledger.map((entry) => entry.reason)).toEqual([
        "adjustnormaldamage",
        "adjustnormaldamage-focus-band",
      ]);
    });

    it("failed lethal roll still consumes the band draw and leaves the hit lethal", () => {
      const rc = context(0, {}, { battleMoveDamage: 999 }, { hp: 10, item: HOLD_EFFECT_ITEM_FOCUS_BAND });
      const { result } = stepAtOpcode("B_SCR_OP_ADJUSTNORMALDAMAGE", rc, 1);
      expect(result.kind).toBe("advanced");
      expect(result.state.rulesContext.battleMoveDamage).toBe(939);
      expect(result.state.rulesContext.battlers[1].specialStatus.focusBanded).toBe(0);
      expect(result.state.rulesContext.aiObservedItemEffects[1]).toBe(0);
      expect(result.state.rulesContext.moveResultFlags & (1 << 7)).toBe(0);
      expect(result.state.rng.ledger.map(({ reason, randomValue }) => [reason, randomValue])).toEqual([
        ["adjustnormaldamage", 16838],
        ["adjustnormaldamage-focus-band", 44065],
      ]);
    });

    it("does not shift the canonical no-band hit ledger", () => {
      const rc = context(0, {}, { battleMoveDamage: 999 }, { hp: 10, item: HOLD_EFFECT_ITEM_LEFTOVERS });
      const { result } = stepAtOpcode("B_SCR_OP_ADJUSTNORMALDAMAGE", rc, rngValueBeforeU16(52212));
      expect(result.kind).toBe("advanced");
      expect(result.state.rng.ledger.map((entry) => entry.reason)).toEqual(["adjustnormaldamage"]);
      expect(result.state.rng.ledger[0]!.randomValue).toBe(52212);
    });

    it("keeps Endure's source precedence over a successful Focus Band roll", () => {
      const rc = context(0, {}, { battleMoveDamage: 999 }, { hp: 10, endured: 1, item: HOLD_EFFECT_ITEM_FOCUS_BAND });
      const { result } = stepAtOpcode("B_SCR_OP_ADJUSTNORMALDAMAGE", rc, 53);
      expect(result.kind).toBe("advanced");
      if (result.kind !== "advanced") throw new Error("expected advance");
      expect(result.state.rulesContext.battleMoveDamage).toBe(9);
      expect(result.state.rulesContext.moveResultFlags & (1 << 6)).toBe(1 << 6);
      expect(result.state.rulesContext.moveResultFlags & (1 << 7)).toBe(0);
      expect(result.state.rulesContext.lastUsedItem).toBe(0);
    });
  });
});

describe("production adjustnormaldamage2 (Cmd_adjustnormaldamage2) dispatch", () => {
  it("omits only False Swipe's clamp while consuming the same random roll", () => {
    const rc = context(0, {}, { currentMove: FALSE_SWIPE, battleMoveDamage: 999 }, { hp: 10 });
    const seed = rngValueBeforeU16(52212);
    const ordinary = stepAtOpcode("B_SCR_OP_ADJUSTNORMALDAMAGE", rc, seed).result;
    const delayed = stepAtOpcode("B_SCR_OP_ADJUSTNORMALDAMAGE2", rc, seed).result;
    expect(ordinary.kind).toBe("advanced");
    expect(delayed.kind).toBe("advanced");
    expect(ordinary.state.rulesContext.battleMoveDamage).toBe(9);
    expect(delayed.state.rulesContext.battleMoveDamage).toBe(959);
    expect(ordinary.state.rulesContext.moveResultFlags).toBe(0);
    expect(delayed.state.rulesContext.moveResultFlags).toBe(0);
    expect(ordinary.state.rng.calls).toBe(1);
    expect(delayed.state.rng.calls).toBe(1);
    expect(ordinary.state.rng.ledger[0]!.randomValue).toBe(52212);
    expect(delayed.state.rng.ledger[0]!.randomValue).toBe(52212);
    expect(delayed.state.rng.ledger[0]!.reason).toBe("adjustnormaldamage2");
  });

  it("preserves the shared Endure clamp and flag despite a False Swipe current move", () => {
    const rc = context(
      0,
      {},
      { currentMove: FALSE_SWIPE, battleMoveDamage: 999 },
      { hp: 10, endured: 1 },
    );
    const { result } = stepAtOpcode("B_SCR_OP_ADJUSTNORMALDAMAGE2", rc, rngValueBeforeU16(52212));
    expect(result.kind).toBe("advanced");
    expect(result.state.rulesContext.battleMoveDamage).toBe(9);
    expect(result.state.rulesContext.moveResultFlags & (1 << 6)).toBe(1 << 6);
    expect(result.state.rng.calls).toBe(1);
  });

  it("preserves Substitute's suppression of both False Swipe and Endure clamps", () => {
    const rc = context(
      0,
      {},
      { currentMove: FALSE_SWIPE, battleMoveDamage: 999 },
      { hp: 10, endured: 1, status2: 1 << 24 },
    );
    const { result } = stepAtOpcode("B_SCR_OP_ADJUSTNORMALDAMAGE2", rc, rngValueBeforeU16(52212));
    expect(result.kind).toBe("advanced");
    expect(result.state.rulesContext.battleMoveDamage).toBe(959);
    expect(result.state.rulesContext.moveResultFlags & (1 << 6)).toBe(0);
    expect(result.state.rng.calls).toBe(1);
  });

  it("runs the same variance-then-Focus-Band order in Cmd_adjustnormaldamage2", () => {
    const rc = context(
      0,
      {},
      { currentMove: FALSE_SWIPE, battleMoveDamage: 999 },
      { hp: 10, item: HOLD_EFFECT_ITEM_FOCUS_BAND },
    );
    const { result } = stepAtOpcode("B_SCR_OP_ADJUSTNORMALDAMAGE2", rc, 53);
    expect(result.kind).toBe("advanced");
    expect(result.state.rulesContext.battleMoveDamage).toBe(9);
    expect(result.state.rulesContext.moveResultFlags & (1 << 7)).toBe(1 << 7);
    expect(result.state.rulesContext.aiObservedItemEffects[1]).toBe(HOLD_EFFECT_ID_FOCUS_BAND);
    expect(result.state.rng.ledger.map((entry) => entry.reason)).toEqual([
      "adjustnormaldamage2",
      "adjustnormaldamage2-focus-band",
    ]);
  });
});

describe("production setdamagetohealthdifference (Cmd_setdamagetohealthdifference) dispatch", () => {
  it("registers B_SCR_OP_SETDAMAGETOHEALTHDIFFERENCE", () => {
    const instruction = program.instructions.find((i) => i.opcodeName === "B_SCR_OP_SETDAMAGETOHEALTHDIFFERENCE")!;
    expect(instruction).toBeDefined();
  });

  it(
    "success: target HP above user HP sets gBattleMoveDamage to the difference, zero RNG "
      + "(live oracle bin/oracle lab tools/battle-lab/mechanic-endeavor-success.json: "
      + "Diglett 85hp user vs Chansey 325hp target -> gBattleMoveDamage 240, target settles at 85)",
    () => {
      const rc = context(0, { hp: 85 }, {}, { hp: 325 });
      const { result } = stepAtOpcode("B_SCR_OP_SETDAMAGETOHEALTHDIFFERENCE", rc);
      expect(result.kind).toBe("advanced");
      if (result.kind !== "advanced") throw new Error("expected advance");
      expect(result.state.rulesContext.battleMoveDamage).toBe(240);
      expect(result.state.rng.calls).toBe(0);
    },
  );

  it("fails on the exact boundary (target HP equals user HP, source's <=), jumps to BattleScript_ButItFailed", () => {
    const rc = context(0, { hp: 100 }, {}, { hp: 100 });
    const { result } = stepAtOpcode("B_SCR_OP_SETDAMAGETOHEALTHDIFFERENCE", rc);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.programCounter).toBe(labelPc("BattleScript_ButItFailed"));
    expect(result.state.rulesContext.battleMoveDamage).toBe(0); // untouched
    expect(result.state.rng.calls).toBe(0);
  });

  it(
    "fails when the user's HP exceeds the target's, jumps to BattleScript_ButItFailed "
      + "(live oracle mechanic-endeavor-fail.json: Chansey 325hp user vs Diglett 85hp target -> no HP change either side)",
    () => {
      const rc = context(0, { hp: 325 }, {}, { hp: 85 });
      const { result } = stepAtOpcode("B_SCR_OP_SETDAMAGETOHEALTHDIFFERENCE", rc);
      expect(result.kind).toBe("advanced");
      if (result.kind !== "advanced") throw new Error("expected advance");
      expect(result.state.programCounter).toBe(labelPc("BattleScript_ButItFailed"));
      expect(result.state.rng.calls).toBe(0);
    },
  );
});

describe("production adjustsetdamage (Cmd_adjustsetdamage) dispatch", () => {
  it("registers B_SCR_OP_ADJUSTSETDAMAGE", () => {
    const instruction = program.instructions.find((i) => i.opcodeName === "B_SCR_OP_ADJUSTSETDAMAGE")!;
    expect(instruction).toBeDefined();
  });

  it("plain pass-through: Endeavor's own set damage is untouched with no clamp condition, zero RNG (no random multiplier, unlike adjustnormaldamage)", () => {
    const rc = context(0, {}, { currentMove: ENDEAVOR, battleMoveDamage: 240 }, { hp: 325 });
    const { result } = stepAtOpcode("B_SCR_OP_ADJUSTSETDAMAGE", rc);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battleMoveDamage).toBe(240);
    expect(result.state.rulesContext.moveResultFlags & (1 << 6)).toBe(0); // not MOVE_RESULT_FOE_ENDURED
    expect(result.state.rng.calls).toBe(0);
  });

  it("False Swipe clamps lethal set-damage to hp-1", () => {
    const rc = context(0, {}, { currentMove: FALSE_SWIPE, battleMoveDamage: 999 }, { hp: 10 });
    const { result } = stepAtOpcode("B_SCR_OP_ADJUSTSETDAMAGE", rc);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battleMoveDamage).toBe(9);
    expect(result.state.rulesContext.moveResultFlags & (1 << 6)).toBe(0);
  });

  it("Endure clamps lethal set-damage to hp-1 and sets MOVE_RESULT_FOE_ENDURED", () => {
    const rc = context(0, {}, { currentMove: ENDEAVOR, battleMoveDamage: 999 }, { hp: 10, endured: 1 });
    const { result } = stepAtOpcode("B_SCR_OP_ADJUSTSETDAMAGE", rc);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battleMoveDamage).toBe(9);
    expect(result.state.rulesContext.moveResultFlags & (1 << 6)).toBe(1 << 6);
  });

  it("does not clamp a non-lethal set-damage even with Endure set", () => {
    const rc = context(0, {}, { currentMove: ENDEAVOR, battleMoveDamage: 5 }, { hp: 100, endured: 1 });
    const { result } = stepAtOpcode("B_SCR_OP_ADJUSTSETDAMAGE", rc);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battleMoveDamage).toBe(5); // no random multiplier to shrink it here
    expect(result.state.rulesContext.moveResultFlags & (1 << 6)).toBe(0);
  });

  describe("Focus Band's no-variance adjustsetdamage form", () => {
    it("draws once and clamps a successful lethal hit", () => {
      const rc = context(0, {}, { currentMove: ENDEAVOR, battleMoveDamage: 999 }, { hp: 10, item: HOLD_EFFECT_ITEM_FOCUS_BAND });
      const { result } = stepAtOpcode("B_SCR_OP_ADJUSTSETDAMAGE", rc, rngValueBeforeU16(13608));
      expect(result.kind).toBe("advanced");
      expect(result.state.rulesContext.battleMoveDamage).toBe(9);
      expect(result.state.rulesContext.moveResultFlags & (1 << 7)).toBe(1 << 7);
      expect(result.state.rulesContext.aiObservedItemEffects[1]).toBe(HOLD_EFFECT_ID_FOCUS_BAND);
      expect(result.state.rng.ledger.map((entry) => entry.reason)).toEqual(["adjustsetdamage-focus-band"]);
    });

    it("does not barrier a different held item on the same lethal-hit shape", () => {
      const rc = context(0, {}, { currentMove: ENDEAVOR, battleMoveDamage: 999 }, { hp: 10, endured: 1, item: HOLD_EFFECT_ITEM_LEFTOVERS });
      const { result } = stepAtOpcode("B_SCR_OP_ADJUSTSETDAMAGE", rc);
      expect(result.kind).toBe("advanced");
      if (result.kind !== "advanced") throw new Error("expected advance");
      expect(result.state.rulesContext.battleMoveDamage).toBe(9);
    });
  });
});

describe("production counterdamagecalculator (Cmd_counterdamagecalculator) dispatch -- Counter's own three-gate retaliation", () => {
  it("registers B_SCR_OP_COUNTERDAMAGECALCULATOR", () => {
    expect(program.instructions.find((i) => i.opcodeName === "B_SCR_OP_COUNTERDAMAGECALCULATOR")).toBeDefined();
  });

  it("success: doubles the recorded physical hit and redirects gBattlerTarget to the recorded hitter", () => {
    const rc = context(0, { protectPhysicalDmg: 14, protectPhysicalBattlerId: 1 }, {}, { hp: 100 });
    const { result } = stepAtOpcode("B_SCR_OP_COUNTERDAMAGECALCULATOR", rc);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battleMoveDamage).toBe(28);
    expect(result.state.rulesContext.selectorRoles.target).toBe(1);
  });

  it("success in doubles: redirects away from the pre-existing target to the actual recorded hitter", () => {
    const doublesTopology = Object.freeze({
      battlersCount: 4 as const,
      battleTypeFlags: BATTLE_SCRIPT_BATTLE_TYPE_DOUBLE,
      battlerPositions: [0, 1, 2, 3] as const,
    });
    const rc = context(0, {}, {
      battleTopology: doublesTopology,
      battlers: [
        battler({ side: 0, protectPhysicalDmg: 14, protectPhysicalBattlerId: 3 }), // attacker (Counter user)
        battler({ side: 1 }), // pre-existing target -- must NOT be who gets hit
        battler({ side: 0 }), // attacker's ally
        battler({ side: 1, hp: 77 }), // the actual opposing-side battler that hit the attacker
      ],
    });
    const { result } = stepAtOpcode("B_SCR_OP_COUNTERDAMAGECALCULATOR", rc);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battleMoveDamage).toBe(28);
    expect(result.state.rulesContext.selectorRoles.target).toBe(3);
  });

  it("failure gate (a): no physical hit recorded (protectPhysicalDmg 0) jumps to BattleScript_FailedFromAtkString and sets ppNotAffectedByPressure", () => {
    const rc = context(0, {}, {}, { hp: 100 });
    const { result } = stepAtOpcode("B_SCR_OP_COUNTERDAMAGECALCULATOR", rc);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.programCounter).toBe(labelPc("BattleScript_FailedFromAtkString"));
    expect(result.state.rulesContext.battleMoveDamage).toBe(0);
    expect(result.state.rulesContext.battlers[0]!.ppNotAffectedByPressure).toBe(1);
  });

  it("failure gate (b): recorded hitter is on the attacker's own side (ally fire never retaliates)", () => {
    const rc = context(0, {}, {
      battlers: [
        battler({ side: 0, protectPhysicalDmg: 14, protectPhysicalBattlerId: 2 }),
        battler({ side: 1 }),
        battler({ side: 0, hp: 100 }), // same side as the attacker
        battler({ side: 1 }),
      ],
    });
    const { result } = stepAtOpcode("B_SCR_OP_COUNTERDAMAGECALCULATOR", rc);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.programCounter).toBe(labelPc("BattleScript_FailedFromAtkString"));
    expect(result.state.rulesContext.battlers[0]!.ppNotAffectedByPressure).toBe(1);
  });

  it("failure gate (c): the recorded hitter has since fainted", () => {
    const rc = context(0, { protectPhysicalDmg: 14, protectPhysicalBattlerId: 1 }, {}, { hp: 0 });
    const { result } = stepAtOpcode("B_SCR_OP_COUNTERDAMAGECALCULATOR", rc);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.programCounter).toBe(labelPc("BattleScript_FailedFromAtkString"));
    expect(result.state.rulesContext.battlers[0]!.ppNotAffectedByPressure).toBe(1);
  });

  it("a recorded SPECIAL hit does not satisfy Counter's own (physical-only) gate", () => {
    const rc = context(0, { protectSpecialDmg: 14, protectSpecialBattlerId: 1 }, {}, { hp: 100 });
    const { result } = stepAtOpcode("B_SCR_OP_COUNTERDAMAGECALCULATOR", rc);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.programCounter).toBe(labelPc("BattleScript_FailedFromAtkString"));
  });
});

describe("production mirrorcoatdamagecalculator (Cmd_mirrorcoatdamagecalculator) dispatch -- byte-for-byte Counter twin, special fields", () => {
  it("registers B_SCR_OP_MIRRORCOATDAMAGECALCULATOR", () => {
    expect(program.instructions.find((i) => i.opcodeName === "B_SCR_OP_MIRRORCOATDAMAGECALCULATOR")).toBeDefined();
  });

  it("success: doubles the recorded special hit and redirects gBattlerTarget to the recorded hitter", () => {
    const rc = context(0, { protectSpecialDmg: 8, protectSpecialBattlerId: 1 }, {}, { hp: 100 });
    const { result } = stepAtOpcode("B_SCR_OP_MIRRORCOATDAMAGECALCULATOR", rc);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battleMoveDamage).toBe(16);
    expect(result.state.rulesContext.selectorRoles.target).toBe(1);
  });

  it("failure gate (a): no special hit recorded (protectSpecialDmg 0) jumps to BattleScript_FailedFromAtkString and sets ppNotAffectedByPressure", () => {
    const rc = context(0, {}, {}, { hp: 100 });
    const { result } = stepAtOpcode("B_SCR_OP_MIRRORCOATDAMAGECALCULATOR", rc);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.programCounter).toBe(labelPc("BattleScript_FailedFromAtkString"));
    expect(result.state.rulesContext.battleMoveDamage).toBe(0);
    expect(result.state.rulesContext.battlers[0]!.ppNotAffectedByPressure).toBe(1);
  });

  it("failure gate (b): recorded hitter is on the attacker's own side", () => {
    const rc = context(0, {}, {
      battlers: [
        battler({ side: 0, protectSpecialDmg: 8, protectSpecialBattlerId: 2 }),
        battler({ side: 1 }),
        battler({ side: 0, hp: 100 }),
        battler({ side: 1 }),
      ],
    });
    const { result } = stepAtOpcode("B_SCR_OP_MIRRORCOATDAMAGECALCULATOR", rc);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.programCounter).toBe(labelPc("BattleScript_FailedFromAtkString"));
  });

  it("failure gate (c): the recorded hitter has since fainted", () => {
    const rc = context(0, { protectSpecialDmg: 8, protectSpecialBattlerId: 1 }, {}, { hp: 0 });
    const { result } = stepAtOpcode("B_SCR_OP_MIRRORCOATDAMAGECALCULATOR", rc);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.programCounter).toBe(labelPc("BattleScript_FailedFromAtkString"));
  });

  it("a recorded PHYSICAL hit does not satisfy Mirror Coat's own (special-only) gate", () => {
    const rc = context(0, { protectPhysicalDmg: 8, protectPhysicalBattlerId: 1 }, {}, { hp: 100 });
    const { result } = stepAtOpcode("B_SCR_OP_MIRRORCOATDAMAGECALCULATOR", rc);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.programCounter).toBe(labelPc("BattleScript_FailedFromAtkString"));
  });
});

/**
 * Walks the real committed script from `entryLabel` until `targetLabel`'s own
 * programCounter is reached (or `budget` steps pass). Mirrors
 * tests/battleScriptIngrainLeechSeedWrapOpcode.test.ts's own runUntilLabel.
 */
function runUntilLabel(
  entryLabel: string,
  targetLabel: string,
  rulesContext: BattleScriptRulesContext,
  rngSeed = 1,
  ports = externalPorts(),
  budget = 50,
) {
  const execution = createBattleScriptStatusRulesExecution(program, entryLabel, rulesContext, rngSeed, ports);
  const targetPc = labelPc(targetLabel);
  let result = stepBattleScriptMachine(program, execution.state, execution.handlers);
  let steps = 1;
  while (result.kind === "advanced" && result.state.programCounter !== targetPc && steps < budget) {
    result = stepBattleScriptMachine(program, result.state, execution.handlers);
    steps++;
  }
  return { execution, result, steps };
}

/**
 * FRONTIER GATE: EFFECT_ENDEAVOR's real committed script
 * (`BattleScript_EffectEndeavor`, data/battle_scripts_1.s -- attackcanceler,
 * attackstring, ppreduce, setdamagetohealthdifference, copyword,
 * accuracycheck, typecalc, jumpifmovehadnoeffect, bicbyte, copyword,
 * adjustsetdamage, goto BattleScript_HitFromAtkAnimation) now runs end to
 * end through the three opcodes this module/battleScriptSetByte.ts register
 * this session, landing in the exact same generic hit-chain tail every other
 * EFFECT_HIT-family move already proves reachable (the KO scenario test
 * above). Ground truth pinned live this session (`bin/oracle lab
 * tools/battle-lab/mechanic-endeavor-{success,fail}.json`): Diglett (85hp,
 * TYPE_GROUND, avoids the TYPE_NORMAL STAB this synthetic fixture would
 * otherwise apply) vs Chansey (325hp, default TYPE_NORMAL) at Level 50.
 */
describe("EFFECT_ENDEAVOR: full committed script, live-oracle-pinned ground truth", () => {
  it(
    "success: reaches BattleScript_HitFromAtkAnimation with gBattleMoveDamage 240 "
      + "(live oracle: Chansey 325 -> 85, Diglett unchanged at 85), exactly 1 RNG draw so far (accuracycheck; "
      + "seteffectwithchance's own draw lives in the shared tail past this point, live-oracle total 2)",
    () => {
      const rc = context(0, { hp: 85, types: ["TYPE_GROUND", "TYPE_GROUND"] }, { currentMove: ENDEAVOR }, { hp: 325 });
      const { result, steps } = runUntilLabel("BattleScript_EffectEndeavor", "BattleScript_HitFromAtkAnimation", rc);
      expect(result.kind).toBe("advanced");
      if (result.kind !== "advanced") throw new Error("expected advance");
      expect(result.state.programCounter).toBe(labelPc("BattleScript_HitFromAtkAnimation"));
      expect(result.state.rulesContext.battleMoveDamage).toBe(240);
      expect(result.state.rulesContext.moveResultFlags).toBe(0);
      expect(result.state.rng.calls).toBe(1);
      expect(steps).toBeLessThan(50);
    },
  );

  it(
    "fail: user's HP already exceeds the target's -- jumps straight to BattleScript_ButItFailed, zero RNG "
      + "(live oracle: Chansey 325hp user vs Diglett 85hp target, no HP change either side)",
    () => {
      const rc = context(0, { hp: 325 }, { currentMove: ENDEAVOR }, { hp: 85 });
      const { result, steps } = runUntilLabel("BattleScript_EffectEndeavor", "BattleScript_ButItFailed", rc);
      expect(result.kind).toBe("advanced");
      if (result.kind !== "advanced") throw new Error("expected advance");
      expect(result.state.programCounter).toBe(labelPc("BattleScript_ButItFailed"));
      expect(result.state.rng.calls).toBe(0);
      expect(steps).toBeLessThan(50);
    },
  );
});

/**
 * FRONTIER GATE: EFFECT_COUNTER/EFFECT_MIRROR_COAT's real committed scripts
 * (`BattleScript_EffectCounter`/`BattleScript_EffectMirrorCoat` --
 * attackcanceler, counter/mirrorcoatdamagecalculator, accuracycheck,
 * attackstring, ppreduce, typecalc2, adjustsetdamage, goto
 * BattleScript_HitFromAtkAnimation) now run end to end through this
 * session's new opcodes, landing in the same generic hit-chain tail every
 * other EFFECT_HIT-family move already proves reachable. `protectPhysicalDmg`/
 * `protectSpecialDmg` are seeded directly here (proven as a real write-through
 * of `Cmd_datahpupdate` by the datahpupdate describe block above) --
 * matching the committed ledger `Cmd_counterdamagecalculator`/
 * `Cmd_mirrorcoatdamagecalculator` themselves read, mid-turn, from an
 * earlier action's hit. Ground truth pinned live this session (`bin/oracle
 * lab tools/battle-lab/mechanic-fixed-damage-{counter,mirrorcoat}-{hit,fail}.json`,
 * docs/counter-retaliation-design.md §4 step 7): Electrode (opponent) vs
 * Shuckle (player) at Level 50, Pound/Water Gun then Counter/Mirror Coat.
 */
describe("EFFECT_COUNTER / EFFECT_MIRROR_COAT: full committed script, live-oracle-pinned ground truth", () => {
  it(
    "Counter success: reaches BattleScript_HitFromAtkAnimation with gBattleMoveDamage 4 "
      + "(live oracle: Electrode's Pound dealt 2 to Shuckle, Shuckle's Counter dealt 4 back)",
    () => {
      const rc = context(0, { protectPhysicalDmg: 2, protectPhysicalBattlerId: 1 }, { currentMove: COUNTER }, { hp: 100 });
      const { result, steps } = runUntilLabel("BattleScript_EffectCounter", "BattleScript_HitFromAtkAnimation", rc);
      expect(result.kind).toBe("advanced");
      if (result.kind !== "advanced") throw new Error("expected advance");
      expect(result.state.programCounter).toBe(labelPc("BattleScript_HitFromAtkAnimation"));
      expect(result.state.rulesContext.battleMoveDamage).toBe(4);
      expect(result.state.rulesContext.selectorRoles.target).toBe(1);
      expect(steps).toBeLessThan(50);
    },
  );

  it(
    "Counter fail: no physical hit recorded this turn -- jumps straight to BattleScript_FailedFromAtkString "
      + "(live oracle: Electrode's Growl is a status move, no HP change either side)",
    () => {
      const rc = context(0, {}, { currentMove: COUNTER }, { hp: 100 });
      const { result, steps } = runUntilLabel("BattleScript_EffectCounter", "BattleScript_FailedFromAtkString", rc);
      expect(result.kind).toBe("advanced");
      if (result.kind !== "advanced") throw new Error("expected advance");
      expect(result.state.programCounter).toBe(labelPc("BattleScript_FailedFromAtkString"));
      expect(result.state.rulesContext.battleMoveDamage).toBe(0);
      expect(steps).toBeLessThan(50);
    },
  );

  it(
    "Mirror Coat success: reaches BattleScript_HitFromAtkAnimation with gBattleMoveDamage 32 "
      + "(live oracle: Electrode's Water Gun dealt 16 to Shuckle, Shuckle's Mirror Coat dealt 32 back)",
    () => {
      const rc = context(0, { protectSpecialDmg: 16, protectSpecialBattlerId: 1 }, { currentMove: MIRROR_COAT }, { hp: 100 });
      const { result, steps } = runUntilLabel("BattleScript_EffectMirrorCoat", "BattleScript_HitFromAtkAnimation", rc);
      expect(result.kind).toBe("advanced");
      if (result.kind !== "advanced") throw new Error("expected advance");
      expect(result.state.programCounter).toBe(labelPc("BattleScript_HitFromAtkAnimation"));
      expect(result.state.rulesContext.battleMoveDamage).toBe(32);
      expect(result.state.rulesContext.selectorRoles.target).toBe(1);
      expect(steps).toBeLessThan(50);
    },
  );

  it(
    "Mirror Coat fail: no special hit recorded this turn -- jumps straight to BattleScript_FailedFromAtkString "
      + "(live oracle: Electrode's Growl is a status move, no HP change either side)",
    () => {
      const rc = context(0, {}, { currentMove: MIRROR_COAT }, { hp: 100 });
      const { result, steps } = runUntilLabel("BattleScript_EffectMirrorCoat", "BattleScript_FailedFromAtkString", rc);
      expect(result.kind).toBe("advanced");
      if (result.kind !== "advanced") throw new Error("expected advance");
      expect(result.state.programCounter).toBe(labelPc("BattleScript_FailedFromAtkString"));
      expect(result.state.rulesContext.battleMoveDamage).toBe(0);
      expect(steps).toBeLessThan(50);
    },
  );
});

/**
 * The RUNG-3 middle of the hit chain, all already-generic wait opcodes
 * (waitanimation/waitstate/waitmessage) interleaved per
 * data/battle_scripts_1.s:253-265.
 */
const RUNG_3_LABELS = [
  "attackanimation",
  "waitanimation",
  "effectivenesssound",
  "hitanimation",
  "waitstate",
  "healthbarupdate",
  "datahpupdate",
  "critmessage",
  "waitmessage",
  "resultmessage",
  "waitmessage",
];

describe("production attackanimation (Cmd_attackanimation) dispatch", () => {
  it("registers B_SCR_OP_ATTACKANIMATION", () => {
    expect(program.instructions.find((i) => i.opcodeName === "B_SCR_OP_ATTACKANIMATION")).toBeDefined();
  });

  it("blocks on a busy controller", () => {
    const rc = context(0, {}, { battleMoveDamage: 2 });
    const ports = externalPorts({ isControllerIdle: () => false });
    const { result } = stepAtOpcode("B_SCR_OP_ATTACKANIMATION", rc, 1, ports);
    expect(result.kind).toBe("blocked");
  });

  it("emits a MOVE_ANIMATION event for the attacker and marks the controller pending", () => {
    const rc = context(0, { friendship: 200 }, { battleMoveDamage: 2, multiHitCounter: 0 });
    const { result } = stepAtOpcode("B_SCR_OP_ATTACKANIMATION", rc);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    const event = result.state.events[0];
    expect(event).toMatchObject({
      kind: "animation",
      animationId: "MOVE_ANIMATION",
      battler: 0,
      arguments: [String(TACKLE), "0", "35", "2", "200", "0"], // animTurn arg is pre-increment (source emits, then increments)
    });
    expect(result.state.scheduler.pendingControllerBattlers).toContain(0);
    expect(result.state.rulesContext.animTurn).toBe(1);
  });

  it("MOVE_RESULT_NO_EFFECT: pauses via BattleScript_Pausex20 without emitting an animation", () => {
    const rc = context(0, {}, { moveResultFlags: 1 << 3 });
    const { result } = stepAtOpcode("B_SCR_OP_ATTACKANIMATION", rc);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.events.length).toBe(0);
    expect(result.state.programCounter).toBe(labelPc("BattleScript_Pausex20"));
    expect(result.state.callStack.length).toBe(1);
  });

  it("HITMARKER_NO_ANIMATIONS: pauses via BattleScript_Pausex20 and still increments animTurn/animTargetsHit", () => {
    const rc = context(0, {}, { hitMarker: 1 << 7 });
    const { result } = stepAtOpcode("B_SCR_OP_ATTACKANIMATION", rc);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.programCounter).toBe(labelPc("BattleScript_Pausex20"));
    expect(result.state.rulesContext.animTurn).toBe(1);
    expect(result.state.rulesContext.animTargetsHit).toBe(1);
    expect(result.state.events.length).toBe(0);
  });
});

describe("production effectivenesssound (Cmd_effectivenesssound) dispatch", () => {
  it("registers B_SCR_OP_EFFECTIVENESSSOUND", () => {
    expect(program.instructions.find((i) => i.opcodeName === "B_SCR_OP_EFFECTIVENESSSOUND")).toBeDefined();
  });

  it("super effective: emits play-se(SE_SUPER_EFFECTIVE) for the target", () => {
    const rc = context(0, {}, { moveResultFlags: 1 << 1 });
    const { result } = stepAtOpcode("B_SCR_OP_EFFECTIVENESSSOUND", rc);
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.events[0]).toMatchObject({ kind: "play-se", battler: 1, songId: 14 });
  });

  it("not very effective: emits play-se(SE_NOT_EFFECTIVE)", () => {
    const rc = context(0, {}, { moveResultFlags: 1 << 2 });
    const { result } = stepAtOpcode("B_SCR_OP_EFFECTIVENESSSOUND", rc);
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.events[0]).toMatchObject({ kind: "play-se", songId: 12 });
  });

  it("neutral hit: emits play-se(SE_EFFECTIVE)", () => {
    const rc = context(0, {}, { moveResultFlags: 0 });
    const { result } = stepAtOpcode("B_SCR_OP_EFFECTIVENESSSOUND", rc);
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.events[0]).toMatchObject({ kind: "play-se", songId: 13 });
  });

  it("doesn't-affect-foe: no sound", () => {
    const rc = context(0, {}, { moveResultFlags: 1 << 3 });
    const { result } = stepAtOpcode("B_SCR_OP_EFFECTIVENESSSOUND", rc);
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.events.length).toBe(0);
  });

  it("missed: no sound", () => {
    const rc = context(0, {}, { moveResultFlags: 1 });
    const { result } = stepAtOpcode("B_SCR_OP_EFFECTIVENESSSOUND", rc);
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.events.length).toBe(0);
  });
});

describe("production hitanimation (Cmd_hitanimation) dispatch", () => {
  it("registers B_SCR_OP_HITANIMATION", () => {
    expect(program.instructions.find((i) => i.opcodeName === "B_SCR_OP_HITANIMATION")).toBeDefined();
  });

  it("emits an animation event for the target and marks it pending", () => {
    const rc = context(0);
    const { result } = stepAtOpcode("B_SCR_OP_HITANIMATION", rc);
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.events[0]).toMatchObject({ kind: "animation", animationId: "HIT_ANIMATION", battler: 1 });
    expect(result.state.scheduler.pendingControllerBattlers).toContain(1);
  });

  it("MOVE_RESULT_NO_EFFECT: no animation", () => {
    const rc = context(0, {}, { moveResultFlags: 1 << 3 });
    const { result } = stepAtOpcode("B_SCR_OP_HITANIMATION", rc);
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.events.length).toBe(0);
  });

  it("substitute active + HITMARKER_IGNORE_SUBSTITUTE: suppressed, no animation", () => {
    const rc = context(0, {}, { hitMarker: 1 << 8 }, { status2: 1 << 24, substituteHP: 10 });
    const { result } = stepAtOpcode("B_SCR_OP_HITANIMATION", rc);
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.events.length).toBe(0);
  });

  it("substitute active WITHOUT HITMARKER_IGNORE_SUBSTITUTE: still animates", () => {
    const rc = context(0, {}, {}, { status2: 1 << 24, substituteHP: 10 });
    const { result } = stepAtOpcode("B_SCR_OP_HITANIMATION", rc);
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.events.length).toBe(1);
  });
});

describe("production healthbarupdate (Cmd_healthbarupdate) dispatch", () => {
  it("registers B_SCR_OP_HEALTHBARUPDATE", () => {
    expect(program.instructions.find((i) => i.opcodeName === "B_SCR_OP_HEALTHBARUPDATE")).toBeDefined();
  });

  it("emits health-bar-update with the raw damage value", () => {
    const rc = context(0, {}, { battleMoveDamage: 50 });
    const { result } = stepAtOpcode("B_SCR_OP_HEALTHBARUPDATE", rc);
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.events[0]).toMatchObject({ kind: "health-bar-update", battler: 1, healthValue: 50 });
  });

  it("clamps huge damage to 10000", () => {
    const rc = context(0, {}, { battleMoveDamage: 99999 });
    const { result } = stepAtOpcode("B_SCR_OP_HEALTHBARUPDATE", rc);
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.events[0]).toMatchObject({ healthValue: 10000 });
  });

  it("MOVE_RESULT_NO_EFFECT: no event", () => {
    const rc = context(0, {}, { moveResultFlags: 1 << 3, battleMoveDamage: 50 });
    const { result } = stepAtOpcode("B_SCR_OP_HEALTHBARUPDATE", rc);
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.events.length).toBe(0);
  });

  it("substitute active: prints STRINGID_SUBSTITUTEDAMAGED instead of a bar update", () => {
    const rc = context(0, {}, { battleMoveDamage: 50 }, { status2: 1 << 24, substituteHP: 10 });
    const { result } = stepAtOpcode("B_SCR_OP_HEALTHBARUPDATE", rc);
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.events[0]).toMatchObject({ kind: "message", messageId: "STRINGID_SUBSTITUTEDAMAGED" });
  });
});

describe("production datahpupdate (Cmd_datahpupdate) dispatch -- the rung's real HP mutation", () => {
  it("registers B_SCR_OP_DATAHPUPDATE", () => {
    expect(program.instructions.find((i) => i.opcodeName === "B_SCR_OP_DATAHPUPDATE")).toBeDefined();
  });

  it("non-killing hit: exact HP delta, hp-change event, physical-damage bookkeeping (scenario 1's 136 -> 122)", () => {
    const rc = context(0, {}, { battleMoveDamage: 14 }, { hp: 136 });
    const { result } = stepAtOpcode("B_SCR_OP_DATAHPUPDATE", rc);
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battlers[1]!.hp).toBe(122);
    expect(result.state.rulesContext.hpDealt).toBe(14);
    expect(result.state.events[0]).toMatchObject({ kind: "hp-change", battler: 1, from: 136, to: 122 });
    expect(result.state.rulesContext.battlers[1]!.specialStatus.physicalDmg).toBe(14); // TACKLE is NORMAL: physical
    expect(result.state.rulesContext.battlers[1]!.protectPhysicalDmg).toBe(14); // ProtectStruct's parallel copy (Counter's own input)
    expect(result.state.rulesContext.battlers[1]!.protectPhysicalBattlerId).toBe(0); // gBattlerAttacker
    expect(result.state.rulesContext.battlers[1]!.protectSpecialDmg).toBe(0);
    expect(result.state.scheduler.pendingControllerBattlers).toContain(1);
  });

  it("special-type hit also writes protectSpecialDmg/protectSpecialBattlerId, not the physical pair (Mirror Coat's own input)", () => {
    const rc = context(0, {}, { battleMoveDamage: 14, currentMove: PSYWAVE }, { hp: 136 });
    const { result } = stepAtOpcode("B_SCR_OP_DATAHPUPDATE", rc);
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battlers[1]!.specialStatus.specialDmg).toBe(14);
    expect(result.state.rulesContext.battlers[1]!.protectSpecialDmg).toBe(14);
    expect(result.state.rulesContext.battlers[1]!.protectSpecialBattlerId).toBe(0); // gBattlerAttacker
    expect(result.state.rulesContext.battlers[1]!.protectPhysicalDmg).toBe(0);
  });

  it("killing hit: HP clamps to 0, hpDealt is the remaining HP not the full damage (KO scenario's 90 -> 0)", () => {
    const rc = context(0, {}, { battleMoveDamage: 204 }, { hp: 90 });
    const { result } = stepAtOpcode("B_SCR_OP_DATAHPUPDATE", rc);
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battlers[1]!.hp).toBe(0);
    expect(result.state.rulesContext.hpDealt).toBe(90);
  });

  it("write-through: also writes the matching party slot at the active battler's partyIndex (docs/faint-outcome-ground-truth.md §3.2 sync point)", () => {
    const rc = context(
      0,
      {},
      {
        battleMoveDamage: 204,
        party: {
          opponent: [
            { species: 0, hp: 0 },
            { species: 0, hp: 0 },
            { species: 191, hp: 90 },
            { species: 0, hp: 0 },
            { species: 0, hp: 0 },
            { species: 0, hp: 0 },
          ],
        },
      },
      { hp: 90, partyIndex: 2 },
    );
    const { result } = stepAtOpcode("B_SCR_OP_DATAHPUPDATE", rc);
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battlers[1]!.hp).toBe(0);
    expect(result.state.rulesContext.party.opponent[2]).toMatchObject({ species: 191, hp: 0 });
    expect(result.state.rulesContext.party.opponent[0]).toMatchObject({ hp: 0 });
    expect(result.state.rulesContext.party.player).toEqual(rc.party.player);
  });

  it("write-through: non-killing hit lands the exact delta in the party slot too (136 -> 122)", () => {
    const rc = context(
      0,
      {},
      {
        battleMoveDamage: 14,
        party: {
          opponent: [
            { species: 0, hp: 0 },
            { species: 261, hp: 136 },
            { species: 0, hp: 0 },
            { species: 0, hp: 0 },
            { species: 0, hp: 0 },
            { species: 0, hp: 0 },
          ],
        },
      },
      { hp: 136, partyIndex: 1 },
    );
    const { result } = stepAtOpcode("B_SCR_OP_DATAHPUPDATE", rc);
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battlers[1]!.hp).toBe(122);
    expect(result.state.rulesContext.party.opponent[1]).toMatchObject({ species: 261, hp: 122 });
  });

  it("MOVE_RESULT_NO_EFFECT: hp untouched, no event", () => {
    const rc = context(0, {}, { moveResultFlags: 1 << 3, battleMoveDamage: 50 }, { hp: 100 });
    const { result } = stepAtOpcode("B_SCR_OP_DATAHPUPDATE", rc);
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battlers[1]!.hp).toBe(100);
    expect(result.state.events.length).toBe(0);
  });

  it("substitute active, survives: damages the substitute instead of real HP", () => {
    const rc = context(0, {}, { battleMoveDamage: 14 }, { hp: 100, status2: 1 << 24, substituteHP: 50 });
    const { result } = stepAtOpcode("B_SCR_OP_DATAHPUPDATE", rc);
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battlers[1]!.hp).toBe(100);
    expect(result.state.rulesContext.battlers[1]!.substituteHP).toBe(36);
    expect(result.state.rulesContext.hpDealt).toBe(14);
    expect(result.state.events.length).toBe(0);
  });

  describe("(b) unsupported-branch barriers", () => {
    it("halts when the substitute would fade (BattleScript_SubstituteFade cutscene unmodeled)", () => {
      const rc = context(0, {}, { battleMoveDamage: 50 }, { hp: 100, status2: 1 << 24, substituteHP: 30 });
      const { result } = stepAtOpcode("B_SCR_OP_DATAHPUPDATE", rc);
      expect(result.kind).toBe("halted");
      expect(result.state.haltReason).toMatchObject({ kind: "unsupported-branch", sourceLine: 1889 });
    });

  });

  describe("negative damage is HP gain (Ingrain/Leech Seed's own end-turn heals -- docs/ingrain-leechseed-wrap-ground-truth.md §2a/§2b)", () => {
    it("heals, clamped at maxHP, with none of the positive branch's bide/shellBell/physical-special bookkeeping", () => {
      const rc = context(0, {}, { battleMoveDamage: -10, hitMarker: 1 << 20 }, { hp: 50, maxHP: 55 });
      const { result } = stepAtOpcode("B_SCR_OP_DATAHPUPDATE", rc);
      if (result.kind !== "advanced") throw new Error("expected advance");
      expect(result.state.rulesContext.battlers[1]!.hp).toBe(55); // 50 + 10 = 60, capped at maxHP 55
      expect(result.state.rulesContext.hitMarker & (1 << 20)).toBe(0); // HITMARKER_PASSIVE_HP_UPDATE cleared either way
      expect(result.state.rulesContext.hpDealt).toBe(0); // unlike the positive branch, gHpDealt is left untouched
      expect(result.state.events.length).toBe(1);
      expect(result.state.events[0]).toMatchObject({ kind: "hp-change", battler: 1, from: 50, to: 55 });
    });

    it("does not overheal past maxHP even far below it", () => {
      const rc = context(0, {}, { battleMoveDamage: -10 }, { hp: 100, maxHP: 161 });
      const { result } = stepAtOpcode("B_SCR_OP_DATAHPUPDATE", rc);
      if (result.kind !== "advanced") throw new Error("expected advance");
      expect(result.state.rulesContext.battlers[1]!.hp).toBe(110);
    });
  });
});

describe("production critmessage (Cmd_critmessage) dispatch", () => {
  it("registers B_SCR_OP_CRITMESSAGE", () => {
    expect(program.instructions.find((i) => i.opcodeName === "B_SCR_OP_CRITMESSAGE")).toBeDefined();
  });

  it("crit + not no-effect: emits STRINGID_CRITICALHIT", () => {
    const rc = context(0, {}, { critMultiplier: 2 });
    const { result } = stepAtOpcode("B_SCR_OP_CRITMESSAGE", rc);
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.events[0]).toMatchObject({ kind: "message", messageId: "STRINGID_CRITICALHIT" });
    expect(result.state.scheduler.messageDisplayActive).toBe(true);
  });

  it("crit but MOVE_RESULT_NO_EFFECT: no message", () => {
    const rc = context(0, {}, { critMultiplier: 2, moveResultFlags: 1 << 3 });
    const { result } = stepAtOpcode("B_SCR_OP_CRITMESSAGE", rc);
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.events.length).toBe(0);
  });

  it("not a crit: no message", () => {
    const rc = context(0, {}, { critMultiplier: 1 });
    const { result } = stepAtOpcode("B_SCR_OP_CRITMESSAGE", rc);
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.events.length).toBe(0);
  });

  it("blocks on a busy controller", () => {
    const rc = context(0, {}, { critMultiplier: 2 });
    const ports = externalPorts({ isControllerIdle: () => false });
    const { result } = stepAtOpcode("B_SCR_OP_CRITMESSAGE", rc, 1, ports);
    expect(result.kind).toBe("blocked");
  });
});

describe("production resultmessage (Cmd_resultmessage) dispatch", () => {
  it("registers B_SCR_OP_RESULTMESSAGE", () => {
    expect(program.instructions.find((i) => i.opcodeName === "B_SCR_OP_RESULTMESSAGE")).toBeDefined();
  });

  it("miss: emits the gMissStringIds entry for the missType", () => {
    const rc = context(0, {}, { moveResultFlags: 1, missType: 1 /* B_MSG_PROTECTED */ });
    const { result } = stepAtOpcode("B_SCR_OP_RESULTMESSAGE", rc);
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.events[0]).toMatchObject({ kind: "message", messageId: "STRINGID_PKMNPROTECTEDITSELF" });
  });

  it("super effective: emits STRINGID_SUPEREFFECTIVE", () => {
    const rc = context(0, {}, { moveResultFlags: 1 << 1 });
    const { result } = stepAtOpcode("B_SCR_OP_RESULTMESSAGE", rc);
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.events[0]).toMatchObject({ kind: "message", messageId: "STRINGID_SUPEREFFECTIVE" });
  });

  it("no flags at all: no message, messageDisplayActive cleared", () => {
    const rc = context(0, {}, { moveResultFlags: 0 });
    const { result } = stepAtOpcode("B_SCR_OP_RESULTMESSAGE", rc);
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.events.length).toBe(0);
    expect(result.state.scheduler.messageDisplayActive).toBe(false);
  });

  it("FOE_ENDURED alone: exact-match case prints STRINGID_PKMNENDUREDHIT directly, no jump", () => {
    const rc = context(0, {}, { moveResultFlags: 1 << 6 });
    const { result } = stepAtOpcode("B_SCR_OP_RESULTMESSAGE", rc);
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.events[0]).toMatchObject({ kind: "message", messageId: "STRINGID_PKMNENDUREDHIT" });
  });

  it("FOE_ENDURED combined with SUPER_EFFECTIVE: jumps (call-current) to BattleScript_EnduredMsg, clearing only ENDURED/HUNG_ON", () => {
    const rc = context(0, {}, { moveResultFlags: (1 << 1) | (1 << 6) });
    const { result } = stepAtOpcode("B_SCR_OP_RESULTMESSAGE", rc);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.programCounter).toBe(labelPc("BattleScript_EnduredMsg"));
    expect(result.state.rulesContext.moveResultFlags).toBe(1 << 1); // SUPER_EFFECTIVE survives the clear
    expect(result.state.callStack.length).toBe(1);
  });

  it("MOVE_RESULT_ONE_HIT_KO alone: exact-match case prints STRINGID_ONEHITKO directly, no jump (EFFECT_OHKO registration -- this case is real now, not a barrier)", () => {
    const rc = context(0, {}, { moveResultFlags: 1 << 4 });
    const { result } = stepAtOpcode("B_SCR_OP_RESULTMESSAGE", rc);
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.events[0]).toMatchObject({ kind: "message", messageId: "STRINGID_ONEHITKO" });
  });

  it("MOVE_RESULT_ONE_HIT_KO combined with SUPER_EFFECTIVE: jumps (call-current) to BattleScript_OneHitKOMsg, clearing ONE_HIT_KO/SUPER_EFFECTIVE/NOT_VERY_EFFECTIVE", () => {
    const rc = context(0, {}, { moveResultFlags: (1 << 1) | (1 << 4) });
    const { result } = stepAtOpcode("B_SCR_OP_RESULTMESSAGE", rc);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.programCounter).toBe(labelPc("BattleScript_OneHitKOMsg"));
    expect(result.state.rulesContext.moveResultFlags).toBe(0);
    expect(result.state.callStack.length).toBe(1);
  });

  describe("Focus Band result-message consumption", () => {
    it("records the target item, clears survival flags, and call-current jumps to the hang-on script", () => {
      const rc = context(
        0,
        {},
        { moveResultFlags: 1 << 7, lastUsedItem: 77 },
        { item: HOLD_EFFECT_ITEM_FOCUS_BAND },
      );
      const { execution, result } = stepAtOpcode("B_SCR_OP_RESULTMESSAGE", rc);
      expect(result.kind).toBe("advanced");
      expect(result.state.programCounter).toBe(labelPc("BattleScript_FocusBandActivates"));
      expect(result.state.rulesContext.moveResultFlags).toBe(0);
      expect(result.state.rulesContext.lastUsedItem).toBe(HOLD_EFFECT_ITEM_FOCUS_BAND);
      expect(result.state.callStack.length).toBe(1);

      const animation = stepBattleScriptMachine(program, result.state, execution.handlers);
      expect(animation.kind).toBe("advanced");
      const printed = stepBattleScriptMachine(program, animation.state, execution.handlers);
      expect(printed.kind).toBe("advanced");
      expect(printed.state.events.at(-1)).toMatchObject({
        kind: "message",
        messageId: "STRINGID_PKMNHUNGONWITHX",
      });
      expect(printed.state.rulesContext.lastUsedItem).toBe(HOLD_EFFECT_ITEM_FOCUS_BAND);
    });
  });
});

const MOVE_EFFECT_CERTAIN = 1 << 7;
const MUD_SLAP = 189; // EFFECT_ACCURACY_DOWN_HIT, secondaryEffectChance 100 -- guarantees the chance-roll succeeds regardless of the actual u16.
const BODY_SLAM = 34; // EFFECT_PARALYZE_HIT, secondaryEffectChance 30 -- certain === (percentChance >= 100) is FALSE for this move.
const MOVE_EFFECT_POISON = 2;
const MOVE_EFFECT_BURN = 3;
const MOVE_EFFECT_FREEZE = 4;
const MOVE_EFFECT_PARALYSIS = 5;
const MOVE_EFFECT_SLEEP = 1;
const MOVE_EFFECT_TOXIC = 6;
const MOVE_EFFECT_CONFUSION = 7;
const MOVE_EFFECT_FLINCH = 8;
const MOVE_EFFECT_TRI_ATTACK = 9;
const MOVE_EFFECT_UPROAR = 10;
const MOVE_EFFECT_RECHARGE = 29;
const MOVE_EFFECT_RAGE = 30;
const MOVE_EFFECT_ALL_STATS_UP = 34;
const MOVE_EFFECT_REMOVE_PARALYSIS = 36;
const MOVE_EFFECT_ATK_DEF_DOWN = 37;
const MOVE_EFFECT_RECOIL_25 = 14;
const MOVE_EFFECT_RECOIL_33 = 38;
const MOVE_EFFECT_SP_ATK_TWO_DOWN = 59;
const MOVE_EFFECT_AFFECTS_USER = 1 << 6;
const STATUS2_RAGE = 1 << 23;
const STATUS1_POISON = 1 << 3;
const STATUS1_BURN_BIT = 1 << 4;
const STATUS1_FREEZE_BIT = 1 << 5;
const STATUS1_PARALYSIS_BIT = 1 << 6;
const ABILITY_LIMBER = 7;
const ABILITY_IMMUNITY = 17;
const ABILITY_SHIELD_DUST = 19;
const ABILITY_MAGMA_ARMOR = 40;
const ABILITY_ROCK_HEAD = 69;
const ABILITY_WATER_VEIL = 41;
const HITMARKER_STATUS_ABILITY_EFFECT = 1 << 13;
const B_MSG_STATUSED = 0;
const B_MSG_STATUSED_BY_ABILITY = 1;
const B_MSG_ABILITY_PREVENTS_MOVE_STATUS = 0;
const B_MSG_ABILITY_PREVENTS_ABILITY_STATUS = 1;
const B_MSG_STATUS_HAD_NO_EFFECT = 2;

describe("production seteffectwithchance (Cmd_seteffectwithchance) dispatch", () => {
  it("registers B_SCR_OP_SETEFFECTWITHCHANCE", () => {
    expect(program.instructions.find((i) => i.opcodeName === "B_SCR_OP_SETEFFECTWITHCHANCE")).toBeDefined();
  });

  it("plain EFFECT_HIT move (moveEffectByte 0, secondaryEffectChance 0): consumes exactly one roll and passes through", () => {
    const rc = context(0);
    const { result } = stepAtOpcode("B_SCR_OP_SETEFFECTWITHCHANCE", rc);
    if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
    expect(result.state.rng.calls).toBe(1);
    expect(result.state.rng.ledger[0]!.reason).toBe("seteffectwithchance");
    expect(result.state.rulesContext.moveEffectByte).toBe(0);
    expect(result.state.rulesContext.multiHitEffect).toBe(0);
  });

  it("MOVE_EFFECT_CERTAIN alone (effect byte 0 once the CERTAIN bit is stripped): no barrier, passes through -- sStatusFlagsForMoveEffects[0] matches no switch case in real source", () => {
    const rc = context(0, {}, { moveEffectByte: MOVE_EFFECT_CERTAIN });
    const { result } = stepAtOpcode("B_SCR_OP_SETEFFECTWITHCHANCE", rc);
    if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
    expect(result.state.rulesContext.moveEffectByte).toBe(0);
    expect(result.state.rulesContext.battlers[1]!.status1).toBe(0);
  });

  it("MOVE_EFFECT_CERTAIN but MOVE_RESULT_NO_EFFECT set: no barrier, passes through untouched", () => {
    const rc = context(0, {}, { moveEffectByte: MOVE_EFFECT_CERTAIN, moveResultFlags: 1 << 3 });
    const { result } = stepAtOpcode("B_SCR_OP_SETEFFECTWITHCHANCE", rc);
    if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
    expect(result.state.rulesContext.moveEffectByte).toBe(0);
  });

  it("chance roll succeeds but moveEffectByte is 0: no barrier, still consumes the roll and passes through", () => {
    const rc = context(0, {}, { currentMove: MUD_SLAP, moveEffectByte: 0 });
    const { result } = stepAtOpcode("B_SCR_OP_SETEFFECTWITHCHANCE", rc);
    if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
    expect(result.state.rng.calls).toBe(1);
  });

  describe("SetMoveEffect status-write quartet (registered)", () => {
    it("POISON: certain-bit dispatch statuses the target, calls BattleScript_MoveEffectPoison, zero extra RNG, party slot synced", () => {
      const rc = context(0, {}, { moveEffectByte: MOVE_EFFECT_POISON | MOVE_EFFECT_CERTAIN });
      const { result } = stepAtOpcode("B_SCR_OP_SETEFFECTWITHCHANCE", rc);
      if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
      expect(result.state.programCounter).toBe(labelPc("BattleScript_MoveEffectPoison"));
      expect(result.state.callStack.length).toBe(1);
      expect(result.state.rng.calls).toBe(0);
      expect(result.state.rulesContext.battlers[1]!.status1).toBe(STATUS1_POISON);
      expect(result.state.rulesContext.party.opponent[0]!.status1).toBe(STATUS1_POISON);
      expect(result.state.rulesContext.multistringChooser).toBe(B_MSG_STATUSED);
      expect(result.state.rulesContext.selectorRoles.effectBattler).toBe(1);
      expect(result.state.events).toEqual([
        expect.objectContaining({ kind: "set-battler-status-data", battler: 1, status1: STATUS1_POISON }),
      ]);
    });

    it("BURN: certain-bit dispatch statuses the target and calls BattleScript_MoveEffectBurn", () => {
      const rc = context(0, {}, { moveEffectByte: MOVE_EFFECT_BURN | MOVE_EFFECT_CERTAIN });
      const { result } = stepAtOpcode("B_SCR_OP_SETEFFECTWITHCHANCE", rc);
      if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
      expect(result.state.programCounter).toBe(labelPc("BattleScript_MoveEffectBurn"));
      expect(result.state.rulesContext.battlers[1]!.status1).toBe(STATUS1_BURN_BIT);
      expect(result.state.rulesContext.party.opponent[0]!.status1).toBe(STATUS1_BURN_BIT);
    });

    it("FREEZE: certain-bit dispatch statuses the target and calls BattleScript_MoveEffectFreeze (no weather set)", () => {
      const rc = context(0, {}, { moveEffectByte: MOVE_EFFECT_FREEZE | MOVE_EFFECT_CERTAIN });
      const { result } = stepAtOpcode("B_SCR_OP_SETEFFECTWITHCHANCE", rc);
      if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
      expect(result.state.programCounter).toBe(labelPc("BattleScript_MoveEffectFreeze"));
      expect(result.state.rulesContext.battlers[1]!.status1).toBe(STATUS1_FREEZE_BIT);
    });

    it("SLEEP: landing on a Rollout-locked target cancels the lock and its timer", () => {
      const rc = context(
        0,
        {},
        { moveEffectByte: MOVE_EFFECT_SLEEP | MOVE_EFFECT_CERTAIN },
        { status2: 0x1000, rolloutTimer: 3 },
      );
      const { result } = stepAtOpcode("B_SCR_OP_SETEFFECTWITHCHANCE", rc);
      if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
      expect(result.state.rulesContext.battlers[1]).toMatchObject({
        status2: 0,
        rolloutTimer: 0,
      });
    });

    it("SLEEP: a target with no multi-turn lock preserves unrelated status2/status3 state", () => {
      const rc = context(
        0,
        {},
        { moveEffectByte: MOVE_EFFECT_SLEEP | MOVE_EFFECT_CERTAIN },
        { status2: 0x8000_0001, status3: 0x20 },
      );
      const { result } = stepAtOpcode("B_SCR_OP_SETEFFECTWITHCHANCE", rc);
      if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
      expect(result.state.rulesContext.battlers[1]).toMatchObject({
        status2: 0x8000_0001,
        status3: 0x20,
        rolloutTimer: 0,
        furyCutterCounter: 0,
      });
    });

    it("FREEZE: sun weather blocks the freeze (WEATHER_HAS_EFFECT && B_WEATHER_SUN)", () => {
      const B_WEATHER_SUN = (1 << 5) | (1 << 6);
      const rc = context(0, {}, { moveEffectByte: MOVE_EFFECT_FREEZE | MOVE_EFFECT_CERTAIN, weather: B_WEATHER_SUN });
      const { result } = stepAtOpcode("B_SCR_OP_SETEFFECTWITHCHANCE", rc);
      if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
      expect(result.state.programCounter).not.toBe(labelPc("BattleScript_MoveEffectFreeze"));
      expect(result.state.rulesContext.battlers[1]!.status1).toBe(0);
    });

    it("PARALYSIS: certain-bit dispatch statuses the target and calls BattleScript_MoveEffectParalysis", () => {
      const rc = context(0, {}, { moveEffectByte: MOVE_EFFECT_PARALYSIS | MOVE_EFFECT_CERTAIN });
      const { result } = stepAtOpcode("B_SCR_OP_SETEFFECTWITHCHANCE", rc);
      if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
      expect(result.state.programCounter).toBe(labelPc("BattleScript_MoveEffectParalysis"));
      expect(result.state.rulesContext.battlers[1]!.status1).toBe(STATUS1_PARALYSIS_BIT);
    });

    it("chance-roll dispatch site (100%-chance move) also reaches applySetMoveEffect and consumes exactly one RNG call", () => {
      const rc = context(0, {}, { currentMove: MUD_SLAP, moveEffectByte: MOVE_EFFECT_PARALYSIS });
      const { result } = stepAtOpcode("B_SCR_OP_SETEFFECTWITHCHANCE", rc);
      if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
      expect(result.state.programCounter).toBe(labelPc("BattleScript_MoveEffectParalysis"));
      expect(result.state.rng.calls).toBe(1);
      expect(result.state.rulesContext.battlers[1]!.status1).toBe(STATUS1_PARALYSIS_BIT);
    });

    it("already statused: no-op pass-through, status1 unchanged", () => {
      const rc = context(0, {}, { moveEffectByte: MOVE_EFFECT_PARALYSIS | MOVE_EFFECT_CERTAIN }, { status1: STATUS1_BURN_BIT });
      const { result } = stepAtOpcode("B_SCR_OP_SETEFFECTWITHCHANCE", rc);
      if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
      expect(result.state.rulesContext.battlers[1]!.status1).toBe(STATUS1_BURN_BIT);
      expect(result.state.events).toEqual([]);
    });

    it("Poison-type target: silently immune, no message, no status (Gen 3 secondary-effect quirk)", () => {
      const rc = context(0, {}, { moveEffectByte: MOVE_EFFECT_POISON | MOVE_EFFECT_CERTAIN }, { types: ["TYPE_POISON", "TYPE_POISON"] });
      const { result } = stepAtOpcode("B_SCR_OP_SETEFFECTWITHCHANCE", rc);
      if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
      expect(result.state.rulesContext.battlers[1]!.status1).toBe(0);
      expect(result.state.events).toEqual([]);
    });

    it("Immunity ability, certain: BattleScript_PSNPrevention call, ability-prevents message, hitMarker's ability-effect bit cleared", () => {
      const rc = context(
        0,
        {},
        { moveEffectByte: MOVE_EFFECT_POISON | MOVE_EFFECT_CERTAIN, hitMarker: HITMARKER_STATUS_ABILITY_EFFECT },
        { ability: ABILITY_IMMUNITY },
      );
      const { result } = stepAtOpcode("B_SCR_OP_SETEFFECTWITHCHANCE", rc);
      if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
      expect(result.state.programCounter).toBe(labelPc("BattleScript_PSNPrevention"));
      expect(result.state.rulesContext.battlers[1]!.status1).toBe(0);
      expect(result.state.rulesContext.multistringChooser).toBe(B_MSG_ABILITY_PREVENTS_ABILITY_STATUS);
      expect(result.state.rulesContext.hitMarker & HITMARKER_STATUS_ABILITY_EFFECT).toBe(0);
      expect(result.state.rulesContext.lastUsedAbility).toBe(ABILITY_IMMUNITY);
      expect(result.state.rulesContext.aiObservedAbilityIds[1]).toBe(ABILITY_IMMUNITY);
    });

    it("Immunity ability, certain, no ability-effect hitmarker: ability-prevents-move-status message", () => {
      const rc = context(
        0,
        {},
        { moveEffectByte: MOVE_EFFECT_POISON | MOVE_EFFECT_CERTAIN },
        { ability: ABILITY_IMMUNITY },
      );
      const { result } = stepAtOpcode("B_SCR_OP_SETEFFECTWITHCHANCE", rc);
      if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
      expect(result.state.programCounter).toBe(labelPc("BattleScript_PSNPrevention"));
      expect(result.state.rulesContext.multistringChooser).toBe(B_MSG_ABILITY_PREVENTS_MOVE_STATUS);
    });

    it("Steel-type target with the ability-effect hitmarker, certain: BattleScript_PSNPrevention with STATUS_HAD_NO_EFFECT, hitMarker bit NOT cleared", () => {
      const rc = context(
        0,
        {},
        { moveEffectByte: MOVE_EFFECT_POISON | MOVE_EFFECT_CERTAIN, hitMarker: HITMARKER_STATUS_ABILITY_EFFECT },
        { types: ["TYPE_STEEL", "TYPE_STEEL"] },
      );
      const { result } = stepAtOpcode("B_SCR_OP_SETEFFECTWITHCHANCE", rc);
      if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
      expect(result.state.programCounter).toBe(labelPc("BattleScript_PSNPrevention"));
      expect(result.state.rulesContext.multistringChooser).toBe(B_MSG_STATUS_HAD_NO_EFFECT);
      expect(result.state.rulesContext.hitMarker & HITMARKER_STATUS_ABILITY_EFFECT).toBe(HITMARKER_STATUS_ABILITY_EFFECT);
    });

    it("Water Veil ability, certain: blocks BURN via BattleScript_BRNPrevention", () => {
      const rc = context(
        0,
        {},
        { moveEffectByte: MOVE_EFFECT_BURN | MOVE_EFFECT_CERTAIN },
        { ability: ABILITY_WATER_VEIL },
      );
      const { result } = stepAtOpcode("B_SCR_OP_SETEFFECTWITHCHANCE", rc);
      if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
      expect(result.state.programCounter).toBe(labelPc("BattleScript_BRNPrevention"));
      expect(result.state.rulesContext.battlers[1]!.status1).toBe(0);
      expect(result.state.rulesContext.lastUsedAbility).toBe(ABILITY_WATER_VEIL);
      expect(result.state.rulesContext.aiObservedAbilityIds[1]).toBe(ABILITY_WATER_VEIL);
    });

    it("Magma Armor ability: silently blocks FREEZE, no message sub-script (source has none for this ability)", () => {
      const rc = context(
        0,
        {},
        { moveEffectByte: MOVE_EFFECT_FREEZE | MOVE_EFFECT_CERTAIN },
        { ability: ABILITY_MAGMA_ARMOR },
      );
      const { result } = stepAtOpcode("B_SCR_OP_SETEFFECTWITHCHANCE", rc);
      if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
      expect(result.state.programCounter).not.toBe(labelPc("BattleScript_MoveEffectFreeze"));
      expect(result.state.rulesContext.battlers[1]!.status1).toBe(0);
    });

    it("Limber ability, certain: blocks PARALYSIS via BattleScript_PRLZPrevention", () => {
      const rc = context(
        0,
        {},
        { moveEffectByte: MOVE_EFFECT_PARALYSIS | MOVE_EFFECT_CERTAIN },
        { ability: ABILITY_LIMBER },
      );
      const { result } = stepAtOpcode("B_SCR_OP_SETEFFECTWITHCHANCE", rc);
      if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
      expect(result.state.programCounter).toBe(labelPc("BattleScript_PRLZPrevention"));
      expect(result.state.rulesContext.battlers[1]!.status1).toBe(0);
      expect(result.state.rulesContext.lastUsedAbility).toBe(ABILITY_LIMBER);
      expect(result.state.rulesContext.aiObservedAbilityIds[1]).toBe(ABILITY_LIMBER);
    });

    it("Limber ability, not certain (chance-roll dispatch, percentChance < 100): silently blocks with no message, no prevention call", () => {
      const rc = context(
        0,
        {},
        { currentMove: BODY_SLAM, moveEffectByte: MOVE_EFFECT_PARALYSIS },
        { ability: ABILITY_LIMBER },
      );
      // Force the seteffectwithchance roll to land well under Body Slam's 30% chance.
      const { result } = stepAtOpcode("B_SCR_OP_SETEFFECTWITHCHANCE", rc, rngValueBeforeU16(0));
      if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
      expect(result.state.programCounter).not.toBe(labelPc("BattleScript_PRLZPrevention"));
      expect(result.state.rulesContext.battlers[1]!.status1).toBe(0);
      expect(result.state.rulesContext.aiObservedAbilityIds[1]).toBe(0);
      expect(result.state.rng.calls).toBe(1);
    });

    it("Shield Dust ability on the target: silently blocks any quartet member (effectByte <= 9)", () => {
      const rc = context(
        0,
        {},
        { moveEffectByte: MOVE_EFFECT_POISON | MOVE_EFFECT_CERTAIN },
        { ability: ABILITY_SHIELD_DUST },
      );
      const { result } = stepAtOpcode("B_SCR_OP_SETEFFECTWITHCHANCE", rc);
      if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
      expect(result.state.rulesContext.battlers[1]!.status1).toBe(0);
    });

    it("Safeguard on the target's side: silently blocks any quartet member (effectByte <= 7)", () => {
      const SIDE_STATUS_SAFEGUARD = 1 << 5;
      const rc = context(0, {}, {
        moveEffectByte: MOVE_EFFECT_PARALYSIS | MOVE_EFFECT_CERTAIN,
        sideStatuses: [0, SIDE_STATUS_SAFEGUARD],
      });
      const { result } = stepAtOpcode("B_SCR_OP_SETEFFECTWITHCHANCE", rc);
      if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
      expect(result.state.rulesContext.battlers[1]!.status1).toBe(0);
    });

    it("target at 0 HP: silently blocks (INCREMENT_RESET_RETURN)", () => {
      const rc = context(0, {}, { moveEffectByte: MOVE_EFFECT_POISON | MOVE_EFFECT_CERTAIN }, { hp: 0 });
      const { result } = stepAtOpcode("B_SCR_OP_SETEFFECTWITHCHANCE", rc);
      if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
      expect(result.state.rulesContext.battlers[1]!.status1).toBe(0);
    });

    it("target has a Substitute up: silently blocks", () => {
      const STATUS2_SUBSTITUTE = 1 << 24;
      const rc = context(0, {}, { moveEffectByte: MOVE_EFFECT_POISON | MOVE_EFFECT_CERTAIN }, { status2: STATUS2_SUBSTITUTE });
      const { result } = stepAtOpcode("B_SCR_OP_SETEFFECTWITHCHANCE", rc);
      if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
      expect(result.state.rulesContext.battlers[1]!.status1).toBe(0);
    });
  });

  describe("(b) unsupported-branch barriers", () => {
    it("SLEEP: certain-bit dispatch also reaches applySetMoveEffect's SLEEP case (registered via Cmd_seteffectprimary; the switch itself is dispatch-path-agnostic), drawing the duration roll", () => {
      const rc = context(0, {}, { moveEffectByte: MOVE_EFFECT_SLEEP | MOVE_EFFECT_CERTAIN });
      const { result } = stepAtOpcode("B_SCR_OP_SETEFFECTWITHCHANCE", rc);
      if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
      expect(result.state.programCounter).toBe(labelPc("BattleScript_MoveEffectSleep"));
      expect(result.state.rng.calls).toBe(1);
      const status1 = result.state.rulesContext.battlers[1]!.status1;
      expect(status1).toBeGreaterThanOrEqual(2);
      expect(status1).toBeLessThanOrEqual(5);
    });

    it("TOXIC: certain-bit dispatch statuses the target and calls BattleScript_MoveEffectToxic", () => {
      const rc = context(0, {}, { moveEffectByte: MOVE_EFFECT_TOXIC | MOVE_EFFECT_CERTAIN });
      const { result } = stepAtOpcode("B_SCR_OP_SETEFFECTWITHCHANCE", rc);
      if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
      expect(result.state.programCounter).toBe(labelPc("BattleScript_MoveEffectToxic"));
      expect(result.state.rulesContext.battlers[1]!.status1).toBe(1 << 7);
    });

    it("TOXIC: Immunity blocks with the certain bit set (primary||certain gate)", () => {
      const rc = context(0, {}, { moveEffectByte: MOVE_EFFECT_TOXIC | MOVE_EFFECT_CERTAIN }, { ability: ABILITY_IMMUNITY });
      const { result } = stepAtOpcode("B_SCR_OP_SETEFFECTWITHCHANCE", rc);
      if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
      expect(result.state.programCounter).toBe(labelPc("BattleScript_PSNPrevention"));
      expect(result.state.rulesContext.battlers[1]!.status1).toBe(0);
    });

    it("halts on a still-unmodeled family-B byte (> PRIMARY_STATUS_MOVE_EFFECT)", () => {
      const rc = context(0, {}, { moveEffectByte: 55 | MOVE_EFFECT_CERTAIN });
      const { result } = stepAtOpcode("B_SCR_OP_SETEFFECTWITHCHANCE", rc);
      expect(result.kind).toBe("halted");
      expect(result.state.haltReason).toMatchObject({ kind: "unsupported-branch", sourceLine: 2522 });
    });

    it("halts when the chance roll succeeds with a still-unmodeled family-B effect byte", () => {
      const rc = context(0, {}, { currentMove: MUD_SLAP, moveEffectByte: 55 });
      const { result } = stepAtOpcode("B_SCR_OP_SETEFFECTWITHCHANCE", rc);
      expect(result.kind).toBe("halted");
      expect(result.state.haltReason).toMatchObject({ kind: "unsupported-branch", sourceLine: 2522 });
    });
  });
});

/**
 * MOVE_EFFECT_CONFUSION (7) and MOVE_EFFECT_FLINCH (8), the two family-B
 * bytes registered directly against `docs/stat-change-confusion-ground-
 * truth.md` S1.6/S2.5 (confusion) and `docs/set-move-effect-ground-truth.md`
 * (flinch). Neither needs a new opcode: all 4 BattleScript_MoveEffectConfusion
 * ops were already registered, and FLINCH's plain case is a direct status2
 * write with no script sub-call at all.
 *
 * The confusion proc/control raw RNG values below are the REAL oracle
 * frame-0 rngValue for `tools/battle-lab/mechanic-set-move-effect-confusion-
 * off.json` seeds 9/1, forward-stepped 3 times past the shared accuracycheck/
 * critcalc/ApplyRandomDmgMultiplier rolls (verified independently via
 * `bin/oracle lab` at authoring time, matching docs S2.5's own table exactly:
 * seed 9 -> rolls 17703/40680/247/3806/9241/10365, seed 1 ->
 * 40931/33731/29631/46260) -- feeding the pre-roll-4 value directly into
 * `stepAtOpcode`'s rngSeed reproduces the documented roll-4 (chance gate) and
 * roll-5 (confusion duration) draws byte-for-byte without re-simulating the
 * three prior hit-chain rolls.
 */
describe("SetMoveEffect confusion/flinch family (registered)", () => {
  const MOVE_WATER_PULSE = 352; // EFFECT_CONFUSE_HIT, secondaryEffectChance 20
  const ABILITY_OWN_TEMPO = 20;
  const ABILITY_INNER_FOCUS = 39;
  const SIDE_STATUS_SAFEGUARD = 1 << 5;
  const STATUS2_CONFUSION_MASK = 0x7;
  const STATUS2_FLINCHED = 1 << 3;
  const STATUS2_SUBSTITUTE = 1 << 24;
  // docs S2.5: seed 9's raw rngValue immediately before roll 4 (3 steps past frame 0's 789488161).
  const CONFUSION_PROC_SEED_PRE_ROLL4 = 16193002;
  // docs S2.2/S2.5: seed 1's raw rngValue immediately before roll 4 (3 steps past frame 0's 3034451114).
  const CONFUSION_CONTROL_SEED_PRE_ROLL4 = 1941898439;

  describe("MOVE_EFFECT_CONFUSION", () => {
    it("real seteffectwithchance proc (docs S2.5 seed 9): roll 4 (3806) clears the 20% gate, roll 5 (9241) draws a 3-turn duration, calls BattleScript_MoveEffectConfusion", () => {
      const rc = context(0, {}, { currentMove: MOVE_WATER_PULSE, moveEffectByte: MOVE_EFFECT_CONFUSION });
      const { result } = stepAtOpcode("B_SCR_OP_SETEFFECTWITHCHANCE", rc, CONFUSION_PROC_SEED_PRE_ROLL4);
      if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
      expect(result.state.rng.calls).toBe(2);
      expect(result.state.rng.ledger[0]!.randomValue).toBe(3806);
      expect(result.state.rng.ledger[1]!.randomValue).toBe(9241);
      expect(result.state.programCounter).toBe(labelPc("BattleScript_MoveEffectConfusion"));
      expect(result.state.callStack.length).toBe(1);
      expect(result.state.rulesContext.battlers[1]!.status2 & STATUS2_CONFUSION_MASK).toBe(3); // 9241 % 4 + 2
      expect(result.state.rulesContext.moveEffectByte).toBe(0);
    });

    it("control seed (docs S2.2/S2.5 seed 1): roll 4 (46260) misses the 20% gate, no duration draw, status2 untouched", () => {
      const rc = context(0, {}, { currentMove: MOVE_WATER_PULSE, moveEffectByte: MOVE_EFFECT_CONFUSION });
      const { result } = stepAtOpcode("B_SCR_OP_SETEFFECTWITHCHANCE", rc, CONFUSION_CONTROL_SEED_PRE_ROLL4);
      if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
      expect(result.state.rng.calls).toBe(1);
      expect(result.state.rng.ledger[0]!.randomValue).toBe(46260);
      expect(result.state.rulesContext.battlers[1]!.status2).toBe(0);
    });

    it("certain-bit dispatch (skips the outer chance roll): draws only the duration roll and pins its exact (Random()%4)+2 arithmetic", () => {
      const rc = context(0, {}, { moveEffectByte: MOVE_EFFECT_CONFUSION | MOVE_EFFECT_CERTAIN });
      const { result } = stepAtOpcode("B_SCR_OP_SETEFFECTWITHCHANCE", rc, rngValueBeforeU16(9241));
      if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
      expect(result.state.rng.calls).toBe(1);
      expect(result.state.rulesContext.battlers[1]!.status2 & STATUS2_CONFUSION_MASK).toBe(3);
      expect(result.state.programCounter).toBe(labelPc("BattleScript_MoveEffectConfusion"));
    });

    it("Own Tempo: silently blocks (no message, no jump), zero RNG", () => {
      const rc = context(
        0,
        {},
        { moveEffectByte: MOVE_EFFECT_CONFUSION | MOVE_EFFECT_CERTAIN },
        { ability: ABILITY_OWN_TEMPO },
      );
      const { result } = stepAtOpcode("B_SCR_OP_SETEFFECTWITHCHANCE", rc);
      if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
      expect(result.state.callStack.length).toBe(0);
      expect(result.state.rng.calls).toBe(0);
      expect(result.state.rulesContext.battlers[1]!.status2).toBe(0);
    });

    it("already confused: the shared status2-already-set early-out skips silently, zero RNG", () => {
      const rc = context(
        0,
        {},
        { moveEffectByte: MOVE_EFFECT_CONFUSION | MOVE_EFFECT_CERTAIN },
        { status2: 4 },
      );
      const { result } = stepAtOpcode("B_SCR_OP_SETEFFECTWITHCHANCE", rc);
      if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
      expect(result.state.rng.calls).toBe(0);
      expect(result.state.rulesContext.battlers[1]!.status2).toBe(4);
    });

    it("Safeguard on the target's side: silently blocks (effectByte 7 <= SetMoveEffect's own <=7 gate)", () => {
      const rc = context(0, {}, {
        moveEffectByte: MOVE_EFFECT_CONFUSION | MOVE_EFFECT_CERTAIN,
        sideStatuses: [0, SIDE_STATUS_SAFEGUARD],
      });
      const { result } = stepAtOpcode("B_SCR_OP_SETEFFECTWITHCHANCE", rc);
      if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
      expect(result.state.rulesContext.battlers[1]!.status2).toBe(0);
    });

    it("target has a Substitute up: silently blocks", () => {
      const rc = context(
        0,
        {},
        { moveEffectByte: MOVE_EFFECT_CONFUSION | MOVE_EFFECT_CERTAIN },
        { status2: STATUS2_SUBSTITUTE },
      );
      const { result } = stepAtOpcode("B_SCR_OP_SETEFFECTWITHCHANCE", rc);
      if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
      expect(result.state.rulesContext.battlers[1]!.status2 & STATUS2_CONFUSION_MASK).toBe(0);
    });
  });

  describe("MOVE_EFFECT_FLINCH", () => {
    it("proc sets STATUS2_FLINCHED when the target hasn't acted yet (default turn-order shape: currentTurnActionNumber 0, turnOrderNum 1)", () => {
      const rc = context(0, {}, { moveEffectByte: MOVE_EFFECT_FLINCH | MOVE_EFFECT_CERTAIN });
      const { result } = stepAtOpcode("B_SCR_OP_SETEFFECTWITHCHANCE", rc);
      if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
      expect(result.state.rng.calls).toBe(0);
      expect(result.state.callStack.length).toBe(0);
      expect(result.state.rulesContext.battlers[1]!.status2).toBe(STATUS2_FLINCHED);
    });

    it("not-yet-acted gate's negative case: the target has already acted this turn (turnOrderNum <= currentTurnActionNumber), no write", () => {
      const rc = context(
        0,
        {},
        { moveEffectByte: MOVE_EFFECT_FLINCH | MOVE_EFFECT_CERTAIN, currentTurnActionNumber: 0 },
        { turnOrderNum: 0 },
      );
      const { result } = stepAtOpcode("B_SCR_OP_SETEFFECTWITHCHANCE", rc);
      if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
      expect(result.state.rulesContext.battlers[1]!.status2).toBe(0);
    });

    it("Inner Focus, certain: direct (un-pushed) jump to BattleScript_FlinchPrevention, lastUsedAbility recorded, no status2 write", () => {
      const rc = context(
        0,
        {},
        { moveEffectByte: MOVE_EFFECT_FLINCH | MOVE_EFFECT_CERTAIN },
        { ability: ABILITY_INNER_FOCUS },
      );
      const { result } = stepAtOpcode("B_SCR_OP_SETEFFECTWITHCHANCE", rc);
      if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
      expect(result.state.programCounter).toBe(labelPc("BattleScript_FlinchPrevention"));
      expect(result.state.callStack.length).toBe(0); // a plain jump, not a call -- BattleScript_FlinchPrevention's own goto ends the move
      expect(result.state.rulesContext.lastUsedAbility).toBe(ABILITY_INNER_FOCUS);
      expect(result.state.rulesContext.aiObservedAbilityIds[1]).toBe(ABILITY_INNER_FOCUS);
      expect(result.state.rulesContext.battlers[1]!.status2).toBe(0);
    });

    it("Inner Focus, not certain (chance-roll dispatch, percentChance < 100): silently blocks with no message, no jump", () => {
      const rc = context(
        0,
        {},
        { currentMove: ROCK_SLIDE, moveEffectByte: MOVE_EFFECT_FLINCH },
        { ability: ABILITY_INNER_FOCUS },
      );
      // Force the seteffectwithchance roll to land well under Rock Slide's 30% chance.
      const { result } = stepAtOpcode("B_SCR_OP_SETEFFECTWITHCHANCE", rc, rngValueBeforeU16(0));
      if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
      expect(result.state.programCounter).not.toBe(labelPc("BattleScript_FlinchPrevention"));
      expect(result.state.callStack.length).toBe(0);
      expect(result.state.rulesContext.battlers[1]!.status2).toBe(0);
      expect(result.state.rulesContext.aiObservedAbilityIds[1]).toBe(0);
    });

    it("already flinched: the shared status2-already-set early-out skips silently", () => {
      const rc = context(
        0,
        {},
        { moveEffectByte: MOVE_EFFECT_FLINCH | MOVE_EFFECT_CERTAIN },
        { status2: STATUS2_FLINCHED },
      );
      const { result } = stepAtOpcode("B_SCR_OP_SETEFFECTWITHCHANCE", rc);
      if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
      expect(result.state.rulesContext.battlers[1]!.status2).toBe(STATUS2_FLINCHED);
    });

    it("Safeguard does NOT block flinch (effectByte 8 is above SetMoveEffect's own <=7 Safeguard gate)", () => {
      const rc = context(0, {}, {
        moveEffectByte: MOVE_EFFECT_FLINCH | MOVE_EFFECT_CERTAIN,
        sideStatuses: [0, SIDE_STATUS_SAFEGUARD],
      });
      const { result } = stepAtOpcode("B_SCR_OP_SETEFFECTWITHCHANCE", rc);
      if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
      expect(result.state.rulesContext.battlers[1]!.status2).toBe(STATUS2_FLINCHED);
    });

    it("Shield Dust DOES block flinch (effectByte 8 is within SetMoveEffect's own <=9 Shield Dust gate)", () => {
      const rc = context(
        0,
        {},
        { moveEffectByte: MOVE_EFFECT_FLINCH | MOVE_EFFECT_CERTAIN },
        { ability: ABILITY_SHIELD_DUST },
      );
      const { result } = stepAtOpcode("B_SCR_OP_SETEFFECTWITHCHANCE", rc);
      if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
      expect(result.state.rulesContext.battlers[1]!.status2).toBe(0);
    });
  });
});

/**
 * SetMoveEffect's MOVE_EFFECT_CHARGING case (semi-invulnerable registration
 * rung 2, docs/semi-invulnerable-registration-scout.md §2d/§5 rung 2). Real
 * call site: `BattleScriptFirstChargingTurn`'s own `setmoveeffect
 * MOVE_EFFECT_CHARGING | MOVE_EFFECT_AFFECTS_USER` + `seteffectprimary`,
 * shared verbatim by all five two-turn-charge effects.
 */
describe("SetMoveEffect two-turn-charge family (registered) -- MOVE_EFFECT_CHARGING", () => {
  const MOVE_EFFECT_CHARGING = 12;
  const MOVE_EFFECT_AFFECTS_USER = 1 << 6;
  const STATUS2_MULTIPLETURNS = 1 << 12;

  const setEffectPrimaryPc = program.instructions.find(
    (instruction) =>
      instruction.opcodeName === "B_SCR_OP_SETEFFECTPRIMARY"
      && instruction.source.label === "BattleScriptFirstChargingTurn",
  )!.programCounter;

  function stepAtChargingSetEffectPrimary(rulesContext: BattleScriptRulesContext, rngSeed = 1) {
    const execution = createBattleScriptStatusRulesExecution(
      program,
      "BattleScriptFirstChargingTurn",
      rulesContext,
      rngSeed,
      externalPorts(),
    );
    const patched = Object.freeze({ ...execution.state, programCounter: setEffectPrimaryPc });
    return { execution, result: stepBattleScriptMachine(program, patched, execution.handlers) };
  }

  it("turn 1 (not yet charging): sets STATUS2_MULTIPLETURNS + chargingTurn + gLockedMoves on the attacker, zero RNG, advances (SetMoveEffect just breaks, not a call)", () => {
    const rc = context(0, {}, {
      currentMove: 19,
      lockedMoves: [7, 8, 9, 10],
      moveEffectByte: MOVE_EFFECT_CHARGING | MOVE_EFFECT_AFFECTS_USER,
    });
    const { execution, result } = stepAtChargingSetEffectPrimary(rc);
    if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
    expect(result.state.rng.calls).toBe(execution.state.rng.calls);
    expect(result.state.rulesContext.battlers[0]!.status2 & STATUS2_MULTIPLETURNS).toBe(STATUS2_MULTIPLETURNS);
    expect(result.state.rulesContext.battlers[0]!.chargingTurn).toBe(1);
    expect(result.state.rulesContext.lockedMoves).toEqual([19, 8, 9, 10]);
    expect(result.state.programCounter).toBe(setEffectPrimaryPc + 1);
  });

  it("MOVE_EFFECT_AFFECTS_USER targets the attacker, never the target", () => {
    const rc = context(0, {}, { moveEffectByte: MOVE_EFFECT_CHARGING | MOVE_EFFECT_AFFECTS_USER });
    const { result } = stepAtChargingSetEffectPrimary(rc);
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battlers[1]!.status2).toBe(0);
    expect(result.state.rulesContext.battlers[1]!.chargingTurn).toBe(0);
  });

  it("already charging (turn-2 dead-code path, ported for fidelity per applyThrashMoveEffect's own precedent): the shared status2-already-set early-out skips silently, zero RNG, status2/chargingTurn unchanged", () => {
    const rc = context(
      0,
      { status2: STATUS2_MULTIPLETURNS, chargingTurn: 0 },
      {
        currentMove: 19,
        lockedMoves: [7, 8, 9, 10],
        moveEffectByte: MOVE_EFFECT_CHARGING | MOVE_EFFECT_AFFECTS_USER,
      },
    );
    const { execution, result } = stepAtChargingSetEffectPrimary(rc);
    if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
    expect(result.state.rng.calls).toBe(execution.state.rng.calls);
    expect(result.state.rulesContext.battlers[0]!.status2).toBe(STATUS2_MULTIPLETURNS);
    expect(result.state.rulesContext.battlers[0]!.chargingTurn).toBe(0);
    expect(result.state.rulesContext.lockedMoves).toEqual([7, 8, 9, 10]);
    expect(result.state.programCounter).toBe(setEffectPrimaryPc + 1);
  });

  it("registered in SET_MOVE_EFFECT_SUPPORTED_BYTES (drives the census's SETMOVEEFFECT_SUPPORTED derivation)", () => {
    expect(SET_MOVE_EFFECT_SUPPORTED_BYTES.has(MOVE_EFFECT_CHARGING)).toBe(true);
  });
});

/**
 * Secondary-effect stat-change route (docs/stat-change-confusion-ground-
 * truth.md): SetMoveEffect's ATK/DEF/SPD/SP_ATK/SP_DEF/ACC/EVS +-1/+-2 cases
 * (:2644-2727), all dispatching through the shared changeStatBuffs() core
 * (battleScriptStatBuffs.ts). `flags` is always 0/MOVE_EFFECT_AFFECTS_USER on
 * this route, so every ability/Mist guard blocks silently (no message, no
 * jump) -- MOVE_EFFECT_CERTAIN bypasses Cmd_seteffectwithchance's own outer
 * chance roll (same technique the PARALYSIS-certain-bit tests above use;
 * unrelated to ChangeStatBuffs' own internal `certain`, which stays FALSE on
 * this route regardless per docs S1.1).
 */
describe("SetMoveEffect stat-change family (registered) -- secondary-effect route", () => {
  const MOVE_EFFECT_ATK_PLUS_2 = 39;
  const MOVE_EFFECT_SP_DEF_PLUS_1 = 19;
  const MOVE_EFFECT_ACC_MINUS_1 = 27;
  const MOVE_EFFECT_ATK_MINUS_1 = 22;
  const MOVE_EFFECT_SP_DEF_MINUS_1 = 26;
  const MOVE_EFFECT_AFFECTS_USER = 1 << 6;
  const ABILITY_CLEAR_BODY = 29;
  const ABILITY_WHITE_SMOKE = 73;
  const ABILITY_KEEN_EYE = 51;
  const ABILITY_HYPER_CUTTER = 52;
  const B_MSG_DEFENDER_STAT_FELL = 1;
  const B_MSG_DEFENDER_STAT_ROSE = 1;
  const B_MSG_STAT_WONT_CHANGE = 2;
  const CRUNCH = 242; // EFFECT_SPECIAL_DEFENSE_DOWN_HIT, secondaryEffectChance 20, FLAG_PROTECT_AFFECTED

  it("SP_DEF_MINUS_1: lowers the target's SPDEF stage 6 -> 5, calls BattleScript_StatDown, zero extra RNG, DEFENDER_STAT_FELL", () => {
    const rc = context(0, {}, { currentMove: CRUNCH, moveEffectByte: MOVE_EFFECT_SP_DEF_MINUS_1 | MOVE_EFFECT_CERTAIN });
    const { result } = stepAtOpcode("B_SCR_OP_SETEFFECTWITHCHANCE", rc);
    if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
    expect(result.state.programCounter).toBe(labelPc("BattleScript_StatDown"));
    expect(result.state.callStack.length).toBe(1);
    expect(result.state.rng.calls).toBe(0);
    expect(result.state.rulesContext.battlers[1]!.statStages[5]).toBe(5); // STAT_SPDEF
    expect(result.state.rulesContext.multistringChooser).toBe(B_MSG_DEFENDER_STAT_FELL);
    expect(result.state.rulesContext.animArg1).toBe(MOVE_EFFECT_SP_DEF_MINUS_1);
    expect(result.state.rulesContext.selectorRoles.effectBattler).toBe(1);
  });

  it("SP_DEF_PLUS_1 (increase, no ability/Mist guards apply): raises the target's SPDEF stage 6 -> 7, calls BattleScript_StatUp", () => {
    const rc = context(0, {}, { moveEffectByte: MOVE_EFFECT_SP_DEF_PLUS_1 | MOVE_EFFECT_CERTAIN });
    const { result } = stepAtOpcode("B_SCR_OP_SETEFFECTWITHCHANCE", rc);
    if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
    expect(result.state.programCounter).toBe(labelPc("BattleScript_StatUp"));
    expect(result.state.rulesContext.battlers[1]!.statStages[5]).toBe(7);
    // affectsUser=0 -> activeBattler=target(1) -> (target===activeBattler)=true -> DEFENDER (the target's own stat rose, from the mover's perspective).
    expect(result.state.rulesContext.multistringChooser).toBe(B_MSG_DEFENDER_STAT_ROSE);
  });

  it("ATK_PLUS_2 (magnitude 2, AFFECTS_USER): raises the attacker's own ATK stage 6 -> 8", () => {
    const rc = context(0, {}, { moveEffectByte: MOVE_EFFECT_ATK_PLUS_2 | MOVE_EFFECT_AFFECTS_USER | MOVE_EFFECT_CERTAIN });
    const { result } = stepAtOpcode("B_SCR_OP_SETEFFECTWITHCHANCE", rc);
    if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
    expect(result.state.rulesContext.battlers[0]!.statStages[1]).toBe(8); // STAT_ATK, attacker battler 0
    expect(result.state.rulesContext.animArg1).toBe(MOVE_EFFECT_ATK_PLUS_2);
    expect(result.state.rulesContext.selectorRoles.effectBattler).toBe(0);
  });

  it("Mist: silently blocks the decrease (no message, no jump), stage untouched, zero extra RNG", () => {
    const rc = context(0, {}, { moveEffectByte: MOVE_EFFECT_SP_DEF_MINUS_1 | MOVE_EFFECT_CERTAIN, mistTimers: [0, 5] });
    const { result } = stepAtOpcode("B_SCR_OP_SETEFFECTWITHCHANCE", rc);
    if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
    expect(result.state.callStack.length).toBe(0);
    expect(result.state.rng.calls).toBe(0);
    expect(result.state.rulesContext.battlers[1]!.statStages[5]).toBe(6);
  });

  it("Protect (structural, unconditional regardless of flags): jumps to BattleScript_ButItFailed and sets MOVE_RESULT_MISSED", () => {
    const rc = context(0, {}, { currentMove: CRUNCH, moveEffectByte: MOVE_EFFECT_SP_DEF_MINUS_1 | MOVE_EFFECT_CERTAIN }, { protected: 1 });
    const { result } = stepAtOpcode("B_SCR_OP_SETEFFECTWITHCHANCE", rc);
    if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
    expect(result.state.programCounter).toBe(labelPc("BattleScript_ButItFailed"));
    expect(result.state.rulesContext.moveResultFlags & 1).toBe(1); // MOVE_RESULT_MISSED
    expect(result.state.rulesContext.battlers[1]!.statStages[5]).toBe(6);
  });

  it("Clear Body: silently blocks the decrease, stage untouched (docs §2.3's live-verified Metang case)", () => {
    const rc = context(0, {}, { moveEffectByte: MOVE_EFFECT_SP_DEF_MINUS_1 | MOVE_EFFECT_CERTAIN }, { ability: ABILITY_CLEAR_BODY });
    const { result } = stepAtOpcode("B_SCR_OP_SETEFFECTWITHCHANCE", rc);
    if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
    expect(result.state.callStack.length).toBe(0);
    expect(result.state.rulesContext.battlers[1]!.statStages[5]).toBe(6);
  });

  it("White Smoke: silently blocks the decrease exactly like Clear Body", () => {
    const rc = context(0, {}, { moveEffectByte: MOVE_EFFECT_ATK_MINUS_1 | MOVE_EFFECT_CERTAIN }, { ability: ABILITY_WHITE_SMOKE });
    const { result } = stepAtOpcode("B_SCR_OP_SETEFFECTWITHCHANCE", rc);
    if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
    expect(result.state.rulesContext.battlers[1]!.statStages[1]).toBe(6);
  });

  it("Keen Eye: blocks ACC_MINUS_1 specifically (statId-gated)", () => {
    const rc = context(0, {}, { moveEffectByte: MOVE_EFFECT_ACC_MINUS_1 | MOVE_EFFECT_CERTAIN }, { ability: ABILITY_KEEN_EYE });
    const { result } = stepAtOpcode("B_SCR_OP_SETEFFECTWITHCHANCE", rc);
    if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
    expect(result.state.rulesContext.battlers[1]!.statStages[6]).toBe(6); // STAT_ACC
  });

  it("Keen Eye does not block ATK_MINUS_1 (statId-specific, not a generic block)", () => {
    const rc = context(0, {}, { moveEffectByte: MOVE_EFFECT_ATK_MINUS_1 | MOVE_EFFECT_CERTAIN }, { ability: ABILITY_KEEN_EYE });
    const { result } = stepAtOpcode("B_SCR_OP_SETEFFECTWITHCHANCE", rc);
    if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
    expect(result.state.rulesContext.battlers[1]!.statStages[1]).toBe(5);
  });

  it("Hyper Cutter: blocks ATK_MINUS_1 specifically (statId-gated)", () => {
    const rc = context(0, {}, { moveEffectByte: MOVE_EFFECT_ATK_MINUS_1 | MOVE_EFFECT_CERTAIN }, { ability: ABILITY_HYPER_CUTTER });
    const { result } = stepAtOpcode("B_SCR_OP_SETEFFECTWITHCHANCE", rc);
    if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
    expect(result.state.rulesContext.battlers[1]!.statStages[1]).toBe(6);
  });

  it("Shield Dust: blocks a stat-down secondary effect (structurally reachable only on this route, flags===0)", () => {
    const rc = context(0, {}, { moveEffectByte: MOVE_EFFECT_SP_DEF_MINUS_1 | MOVE_EFFECT_CERTAIN }, { ability: ABILITY_SHIELD_DUST });
    const { result } = stepAtOpcode("B_SCR_OP_SETEFFECTWITHCHANCE", rc);
    if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
    expect(result.state.rulesContext.battlers[1]!.statStages[5]).toBe(6);
  });

  it("already at MAX_STAT_STAGE (12): silently blocks the increase, no early return before the clamp write", () => {
    const rc = context(0, {}, { moveEffectByte: MOVE_EFFECT_SP_DEF_PLUS_1 | MOVE_EFFECT_CERTAIN }, { statStages: [6, 6, 6, 6, 6, 12, 6, 6] });
    const { result } = stepAtOpcode("B_SCR_OP_SETEFFECTWITHCHANCE", rc);
    if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
    expect(result.state.callStack.length).toBe(0);
    expect(result.state.rulesContext.battlers[1]!.statStages[5]).toBe(12);
    expect(result.state.rulesContext.multistringChooser).toBe(B_MSG_STAT_WONT_CHANGE);
  });

  /**
   * battle_script_commands.c:7091-7096's clamp-tail check compares raw
   * MULTISTRING_CHOOSER values, and B_MSG_STAT_WONT_INCREASE/_DECREASE are
   * both literally 2 (battle_string_ids.h:397,405) -- the early-return is
   * direction-INDEPENDENT. This diverges from docs/stat-change-confusion-
   * ground-truth.md S1.1's claim that an already-MIN decrease never early-
   * returns (that claim was never live-verified by its own probe either);
   * this test pins the literal, source-verified behavior instead.
   */
  it("already at MIN_STAT_STAGE (0): also silently blocks (direction-independent per the literal C comparison, not the asymmetry docs/stat-change-confusion-ground-truth.md S1.1 describes)", () => {
    const rc = context(0, {}, { moveEffectByte: MOVE_EFFECT_SP_DEF_MINUS_1 | MOVE_EFFECT_CERTAIN }, { statStages: [6, 6, 6, 6, 6, 0, 6, 6] });
    const { result } = stepAtOpcode("B_SCR_OP_SETEFFECTWITHCHANCE", rc);
    if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
    expect(result.state.callStack.length).toBe(0);
    expect(result.state.rulesContext.battlers[1]!.statStages[5]).toBe(0);
    expect(result.state.rulesContext.multistringChooser).toBe(B_MSG_STAT_WONT_CHANGE);
  });
});

describe("production printfromtable (Cmd_printfromtable) dispatch", () => {
  it("registers B_SCR_OP_PRINTFROMTABLE", () => {
    expect(program.instructions.find((i) => i.opcodeName === "B_SCR_OP_PRINTFROMTABLE")).toBeDefined();
  });

  it.each([
    [0, "STRINGID_PKMNWOKEUP"],
    [1, "STRINGID_PKMNWOKEUPINUPROAR"],
  ])("BattleScript_MoveUsedWokeUp's gWokeUpStringIds selector %i resolves %s", (chooser, messageId) => {
    const pc = program.instructions.find((i) =>
      i.opcodeName === "B_SCR_OP_PRINTFROMTABLE" && i.operands[0]?.expression === "gWokeUpStringIds"
    )!.programCounter;
    const rc = context(0, {}, { multistringChooser: chooser });
    const { result } = stepAtProgramCounter(pc, rc);
    if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
    expect(result.state.events).toEqual([
      expect.objectContaining({ kind: "message", messageId }),
    ]);
  });

  it("BattleScript_MoveEffectParalysis's own printfromtable gGotParalyzedStringIds, MULTISTRING_CHOOSER 0: resolves STRINGID_PKMNWASPARALYZED", () => {
    const pc = program.instructions.find((i) =>
      i.opcodeName === "B_SCR_OP_PRINTFROMTABLE" && i.operands[0]?.expression === "gGotParalyzedStringIds"
    )!.programCounter;
    const rc = context(0, {}, { multistringChooser: B_MSG_STATUSED });
    const { result } = stepAtProgramCounter(pc, rc);
    if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
    expect(result.state.events).toEqual([
      expect.objectContaining({ kind: "message", messageId: "STRINGID_PKMNWASPARALYZED" }),
    ]);
  });

  it("same table, MULTISTRING_CHOOSER 1: resolves STRINGID_PKMNWASPARALYZEDBY", () => {
    const pc = program.instructions.find((i) =>
      i.opcodeName === "B_SCR_OP_PRINTFROMTABLE" && i.operands[0]?.expression === "gGotParalyzedStringIds"
    )!.programCounter;
    const rc = context(0, {}, { multistringChooser: B_MSG_STATUSED_BY_ABILITY });
    const { result } = stepAtProgramCounter(pc, rc);
    if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
    expect(result.state.events).toEqual([
      expect.objectContaining({ kind: "message", messageId: "STRINGID_PKMNWASPARALYZEDBY" }),
    ]);
  });

  it("BattleScript_PSNPrevention's own printfromtable gPSNPreventionStringIds, MULTISTRING_CHOOSER 2: resolves STRINGID_PKMNSXHADNOEFFECTONY", () => {
    const pc = program.instructions.find((i) =>
      i.opcodeName === "B_SCR_OP_PRINTFROMTABLE" && i.operands[0]?.expression === "gPSNPreventionStringIds"
    )!.programCounter;
    const rc = context(0, {}, { multistringChooser: B_MSG_STATUS_HAD_NO_EFFECT });
    const { result } = stepAtProgramCounter(pc, rc);
    if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
    expect(result.state.events).toEqual([
      expect.objectContaining({ kind: "message", messageId: "STRINGID_PKMNSXHADNOEFFECTONY" }),
    ]);
  });

  describe(
    "BattleScriptFirstChargingTurn's own printfromtable gFirstTurnOfTwoStringIds "
      + "(semi-invulnerable registration rung 4, docs/semi-invulnerable-registration-scout.md §1b/§5 rung 4 -- "
      + "all 8 B_MSG_TURN1_* indices, shared by all five two-turn-charge effects)",
    () => {
      const pc = program.instructions.find((i) =>
        i.opcodeName === "B_SCR_OP_PRINTFROMTABLE" && i.operands[0]?.expression === "gFirstTurnOfTwoStringIds"
      )!.programCounter;

      const cases: readonly [number, string][] = [
        [0, "STRINGID_PKMNWHIPPEDWHIRLWIND"], // B_MSG_TURN1_RAZOR_WIND
        [1, "STRINGID_PKMNTOOKSUNLIGHT"], // B_MSG_TURN1_SOLAR_BEAM
        [2, "STRINGID_PKMNLOWEREDHEAD"], // B_MSG_TURN1_SKULL_BASH
        [3, "STRINGID_PKMNISGLOWING"], // B_MSG_TURN1_SKY_ATTACK
        [4, "STRINGID_PKMNFLEWHIGH"], // B_MSG_TURN1_FLY
        [5, "STRINGID_PKMNDUGHOLE"], // B_MSG_TURN1_DIG
        [6, "STRINGID_PKMNHIDUNDERWATER"], // B_MSG_TURN1_DIVE
        [7, "STRINGID_PKMNSPRANGUP"], // B_MSG_TURN1_BOUNCE
      ];

      for (const [index, stringId] of cases) {
        it(`MULTISTRING_CHOOSER ${index}: resolves ${stringId}`, () => {
          const rc = context(0, {}, { multistringChooser: index });
          const { result } = stepAtProgramCounter(pc, rc);
          if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
          expect(result.state.events).toEqual([
            expect.objectContaining({ kind: "message", messageId: stringId }),
          ]);
        });
      }
    },
  );
});

describe("production updatestatusicon (Cmd_updatestatusicon) dispatch", () => {
  it("registers B_SCR_OP_UPDATESTATUSICON", () => {
    expect(program.instructions.find((i) => i.opcodeName === "B_SCR_OP_UPDATESTATUSICON")).toBeDefined();
  });

  it("BS_EFFECT_BATTLER (BattleScript_UpdateEffectStatusIconRet's own shape): emits status-icon-update for the effect battler", () => {
    const pc = program.instructions.find((i) =>
      i.opcodeName === "B_SCR_OP_UPDATESTATUSICON" && i.operands[0]?.expression === "BS_EFFECT_BATTLER"
    )!.programCounter;
    const rc = context(0, {}, {}, { status1: STATUS1_PARALYSIS_BIT });
    const { result } = stepAtProgramCounter(pc, rc);
    if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
    expect(result.state.events).toEqual([
      expect.objectContaining({ kind: "status-icon-update", battler: 1, status1: STATUS1_PARALYSIS_BIT, status2: 0 }),
    ]);
  });

  describe("BS_ATTACKER_WITH_PARTNER", () => {
    const pc = program.instructions.find((i) =>
      i.opcodeName === "B_SCR_OP_UPDATESTATUSICON" && i.operands[0]?.expression === "BS_ATTACKER_WITH_PARTNER"
    )!.programCounter;

    it("singles emits only the present attacker", () => {
      const rc = context(0, { status1: STATUS1_PARALYSIS_BIT });
      const { result } = stepAtProgramCounter(pc, rc);
      if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
      expect(result.state.scheduler.pendingControllerBattlers).toEqual([0]);
      expect(result.state.events).toEqual([
        expect.objectContaining({
          kind: "status-icon-update",
          battler: 0,
          status1: STATUS1_PARALYSIS_BIT,
        }),
      ]);
    });

    it("doubles emits attacker then positional partner, skipping an absent partner", () => {
      const doubles = {
        battlersCount: 4 as const,
        battleTypeFlags: BATTLE_SCRIPT_BATTLE_TYPE_DOUBLE,
        battlerPositions: [0, 1, 2, 3],
      };
      const battlers = [
        battler({ side: 0, status1: STATUS1_PARALYSIS_BIT }),
        battler({ side: 1 }),
        battler({ side: 0, status1: STATUS1_BURN_BIT }),
        battler({ side: 1 }),
      ];
      const present = stepAtProgramCounter(
        pc,
        context(0, {}, { battlers, battleTopology: doubles }),
      ).result;
      if (present.kind !== "advanced") throw new Error(`expected advance, got ${present.kind}`);
      expect(present.state.scheduler).toMatchObject({
        activeBattler: 2,
        pendingControllerBattlers: [0, 2],
      });
      expect(present.state.events).toEqual([
        expect.objectContaining({ kind: "status-icon-update", battler: 0 }),
        expect.objectContaining({ kind: "status-icon-update", battler: 2 }),
      ]);

      const absent = stepAtProgramCounter(
        pc,
        context(0, {}, {
          battlers,
          battleTopology: doubles,
          absentBattlerFlags: 1 << 2,
        }),
      ).result;
      if (absent.kind !== "advanced") throw new Error(`expected advance, got ${absent.kind}`);
      expect(absent.state.scheduler).toMatchObject({
        activeBattler: 2,
        pendingControllerBattlers: [0],
      });
      expect(absent.state.events).toHaveLength(1);
    });
  });
});

const HITMARKER_DESTINYBOND = 1 << 6;
const HITMARKER_PLAYER_FAINTED = 1 << 22;
const STATUS3_GRUDGE = 1 << 14;
const TRYFAINTMON_TARGET_FAINTED_BIT = (1 << 29) >>> 0; // HITMARKER_FAINTED(battler 1)
const TRYFAINTMON_ATTACKER_FAINTED_BIT = (1 << 28) >>> 0; // HITMARKER_FAINTED(battler 0)

describe("production tryfaintmon (Cmd_tryfaintmon) dispatch", () => {
  it("registers B_SCR_OP_TRYFAINTMON", () => {
    expect(program.instructions.find((i) => i.opcodeName === "B_SCR_OP_TRYFAINTMON")).toBeDefined();
  });

  it("no faint (target hp nonzero): passes through, hitMarker untouched", () => {
    const rc = context(0, {}, {}, { hp: 90 });
    const { result } = stepAtOpcode("B_SCR_OP_TRYFAINTMON", rc);
    if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
    expect(result.state.rulesContext.hitMarker).toBe(0);
  });

  it("BS_TARGET faints (KO scenario shape): calls into BattleScript_FaintTarget, sets HITMARKER_FAINTED(target) only", () => {
    const rc = context(0, {}, {}, { hp: 0 });
    const { result } = stepAtOpcode("B_SCR_OP_TRYFAINTMON", rc);
    if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
    expect(result.state.programCounter).toBe(labelPc("BattleScript_FaintTarget"));
    expect(result.state.callStack.length).toBe(1);
    expect(result.state.rulesContext.hitMarker & TRYFAINTMON_TARGET_FAINTED_BIT).toBe(TRYFAINTMON_TARGET_FAINTED_BIT);
    expect(result.state.rulesContext.hitMarker & HITMARKER_PLAYER_FAINTED).toBe(0); // target here is the opponent (side 1)
  });

  it("BS_ATTACKER faints on the player side: calls BattleScript_FaintAttacker and sets HITMARKER_PLAYER_FAINTED", () => {
    const pc = findTryfaintmonPc((ops) => ops[0] === "BS_ATTACKER" && ops[1] === "FALSE");
    const rc = context(0, { hp: 0 });
    const { result } = stepAtProgramCounter(pc, rc);
    if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
    expect(result.state.programCounter).toBe(labelPc("BattleScript_FaintAttacker"));
    expect(result.state.rulesContext.hitMarker & TRYFAINTMON_ATTACKER_FAINTED_BIT).toBe(TRYFAINTMON_ATTACKER_FAINTED_BIT);
    expect(result.state.rulesContext.hitMarker & HITMARKER_PLAYER_FAINTED).toBe(HITMARKER_PLAYER_FAINTED);
  });

  it("any other operand spelling (BS_FAINTED) takes the target path, matching source's literal == BS_ATTACKER comparison", () => {
    const pc = findTryfaintmonPc((ops) => ops[0] === "BS_FAINTED" && ops[1] === "FALSE");
    const rc = context(0, {}, {}, { hp: 0 });
    const { result } = stepAtProgramCounter(pc, rc);
    if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
    expect(result.state.programCounter).toBe(labelPc("BattleScript_FaintTarget"));
  });

  it("absentBattlerFlags set for the target: no faint even at hp 0", () => {
    const rc = context(0, {}, { absentBattlerFlags: 1 << 1 }, { hp: 0 });
    const { result } = stepAtOpcode("B_SCR_OP_TRYFAINTMON", rc);
    if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
    expect(result.state.rulesContext.hitMarker).toBe(0);
  });

  describe("(b) unsupported-branch barriers", () => {
    it("HITMARKER_DESTINYBOND schedules the avenging script above the original target-faint continuation", () => {
      const rc = context(0, {}, { hitMarker: HITMARKER_DESTINYBOND }, { hp: 0 });
      const { result } = stepAtOpcode("B_SCR_OP_TRYFAINTMON", rc);
      if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
      expect(result.state.programCounter).toBe(labelPc("BattleScript_DestinyBondTakesLife"));
      expect(result.state.callStack).toEqual([
        findTryfaintmonPc((ops) => ops[0] === "BS_TARGET" && ops[1] === "FALSE") + 1,
        labelPc("BattleScript_FaintTarget"),
      ]);
      expect(result.state.rulesContext.hitMarker & HITMARKER_DESTINYBOND).toBe(0);
      expect(result.state.rulesContext.battleMoveDamage).toBe(rc.battlers[0]!.hp);
    });

    it("Grudge does not fire on MOVE_STRUGGLE, matching source's explicit exclusion", () => {
      const rc = context(0, {}, { currentMove: 165 /* MOVE_STRUGGLE */ }, { hp: 0, status3: STATUS3_GRUDGE });
      const { result } = stepAtOpcode("B_SCR_OP_TRYFAINTMON", rc);
      if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
    });

    it("tryfaintmon_spikes advances when no faint marker is set", () => {
      const pc = findTryfaintmonPc((ops) => ops[0] === "BS_ATTACKER" && ops[1] === "TRUE");
      const rc = context(0);
      const { result } = stepAtProgramCounter(pc, rc);
      expect(result.kind).toBe("advanced");
      expect(result.state.programCounter).toBe(pc + 1);
    });

    it("tryfaintmon_spikes pops the switch-in return, clears the damaged guard, and jumps on a marked faint", () => {
      const pc = findTryfaintmonPc((ops) => ops[0] === "BS_ATTACKER" && ops[1] === "TRUE");
      const rc = context(0, {}, {
        hitMarker: TRYFAINTMON_ATTACKER_FAINTED_BIT,
        sideStatuses: [(1 << 4) | (1 << 9), 0],
      });
      const execution = createBattleScriptStatusRulesExecution(
        program, "BattleScript_HitFromCritCalc", rc, 1, externalPorts(),
      );
      const state = Object.freeze({
        ...execution.state,
        programCounter: pc,
        callStack: Object.freeze([777]),
      });
      const result = stepBattleScriptMachine(program, state, execution.handlers);
      if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
      expect(result.state.programCounter).toBe(labelPc("BattleScript_SpikesOnAttackerFainted"));
      expect(result.state.callStack).toEqual([]);
      expect(result.state.rulesContext.sideStatuses[0]).toBe(1 << 4);
    });
  });
});

describe("production dofaintanimation (Cmd_dofaintanimation) dispatch", () => {
  it("registers B_SCR_OP_DOFAINTANIMATION", () => {
    expect(program.instructions.find((i) => i.opcodeName === "B_SCR_OP_DOFAINTANIMATION")).toBeDefined();
  });

  it("BS_TARGET (BattleScript_FaintTarget shape): emits faint-animation for the target battler, rulesContext untouched", () => {
    const pc = program.instructions.find((i) =>
      i.opcodeName === "B_SCR_OP_DOFAINTANIMATION" && i.operands[0]?.expression === "BS_TARGET"
    )!.programCounter;
    const rc = context(0, {}, {}, { hp: 0 });
    const { result } = stepAtProgramCounter(pc, rc);
    if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
    expect(result.state.events).toEqual([
      expect.objectContaining({ kind: "faint-animation", battler: 1 }),
    ]);
    expect(result.state.rulesContext).toBe(rc);
  });
});

describe("production cleareffectsonfaint (Cmd_cleareffectsonfaint) dispatch", () => {
  const cleareffectsonfaintTargetPc = program.instructions.find((i) =>
    i.opcodeName === "B_SCR_OP_CLEAREFFECTSONFAINT" && i.operands[0]?.expression === "BS_TARGET"
  )!.programCounter;

  it("registers B_SCR_OP_CLEAREFFECTSONFAINT", () => {
    expect(program.instructions.find((i) => i.opcodeName === "B_SCR_OP_CLEAREFFECTSONFAINT")).toBeDefined();
  });

  it(
    "BS_TARGET (KO scenario shape): zeroes status1/status2/status3/statStages and the modeled "
      + "DisableStruct/ProtectStruct fields, emits set-battler-status-data, clears the target's own "
      + "move-history slot",
    () => {
      const rc = context(
        0,
        {},
        {},
        {
          hp: 0,
          status1: 0x40,
          status2: 0x1234,
          status3: 0x108, // includes STATUS3_MINIMIZED; FaintClearSetData owns the whole-slot clear.
          statStages: [2, 3, 4, 5, 6, 7, 8, 9],
          rolloutTimer: 3,
          furyCutterCounter: 2,
          tauntTimer: 1,
          rechargeTimer: 1,
          disabledMove: 12,
          disableTimer: 4,
          disableTimerStartValue: 5,
          stockpileCounter: 3,
          protected: 1,
          protectUses: 3,
          battlerWithSureHit: 0,
          transformedMonPersonality: 50,
        },
      );
      const { result } = stepAtProgramCounter(cleareffectsonfaintTargetPc, rc);
      if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
      const target = result.state.rulesContext.battlers[1]!;
      expect(target.status1).toBe(0);
      expect(target.status2).toBe(0);
      expect(target.status3).toBe(0);
      expect(target.statStages).toEqual([6, 6, 6, 6, 6, 6, 6, 6]);
      expect(target.rolloutTimer).toBe(0);
      expect(target.furyCutterCounter).toBe(0);
      expect(target.tauntTimer).toBe(0);
      expect(target.rechargeTimer).toBe(0);
      expect(target.disabledMove).toBe(0);
      expect(target.disableTimer).toBe(0);
      expect(target.disableTimerStartValue).toBe(0);
      expect(target.stockpileCounter).toBe(0);
      expect(target.protected).toBe(0);
      // FaintClearSetData's DisableStruct::protectUses zero -- a real write now that
      // battleScriptProtectlikeOpcode.ts's own field exists (previously a no-op, see
      // that file's history: this field simply didn't exist on the engine's battler state).
      expect(target.protectUses).toBe(0);
      expect(target.battlerWithSureHit).toBe(0);
      expect(target.transformedMonPersonality).toBe(0);
      expect(result.state.rulesContext.moveHistory.lastHitBy[1]).toBe(0xff);
      expect(result.state.events).toEqual([
        expect.objectContaining({ kind: "set-battler-status-data", battler: 1, status1: 0 }),
      ]);
    },
  );

  it("clears STATUS2_INFATUATED_WITH(target) on every other battler while leaving unrelated status2 bits alone", () => {
    const infatuatedWithTarget = (1 << (16 + 1)) >>> 0; // gBitTable[1] << 16
    const rc = context(0, { status2: infatuatedWithTarget | 0x1 }, {}, { hp: 0 });
    const { result } = stepAtProgramCounter(cleareffectsonfaintTargetPc, rc);
    if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
    expect(result.state.rulesContext.battlers[0]!.status2).toBe(0x1);
  });

  it(
    "clears STATUS2_WRAPPED on another battler only when this fainted battler is the one who set it "
      + "(gBattleStruct->wrappedBy identity, docs/ingrain-leechseed-wrap-ground-truth.md §1c/§5 slice 2)",
    () => {
      const rc = context(0, { status2: (3 << 13) | 0x1, wrappedBy: 1 }, {}, { hp: 0 });
      const { result } = stepAtProgramCounter(cleareffectsonfaintTargetPc, rc);
      if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
      expect(result.state.rulesContext.battlers[0]!.status2).toBe(0x1); // WRAPPED bits cleared, unrelated bit kept
    },
  );

  it("leaves STATUS2_WRAPPED alone when some OTHER battler (not this fainted one) set it", () => {
    const rc = context(0, { status2: 3 << 13, wrappedBy: 2 }, {}, { hp: 0 });
    const { result } = stepAtProgramCounter(cleareffectsonfaintTargetPc, rc);
    if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
    expect(result.state.rulesContext.battlers[0]!.status2).toBe(3 << 13);
  });

  describe("(b) unsupported-branch barriers", () => {
    it("halts on an unsupported selector spelling (Battle Arena's BS_OPPONENT1), not BS_TARGET/BS_ATTACKER", () => {
      const pc = program.instructions.find((i) =>
        i.opcodeName === "B_SCR_OP_CLEAREFFECTSONFAINT" && i.operands[0]?.expression === "BS_OPPONENT1"
      )!.programCounter;
      const rc = context(0, {}, {}, { hp: 0 });
      const { result } = stepAtProgramCounter(pc, rc);
      expect(result.kind).toBe("halted");
      expect(result.state.haltReason).toMatchObject({ kind: "unsupported-branch", sourceLine: 3064 });
    });
  });

  it("Roar/faint-style removal clears Mean Look only when the departing battler owns the trap", () => {
    const owned = context(
      0,
      { status2: 1 << 26, battlerPreventingEscape: 1 },
      {},
      { hp: 0 },
    );
    const ownedResult = stepAtProgramCounter(cleareffectsonfaintTargetPc, owned).result;
    if (ownedResult.kind !== "advanced") throw new Error(`expected advance, got ${ownedResult.kind}`);
    expect(ownedResult.state.rulesContext.battlers[0].status2).toBe(0);

    const otherOwner = context(
      0,
      { status2: 1 << 26, battlerPreventingEscape: 2 },
      {},
      { hp: 0 },
    );
    const otherResult = stepAtProgramCounter(cleareffectsonfaintTargetPc, otherOwner).result;
    if (otherResult.kind !== "advanced") throw new Error(`expected advance, got ${otherResult.kind}`);
    expect(otherResult.state.rulesContext.battlers[0].status2).toBe(1 << 26);
  });

  it("faint cleanup clears another battler's sure-hit marker only when the fainted battler owns it", () => {
    const owned = context(
      0,
      { status3: 1 << 3, battlerWithSureHit: 1 },
      {},
      { hp: 0 },
    );
    const ownedResult = stepAtProgramCounter(cleareffectsonfaintTargetPc, owned).result;
    if (ownedResult.kind !== "advanced") throw new Error("expected advance");
    expect(ownedResult.state.rulesContext.battlers[0]).toMatchObject({
      status3: 0,
      battlerWithSureHit: 0,
    });

    const other = context(
      0,
      { status3: 1 << 3, battlerWithSureHit: 2 },
      {},
      { hp: 0 },
    );
    const otherResult = stepAtProgramCounter(cleareffectsonfaintTargetPc, other).result;
    if (otherResult.kind !== "advanced") throw new Error("expected advance");
    expect(otherResult.state.rulesContext.battlers[0].status3).toBe(1 << 3);
  });
});

describe("RUNG 4 integration: opcode 0 -> ... -> seteffectwithchance -> tryfaintmon -> moveend-to-end / playfaintcry boundary", () => {
  it("RUNG 1 hit turn (Tackle, seed 1): walks the full sixteen-opcode hit chain from the script's own "
    + "literal BattleScript_EffectHit entry (not the BattleScript_HitFromAtkCanceler shortcut prior "
    + "integration proofs used, per the executable-frontier census), no-faint tryfaintmon pass-through, "
    + "halts at moveend (opcode 73)", () => {
    // attack/defense nonzero (unlike the default 0/0 fixture) so damagecalc produces a real,
    // non-NaN, non-lethal hit -- this scenario specifically needs tryfaintmon's no-faint path.
    const rc = context(0, { attack: 40 }, {}, { defense: 40 });
    const execution = createBattleScriptStatusRulesExecution(
      program,
      "BattleScript_EffectHit",
      rc,
      1,
      externalPorts(),
    );
    const handlers = execution.handlers;
    // jumpifnotmove MOVE_SURF, BattleScript_HitFromAtkCanceler: currentMove is Tackle (not Surf), so
    // this is taken unconditionally, skipping the Surf-only underwater guard entirely.
    let result = stepBattleScriptMachine(program, execution.state, handlers); // jumpifhalfword
    if (result.kind !== "advanced") throw new Error(`jumpifhalfword did not advance: ${result.kind}`);
    expect(result.state.programCounter).toBe(labelPc("BattleScript_HitFromAtkCanceler"));
    result = stepBattleScriptMachine(program, result.state, handlers); // opcode 0
    if (result.kind !== "advanced") throw new Error(`opcode 0 did not advance: ${result.kind}`);
    result = stepBattleScriptMachine(program, result.state, handlers); // accuracycheck
    if (result.kind !== "advanced") throw new Error(`accuracycheck did not advance: ${result.kind}`);
    expect(result.state.rng.calls).toBe(1);
    result = stepBattleScriptMachine(program, result.state, handlers); // attackstring
    if (result.kind !== "advanced") throw new Error(`attackstring did not advance: ${result.kind}`);
    result = stepBattleScriptMachine(program, result.state, handlers); // ppreduce
    if (result.kind !== "advanced") throw new Error(`ppreduce did not advance: ${result.kind}`);
    expect(result.state.rulesContext.battlers[0]!.pp[0]).toBe(34);
    expect(result.state.programCounter).toBe(labelPc("BattleScript_HitFromCritCalc"));
    result = stepBattleScriptMachine(program, result.state, handlers); // critcalc
    if (result.kind !== "advanced") throw new Error(`critcalc did not advance: ${result.kind}`);
    result = stepBattleScriptMachine(program, result.state, handlers); // damagecalc
    if (result.kind !== "advanced") throw new Error(`damagecalc did not advance: ${result.kind}`);
    result = stepBattleScriptMachine(program, result.state, handlers); // typecalc
    if (result.kind !== "advanced") throw new Error(`typecalc did not advance: ${result.kind}`);
    result = stepBattleScriptMachine(program, result.state, handlers); // adjustnormaldamage
    if (result.kind !== "advanced") throw new Error(`adjustnormaldamage did not advance: ${result.kind}`);
    expect(result.state.programCounter).toBe(labelPc("BattleScript_HitFromAtkAnimation"));
    for (const label of RUNG_3_LABELS) {
      if (result.kind !== "advanced") throw new Error(`${label} did not advance: ${result.kind}`);
      result = stepBattleScriptMachine(program, result.state, handlers);
    }
    if (result.kind !== "advanced") throw new Error(`expected advance before seteffectwithchance, got ${result.kind}`);
    expect(result.state.rulesContext.battlers[1]!.hp).toBeLessThan(100); // datahpupdate dealt real damage
    result = stepBattleScriptMachine(program, result.state, handlers); // seteffectwithchance
    if (result.kind !== "advanced") throw new Error(`seteffectwithchance did not advance: ${result.kind}`);
    expect(result.state.rng.calls).toBe(4); // ground truth's roll 4
    result = stepBattleScriptMachine(program, result.state, handlers); // tryfaintmon: no faint, target survives
    if (result.kind !== "advanced") throw new Error(`tryfaintmon did not advance: ${result.kind}`);
    expect(result.state.callStack.length).toBe(0); // pass-through, not a call into BattleScript_FaintTarget
    result = stepBattleScriptMachine(program, result.state, handlers); // setbyte sMOVEEND_STATE, 0 (BattleScript_MoveEnd's moveendall)
    if (result.kind !== "advanced") throw new Error(`setbyte did not advance: ${result.kind}`);
    expect(result.state.rulesContext.moveendState).toBe(0);

    // Cmd_moveend's do-while loop pauses (same PC, controller-return) at the
    // ordinary attacker/target sprite-visibility states (9, 10) even though
    // neither battler is actually semi-invulnerable -- matching
    // docs/battle-script-move-end-vertical-audit.md's case-9/10 analysis. A
    // real driver acknowledges and resumes the same instruction each time.
    const moveendPc = result.state.programCounter;
    let state = ackAllPending(result.state);
    let stepped = stepBattleScriptMachine(program, state, handlers);
    let moveendResumptions = 0;
    while (stepped.kind === "advanced" && stepped.state.programCounter === moveendPc) {
      moveendResumptions += 1;
      if (moveendResumptions > 17) throw new Error("Cmd_moveend did not converge on MOVEEND_COUNT");
      state = ackAllPending(stepped.state);
      stepped = stepBattleScriptMachine(program, state, handlers);
    }
    if (stepped.kind !== "advanced") throw new Error(`moveend did not complete: ${stepped.kind}`);
    expect(moveendResumptions).toBe(2); // controller-returns at states 9 (attacker) and 10 (target)
    expect(stepped.state.rulesContext.moveendState).toBe(17); // MOVEEND_COUNT
    expect(stepped.state.rng.calls).toBe(4); // moveend itself draws no RNG on this path
    expect(stepped.state.programCounter).toBe(moveendPc + 1);

    const finished = stepBattleScriptMachine(program, stepped.state, handlers); // end
    expect(finished.kind).toBe("halted");
    if (finished.kind !== "halted") throw new Error("expected halted");
    expect(finished.state.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
  });

  it(
    "Surf-underwater sub-branch (executable-frontier census): with the target's own STATUS3_UNDERWATER "
      + "bit set directly in the staged context (Dive), Surf's jumpifnotmove falls through instead of "
      + "jumping, jumpifnostatus3 also falls through (bit is set), and the two-instruction underwater "
      + "sub-script (orword gHitMarker HITMARKER_IGNORE_UNDERWATER; setbyte sDMG_MULTIPLIER 2) runs "
      + "before reconverging on the same BattleScript_HitFromAtkCanceler entry -- no opcode beyond the "
      + "registered trio plus the already-registered setbyte is needed on this branch",
    () => {
      const rc = context(0, {}, { currentMove: MOVE_SURF }, { status3: STATUS3_UNDERWATER });
      const execution = createBattleScriptStatusRulesExecution(program, "BattleScript_EffectHit", rc, 1, externalPorts());
      const handlers = execution.handlers;
      let result = stepBattleScriptMachine(program, execution.state, handlers); // jumpifhalfword: Surf, not taken
      if (result.kind !== "advanced") throw new Error(`jumpifhalfword did not advance: ${result.kind}`);
      expect(result.state.programCounter).toBe(execution.state.programCounter + 1);
      result = stepBattleScriptMachine(program, result.state, handlers); // jumpifstatus3condition: underwater, not taken
      if (result.kind !== "advanced") throw new Error(`jumpifstatus3condition did not advance: ${result.kind}`);
      result = stepBattleScriptMachine(program, result.state, handlers); // orword gHitMarker, HITMARKER_IGNORE_UNDERWATER
      if (result.kind !== "advanced") throw new Error(`orword did not advance: ${result.kind}`);
      expect(result.state.rulesContext.hitMarker & (1 << 18)).toBe(1 << 18); // HITMARKER_IGNORE_UNDERWATER
      result = stepBattleScriptMachine(program, result.state, handlers); // setbyte sDMG_MULTIPLIER, 2
      if (result.kind !== "advanced") throw new Error(`setbyte did not advance: ${result.kind}`);
      expect(result.state.rulesContext.dmgMultiplier).toBe(2);
      expect(result.state.programCounter).toBe(labelPc("BattleScript_HitFromAtkCanceler"));
    },
  );

  it(
    "RUNG 1 leverage: ROCK_SLIDE (MOVE_TARGET_BOTH, seed 1) previously halted at Cmd_ppreduce's "
      + "Pressure barrier (PROGRESS 442) -- now walks the full hit chain, through the real "
      + "ABILITYEFFECT_COUNT_OTHER_SIDE Pressure scan (proven by the dedicated ppreduce unit tests "
      + "above, both the singles-degenerate case and the doubles multi-battler case), all the way to "
      + "the script's own end. Singles, no Pressure on the opponent here specifically: giving the "
      + "direct target a nonzero ability trips a separate, pre-existing, unrelated accuracycheck "
      + "barrier (JumpIfMoveFailed's AbilityBattleEffects(ABILITYEFFECT_ABSORBING) check, "
      + "battle_script_commands.c:1020, fires for ANY nonzero target ability); putting Pressure on a "
      + "non-target doubles battler instead trips moveend's own separate, already-pinned "
      + "MOVEEND_NEXT_TARGET doubles-replay barrier (battle_script_commands.c:4467, explicitly "
      + "\"unreachable for Level-50 singles\"). Neither barrier is Cmd_ppreduce's; this test's own "
      + "job is proving the chain no longer halts at ppreduce, not re-proving the count arithmetic.",
    () => {
      const rc = context(0, { attack: 40, pp: [15, 0, 0, 0] }, { currentMove: ROCK_SLIDE }, { defense: 40 });
      const execution = createBattleScriptStatusRulesExecution(
        program,
        "BattleScript_HitFromAtkCanceler",
        rc,
        1,
        externalPorts(),
      );
      const handlers = execution.handlers;
      let result = stepBattleScriptMachine(program, execution.state, handlers); // opcode 0
      if (result.kind !== "advanced") throw new Error(`opcode 0 did not advance: ${result.kind}`);
      result = stepBattleScriptMachine(program, result.state, handlers); // accuracycheck
      if (result.kind !== "advanced") throw new Error(`accuracycheck did not advance: ${result.kind}`);
      result = stepBattleScriptMachine(program, result.state, handlers); // attackstring
      if (result.kind !== "advanced") throw new Error(`attackstring did not advance: ${result.kind}`);
      result = stepBattleScriptMachine(program, result.state, handlers); // ppreduce -- was a barrier, now real
      if (result.kind !== "advanced") throw new Error(`ppreduce did not advance: ${result.kind}`);
      expect(result.state.rulesContext.battlers[0]!.pp[0]).toBe(14); // ppToDeduct = 1, no opposing Pressure
      expect(result.state.programCounter).toBe(labelPc("BattleScript_HitFromCritCalc"));
      result = stepBattleScriptMachine(program, result.state, handlers); // critcalc
      if (result.kind !== "advanced") throw new Error(`critcalc did not advance: ${result.kind}`);
      result = stepBattleScriptMachine(program, result.state, handlers); // damagecalc
      if (result.kind !== "advanced") throw new Error(`damagecalc did not advance: ${result.kind}`);
      result = stepBattleScriptMachine(program, result.state, handlers); // typecalc
      if (result.kind !== "advanced") throw new Error(`typecalc did not advance: ${result.kind}`);
      result = stepBattleScriptMachine(program, result.state, handlers); // adjustnormaldamage
      if (result.kind !== "advanced") throw new Error(`adjustnormaldamage did not advance: ${result.kind}`);
      expect(result.state.programCounter).toBe(labelPc("BattleScript_HitFromAtkAnimation"));
      for (const label of RUNG_3_LABELS) {
        if (result.kind !== "advanced") throw new Error(`${label} did not advance: ${result.kind}`);
        result = stepBattleScriptMachine(program, result.state, handlers);
      }
      if (result.kind !== "advanced") throw new Error(`expected advance before seteffectwithchance, got ${result.kind}`);
      expect(result.state.rulesContext.battlers[1]!.hp).toBeLessThan(100); // datahpupdate dealt real damage
      result = stepBattleScriptMachine(program, result.state, handlers); // seteffectwithchance
      if (result.kind !== "advanced") throw new Error(`seteffectwithchance did not advance: ${result.kind}`);
      result = stepBattleScriptMachine(program, result.state, handlers); // tryfaintmon: no faint, target survives
      if (result.kind !== "advanced") throw new Error(`tryfaintmon did not advance: ${result.kind}`);
      expect(result.state.callStack.length).toBe(0); // pass-through, not a call into BattleScript_FaintTarget
      result = stepBattleScriptMachine(program, result.state, handlers); // setbyte sMOVEEND_STATE, 0
      if (result.kind !== "advanced") throw new Error(`setbyte did not advance: ${result.kind}`);
      expect(result.state.rulesContext.moveendState).toBe(0);

      const moveendPc = result.state.programCounter;
      let state = ackAllPending(result.state);
      let stepped = stepBattleScriptMachine(program, state, handlers);
      let moveendResumptions = 0;
      while (stepped.kind === "advanced" && stepped.state.programCounter === moveendPc) {
        moveendResumptions += 1;
        if (moveendResumptions > 17) throw new Error("Cmd_moveend did not converge on MOVEEND_COUNT");
        state = ackAllPending(stepped.state);
        stepped = stepBattleScriptMachine(program, state, handlers);
      }
      if (stepped.kind !== "advanced") throw new Error(`moveend did not complete: ${stepped.kind}`);
      expect(stepped.state.rulesContext.moveendState).toBe(17); // MOVEEND_COUNT

      const finished = stepBattleScriptMachine(program, stepped.state, handlers); // end
      expect(finished.kind).toBe("halted");
      if (finished.kind !== "halted") throw new Error("expected halted");
      expect(finished.state.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
    },
  );

  it(
    "full staged hit turn on the KO scenario's real ROM seed (919694434): reproduces the pinned "
      + "142 -> 213 -> 213 -> 204 damage chain, the exact 4-roll ledger (accuracycheck, critcalc, "
      + "adjustnormaldamage, seteffectwithchance), the killing hit's HP -> 0, tryfaintmon's faint "
      + "branch into BattleScript_FaintTarget, and now runs the FULL faint cutscene (playfaintcry, "
      + "pause, dofaintanimation, cleareffectsonfaint, printstring, return) back through moveendall "
      + "to the script's own end, with rng.calls still exactly 4 throughout (ISSUES #43 fixed)",
    () => {
      const rc = context(
        0,
        { attack: 200, level: 50, types: ["TYPE_NORMAL", "TYPE_NORMAL"] },
        { currentMove: STRENGTH },
        { defense: 50, types: ["TYPE_GRASS", "TYPE_GRASS"], hp: 90 },
      );
      const faintPorts = externalPorts({
        resolveHalfwordOperand: (_context, operand) =>
          operand.expression === "B_WAIT_TIME_LONG" ? 64 : null,
      });
      const execution = createBattleScriptStatusRulesExecution(
        program,
        "BattleScript_HitFromAtkCanceler",
        rc,
        919694434, // the KO scenario's actual frame-0 gRngValue (docs/hit-chain-ground-truth.md)
        faintPorts,
      );
      const handlers = execution.handlers;
      let result = stepBattleScriptMachine(program, execution.state, handlers); // opcode 0
      for (const label of ["accuracycheck", "attackstring", "ppreduce", "critcalc", "damagecalc", "typecalc", "adjustnormaldamage"]) {
        if (result.kind !== "advanced") throw new Error(`${label} did not advance: ${result.kind}`);
        result = stepBattleScriptMachine(program, result.state, handlers);
      }
      if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);

      expect(result.state.rng.calls).toBe(3);
      expect(result.state.rng.ledger.map((entry) => entry.reason)).toEqual([
        "accuracycheck",
        "critcalc",
        "adjustnormaldamage",
      ]);
      expect(result.state.rng.ledger[0]!.randomValue).toBe(56317);
      expect(result.state.rng.ledger[1]!.randomValue).toBe(15002); // 15002 % 16 = 10, no crit
      expect(result.state.rng.ledger[2]!.randomValue).toBe(52212);
      expect(result.state.rulesContext.critMultiplier).toBe(1);
      expect(result.state.rulesContext.battleMoveDamage).toBe(204); // 142 -> STAB 213 -> neutral type -> 96% -> 204
      expect(result.state.programCounter).toBe(labelPc("BattleScript_HitFromAtkAnimation"));

      const rngCallsBeforeRung3 = result.state.rng.calls;
      for (const label of RUNG_3_LABELS) {
        if (result.kind !== "advanced") throw new Error(`${label} did not advance: ${result.kind}`);
        result = stepBattleScriptMachine(program, result.state, handlers);
      }
      if (result.kind !== "advanced") throw new Error(`expected advance before seteffectwithchance, got ${result.kind}`);
      expect(result.state.rng.calls).toBe(rngCallsBeforeRung3); // RUNG 3 consumes zero RNG (ground truth)
      expect(result.state.rulesContext.battlers[1]!.hp).toBe(0); // the killing hit clamps HP to 0
      expect(result.state.rulesContext.hpDealt).toBe(90); // dealt == remaining HP, not the full 204 damage

      result = stepBattleScriptMachine(program, result.state, handlers); // seteffectwithchance
      if (result.kind !== "advanced") throw new Error(`seteffectwithchance did not advance: ${result.kind}`);
      expect(result.state.rng.calls).toBe(4);
      expect(result.state.rng.ledger[3]!.reason).toBe("seteffectwithchance");
      expect(result.state.rng.ledger[3]!.randomValue).toBe(24745); // ground truth's roll 4

      result = stepBattleScriptMachine(program, result.state, handlers); // tryfaintmon: KO'd target faints
      if (result.kind !== "advanced") throw new Error(`tryfaintmon did not advance: ${result.kind}`);
      expect(result.state.programCounter).toBe(labelPc("BattleScript_FaintTarget"));
      expect(result.state.callStack.length).toBe(1);
      expect(result.state.rng.calls).toBe(4); // tryfaintmon's faint branch consumes no RNG

      // playfaintcry BS_TARGET: resolveRulesBattlerForBattleScript now maps BS_TARGET to the
      // hit chain's own selectorRoles.target (ISSUES #43 fix, battle_util.c:694-734's
      // unconditional `case BS_TARGET: ret = gBattlerTarget;`), so this genuinely advances.
      result = stepBattleScriptMachine(program, result.state, handlers); // playfaintcry
      if (result.kind !== "advanced") throw new Error(`playfaintcry did not advance: ${result.kind}`);
      expect(result.state.events.at(-1)).toEqual(
        expect.objectContaining({ kind: "play-faint-cry", battler: 1 }),
      );
      expect(result.state.rng.calls).toBe(4);

      // pause B_WAIT_TIME_LONG (64): 63 scheduler-only ticks at the same PC, then advances.
      let state = result.state;
      for (let tick = 0; tick < 64; tick += 1) {
        const stepped = stepBattleScriptMachine(program, state, handlers);
        const expectedKind = tick < 63 ? "scheduler-progressed" : "advanced";
        if (stepped.kind !== expectedKind) {
          throw new Error(`pause tick ${tick} was ${stepped.kind}, expected ${expectedKind}`);
        }
        state = stepped.state;
      }
      expect(state.rng.calls).toBe(4);

      let stepped = stepBattleScriptMachine(program, state, handlers); // dofaintanimation
      if (stepped.kind !== "advanced") throw new Error(`dofaintanimation did not advance: ${stepped.kind}`);
      expect(stepped.state.events.at(-1)).toEqual(
        expect.objectContaining({ kind: "faint-animation", battler: 1 }),
      );

      stepped = stepBattleScriptMachine(program, stepped.state, handlers); // cleareffectsonfaint
      if (stepped.kind !== "advanced") throw new Error(`cleareffectsonfaint did not advance: ${stepped.kind}`);
      expect(stepped.state.events.at(-1)).toEqual(
        expect.objectContaining({ kind: "set-battler-status-data", battler: 1, status1: 0 }),
      );
      const clearedTarget = stepped.state.rulesContext.battlers[1]!;
      expect(clearedTarget.status1).toBe(0);
      expect(clearedTarget.status2).toBe(0);
      expect(clearedTarget.status3).toBe(0);
      expect(clearedTarget.statStages).toEqual([6, 6, 6, 6, 6, 6, 6, 6]);
      expect(stepped.state.rulesContext.moveHistory.lastHitBy[1]).toBe(0xff);
      expect(stepped.state.rng.calls).toBe(4); // FaintClearSetData draws no RNG (ground truth)

      stepped = stepBattleScriptMachine(program, stepped.state, handlers); // printstring STRINGID_TARGETFAINTED
      if (stepped.kind !== "advanced") throw new Error(`printstring did not advance: ${stepped.kind}`);
      expect(stepped.state.events.at(-1)).toEqual(
        expect.objectContaining({ kind: "message", messageId: "STRINGID_TARGETFAINTED" }),
      );

      stepped = stepBattleScriptMachine(program, stepped.state, handlers); // return
      if (stepped.kind !== "advanced") throw new Error(`return did not advance: ${stepped.kind}`);
      expect(stepped.state.callStack.length).toBe(0); // popped back out of BattleScript_FaintTarget
      expect(stepped.state.programCounter).toBe(labelPc("BattleScript_MoveEnd")); // moveendall's setbyte half

      stepped = stepBattleScriptMachine(program, stepped.state, handlers); // setbyte sMOVEEND_STATE, 0
      if (stepped.kind !== "advanced") throw new Error(`setbyte did not advance: ${stepped.kind}`);
      expect(stepped.state.rulesContext.moveendState).toBe(0);

      // Cmd_moveend's do-while loop pauses (same PC, controller-return) at the ordinary
      // attacker/target sprite-visibility states even though neither battler is actually
      // semi-invulnerable, matching the RUNG 1 pattern above; a real driver acknowledges and
      // resumes the same instruction each time.
      const moveendPc = stepped.state.programCounter;
      let moveendState = ackAllPending(stepped.state);
      let moveendStepped = stepBattleScriptMachine(program, moveendState, handlers);
      let moveendResumptions = 0;
      while (moveendStepped.kind === "advanced" && moveendStepped.state.programCounter === moveendPc) {
        moveendResumptions += 1;
        if (moveendResumptions > 17) throw new Error("Cmd_moveend did not converge on MOVEEND_COUNT");
        moveendState = ackAllPending(moveendStepped.state);
        moveendStepped = stepBattleScriptMachine(program, moveendState, handlers);
      }
      if (moveendStepped.kind !== "advanced") throw new Error(`moveend did not complete: ${moveendStepped.kind}`);
      expect(moveendStepped.state.rulesContext.moveendState).toBe(17); // MOVEEND_COUNT
      expect(moveendStepped.state.rng.calls).toBe(4); // moveend itself draws no RNG on this path
      expect(moveendStepped.state.programCounter).toBe(moveendPc + 1);

      const finished = stepBattleScriptMachine(program, moveendStepped.state, handlers); // end
      expect(finished.kind).toBe("halted");
      if (finished.kind !== "halted") throw new Error("expected halted");
      expect(finished.state.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
      expect(finished.state.rng.calls).toBe(4); // the whole faint window draws zero Random() calls
      // pinned damage/HP assertions from earlier in this test are unchanged: battleMoveDamage 204,
      // target hp 0, hpDealt 90 -- this handoff only advances the script, it never revisits damage.
      expect(finished.state.rulesContext.battleMoveDamage).toBe(204);
      expect(finished.state.rulesContext.battlers[1]!.hp).toBe(0);
      expect(finished.state.rulesContext.hpDealt).toBe(90);
    },
  );

  it("miss turn (Slam, seed 2): 1 RNG call at accuracycheck, PP-1, hands off cleanly to the already-registered pause opcode", () => {
    const rc = context(0, {}, { currentMove: SLAM });
    const execution = createBattleScriptStatusRulesExecution(
      program,
      "BattleScript_HitFromAtkCanceler",
      rc,
      2,
      externalPorts(),
    );
    let result = stepBattleScriptMachine(program, execution.state, execution.handlers); // opcode 0
    if (result.kind !== "advanced") throw new Error(`opcode 0 did not advance: ${result.kind}`);
    result = stepBattleScriptMachine(program, result.state, execution.handlers); // accuracycheck (miss)
    if (result.kind !== "advanced") throw new Error(`accuracycheck did not advance: ${result.kind}`);
    expect(result.state.rng.calls).toBe(1);
    expect(result.state.programCounter).toBe(labelPc("BattleScript_PrintMoveMissed"));
    result = stepBattleScriptMachine(program, result.state, execution.handlers); // attackstring
    if (result.kind !== "advanced") throw new Error(`attackstring did not advance: ${result.kind}`);
    result = stepBattleScriptMachine(program, result.state, execution.handlers); // ppreduce
    if (result.kind !== "advanced") throw new Error(`ppreduce did not advance: ${result.kind}`);
    expect(result.state.rulesContext.battlers[0]!.pp[0]).toBe(34);
    expect(result.state.rulesContext.moveResultFlags & 1).toBe(1);
    expect(result.state.rng.calls).toBe(1); // exactly the ground-truth 1-roll miss pattern
    const next = program.instructions[result.state.programCounter];
    expect(next?.opcodeName).toBe("B_SCR_OP_PAUSE");
  });
});

describe(
  "EFFECT_EARTHQUAKE: full committed script, executable-frontier census's own top-ranked next "
    + "registration (B_SCR_OP_JUMPIFNEXTTARGETVALID + B_SCR_OP_SELECTFIRSTVALIDTARGET, the census's "
    + "single largest entry -- 1 Factory-L50 move, 147 weighted)",
  () => {
    it(
      "singles: resolves as a plain hit end to end -- selectfirstvalidtarget overwrites the target "
        + "role, the underground-bonus branch is skipped (target not underground), real damage lands "
        + "with no secondary-effect RNG draw (Earthquake sets no move effect), and "
        + "jumpifnexttargetvalid falls through (singles never loops back to hit another battler) all "
        + "the way to the script's own end",
      () => {
        const rc = context(0, { attack: 60, level: 50 }, { currentMove: EARTHQUAKE }, { defense: 50 });
        // printstring STRINGID_EMPTYSTRING3 (Earthquake's own no-secondary-effect filler print) genuinely
        // sets messageDisplayActive, so its own `waitmessage 1` (a literal halfword, not a named constant)
        // needs a real port answer -- unlike the two earlier `waitmessage B_WAIT_TIME_LONG` calls, which
        // fall through immediately because critmessage/resultmessage never set that flag in the first place.
        const earthquakePorts = externalPorts({
          resolveHalfwordOperand: (_context, operand) => (operand.expression === "1" ? 1 : null),
        });
        const execution = createBattleScriptStatusRulesExecution(
          program,
          "BattleScript_EffectEarthquake",
          rc,
          1,
          earthquakePorts,
        );
        const handlers = execution.handlers;

        let result = stepBattleScriptMachine(program, execution.state, handlers); // attackcanceler (opcode 0)
        if (result.kind !== "advanced") throw new Error(`attackcanceler did not advance: ${result.kind}`);
        result = stepBattleScriptMachine(program, result.state, handlers); // attackstring
        if (result.kind !== "advanced") throw new Error(`attackstring did not advance: ${result.kind}`);
        result = stepBattleScriptMachine(program, result.state, handlers); // ppreduce
        if (result.kind !== "advanced") throw new Error(`ppreduce did not advance: ${result.kind}`);
        expect(result.state.rulesContext.battlers[0]!.pp[0]).toBe(34);

        result = stepBattleScriptMachine(program, result.state, handlers); // selectfirstvalidtarget (NEW)
        if (result.kind !== "advanced") throw new Error(`selectfirstvalidtarget did not advance: ${result.kind}`);
        expect(result.state.rulesContext.selectorRoles.target).toBe(1);
        expect(result.state.programCounter).toBe(labelPc("BattleScript_HitsAllWithUndergroundBonusLoop"));

        result = stepBattleScriptMachine(program, result.state, handlers); // movevaluescleanup
        if (result.kind !== "advanced") throw new Error(`movevaluescleanup did not advance: ${result.kind}`);
        result = stepBattleScriptMachine(program, result.state, handlers); // jumpifnostatus3: target not underground, jumps
        if (result.kind !== "advanced") throw new Error(`jumpifnostatus3 did not advance: ${result.kind}`);
        expect(result.state.programCounter).toBe(labelPc("BattleScript_HitsAllNoUndergroundBonus"));

        result = stepBattleScriptMachine(program, result.state, handlers); // bicword gHitMarker, HITMARKER_IGNORE_UNDERGROUND
        if (result.kind !== "advanced") throw new Error(`bicword did not advance: ${result.kind}`);
        result = stepBattleScriptMachine(program, result.state, handlers); // setbyte sDMG_MULTIPLIER, 1
        if (result.kind !== "advanced") throw new Error(`setbyte did not advance: ${result.kind}`);
        expect(result.state.rulesContext.dmgMultiplier).toBe(1);
        expect(result.state.programCounter).toBe(labelPc("BattleScript_DoHitAllWithUndergroundBonus"));

        result = stepBattleScriptMachine(program, result.state, handlers); // accuracycheck: always hits (100 accuracy)
        if (result.kind !== "advanced") throw new Error(`accuracycheck did not advance: ${result.kind}`);
        expect(result.state.rng.calls).toBe(1);
        result = stepBattleScriptMachine(program, result.state, handlers); // critcalc
        if (result.kind !== "advanced") throw new Error(`critcalc did not advance: ${result.kind}`);
        result = stepBattleScriptMachine(program, result.state, handlers); // damagecalc
        if (result.kind !== "advanced") throw new Error(`damagecalc did not advance: ${result.kind}`);
        result = stepBattleScriptMachine(program, result.state, handlers); // typecalc
        if (result.kind !== "advanced") throw new Error(`typecalc did not advance: ${result.kind}`);
        result = stepBattleScriptMachine(program, result.state, handlers); // adjustnormaldamage
        if (result.kind !== "advanced") throw new Error(`adjustnormaldamage did not advance: ${result.kind}`);
        expect(result.state.rulesContext.battleMoveDamage).toBeGreaterThan(0);

        for (const label of RUNG_3_LABELS) {
          if (result.kind !== "advanced") throw new Error(`${label} did not advance: ${result.kind}`);
          result = stepBattleScriptMachine(program, result.state, handlers);
        }
        if (result.kind !== "advanced") throw new Error(`expected advance before printstring, got ${result.kind}`);
        expect(result.state.rulesContext.battlers[1]!.hp).toBeLessThan(100); // datahpupdate dealt real damage

        result = stepBattleScriptMachine(program, result.state, handlers); // printstring STRINGID_EMPTYSTRING3
        if (result.kind !== "advanced") throw new Error(`printstring did not advance: ${result.kind}`);
        result = stepBattleScriptMachine(program, result.state, handlers); // waitmessage 1
        if (result.kind !== "advanced") throw new Error(`waitmessage did not advance: ${result.kind}`);
        result = stepBattleScriptMachine(program, result.state, handlers); // tryfaintmon: no faint, target survives
        if (result.kind !== "advanced") throw new Error(`tryfaintmon did not advance: ${result.kind}`);
        expect(result.state.callStack.length).toBe(0);
        // accuracycheck, critcalc, adjustnormaldamage -- exactly the ground-truth 3-roll hit ledger with
        // no 4th (seteffectwithchance) draw, since Earthquake sets no secondary move effect at all.
        expect(result.state.rng.calls).toBe(3);
        expect(result.state.rng.ledger.map((entry) => entry.reason)).toEqual([
          "accuracycheck",
          "critcalc",
          "adjustnormaldamage",
        ]);

        result = stepBattleScriptMachine(program, result.state, handlers); // setbyte sMOVEEND_STATE, 0 (moveendto)
        if (result.kind !== "advanced") throw new Error(`setbyte did not advance: ${result.kind}`);
        expect(result.state.rulesContext.moveendState).toBe(0);

        const moveendPc = result.state.programCounter;
        let state = ackAllPending(result.state);
        let stepped = stepBattleScriptMachine(program, state, handlers);
        let moveendResumptions = 0;
        while (stepped.kind === "advanced" && stepped.state.programCounter === moveendPc) {
          moveendResumptions += 1;
          if (moveendResumptions > 17) throw new Error("Cmd_moveend did not converge on MOVEEND_COUNT");
          state = ackAllPending(stepped.state);
          stepped = stepBattleScriptMachine(program, state, handlers);
        }
        if (stepped.kind !== "advanced") throw new Error(`moveend did not complete: ${stepped.kind}`);
        // moveendto MOVEEND_NEXT_TARGET (mode 2, endState 16) forces MOVEEND_COUNT the instant state
        // 16 is reached, WITHOUT running its body -- the script's own jumpifnexttargetvalid instruction
        // does that job instead (data/battle_scripts_1.s:1868-1869).
        expect(stepped.state.rulesContext.moveendState).toBe(17);
        expect(stepped.state.programCounter).toBe(moveendPc + 1);

        const jumped = stepBattleScriptMachine(program, stepped.state, handlers); // jumpifnexttargetvalid (NEW)
        if (jumped.kind !== "advanced") throw new Error(`jumpifnexttargetvalid did not advance: ${jumped.kind}`);
        // Singles: falls through to the very next instruction, never loops back to hit another battler.
        expect(jumped.state.programCounter).toBe(stepped.state.programCounter + 1);

        const finished = stepBattleScriptMachine(program, jumped.state, handlers); // end
        expect(finished.kind).toBe("halted");
        if (finished.kind !== "halted") throw new Error("expected halted");
        expect(finished.state.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
      },
    );
  },
);

describe(
  "SetMoveEffect integration proof: KADABRA Body Slam vs. MAGNETON "
    + "(docs/set-move-effect-ground-truth.md §2, tools/battle-lab/mechanic-set-move-effect-paralysis-off.json)",
  () => {
    // Real level-50 stats for the committed oracle fixture's overrides.parties (species base
    // stats x IV 31 / EV 0 / nature 0 HARDY, neutral -- Magneton's derived max HP (125)
    // independently matches the ground-truth doc's own "125 max HP" citation exactly).
    // Two deliberate substitutions, both proven inert to this proof's own subject (the status
    // write), not swept under the rug:
    // (1) The fixture's real abilities (Synchronize/Magnet Pull) are zeroed here, matching this
    //     file's own precedent (docs/hit-chain-ground-truth.md's crit scenario does the same,
    //     "Item and ability are overridden to 0"). This kernel's accuracycheck already barriers
    //     on ANY nonzero *target* ability (JumpIfMoveFailed's AbilityBattleEffects
    //     (ABILITYEFFECT_ABSORBING) check, battle_script_commands.c:1020, fires for any nonzero
    //     ability) -- a real, pre-existing, unrelated limitation. Neither real ability gates
    //     paralysis (only ABILITY_LIMBER does).
    // (2) The walk starts at BattleScript_HitFromAtkCanceler with moveEffectByte pre-set to
    //     MOVE_EFFECT_PARALYSIS, rather than at the move's own BattleScript_EffectParalyzeHit
    //     entry (`setmoveeffect MOVE_EFFECT_PARALYSIS; goto BattleScript_EffectHit`,
    //     data/battle_scripts_1.s:370-372). BattleScript_EffectHit's own preamble
    //     (`jumpifnotmove MOVE_SURF, ...`, :237) is registered (B_SCR_OP_JUMPIFHALFWORD, see the
    //     "literal BattleScript_EffectHit entry" test above) but unrelated to SetMoveEffect, and
    //     for any non-Surf move (Body Slam included) it always falls straight through to
    //     BattleScript_HitFromAtkCanceler regardless, so pre-setting moveEffectByte to what that
    //     preamble would have produced is exact, not approximate.
    const SPECIES_KADABRA = 64;
    const SPECIES_MAGNETON = 82;
    const TACKLE_MOVE = 33;

    function kadabraVsMagnetonContext(): BattleScriptRulesContext {
      return context(
        0,
        {
          species: SPECIES_KADABRA,
          types: ["TYPE_PSYCHIC", "TYPE_PSYCHIC"],
          attack: 55,
          defense: 50,
          spAttack: 140,
          spDefense: 90,
          level: 50,
          moves: [BODY_SLAM, 0, 0, 0],
          pp: [15, 0, 0, 0],
        },
        { currentMove: BODY_SLAM, moveEffectByte: MOVE_EFFECT_PARALYSIS },
        {
          species: SPECIES_MAGNETON,
          types: ["TYPE_ELECTRIC", "TYPE_STEEL"],
          attack: 80,
          defense: 115,
          spAttack: 140,
          spDefense: 90,
          level: 50,
          hp: 125,
          moves: [TACKLE_MOVE, 0, 0, 0],
          pp: [35, 0, 0, 0],
        },
      );
    }

    /** Walks the real hit chain from opcode 0 through seteffectwithchance, same shape as RUNG 4's integration tests. */
    function walkKadabraBodySlamToSeteffectwithchance(rngSeed: number) {
      const B_WAIT_TIME_LONG = 64;
      const rc = kadabraVsMagnetonContext();
      const execution = createBattleScriptStatusRulesExecution(
        program,
        "BattleScript_HitFromAtkCanceler",
        rc,
        rngSeed,
        // Normal-type Body Slam vs. Magneton's real Electric/Steel typing is genuinely
        // not-very-effective (Steel resists Normal), so resultmessage's own message prep
        // -- unlike RUNG 4's same-type-default fixtures -- actually queues a message here,
        // and the following waitmessage needs a real wait-duration resolution.
        externalPorts({
          resolveHalfwordOperand: (_context, operand) =>
            operand.expression === "B_WAIT_TIME_LONG" ? B_WAIT_TIME_LONG : null,
        }),
      );
      const handlers = execution.handlers;
      // Body Slam's real not-very-effective message (see above) makes waitmessage's own
      // pauseCounterBattle threshold loop genuinely run this time (RUNG 4's own step-by-step
      // walk never needed this because its same-type-default fixtures never queue a message
      // there) -- pump scheduler-progressed transitions through to their eventual advance,
      // exactly like Cmd_moveend's own do-while convergence loop elsewhere in this file.
      const step = (state: BattleScriptMachineState<BattleScriptRulesContext>) => {
        let stepped = stepBattleScriptMachine(program, state, handlers);
        while (stepped.kind === "scheduler-progressed") {
          stepped = stepBattleScriptMachine(program, stepped.state, handlers);
        }
        return stepped;
      };
      let result = step(execution.state); // opcode 0
      if (result.kind !== "advanced") throw new Error(`opcode 0 did not advance: ${result.kind}`);
      result = step(result.state); // accuracycheck
      if (result.kind !== "advanced") throw new Error(`accuracycheck did not advance: ${result.kind}`);
      result = step(result.state); // attackstring
      if (result.kind !== "advanced") throw new Error(`attackstring did not advance: ${result.kind}`);
      result = step(result.state); // ppreduce
      if (result.kind !== "advanced") throw new Error(`ppreduce did not advance: ${result.kind}`);
      result = step(result.state); // critcalc
      if (result.kind !== "advanced") throw new Error(`critcalc did not advance: ${result.kind}`);
      result = step(result.state); // damagecalc
      if (result.kind !== "advanced") throw new Error(`damagecalc did not advance: ${result.kind}`);
      result = step(result.state); // typecalc
      if (result.kind !== "advanced") throw new Error(`typecalc did not advance: ${result.kind}`);
      result = step(result.state); // adjustnormaldamage
      if (result.kind !== "advanced") throw new Error(`adjustnormaldamage did not advance: ${result.kind}`);
      for (const label of RUNG_3_LABELS) {
        if (result.kind !== "advanced") throw new Error(`${label} did not advance: ${result.kind}`);
        result = step(result.state);
      }
      if (result.kind !== "advanced") throw new Error(`expected advance before seteffectwithchance, got ${result.kind}`);
      result = step(result.state); // seteffectwithchance
      if (result.kind !== "advanced") throw new Error(`seteffectwithchance did not advance: ${result.kind}`);
      return result;
    }

    // The real ROM's own frame-0 gRngValue for this exact fixture's proc seed (seed 4),
    // docs/set-move-effect-ground-truth.md §2: "Forward-stepping the LCG from frame-0's
    // rngValue (2643437444) exactly 8 times ... lands exactly on frame-450's captured
    // rngValue" -- an oracle-verified 32-bit anchor, not a synthetic reconstruction. (A
    // single target u16 doesn't pin the low 16 bits of the underlying 32-bit LCG state, so
    // rngValueBeforeU16 -- exact for one draw -- would silently diverge from the second draw
    // onward; this proof needs the real seed precisely because it drives four consecutive
    // draws that must all land on the doc's own numbers.)
    const PROC_SEED_FRAME0_RNG_VALUE = 2643437444;

    it("proc seed (real frame-0 rngValue, rolls 61260/64951/891/37229): paralyzes MAGNETON, status1 synced on battler + party slot, exactly 4 RNG calls (zero extra draws vs. a plain hit)", () => {
      const result = walkKadabraBodySlamToSeteffectwithchance(PROC_SEED_FRAME0_RNG_VALUE);
      const rolls = result.state.rng.ledger.map((entry) => entry.randomValue);
      expect(rolls).toEqual([61260, 64951, 891, 37229]); // docs/set-move-effect-ground-truth.md §2's own proc-seed ledger
      expect(result.state.rng.calls).toBe(4);
      expect(result.state.programCounter).toBe(labelPc("BattleScript_MoveEffectParalysis"));
      expect(result.state.callStack.length).toBe(1);
      expect(result.state.rulesContext.battlers[1]!.status1).toBe(STATUS1_PARALYSIS_BIT);
      expect(result.state.rulesContext.party.opponent[0]!.status1).toBe(STATUS1_PARALYSIS_BIT);
      expect(result.state.rulesContext.battlers[1]!.hp).toBe(117); // 125 -> 117, ground truth's own pinned HP
      expect(result.state.rulesContext.battlers[0]!.pp[0]).toBe(14); // 15 -> 14, ground truth's own pinned PP
    });

    // The ground-truth doc pins the control case's own four u16 rolls (40931/33731/29631/
    // 46260) but not its raw 32-bit frame-0 rngValue, and deriving that value would mean
    // querying the live oracle -- off-limits for a hermetic Tier-1 test (AGENTS.md: "no
    // oracle, no emulator, no network"). This seed is therefore a kernel-only synthetic
    // control, picked only for producing a real >=30 (no-proc) roll 4 through the identical
    // opcode chain; its own rolls are asserted for determinism, not claimed to reproduce the
    // doc's literal control numbers.
    const CONTROL_SEED_KERNEL_ONLY = 3;

    it("control seed (kernel-only, no oracle anchor available): hits without paralyzing, status stays untouched, exactly 4 RNG calls", () => {
      const result = walkKadabraBodySlamToSeteffectwithchance(CONTROL_SEED_KERNEL_ONLY);
      const rolls = result.state.rng.ledger.map((entry) => entry.randomValue);
      expect(rolls).toEqual([50515, 12646, 54250, 64452]);
      expect(rolls[3]! % 100).toBeGreaterThanOrEqual(30); // the %100 < 30 chance gate genuinely fails
      expect(result.state.rng.calls).toBe(4);
      expect(result.state.programCounter).not.toBe(labelPc("BattleScript_MoveEffectParalysis"));
      expect(result.state.callStack.length).toBe(0);
      expect(result.state.rulesContext.battlers[1]!.status1).toBe(0);
      expect(result.state.rulesContext.party.opponent[0]!.status1).toBe(0);
      expect(result.state.rulesContext.battlers[1]!.hp).toBe(117); // still a real, non-fatal hit
      expect(result.state.rulesContext.battlers[0]!.pp[0]).toBe(14); // 15 -> 14, same PP decrement regardless of the proc
    });
  },
);

describe("SetMoveEffect family-B cluster 1", () => {
  const TRI_ATTACK = 161;
  const HYPER_BEAM = 63;
  const RAGE = 99;
  const ANCIENT_POWER = 246;
  const SMELLING_SALT = 265;
  const SUPERPOWER = 276;
  const OVERHEAT = 315;
  const RECHARGE = 1 << 22;

  it("exports the cluster-1 and item-motion bytes while Pay Day stays barriered", () => {
    for (const effect of [
      MOVE_EFFECT_TRI_ATTACK,
      MOVE_EFFECT_RECHARGE,
      MOVE_EFFECT_RAGE,
      MOVE_EFFECT_ALL_STATS_UP,
      MOVE_EFFECT_REMOVE_PARALYSIS,
      MOVE_EFFECT_ATK_DEF_DOWN,
      MOVE_EFFECT_SP_ATK_TWO_DOWN,
    ]) {
      expect(SET_MOVE_EFFECT_SUPPORTED_BYTES.has(effect)).toBe(true);
    }
    expect(SET_MOVE_EFFECT_SUPPORTED_BYTES.has(35)).toBe(true); // Rapid Spin, Cluster 3
    expect(SET_MOVE_EFFECT_SUPPORTED_BYTES.has(31)).toBe(true); // Steal Item, Cluster 4
    expect(SET_MOVE_EFFECT_SUPPORTED_BYTES.has(54)).toBe(true); // Knock Off, Cluster 4
    expect(SET_MOVE_EFFECT_SUPPORTED_BYTES.has(11)).toBe(true); // Pay Day, Cluster 4 rung (b)
  });

  for (const [seed, status1, label] of [
    [4, STATUS1_BURN_BIT, "BattleScript_MoveEffectBurn"],
    [3, STATUS1_FREEZE_BIT, "BattleScript_MoveEffectFreeze"],
    [0, STATUS1_PARALYSIS_BIT, "BattleScript_MoveEffectParalysis"],
  ] as const) {
    it(`Tri Attack seed ${seed}: one chance draw plus one selector draw recursively uses ${label}`, () => {
      const rc = context(0, {}, { currentMove: TRI_ATTACK, moveEffectByte: MOVE_EFFECT_TRI_ATTACK });
      const { result } = stepAtOpcode("B_SCR_OP_SETEFFECTWITHCHANCE", rc, seed);
      if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
      expect(result.state.rng.calls).toBe(2);
      expect(result.state.rng.ledger.map((entry) => entry.reason)).toEqual([
        "seteffectwithchance",
        "SetMoveEffect Tri Attack status selector (Random() % 3 + 3)",
      ]);
      expect(result.state.programCounter).toBe(labelPc(label));
      expect(result.state.rulesContext.battlers[1]!.status1).toBe(status1);
      expect(result.state.rulesContext.party.opponent[0]!.status1).toBe(status1);
    });
  }

  it("Tri Attack Freeze cancels an Uproar/Thrash user's complete multi-turn state", () => {
    const rc = context(
      0,
      {},
      { currentMove: TRI_ATTACK, moveEffectByte: MOVE_EFFECT_TRI_ATTACK },
      {
        status2: 0x70 | 0xc00 | 0x1000,
        status3: 0x0004_00c0,
        furyCutterCounter: 2,
      },
    );
    const { result } = stepAtOpcode("B_SCR_OP_SETEFFECTWITHCHANCE", rc, 3);
    if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
    expect(result.state.rulesContext.battlers[1]).toMatchObject({
      status1: STATUS1_FREEZE_BIT,
      status2: 0,
      status3: 0,
      furyCutterCounter: 0,
    });
  });

  it("Tri Attack chance failure consumes only the chance draw", () => {
    const rc = context(0, {}, { currentMove: TRI_ATTACK, moveEffectByte: MOVE_EFFECT_TRI_ATTACK });
    const { result } = stepAtOpcode("B_SCR_OP_SETEFFECTWITHCHANCE", rc, 1);
    if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
    expect(result.state.rng.calls).toBe(1);
    expect(result.state.rulesContext.battlers[1]!.status1).toBe(0);
  });

  it("Tri Attack already-statused no-op consumes the successful chance draw but no selector draw", () => {
    const rc = context(
      0,
      {},
      { currentMove: TRI_ATTACK, moveEffectByte: MOVE_EFFECT_TRI_ATTACK },
      { status1: STATUS1_BURN_BIT },
    );
    const { result } = stepAtOpcode("B_SCR_OP_SETEFFECTWITHCHANCE", rc, 4);
    if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
    expect(result.state.rng.calls).toBe(1);
    expect(result.state.rulesContext.battlers[1]!.status1).toBe(STATUS1_BURN_BIT);
  });

  it("Recharge certain path writes the bit, timer, and current-move lock with zero RNG; duplicate is a no-op", () => {
    const effect = MOVE_EFFECT_RECHARGE | MOVE_EFFECT_AFFECTS_USER | MOVE_EFFECT_CERTAIN;
    const rc = context(0, {}, { currentMove: HYPER_BEAM, moveEffectByte: effect, lockedMoves: [7, 8, 9, 10] });
    const { result } = stepAtOpcode("B_SCR_OP_SETEFFECTWITHCHANCE", rc);
    if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
    expect(result.state.rng.calls).toBe(0);
    expect(result.state.rulesContext.battlers[0]!.status2 & RECHARGE).toBe(RECHARGE);
    expect(result.state.rulesContext.battlers[0]!.rechargeTimer).toBe(2);
    expect(result.state.rulesContext.lockedMoves).toEqual([HYPER_BEAM, 8, 9, 10]);

    const duplicate = context(
      0,
      { status2: RECHARGE, rechargeTimer: 1 },
      { currentMove: HYPER_BEAM, moveEffectByte: effect, lockedMoves: [7, 8, 9, 10] },
    );
    const { result: noOp } = stepAtOpcode("B_SCR_OP_SETEFFECTWITHCHANCE", duplicate);
    if (noOp.kind !== "advanced") throw new Error(`expected advance, got ${noOp.kind}`);
    expect(noOp.state.rulesContext.battlers[0]!.rechargeTimer).toBe(1);
    expect(noOp.state.rulesContext.lockedMoves).toEqual([7, 8, 9, 10]);
  });

  it("Rage primary dispatch always writes the attacker's rage bit with zero RNG", () => {
    const rc = context(0, {}, { currentMove: RAGE, moveEffectByte: MOVE_EFFECT_RAGE });
    const { result } = stepAtOpcode("B_SCR_OP_SETEFFECTPRIMARY", rc);
    if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
    expect(result.state.rng.calls).toBe(0);
    expect(result.state.rulesContext.battlers[0]!.status2 & STATUS2_RAGE).toBe(STATUS2_RAGE);
  });

  it("All Stats Up consumes one successful chance draw and calls its source-ordered callback; failure draws once and skips", () => {
    const effect = MOVE_EFFECT_ALL_STATS_UP | MOVE_EFFECT_AFFECTS_USER;
    const successRc = context(0, {}, { currentMove: ANCIENT_POWER, moveEffectByte: effect });
    const { result: success } = stepAtOpcode("B_SCR_OP_SETEFFECTWITHCHANCE", successRc, 0);
    if (success.kind !== "advanced") throw new Error(`expected advance, got ${success.kind}`);
    expect(success.state.rng.calls).toBe(1);
    expect(success.state.programCounter).toBe(labelPc("BattleScript_AllStatsUp"));
    const { result: failure } = stepAtOpcode("B_SCR_OP_SETEFFECTWITHCHANCE", successRc, 1);
    if (failure.kind !== "advanced") throw new Error(`expected advance, got ${failure.kind}`);
    expect(failure.state.rng.calls).toBe(1);
    expect(failure.state.callStack).toEqual([]);
  });

  it("Remove Paralysis clears active and party status, emits one controller write, and is a zero-RNG no-op when healthy", () => {
    const effect = MOVE_EFFECT_REMOVE_PARALYSIS | MOVE_EFFECT_CERTAIN;
    const rc = context(0, {}, { currentMove: SMELLING_SALT, moveEffectByte: effect }, {
      status1: STATUS1_PARALYSIS_BIT,
    });
    const { result } = stepAtOpcode("B_SCR_OP_SETEFFECTWITHCHANCE", rc);
    if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
    expect(result.state.rng.calls).toBe(0);
    expect(result.state.rulesContext.battlers[1]!.status1).toBe(0);
    expect(result.state.rulesContext.party.opponent[0]!.status1).toBe(0);
    expect(result.state.events).toEqual([
      expect.objectContaining({ kind: "set-battler-status-data", battler: 1, status1: 0 }),
    ]);
    const healthy = context(0, {}, { currentMove: SMELLING_SALT, moveEffectByte: effect });
    const { result: noOp } = stepAtOpcode("B_SCR_OP_SETEFFECTWITHCHANCE", healthy);
    if (noOp.kind !== "advanced") throw new Error(`expected advance, got ${noOp.kind}`);
    expect(noOp.state.rng.calls).toBe(0);
    expect(noOp.state.events).toEqual([]);
  });

  for (const [effect, move, label] of [
    [MOVE_EFFECT_ATK_DEF_DOWN, SUPERPOWER, "BattleScript_AtkDefDown"],
    [MOVE_EFFECT_SP_ATK_TWO_DOWN, OVERHEAT, "BattleScript_SAtkDown2"],
  ] as const) {
    it(`${label}: certain user-directed dispatch calls the committed callback with zero RNG`, () => {
      const rc = context(0, {}, {
        currentMove: move,
        moveEffectByte: effect | MOVE_EFFECT_AFFECTS_USER | MOVE_EFFECT_CERTAIN,
      });
      const { result } = stepAtOpcode("B_SCR_OP_SETEFFECTWITHCHANCE", rc);
      if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
      expect(result.state.rng.calls).toBe(0);
      expect(result.state.programCounter).toBe(labelPc(label));
    });
  }
});

describe("SetMoveEffect family-B cluster 1 committed-script integrations", () => {
  function runEntryToEnd(
    entryLabel: string,
    rulesContext: BattleScriptRulesContext,
    rngSeed: number,
  ) {
    const execution = createBattleScriptStatusRulesExecution(
      program,
      entryLabel,
      rulesContext,
      rngSeed,
      externalPorts({
        resolveHalfwordOperand: (_context, operand) =>
          operand.expression === "B_WAIT_TIME_LONG" || operand.expression === "B_WAIT_TIME_SHORT"
            ? 1
            : null,
      }),
    );
    let state = execution.state;
    let result = stepBattleScriptMachine(program, state, execution.handlers);
    let steps = 1;
    while (result.kind !== "halted" && steps < 1000) {
      state = ackAllPending(result.state);
      result = stepBattleScriptMachine(program, state, execution.handlers);
      steps += 1;
    }
    if (result.kind !== "halted") {
      throw new Error(`${entryLabel} did not reach its own end after ${steps} steps at pc ${result.state.programCounter}`);
    }
    expect(result.state.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
    return result;
  }

  const cases = [
    {
      name: "Tri Attack",
      entry: "BattleScript_EffectTriAttack",
      move: 161,
      seed: 1,
      target: {},
      verify: (rc: BattleScriptRulesContext) => expect(rc.battlers[1]!.status1).not.toBe(0),
    },
    {
      name: "Recharge",
      entry: "BattleScript_EffectRecharge",
      move: 63,
      seed: 1,
      target: {},
      verify: (rc: BattleScriptRulesContext) => {
        expect(rc.battlers[0]!.status2 & (1 << 22)).not.toBe(0);
        expect(rc.battlers[0]!.rechargeTimer).toBe(2);
        expect(rc.lockedMoves[0]).toBe(63);
      },
    },
    {
      name: "Rage",
      entry: "BattleScript_EffectRage",
      move: 99,
      seed: 1,
      target: {},
      verify: (rc: BattleScriptRulesContext) =>
        expect(rc.battlers[0]!.status2 & STATUS2_RAGE).toBe(STATUS2_RAGE),
    },
    {
      name: "All Stats Up",
      entry: "BattleScript_EffectAllStatsUpHit",
      move: 246,
      seed: 61,
      target: {},
      verify: (rc: BattleScriptRulesContext) =>
        expect(rc.battlers[0]!.statStages.slice(1, 6)).toEqual([7, 7, 7, 7, 7]),
    },
    {
      name: "Remove Paralysis",
      entry: "BattleScript_EffectSmellingsalt",
      move: 265,
      seed: 1,
      target: { status1: STATUS1_PARALYSIS_BIT },
      verify: (rc: BattleScriptRulesContext) => {
        expect(rc.battlers[1]!.status1).toBe(0);
        expect(rc.party.opponent[0]!.status1).toBe(0);
      },
    },
    {
      name: "Atk/Def Down",
      entry: "BattleScript_EffectSuperpower",
      move: 276,
      seed: 1,
      target: {},
      verify: (rc: BattleScriptRulesContext) =>
        expect(rc.battlers[0]!.statStages.slice(1, 3)).toEqual([5, 5]),
    },
    {
      name: "Sp. Atk Two Down",
      entry: "BattleScript_EffectOverheat",
      move: 315,
      seed: 1,
      target: {},
      verify: (rc: BattleScriptRulesContext) =>
        expect(rc.battlers[0]!.statStages[4]).toBe(4),
    },
  ] as const;

  for (const fixture of cases) {
    it(`${fixture.name}: real entry reaches its own end without a hidden opcode/operand barrier and canonically replays`, () => {
      const rc = context(
        0,
        {
          attack: 70,
          defense: 70,
          spAttack: 70,
          spDefense: 70,
          moves: [fixture.move, 0, 0, 0],
          pp: [10, 0, 0, 0],
        },
        { currentMove: fixture.move },
        { hp: 1000, maxHP: 1000, defense: 70, spDefense: 70, ...fixture.target },
      );
      const finished = runEntryToEnd(fixture.entry, rc, fixture.seed);
      fixture.verify(finished.state.rulesContext);
      const replay = runEntryToEnd(fixture.entry, rc, fixture.seed);
      expect(replay.state.rulesContext).toEqual(finished.state.rulesContext);
      expect(replay.state.rng.ledger).toEqual(finished.state.rng.ledger);
    });
  }

  it("All Stats Up returns without writes at the all-max boundary after exactly its one chance draw", () => {
    const maxed = context(
      0,
      {
        attack: 70,
        spAttack: 70,
        statStages: [6, 12, 12, 12, 12, 12, 6, 6],
        moves: [246, 0, 0, 0],
        pp: [5, 0, 0, 0],
      },
      { currentMove: 246 },
      { hp: 1000, maxHP: 1000, defense: 70, spDefense: 70 },
    );
    const finished = runEntryToEnd("BattleScript_EffectAllStatsUpHit", maxed, 61);
    expect(finished.state.rulesContext.battlers[0]!.statStages).toEqual([6, 12, 12, 12, 12, 12, 6, 6]);
    expect(finished.state.rng.ledger.filter((entry) => entry.reason === "seteffectwithchance")).toHaveLength(1);
  });

  it("Superpower and Overheat clamp independently at lower stat-room boundaries", () => {
    const superpower = context(
      0,
      {
        attack: 70,
        statStages: [6, 0, 6, 6, 6, 6, 6, 6],
        moves: [276, 0, 0, 0],
        pp: [5, 0, 0, 0],
      },
      { currentMove: 276 },
      { hp: 1000, maxHP: 1000, defense: 70 },
    );
    const superpowerEnd = runEntryToEnd("BattleScript_EffectSuperpower", superpower, 1);
    expect(superpowerEnd.state.rulesContext.battlers[0]!.statStages.slice(1, 3)).toEqual([0, 5]);

    const overheat = context(
      0,
      {
        spAttack: 70,
        statStages: [6, 6, 6, 6, 1, 6, 6, 6],
        moves: [315, 0, 0, 0],
        pp: [5, 0, 0, 0],
      },
      { currentMove: 315 },
      { hp: 1000, maxHP: 1000, spDefense: 70 },
    );
    const overheatEnd = runEntryToEnd("BattleScript_EffectOverheat", overheat, 1);
    expect(overheatEnd.state.rulesContext.battlers[0]!.statStages[4]).toBe(0);
  });

  it("Recharge's next selected action is denied by the existing canceler and clears the lock cell", () => {
    const recharge = context(
      0,
      { attack: 70, moves: [63, 0, 0, 0], pp: [5, 0, 0, 0] },
      { currentMove: 63 },
      { hp: 1000, maxHP: 1000, defense: 70 },
    );
    const first = runEntryToEnd("BattleScript_EffectRecharge", recharge, 1);
    const clearingTurn = Object.freeze({
      ...first.state.rulesContext,
      currentMove: TACKLE,
      currentMovePosition: 0,
      atkCancelerTracker: 0,
    });
    const second = runEntryToEnd("BattleScript_EffectHit", clearingTurn, first.state.rng.value);
    expect(second.state.rulesContext.battlers[0]!.status2 & (1 << 22)).toBe(0);
    expect(second.state.rulesContext.battlers[0]!.rechargeTimer).toBe(0);
    // Source CancelMultiTurnMoves does not clear gLockedMoves; the stale
    // halfword is inert once STATUS2_MULTIPLETURNS/RECHARGE are absent.
    expect(second.state.rulesContext.lockedMoves[0]).toBe(63);
  });
});

describe("SetMoveEffect family-B cluster 2: recoil and Uproar dispatch", () => {
  const DOUBLE_EDGE = 38;
  const TAKE_DOWN = 36;

  function runEntryToEnd(
    entryLabel: string,
    rulesContext: BattleScriptRulesContext,
    rngSeed: number,
  ) {
    const execution = createBattleScriptStatusRulesExecution(
      program,
      entryLabel,
      rulesContext,
      rngSeed,
      externalPorts({
        resolveHalfwordOperand: (_context, operand) =>
          operand.expression === "B_WAIT_TIME_LONG" || operand.expression === "B_WAIT_TIME_SHORT"
            ? 1
            : null,
      }),
    );
    let result = stepBattleScriptMachine(program, execution.state, execution.handlers);
    let steps = 1;
    while (result.kind !== "halted" && steps < 1000) {
      result = stepBattleScriptMachine(
        program,
        ackAllPending(result.state),
        execution.handlers,
      );
      steps += 1;
    }
    if (result.kind !== "halted") throw new Error(`${entryLabel} did not terminate after ${steps} steps`);
    expect(result.state.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
    return result;
  }

  function dispatchRecoil(
    effectByte: number,
    hpDealt: number,
    attackerChanges: Partial<BattleScriptRulesBattler> = {},
  ) {
    const rc = context(
      0,
      { hp: 100, maxHP: 100, ...attackerChanges },
      {
        currentMove: effectByte === MOVE_EFFECT_RECOIL_33 ? DOUBLE_EDGE : TAKE_DOWN,
        moveEffectByte: effectByte | MOVE_EFFECT_AFFECTS_USER | MOVE_EFFECT_CERTAIN,
        hpDealt,
      },
      { hp: 100, maxHP: 100 },
    );
    return stepAtOpcode("B_SCR_OP_SETEFFECTWITHCHANCE", rc).result;
  }

  it("exports Recoil 33, Rapid Spin, and item motion while Pay Day stays barriered", () => {
    expect(SET_MOVE_EFFECT_SUPPORTED_BYTES.has(MOVE_EFFECT_RECOIL_33)).toBe(true);
    expect(SET_MOVE_EFFECT_SUPPORTED_BYTES.has(35)).toBe(true);
    expect(SET_MOVE_EFFECT_SUPPORTED_BYTES.has(31)).toBe(true);
    expect(SET_MOVE_EFFECT_SUPPORTED_BYTES.has(54)).toBe(true);
    expect(SET_MOVE_EFFECT_SUPPORTED_BYTES.has(11)).toBe(true);
  });

  it("Double-Edge derives one-third recoil with C truncation and consumes no RNG", () => {
    const result = dispatchRecoil(MOVE_EFFECT_RECOIL_33, 50);
    if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
    expect(result.state.rulesContext.battleMoveDamage).toBe(16);
    expect(result.state.programCounter).toBe(labelPc("BattleScript_MoveEffectRecoil"));
    expect(result.state.callStack).toHaveLength(1);
    expect(result.state.rng.calls).toBe(0);
  });

  it("Double-Edge raises zero quotient to minimum recoil 1", () => {
    const result = dispatchRecoil(MOVE_EFFECT_RECOIL_33, 2);
    if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
    expect(result.state.rulesContext.battleMoveDamage).toBe(1);
    expect(result.state.rng.calls).toBe(0);
  });

  it("the existing 25% recoil case uses the same committed callback and consumes no RNG", () => {
    const result = dispatchRecoil(MOVE_EFFECT_RECOIL_25, 50);
    if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
    expect(result.state.rulesContext.battleMoveDamage).toBe(12);
    expect(result.state.programCounter).toBe(labelPc("BattleScript_MoveEffectRecoil"));
    expect(result.state.rng.calls).toBe(0);
  });

  it("Rock Head is accepted by jumpifability and skips the HP-update tail", () => {
    const dispatch = dispatchRecoil(MOVE_EFFECT_RECOIL_33, 50, { ability: ABILITY_ROCK_HEAD });
    if (dispatch.kind !== "advanced") throw new Error(`expected advance, got ${dispatch.kind}`);
    const execution = createBattleScriptStatusRulesExecution(
      program,
      "BattleScript_MoveEffectRecoil",
      dispatch.state.rulesContext,
      dispatch.state.rng.value,
      externalPorts(),
    );
    let result = stepBattleScriptMachine(program, execution.state, execution.handlers);
    while (result.kind !== "halted" && result.state.callStack.length === 0 && result.state.events.length === 0) {
      result = stepBattleScriptMachine(program, result.state, execution.handlers);
    }
    expect(result.kind).toBe("halted");
    expect(result.state.haltReason).toMatchObject({ kind: "return-stack-underflow" });
    expect(result.state.rulesContext.battlers[0]!.hp).toBe(100);
    expect(result.state.rulesContext.lastUsedAbility).toBe(ABILITY_ROCK_HEAD);
    expect(result.state.events).toEqual([]);
  });

  it("Double-Edge committed script damages the target before recoil self-KO, then faints the attacker", () => {
    const rc = context(
      0,
      {
        ability: 0,
        hp: 5,
        maxHP: 100,
        attack: 200,
        level: 50,
        types: ["TYPE_NORMAL", "TYPE_NORMAL"],
        moves: [DOUBLE_EDGE, 0, 0, 0],
        pp: [15, 0, 0, 0],
      },
      { currentMove: DOUBLE_EDGE },
      { hp: 1000, maxHP: 1000, defense: 50 },
    );
    const finished = runEntryToEnd("BattleScript_EffectDoubleEdge", rc, 1);
    expect(finished.state.rulesContext.battlers[1]!.hp).toBeLessThan(1000);
    expect(finished.state.rulesContext.battlers[0]!.hp).toBe(0);
    const targetDamage = finished.state.events.findIndex(
      (event) => event.kind === "hp-change" && event.battler === 1,
    );
    const recoilDamage = finished.state.events.findIndex(
      (event) => event.kind === "hp-change" && event.battler === 0,
    );
    const attackerFaint = finished.state.events.findIndex(
      (event) => event.kind === "faint-animation" && event.battler === 0,
    );
    expect(targetDamage).toBeGreaterThanOrEqual(0);
    expect(recoilDamage).toBeGreaterThan(targetDamage);
    expect(attackerFaint).toBeGreaterThan(recoilDamage);
    expect(finished.state.rng.ledger.map((entry) => entry.reason)).toEqual([
      "accuracycheck",
      "critcalc",
      "adjustnormaldamage",
    ]);
  });

  for (const [name, entryLabel, move] of [
    ["Double-Edge", "BattleScript_EffectDoubleEdge", DOUBLE_EDGE],
    ["Take Down", "BattleScript_EffectRecoil", TAKE_DOWN],
  ] as const) {
    it(`${name} full committed script reaches MOVEEND and canonically replays through the shared Rock Head gate`, () => {
      const rc = context(
        0,
        {
          ability: 0,
          hp: 100,
          maxHP: 100,
          attack: 70,
          moves: [move, 0, 0, 0],
          pp: [10, 0, 0, 0],
        },
        { currentMove: move },
        { hp: 1000, maxHP: 1000, defense: 70 },
      );
      const finished = runEntryToEnd(entryLabel, rc, 1);
      expect(finished.state.rulesContext.battlers[0]!.hp).toBeLessThan(100);
      expect(finished.state.rng.ledger.some((entry) => entry.reason === "seteffectwithchance")).toBe(false);
      const replay = runEntryToEnd(entryLabel, rc, 1);
      expect(replay.state.rulesContext).toEqual(finished.state.rulesContext);
      expect(replay.state.rng.ledger).toEqual(finished.state.rng.ledger);
      expect(replay.state.events).toEqual(finished.state.events);
    });
  }

  it("Rock Head negates recoil in a full committed Double-Edge turn", () => {
    const rc = context(
      0,
      {
        ability: ABILITY_ROCK_HEAD,
        hp: 100,
        maxHP: 100,
        attack: 70,
        moves: [DOUBLE_EDGE, 0, 0, 0],
        pp: [10, 0, 0, 0],
      },
      { currentMove: DOUBLE_EDGE },
      { hp: 1000, maxHP: 1000, defense: 70 },
    );
    const finished = runEntryToEnd("BattleScript_EffectDoubleEdge", rc, 1);
    expect(finished.state.rulesContext.battlers[1]!.hp).toBeLessThan(1000);
    expect(finished.state.rulesContext.battlers[0]!.hp).toBe(100);
    expect(finished.state.rulesContext.lastUsedAbility).toBe(ABILITY_ROCK_HEAD);
    expect(finished.state.events).not.toContainEqual(
      expect.objectContaining({ kind: "hp-change", battler: 0 }),
    );
  });

  it("fresh Uproar consumes the standard chance draw then its source timer draw, locks the move for 2-5 turns, and calls its message script", () => {
    const UPROAR = 253;
    const rc = context(
      0,
      { moves: [UPROAR, 0, 0, 0], pp: [10, 0, 0, 0] },
      {
        currentMove: UPROAR,
        moveEffectByte: MOVE_EFFECT_UPROAR | MOVE_EFFECT_AFFECTS_USER,
        lockedMoves: [0, 0, 0, 0],
      },
    );
    const { result } = stepAtOpcode("B_SCR_OP_SETEFFECTWITHCHANCE", rc, 1);
    if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
    expect(result.state.rng.calls).toBe(2);
    expect(result.state.rng.ledger.map((entry) => entry.reason)).toEqual([
      "seteffectwithchance",
      "SetMoveEffect Uproar duration ((Random() & 3) + 2)",
    ]);
    const turns = (result.state.rng.ledger[1]!.randomValue & 3) + 2;
    expect(result.state.rulesContext.battlers[0]!.status2 & 0x70).toBe(turns << 4);
    expect(result.state.rulesContext.battlers[0]!.status2 & (1 << 12)).not.toBe(0);
    expect(result.state.rulesContext.lockedMoves[0]).toBe(UPROAR);
    expect(result.state.programCounter).toBe(labelPc("BattleScript_MoveEffectUproar"));
  });

  it("continuing Uproar still consumes its chance draw but neither rerolls duration nor rewrites the lock", () => {
    const UPROAR = 253;
    const status2 = (4 << 4) | (1 << 12);
    const rc = context(
      0,
      { status2, moves: [UPROAR, 0, 0, 0], pp: [10, 0, 0, 0] },
      {
        currentMove: UPROAR,
        moveEffectByte: MOVE_EFFECT_UPROAR | MOVE_EFFECT_AFFECTS_USER,
        lockedMoves: [UPROAR, 2, 3, 4],
      },
    );
    const { result } = stepAtOpcode("B_SCR_OP_SETEFFECTWITHCHANCE", rc, 1);
    if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
    expect(result.state.rng.ledger.map((entry) => entry.reason)).toEqual(["seteffectwithchance"]);
    expect(result.state.rulesContext.battlers[0]!.status2).toBe(status2);
    expect(result.state.rulesContext.lockedMoves).toEqual([UPROAR, 2, 3, 4]);
    expect(result.state.callStack).toEqual([]);
  });

  it("Uproar full committed script reaches MOVEEND and canonically replays", () => {
    const UPROAR = 253;
    const rc = context(
      0,
      { attack: 70, moves: [UPROAR, 0, 0, 0], pp: [10, 0, 0, 0] },
      { currentMove: UPROAR },
      { hp: 1000, maxHP: 1000, defense: 70 },
    );
    const finished = runEntryToEnd("BattleScript_EffectUproar", rc, 1);
    expect(finished.state.rulesContext.battlers[0]!.status2 & 0x70).not.toBe(0);
    expect(finished.state.rulesContext.lockedMoves[0]).toBe(UPROAR);
    expect(finished.state.rng.ledger.map((entry) => entry.reason).slice(-2)).toEqual([
      "seteffectwithchance",
      "SetMoveEffect Uproar duration ((Random() & 3) + 2)",
    ]);
    const replay = runEntryToEnd("BattleScript_EffectUproar", rc, 1);
    expect(replay.state.rulesContext).toEqual(finished.state.rulesContext);
    expect(replay.state.rng.ledger).toEqual(finished.state.rng.ledger);
    expect(replay.state.events).toEqual(finished.state.events);
  });
});
