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
import { stepBattleScriptMachine } from "../src/engine/battleScriptMachine.ts";

/**
 * Semi-invulnerable registration rungs 6-7
 * (docs/semi-invulnerable-registration-scout.md §2a/§2c/§5).
 */

const program = loadBattleScriptProgram();
/** include/constants/moves.h. */
const MOVE_FLY = 19;
const MOVE_DIG = 91;
const MOVE_DIVE = 291;
const MOVE_BOUNCE = 340;
const TACKLE = 33;
/** include/constants/battle.h:139,163,164,175,259,300. */
const STATUS2_MULTIPLETURNS = 1 << 12;
const STATUS3_ON_AIR = 1 << 6;
const STATUS3_UNDERGROUND = 1 << 7;
const STATUS3_UNDERWATER = 1 << 18;
const MOVE_EFFECT_CHARGING = 12;
const MOVE_EFFECT_RAGE = 30;

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
    types: changes.types ?? (["TYPE_NORMAL", "TYPE_NORMAL"] as const),
    species: changes.species ?? 1,
    attack: changes.attack ?? 50,
    defense: changes.defense ?? 50,
    spAttack: changes.spAttack ?? 50,
    spDefense: changes.spDefense ?? 50,
    level: changes.level ?? 50,
    friendship: changes.friendship ?? 0,
    partyIndex: changes.partyIndex ?? 0,
  }) as unknown as BattleScriptRulesBattler;
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
    selectorRoles: { attacker: 0, target: 1, effectBattler: 0, fainted: null },
    scriptingBattler: 0,
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

function externalPorts(): BattleScriptStatusRulesExternalPorts {
  return Object.freeze({
    isControllerIdle: () => true,
    prepareMessage: () => null,
    prepareSelectionMessage: () => null,
    prepareSelectionMessageFromTable: () => null,
    resolveAttackerBattler: () => null,
    resolveBattlerAtPosition: () => null,
    resolveHalfwordOperand: () => null,
    resolveByteOperand: () => null,
  });
}

function stepAtProgramCounter(pc: number, rulesContext: BattleScriptRulesContext, entryLabel = "BattleScript_EffectHit") {
  const execution = createBattleScriptStatusRulesExecution(program, entryLabel, rulesContext, 1, externalPorts());
  const patched = Object.freeze({ ...execution.state, programCounter: pc });
  return { execution, result: stepBattleScriptMachine(program, patched, execution.handlers) };
}

describe("B_SCR_OP_SETSEMIINVULNERABLEBIT / B_SCR_OP_CLEARSEMIINVULNERABLEBIT (registered, zero barriers)", () => {
  it("registers both opcodes", () => {
    expect(program.instructions.find((i) => i.opcodeName === "B_SCR_OP_SETSEMIINVULNERABLEBIT")).toBeDefined();
    expect(program.instructions.find((i) => i.opcodeName === "B_SCR_OP_CLEARSEMIINVULNERABLEBIT")).toBeDefined();
  });

  const setPc = program.instructions.find((i) => i.opcodeName === "B_SCR_OP_SETSEMIINVULNERABLEBIT")!.programCounter;
  const clearPc = program.instructions.find((i) => i.opcodeName === "B_SCR_OP_CLEARSEMIINVULNERABLEBIT")!.programCounter;

  const cases: readonly [number, number, string][] = [
    [MOVE_FLY, STATUS3_ON_AIR, "Fly -> STATUS3_ON_AIR"],
    [MOVE_BOUNCE, STATUS3_ON_AIR, "Bounce -> STATUS3_ON_AIR (shares Fly's bit)"],
    [MOVE_DIG, STATUS3_UNDERGROUND, "Dig -> STATUS3_UNDERGROUND"],
    [MOVE_DIVE, STATUS3_UNDERWATER, "Dive -> STATUS3_UNDERWATER"],
  ];

  for (const [move, bit, label] of cases) {
    it(`set: ${label}`, () => {
      const rc = context({}, { currentMove: move });
      const { result } = stepAtProgramCounter(setPc, rc);
      if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
      expect(result.state.rulesContext.battlers[0]!.status3).toBe(bit);
      expect(result.state.programCounter).toBe(setPc + 1);
    });

    it(`clear: ${label}`, () => {
      const rc = context({ status3: bit }, { currentMove: move });
      const { result } = stepAtProgramCounter(clearPc, rc);
      if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
      expect(result.state.rulesContext.battlers[0]!.status3).toBe(0);
      expect(result.state.programCounter).toBe(clearPc + 1);
    });
  }

  it("a non-semi-invulnerable current move sets/clears no bit at all (switch's implicit default)", () => {
    const rc = context({}, { currentMove: TACKLE });
    const { result } = stepAtProgramCounter(setPc, rc);
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battlers[0]!.status3).toBe(0);
  });

  it(
    "cross-battler consumer integration: the already-registered accuracycheck ACC_CURR_MOVE path forces a miss "
      + "against an ON_AIR target set by this opcode, proving the write/read composition end-to-end",
    () => {
      const accuracycheckPc = program.instructions.find(
        (i) => i.opcodeName === "B_SCR_OP_ACCURACYCHECK" && i.source.label === "BattleScript_HitFromAccCheck",
      )!.programCounter;

      // Target (battler 1) is ON_AIR (e.g. mid-Fly); attacker (battler 0) uses plain Tackle, no ignore-bit set.
      const missRc = context({}, { currentMove: TACKLE }, { status3: STATUS3_ON_AIR });
      const { result: missResult } = stepAtProgramCounter(accuracycheckPc, missRc);
      if (missResult.kind !== "advanced") throw new Error(`expected advance, got ${missResult.kind}`);
      const missTarget = program.instructions.find((i) => i.source.label === "BattleScript_PrintMoveMissed")!;
      expect(missResult.state.programCounter).toBe(missTarget.programCounter);
      expect(missResult.state.rng.calls).toBe(0); // dodge short-circuits before the accuracy roll

      // Same target, ON_AIR bit unset: the ordinary accuracy roll runs instead.
      const hitRc = context({}, { currentMove: TACKLE }, { status3: 0 });
      const { result: hitResult } = stepAtProgramCounter(accuracycheckPc, hitRc);
      if (hitResult.kind !== "advanced") throw new Error(`expected advance, got ${hitResult.kind}`);
      expect(hitResult.state.rng.calls).toBe(1);
    },
  );
});

