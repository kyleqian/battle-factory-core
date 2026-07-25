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
  loadBattleScriptProgram,
  resolveBattleScriptLabel,
} from "../src/engine/battleScriptProgram.ts";
import { stepBattleScriptMachine } from "../src/engine/battleScriptMachine.ts";

const program = loadBattleScriptProgram();
const TACKLE = 33; // EFFECT_HIT, power 35, accuracy 95, TYPE_NORMAL
const SLAM = 21; // EFFECT_HIT, power 80, accuracy 75, TYPE_NORMAL

function battler(changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 100,
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
    endured: changes.endured,
    helpingHand: changes.helpingHand,
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

function labelPc(label: string): number {
  const entry = resolveBattleScriptLabel(program, label);
  if (!entry) throw new Error(`committed Battle Script program does not define label ${label}`);
  return entry.programCounter;
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

  describe("(b) unsupported-branch barriers", () => {
    it("halts on non-ACC_CURR_MOVE call sites (9 exist in the committed program, none on the hit chain)", () => {
      const nonAccCurrMove = program.instructions.find(
        (i) => i.opcodeName === "B_SCR_OP_ACCURACYCHECK" && i.operands[1]?.expression !== "ACC_CURR_MOVE",
      );
      expect(nonAccCurrMove).toBeDefined();
      const rc = context(0);
      const { execution } = stepFrom("BattleScript_HitFromAccCheck", rc, 1);
      const patched = Object.freeze({ ...execution.state, programCounter: nonAccCurrMove!.programCounter });
      const result = stepBattleScriptMachine(program, patched, execution.handlers);
      expect(result.kind).toBe("halted");
      expect(result.state.haltReason).toMatchObject({
        kind: "unsupported-branch",
        sourceFile: "battle_script_commands.c",
        sourceLine: 1103,
      });
    });

    it("halts on STATUS3_ALWAYS_HITS (Lock-On, battlerWithSureHit unmodeled)", () => {
      const rc = context(0, {}, {}, { status3: 1 << 3 });
      const { result } = stepFrom("BattleScript_HitFromAccCheck", rc, 1);
      expect(result.kind).toBe("halted");
      expect(result.state.haltReason).toMatchObject({ kind: "unsupported-branch", sourceLine: 1052 });
    });

    it("halts when the target holds a nonzero ability on a hit (AbilityBattleEffects absorbing unmodeled)", () => {
      const rc = context(0, {}, {}, { ability: 3 });
      const { result } = stepFrom("BattleScript_HitFromAccCheck", rc, 1);
      expect(result.kind).toBe("halted");
      expect(result.state.haltReason).toMatchObject({ kind: "unsupported-branch", sourceLine: 1020 });
    });
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
});

const STRENGTH = 70; // EFFECT_HIT, power 80, accuracy 100, TYPE_NORMAL
const FALSE_SWIPE = 206; // EFFECT_FALSE_SWIPE, power 40, accuracy 100, TYPE_NORMAL
const ABILITY_BATTLE_ARMOR = 4;
const ABILITY_LEVITATE = 26;
const ABILITY_WONDER_GUARD = 25;
const HOLD_EFFECT_ITEM_FOCUS_BAND = 196; // ITEM_FOCUS_BAND
const HOLD_EFFECT_ITEM_LEFTOVERS = 200; // ITEM_LEFTOVERS -- a real held item, not Focus Band

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
  it("registers B_SCR_OP_DAMAGECALC", () => {
    const instruction = program.instructions.find((i) => i.opcodeName === "B_SCR_OP_DAMAGECALC")!;
    expect(instruction).toBeDefined();
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
  });

  it("Foresight lets Normal hit a Ghost target (skips only the immunity table row)", () => {
    const rc = context(
      0,
      { types: ["TYPE_WATER", "TYPE_WATER"] }, // avoid STAB muddying the pinned 10
      { battleMoveDamage: 10 },
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

  describe("(b) unsupported-branch barrier: Focus Band, only when actually held", () => {
    it("halts when the target holds Focus Band (its roll is unmodeled)", () => {
      const rc = context(0, {}, { battleMoveDamage: 999 }, { hp: 10, item: HOLD_EFFECT_ITEM_FOCUS_BAND });
      const { result } = stepAtOpcode("B_SCR_OP_ADJUSTNORMALDAMAGE", rc, rngValueBeforeU16(52212));
      expect(result.kind).toBe("halted");
      expect(result.state.haltReason).toMatchObject({
        kind: "unsupported-branch",
        sourceFile: "battle_script_commands.c",
        sourceLine: 1677,
      });
    });

    it("does not barrier a different held item on the same lethal-hit shape", () => {
      const rc = context(0, {}, { battleMoveDamage: 999 }, { hp: 10, endured: 1, item: HOLD_EFFECT_ITEM_LEFTOVERS });
      const { result } = stepAtOpcode("B_SCR_OP_ADJUSTNORMALDAMAGE", rc, rngValueBeforeU16(52212));
      expect(result.kind).toBe("advanced");
      if (result.kind !== "advanced") throw new Error("expected advance");
      expect(result.state.rulesContext.battleMoveDamage).toBe(9); // hp - 1, clamped via Endure, item ignored
    });
  });
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
    expect(result.state.scheduler.pendingControllerBattlers).toContain(1);
  });

  it("killing hit: HP clamps to 0, hpDealt is the remaining HP not the full damage (KO scenario's 90 -> 0)", () => {
    const rc = context(0, {}, { battleMoveDamage: 204 }, { hp: 90 });
    const { result } = stepAtOpcode("B_SCR_OP_DATAHPUPDATE", rc);
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battlers[1]!.hp).toBe(0);
    expect(result.state.rulesContext.hpDealt).toBe(90);
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

    it("halts on negative damage (HP gain needs maxHP, unmodeled)", () => {
      const rc = context(0, {}, { battleMoveDamage: -10 }, { hp: 50 });
      const { result } = stepAtOpcode("B_SCR_OP_DATAHPUPDATE", rc);
      expect(result.kind).toBe("halted");
      expect(result.state.haltReason).toMatchObject({ kind: "unsupported-branch", sourceLine: 1899 });
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

  describe("(b) unsupported-branch barriers", () => {
    it("halts on MOVE_RESULT_ONE_HIT_KO (OHKO subsystem unmodeled)", () => {
      const rc = context(0, {}, { moveResultFlags: 1 << 4 });
      const { result } = stepAtOpcode("B_SCR_OP_RESULTMESSAGE", rc);
      expect(result.kind).toBe("halted");
      expect(result.state.haltReason).toMatchObject({ kind: "unsupported-branch", sourceLine: 2071 });
    });

    it("halts on MOVE_RESULT_FOE_HUNG_ON (Focus Band subsystem unmodeled)", () => {
      const rc = context(0, {}, { moveResultFlags: 1 << 7 });
      const { result } = stepAtOpcode("B_SCR_OP_RESULTMESSAGE", rc);
      expect(result.kind).toBe("halted");
      expect(result.state.haltReason).toMatchObject({ kind: "unsupported-branch", sourceLine: 2083 });
    });
  });
});

describe("RUNG 3 integration: opcode 0 -> ... -> resultmessage -> seteffectwithchance boundary", () => {
  it("RUNG 1 hit turn (Tackle, seed 1): walks the full hit chain and halts at seteffectwithchance", () => {
    const rc = context(0);
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
    const halted = stepBattleScriptMachine(program, result.state, handlers); // seteffectwithchance: RUNG-4 boundary
    expect(halted.kind).toBe("unsupported");
  });

  it(
    "full staged hit turn on the KO scenario's real ROM seed (919694434): reproduces the pinned "
      + "142 -> 213 -> 213 -> 204 damage chain, the exact 3-roll ledger (accuracycheck, critcalc, "
      + "adjustnormaldamage), and the killing hit's HP -> 0, then hands off cleanly at "
      + "seteffectwithchance",
    () => {
      const rc = context(
        0,
        { attack: 200, level: 50, types: ["TYPE_NORMAL", "TYPE_NORMAL"] },
        { currentMove: STRENGTH },
        { defense: 50, types: ["TYPE_GRASS", "TYPE_GRASS"], hp: 90 },
      );
      const execution = createBattleScriptStatusRulesExecution(
        program,
        "BattleScript_HitFromAtkCanceler",
        rc,
        919694434, // the KO scenario's actual frame-0 gRngValue (docs/hit-chain-ground-truth.md)
        externalPorts(),
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

      const halted = stepBattleScriptMachine(program, result.state, handlers); // seteffectwithchance: RUNG-4 boundary
      expect(halted.kind).toBe("unsupported");
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