describe("B_SCR_OP_CLEARSTATUSFROMEFFECT (registered, one selector-resolution barrier)", () => {
  it("registers the opcode", () => {
    expect(program.instructions.find((i) => i.opcodeName === "B_SCR_OP_CLEARSTATUSFROMEFFECT")).toBeDefined();
  });

  const pc = program.instructions.find(
    (i) => i.opcodeName === "B_SCR_OP_CLEARSTATUSFROMEFFECT" && i.source.label === "BattleScript_SecondTurnSemiInvulnerable",
  )!.programCounter;

  it("MOVE_EFFECT_CHARGING: clears STATUS2_MULTIPLETURNS on the attacker, resets moveEffectByte", () => {
    const rc = context({ status2: STATUS2_MULTIPLETURNS }, { moveEffectByte: MOVE_EFFECT_CHARGING });
    const { result } = stepAtProgramCounter(pc, rc, "BattleScript_SecondTurnSemiInvulnerable");
    if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
    expect(result.state.rulesContext.battlers[0]!.status2 & STATUS2_MULTIPLETURNS).toBe(0);
    expect(result.state.rulesContext.moveEffectByte).toBe(0);
    expect(result.state.programCounter).toBe(pc + 1);
  });

  it("MOVE_EFFECT_RAGE: genuine no-op (sStatusFlagsForMoveEffects[30] is 0) -- status2 unchanged, moveEffectByte still reset", () => {
    const rc = context({ status2: 0xabc }, { moveEffectByte: MOVE_EFFECT_RAGE });
    const { result } = stepAtProgramCounter(pc, rc, "BattleScript_SecondTurnSemiInvulnerable");
    if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
    expect(result.state.rulesContext.battlers[0]!.status2).toBe(0xabc);
    expect(result.state.rulesContext.moveEffectByte).toBe(0);
  });

  it(
    "family-A (status1) branch, structurally exercised though provably unreached by any committed script "
      + "feeding this opcode today: effectByte <= PRIMARY_STATUS_MOVE_EFFECT selects status1, and since no "
      + "listed mask exists below 12 either, status1 is left unchanged (same default-0 semantics as MOVE_EFFECT_RAGE)",
    () => {
      const rc = context({ status1: 0x7, status2: 0xabc }, { moveEffectByte: 0 });
      const { result } = stepAtProgramCounter(pc, rc, "BattleScript_SecondTurnSemiInvulnerable");
      if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
      expect(result.state.rulesContext.battlers[0]!.status1).toBe(0x7);
      expect(result.state.rulesContext.battlers[0]!.status2).toBe(0xabc); // family-B untouched on this branch
    },
  );

  it("reachability: all 5 concrete BS_ATTACKER call sites in the committed program (RazorWind/SkyAttack/SkullBash/SolarBeam's shared BattleScript_TwoTurnMovesSecondTurn, SemiInvulnerable's own SecondTurn, and Bide's own two)", () => {
    const found = program.instructions.filter((i) => i.opcodeName === "B_SCR_OP_CLEARSTATUSFROMEFFECT");
    expect(found.length).toBe(5);
    for (const instruction of found) {
      expect(instruction.operands[0]?.expression).toBe("BS_ATTACKER");
    }
  });

  describe("(b) unsupported-branch barrier: GetBattlerForBattleScript selector unavailable (BS_ATTACKER before an attacker is assigned)", () => {
    it("halts when selectorRoles.attacker is null", () => {
      const rc = Object.freeze({
        ...context({}, { moveEffectByte: MOVE_EFFECT_CHARGING }),
        selectorRoles: Object.freeze({ attacker: null, target: 1, effectBattler: 0, fainted: null }),
      });
      const { result } = stepAtProgramCounter(pc, rc, "BattleScript_SecondTurnSemiInvulnerable");
      expect(result.kind).toBe("halted");
      expect(result.state.haltReason).toMatchObject({ kind: "unsupported-branch" });
    });

    it("pass-through: the real BS_ATTACKER selector never trips the barrier", () => {
      const rc = context({}, { moveEffectByte: MOVE_EFFECT_CHARGING });
      const { result } = stepAtProgramCounter(pc, rc, "BattleScript_SecondTurnSemiInvulnerable");
      expect(result.kind).toBe("advanced");
    });
  });
});
