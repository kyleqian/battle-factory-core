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
import {
  acknowledgeBattleScriptMachineController,
  stepBattleScriptMachine,
} from "../src/engine/battleScriptMachine.ts";

const program = loadBattleScriptProgram();
const TACKLE = 33; // EFFECT_HIT, power 35, TYPE_NORMAL

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
    confusionSelfDmg: changes.confusionSelfDmg,
    item: changes.item ?? 0,
    statStages: changes.statStages ?? [6, 6, 6, 6, 6, 6, 6, 6],
    specialStatus: changes.specialStatus,
    types: changes.types ?? (["TYPE_NORMAL", "TYPE_NORMAL"] as const),
    species: changes.species ?? 0,
    personality: changes.personality ?? 0,
    attack: changes.attack ?? 0,
    defense: changes.defense ?? 0,
    spAttack: changes.spAttack ?? 0,
    spDefense: changes.spDefense ?? 0,
    level: changes.level ?? 50,
    friendship: changes.friendship ?? 0,
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
    moveendState: 0,
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

/** Lands directly on BattleScript_MoveEnd's B_SCR_OP_MOVEEND instruction (past its setbyte). */
function stepAtMoveend(rulesContext: BattleScriptRulesContext, rngSeed = 1) {
  const execution = createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_MoveEnd",
    rulesContext,
    rngSeed,
    externalPorts(),
  );
  const moveendPc = execution.state.programCounter + 1;
  const instruction = program.instructions[moveendPc];
  if (instruction?.opcodeName !== "B_SCR_OP_MOVEEND") {
    throw new Error("BattleScript_MoveEnd's second instruction is not B_SCR_OP_MOVEEND");
  }
  const patched = Object.freeze({ ...execution.state, programCounter: moveendPc });
  return { execution, moveendPc, result: stepBattleScriptMachine(program, patched, execution.handlers) };
}

function labelPc(label: string): number {
  const entry = resolveBattleScriptLabel(program, label);
  if (!entry) throw new Error(`committed Battle Script program does not define label ${label}`);
  return entry.programCounter;
}

/**
 * Drives one B_SCR_OP_MOVEEND instruction across its controller-return pauses
 * (ordinarily states 9 and 10, see the vertical audit) to genuine completion,
 * acknowledging between resumptions exactly as a real driver must.
 */
function runMoveendToCompletion(rulesContext: BattleScriptRulesContext, rngSeed = 1) {
  const { execution, moveendPc, result: first } = stepAtMoveend(rulesContext, rngSeed);
  let result = first;
  let resumptions = 0;
  while (result.kind === "advanced" && result.state.programCounter === moveendPc) {
    resumptions += 1;
    if (resumptions > 17) throw new Error("Cmd_moveend did not converge on MOVEEND_COUNT");
    let state = result.state;
    for (const battler of state.scheduler.pendingControllerBattlers) {
      state = acknowledgeBattleScriptMachineController(state, battler);
    }
    result = stepBattleScriptMachine(program, state, execution.handlers);
  }
  return { execution, moveendPc, result, resumptions };
}

function runMoveendScriptToTerminal(rulesContext: BattleScriptRulesContext, rngSeed = 1) {
  const { execution, moveendPc } = stepAtMoveend(rulesContext, rngSeed);
  let state = Object.freeze({ ...execution.state, programCounter: moveendPc });
  let result = stepBattleScriptMachine(program, state, execution.handlers);
  for (let steps = 0; result.kind !== "halted" && steps < 300; steps += 1) {
    state = result.state;
    for (const battlerId of state.scheduler.pendingControllerBattlers) {
      state = acknowledgeBattleScriptMachineController(state, battlerId);
    }
    result = stepBattleScriptMachine(program, state, execution.handlers);
  }
  if (result.kind !== "halted") throw new Error("moveend callback did not reach BattleScript_MoveEnd's own END");
  expect(result.state.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
  return result;
}

function runCommittedScriptToTerminal(
  entryLabel: string,
  rulesContext: BattleScriptRulesContext,
  rngSeed: number,
) {
  const execution = createBattleScriptStatusRulesExecution(
    program,
    entryLabel,
    rulesContext,
    rngSeed,
    externalPorts(),
  );
  let result = stepBattleScriptMachine(program, execution.state, execution.handlers);
  for (let steps = 0; result.kind !== "halted" && steps < 500; steps += 1) {
    let state = result.state;
    for (const battlerId of state.scheduler.pendingControllerBattlers) {
      state = acknowledgeBattleScriptMachineController(state, battlerId);
    }
    result = stepBattleScriptMachine(program, state, execution.handlers);
  }
  if (result.kind !== "halted") throw new Error(`${entryLabel} did not reach its own END`);
  expect(result.state.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
  return result;
}

describe("production moveend (Cmd_moveend) registration", () => {
  it("registers B_SCR_OP_MOVEEND", () => {
    const instruction = program.instructions.find((i) => i.opcodeName === "B_SCR_OP_MOVEEND");
    expect(instruction).toBeDefined();
  });

  it("moveendall (endMode 0, no barrier states): runs states 0-16 to MOVEEND_COUNT and advances past the instruction", () => {
    const rc = context(0, { attack: 40 }, {}, { defense: 40, hp: 50 });
    const { result, moveendPc, resumptions } = runMoveendToCompletion(rc);
    if (result.kind !== "advanced") throw new Error(`expected advanced, got ${result.kind}`);
    expect(resumptions).toBe(2); // controller-returns at states 9 (attacker) and 10 (target)
    expect(result.state.rulesContext.moveendState).toBe(17);
    expect(result.state.programCounter).toBe(moveendPc + 1);
    expect(result.state.rng.calls).toBe(0);
  });

  it("MOVEEND_RAGE applies: increments target Attack, calls BattleScript_RageIsBuilding with the current PC pushed", () => {
    const rc = context(
      0,
      {},
      { moveResultFlags: 0 },
      { status2: 1 << 23, hp: 50, specialStatus: { physicalDmg: 4 } },
    );
    const { result, moveendPc } = stepAtMoveend(rc);
    if (result.kind !== "advanced") throw new Error(`expected advanced, got ${result.kind}`);
    expect(result.state.programCounter).toBe(labelPc("BattleScript_RageIsBuilding"));
    expect(result.state.callStack.at(-1)).toBe(moveendPc);
    expect(result.state.rulesContext.battlers[1]!.statStages[1]).toBe(7);
    expect(result.state.rulesContext.moveendState).toBe(1);
  });

  it("MOVEEND_RAGE does not apply without STATUS2_RAGE: passes through with no stat change", () => {
    // Ordinary turns pause (controller-return, same PC) at state 9 -- neither
    // battler is semi-invulnerable, so MOVEEND_ATTACKER_VISIBLE always fires
    // its visibility controller command (docs/battle-script-move-end-vertical-audit.md
    // case 9/10); this only isolates RAGE's own no-op branch.
    const rc = context(0, {}, {}, { hp: 50, specialStatus: { physicalDmg: 4 } });
    const { result } = stepAtMoveend(rc);
    if (result.kind !== "advanced") throw new Error(`expected advanced, got ${result.kind}`);
    expect(result.state.rulesContext.moveendState).toBe(10); // paused at MOVEEND_ATTACKER_VISIBLE
    expect(result.state.rulesContext.battlers[1]!.statStages[1]).toBe(6);
  });

  describe("(b) unsupported-branch barriers", () => {
    it("halts on MOVEEND_SYNCHRONIZE_TARGET's ABILITY_SYNCHRONIZE branch", () => {
      const rc = context(
        0,
        {},
        { moveendState: 2, hitMarker: 1 << 14 },
        { ability: 28 },
      );
      const { result } = stepAtMoveend(rc);
      expect(result.kind).toBe("halted");
      if (result.kind !== "halted") throw new Error("expected halted");
      expect(result.state.haltReason).toMatchObject({ kind: "unsupported-branch", sourceLine: 2971 });
    });

    it("MOVEEND_SYNCHRONIZE_TARGET passes through without ABILITY_SYNCHRONIZE or the hitMarker bit", () => {
      const rc = context(0, {}, { moveendState: 2 }, { ability: 28 });
      const { result } = stepAtMoveend(rc);
      if (result.kind !== "advanced") throw new Error(`expected advanced, got ${result.kind}`);
      expect(result.state.rulesContext.moveendState).toBe(10); // paused at MOVEEND_ATTACKER_VISIBLE
    });

    it("MOVEEND_ON_DAMAGE_ABILITIES passes through for an unrelated ability", () => {
      const rc = context(0, {}, { moveendState: 3 }, { ability: 62 }); // ABILITY_GUTS
      const { result } = stepAtMoveend(rc);
      if (result.kind !== "advanced") throw new Error(`expected advanced, got ${result.kind}`);
      expect(result.state.rulesContext.moveendState).toBe(10); // paused at MOVEEND_ATTACKER_VISIBLE
    });

    it("halts on MOVEEND_IMMUNITY_ABILITIES' status-curing branch (ABILITY_LIMBER, any battler) only when that battler's own matching status bit is actually set -- ability membership alone is a no-op in source (battle_util.c:2892-2898's own `if` gate)", () => {
      const STATUS1_PARALYSIS = 1 << 6;
      const rc = context(0, {}, { moveendState: 4 }, { ability: 7, status1: STATUS1_PARALYSIS });
      const { result } = stepAtMoveend(rc);
      expect(result.kind).toBe("halted");
      if (result.kind !== "halted") throw new Error("expected halted");
      expect(result.state.haltReason).toMatchObject({ kind: "unsupported-branch", sourceLine: 2876 });

      const rcNoStatus = context(0, {}, { moveendState: 4 }, { ability: 7 });
      const { result: passThrough } = stepAtMoveend(rcNoStatus);
      if (passThrough.kind !== "advanced") throw new Error(`expected advanced, got ${passThrough.kind}`);
      expect(passThrough.state.rulesContext.moveendState).toBe(10); // Limber held but not paralyzed -- no cure, no barrier
    });

    it("MOVEEND_IMMUNITY_ABILITIES passes through when no battler holds a curing ability", () => {
      const rc = context(0, {}, { moveendState: 4 });
      const { result } = stepAtMoveend(rc);
      if (result.kind !== "advanced") throw new Error(`expected advanced, got ${result.kind}`);
      expect(result.state.rulesContext.moveendState).toBe(10); // paused at MOVEEND_ATTACKER_VISIBLE
    });

    it("halts on MOVEEND_SYNCHRONIZE_ATTACKER's ABILITY_SYNCHRONIZE branch", () => {
      const rc = context(
        0,
        { ability: 28 },
        { moveendState: 5, hitMarker: 1 << 14 },
      );
      const { result } = stepAtMoveend(rc);
      expect(result.kind).toBe("halted");
      if (result.kind !== "halted") throw new Error("expected halted");
      expect(result.state.haltReason).toMatchObject({ kind: "unsupported-branch", sourceLine: 2987 });
    });

    it("halts on MOVEEND_ITEM_EFFECTS_ALL's status/stat-restoring branch only when the held item can activate", () => {
      const CHERI_BERRY = 133; // GetItemHoldEffect -> HOLD_EFFECT_CURE_PAR
      const STATUS1_PARALYSIS = 1 << 6;
      const rc = context(
        0,
        {},
        { moveendState: 11 },
        { item: CHERI_BERRY, status1: STATUS1_PARALYSIS },
      );
      const { result } = stepAtMoveend(rc);
      expect(result.kind).toBe("halted");
      if (result.kind !== "halted") throw new Error("expected halted");
      expect(result.state.haltReason).toMatchObject({ kind: "unsupported-branch", sourceLine: 3639 });

      const noStatus = context(0, {}, { moveendState: 11 }, { item: CHERI_BERRY });
      const { result: passThrough } = stepAtMoveend(noStatus);
      if (passThrough.kind !== "advanced") {
        throw new Error(`expected advanced, got ${passThrough.kind}`);
      }
      expect(passThrough.state.rulesContext.moveendState).toBe(17);

      const LUM_BERRY = 141; // HOLD_EFFECT_CURE_STATUS also cures confusion.
      const STATUS2_CONFUSION = 1;
      const lumConfused = context(
        0,
        {},
        { moveendState: 11 },
        { item: LUM_BERRY, status2: STATUS2_CONFUSION },
      );
      const { result: lumResult } = stepAtMoveend(lumConfused);
      expect(lumResult.kind).toBe("halted");
      if (lumResult.kind !== "halted") throw new Error("expected halted");
      expect(lumResult.state.haltReason).toMatchObject({
        kind: "unsupported-branch",
        sourceLine: 3639,
      });
    });

    it("MOVEEND_ITEM_EFFECTS_ALL passes through when no battler holds a matching item", () => {
      const rc = context(0, {}, { moveendState: 11 });
      const { result } = stepAtMoveend(rc);
      if (result.kind !== "advanced") throw new Error(`expected advanced, got ${result.kind}`);
      expect(result.state.rulesContext.moveendState).toBe(17);
    });

    it("halts on MOVEEND_KINGSROCK_SHELLBELL's King's Rock flinch branch when battleMoveDamage is nonzero", () => {
      const KINGS_ROCK = 187; // GetItemHoldEffect -> HOLD_EFFECT_FLINCH
      const rc = context(0, { item: KINGS_ROCK }, { moveendState: 12, battleMoveDamage: 10 });
      const { result } = stepAtMoveend(rc);
      expect(result.kind).toBe("halted");
      if (result.kind !== "halted") throw new Error("expected halted");
      expect(result.state.haltReason).toMatchObject({ kind: "unsupported-branch", sourceLine: 3772 });
    });

    it("MOVEEND_KINGSROCK_SHELLBELL does not barrier when battleMoveDamage is zero, even holding King's Rock", () => {
      const KINGS_ROCK = 187;
      const rc = context(0, { item: KINGS_ROCK }, { moveendState: 12, battleMoveDamage: 0 });
      const { result } = stepAtMoveend(rc);
      if (result.kind !== "advanced") throw new Error(`expected advanced, got ${result.kind}`);
      expect(result.state.rulesContext.moveendState).toBe(17);
    });

    it("halts on MOVEEND_NEXT_TARGET's doubles replay (unreachable for Level-50 singles)", () => {
      const MOVE_TARGET_BOTH_MOVE = 13; // MOVE_RAZOR_WIND, target MOVE_TARGET_BOTH
      const rc = context(
        0,
        {},
        {
          moveendState: 16,
          currentMove: MOVE_TARGET_BOTH_MOVE,
          battleTopology: { battlersCount: 4, battleTypeFlags: 1 << 0, battlerPositions: [0, 1, 2, 3] },
        },
        { hp: 40 },
      );
      const { result } = stepAtMoveend(rc);
      expect(result.kind).toBe("halted");
      if (result.kind !== "halted") throw new Error("expected halted");
      expect(result.state.haltReason).toMatchObject({ kind: "unsupported-branch", sourceLine: 4467 });
    });

    it("MOVEEND_NEXT_TARGET passes through for singles (BATTLE_TYPE_DOUBLE unset)", () => {
      const rc = context(0, {}, { moveendState: 16 });
      const { result } = stepAtMoveend(rc);
      if (result.kind !== "advanced") throw new Error(`expected advanced, got ${result.kind}`);
      expect(result.state.rulesContext.moveendState).toBe(17);
    });
  });

  describe("MOVEEND_ON_DAMAGE_ABILITIES contact family", () => {
    const POUND = 1;
    const SWIFT = 129;
    const KARATE_CHOP = 2;
    const damaged = { physicalDmg: 4 };

    it.each([
      ["Poison Point", 38, 1 << 3],
      ["Static", 9, 1 << 6],
      ["Flame Body", 49, 1 << 4],
    ])("%s proc, no-proc, and already-statused eligibility block", (_name, ability, statusBit) => {
      const proc = runMoveendScriptToTerminal(
        context(0, {}, { currentMove: POUND, moveendState: 3 }, { ability, specialStatus: damaged }),
        7,
      );
      expect(proc.state.rulesContext.battlers[0]!.status1).toBe(statusBit);
      expect(proc.state.rng.calls).toBe(1);

      const miss = runMoveendScriptToTerminal(
        context(0, {}, { currentMove: POUND, moveendState: 3 }, { ability, specialStatus: damaged }),
        1,
      );
      expect(miss.state.rulesContext.battlers[0]!.status1).toBe(0);
      expect(miss.state.rng.calls).toBe(1);

      const blocked = runMoveendScriptToTerminal(
        context(0, { status1: 1 << 5 }, { currentMove: POUND, moveendState: 3 }, { ability, specialStatus: damaged }),
        7,
      );
      expect(blocked.state.rulesContext.battlers[0]!.status1).toBe(1 << 5);
      expect(blocked.state.rng.calls).toBe(1);
    });

    it("Effect Spore selects sleep, draws its duration, and still spends the proc on an ineligible attacker", () => {
      const proc = runMoveendScriptToTerminal(
        context(0, {}, { currentMove: POUND, moveendState: 3 }, { ability: 27, specialStatus: damaged }),
        41,
      );
      expect(proc.state.rulesContext.battlers[0]!.status1 & 0x7).toBeGreaterThanOrEqual(2);
      expect(proc.state.rng.calls).toBe(3); // proc + nonzero selector + sleep duration

      const noProc = runMoveendScriptToTerminal(
        context(0, {}, { currentMove: POUND, moveendState: 3 }, { ability: 27, specialStatus: damaged }),
        1,
      );
      expect(noProc.state.rulesContext.battlers[0]!.status1).toBe(0);
      expect(noProc.state.rng.calls).toBe(1);

      const blocked = runMoveendScriptToTerminal(
        context(0, { status1: 1 << 6 }, { currentMove: POUND, moveendState: 3 }, { ability: 27, specialStatus: damaged }),
        41,
      );
      expect(blocked.state.rulesContext.battlers[0]!.status1).toBe(1 << 6);
      expect(blocked.state.rng.calls).toBe(2); // proc + selector; failed SetMoveEffect does not refund

      const repeatsZero = runMoveendScriptToTerminal(
        context(0, {}, { currentMove: POUND, moveendState: 3 }, { ability: 27, specialStatus: damaged }),
        13,
      );
      expect(repeatsZero.state.rulesContext.battlers[0]!.status1).toBe(1 << 6);
      expect(repeatsZero.state.rng.ledger.map((entry) => entry.reason)).toEqual([
        "Effect Spore contact proc",
        "Effect Spore status selector",
        "Effect Spore status selector",
      ]);
    });

    it("Cute Charm rolls before eligibility, writes the target-owned infatuation bit, and runs its full script", () => {
      const proc = runMoveendScriptToTerminal(
        context(
          0,
          { species: 32 },
          { currentMove: POUND, moveendState: 3 },
          { ability: 56, species: 29, specialStatus: damaged },
        ),
        7,
      );
      expect(proc.state.rulesContext.battlers[0]!.status2 & (1 << 17)).not.toBe(0);
      expect(proc.state.rng.calls).toBe(1);

      const noProc = runMoveendScriptToTerminal(
        context(0, { species: 32 }, { currentMove: POUND, moveendState: 3 }, { ability: 56, species: 29, specialStatus: damaged }),
        1,
      );
      expect(noProc.state.rulesContext.battlers[0]!.status2).toBe(0);

      const oblivious = runMoveendScriptToTerminal(
        context(0, { species: 32, ability: 12 }, { currentMove: POUND, moveendState: 3 }, { ability: 56, species: 29, specialStatus: damaged }),
        7,
      );
      expect(oblivious.state.rulesContext.battlers[0]!.status2).toBe(0);
      expect(oblivious.state.rng.calls).toBe(1);

      const targetFainted = runMoveendScriptToTerminal(
        context(0, { species: 32 }, { currentMove: POUND, moveendState: 3 }, {
          ability: 56,
          species: 29,
          hp: 0,
          specialStatus: damaged,
        }),
        7,
      );
      expect(targetFainted.state.rng.calls).toBe(0); // target survival precedes the C short-circuit roll
    });

    it("Color Change needs real damage but not contact, writes both types with no RNG, and runs its full script", () => {
      const changed = runMoveendScriptToTerminal(
        context(0, {}, { currentMove: KARATE_CHOP, moveendState: 3 }, {
          ability: 16,
          types: ["TYPE_NORMAL", "TYPE_NORMAL"],
          specialStatus: damaged,
        }),
      );
      expect(changed.state.rulesContext.battlers[1]!.types).toEqual(["TYPE_FIGHTING", "TYPE_FIGHTING"]);
      expect(changed.state.rulesContext.battleTextBuff1Type).toBe("TYPE_FIGHTING");
      expect(changed.state.rng.calls).toBe(0);

      const alreadyType = runMoveendScriptToTerminal(
        context(0, {}, { currentMove: KARATE_CHOP, moveendState: 3 }, {
          ability: 16,
          types: ["TYPE_FIGHTING", "TYPE_NORMAL"],
          specialStatus: damaged,
        }),
      );
      expect(alreadyType.state.rulesContext.battlers[1]!.types).toEqual(["TYPE_FIGHTING", "TYPE_NORMAL"]);
    });

    it("Rough Skin uses max(1,maxHP/16), can faint the attacker, does not require target survival, and runs its full script", () => {
      const fainted = runMoveendScriptToTerminal(
        context(0, { hp: 1, maxHP: 15 }, { currentMove: POUND, moveendState: 3 }, {
          ability: 24,
          hp: 0,
          specialStatus: damaged,
        }),
      );
      expect(fainted.state.rulesContext.battlers[0]!.hp).toBe(0);
      expect(fainted.state.rng.calls).toBe(0);

      const scaled = runMoveendScriptToTerminal(
        context(0, { hp: 100, maxHP: 160 }, { currentMove: POUND, moveendState: 3 }, { ability: 24, specialStatus: damaged }),
      );
      expect(scaled.state.rulesContext.battlers[0]!.hp).toBe(90);

      const confusionBlocked = runMoveendScriptToTerminal(
        context(0, { hp: 100, maxHP: 160, confusionSelfDmg: 1 }, { currentMove: POUND, moveendState: 3 }, {
          ability: 24,
          specialStatus: damaged,
        }),
      );
      expect(confusionBlocked.state.rulesContext.battlers[0]!.hp).toBe(100);

      const nonContact = runMoveendScriptToTerminal(
        context(0, { hp: 100, maxHP: 160 }, { currentMove: SWIFT, moveendState: 3 }, {
          ability: 24,
          specialStatus: damaged,
        }),
      );
      expect(nonContact.state.rulesContext.battlers[0]!.hp).toBe(100);
    });

    it("Substitute-suppressed damage and non-contact Swift never enter contact abilities or draw", () => {
      const substitute = runMoveendScriptToTerminal(
        context(0, {}, { currentMove: POUND, moveendState: 3 }, {
          ability: 9,
          status2: 1 << 24,
          substituteHP: 20,
          specialStatus: { physicalDmg: 0, specialDmg: 0 },
        }),
        7,
      );
      expect(substitute.state.rulesContext.battlers[0]!.status1).toBe(0);
      expect(substitute.state.rng.calls).toBe(0);

      const swift = runMoveendScriptToTerminal(
        context(0, {}, { currentMove: SWIFT, moveendState: 3 }, { ability: 9, specialStatus: damaged }),
        7,
      );
      expect(swift.state.rulesContext.battlers[0]!.status1).toBe(0);
      expect(swift.state.rng.calls).toBe(0);
    });

    it("ability statuses affect the attacker and bypass Shield Dust plus Safeguard, but keep Limber eligibility", () => {
      const bypass = runMoveendScriptToTerminal(
        context(
          0,
          { ability: 19 },
          { currentMove: POUND, moveendState: 3, sideStatuses: [1 << 5, 0] },
          { ability: 9, specialStatus: damaged },
        ),
        7,
      );
      expect(bypass.state.rulesContext.battlers[0]!.status1).toBe(1 << 6);

      const limber = runMoveendScriptToTerminal(
        context(0, { ability: 7 }, { currentMove: POUND, moveendState: 3 }, { ability: 9, specialStatus: damaged }),
        7,
      );
      expect(limber.state.rulesContext.battlers[0]!.status1).toBe(0);
      expect(limber.state.rng.calls).toBe(1);
    });

    it("live-receipt semantics: Pound's Static roll is draw 5 after the four hit-chain draws, success and failure both spend exactly one", () => {
      const staged = context(
        0,
        { species: 305, attack: 100, maxHP: 125, hp: 125 },
        { currentMove: POUND, moveendState: 0 },
        { ability: 9, species: 25, defense: 80, maxHP: 110, hp: 110 },
      );
      const proc = runCommittedScriptToTerminal("BattleScript_EffectHit", staged, 1);
      expect(proc.state.rng.calls).toBe(5);
      expect(proc.state.rng.ledger.map((entry) => entry.reason)).toEqual([
        "accuracycheck",
        "critcalc",
        "adjustnormaldamage",
        "seteffectwithchance",
        "Static contact proc",
      ]);
      expect(proc.state.rulesContext.battlers[0]!.status1).toBe(1 << 6);

      const failed = runCommittedScriptToTerminal("BattleScript_EffectHit", staged, 0);
      expect(failed.state.rng.calls).toBe(5);
      expect(failed.state.rng.ledger.at(-1)?.reason).toBe("Static contact proc");
      expect(failed.state.rulesContext.battlers[0]!.status1).toBe(0);
    });
  });

  describe("endMode/endState postlude", () => {
    it("moveendcase (endMode 1): stops after the first no-effect state, regardless of endState", () => {
      const instruction = program.instructions.find(
        (i) => i.opcodeName === "B_SCR_OP_MOVEEND" && i.operands[0]?.expression === "1",
      );
      expect(instruction).toBeDefined();
      const rc = context(0, {}, { moveendState: 2 });
      const execution = createBattleScriptStatusRulesExecution(program, "BattleScript_MoveEnd", rc, 1, externalPorts());
      const patched = Object.freeze({ ...execution.state, programCounter: instruction!.programCounter });
      const result = stepBattleScriptMachine(program, patched, execution.handlers);
      if (result.kind !== "advanced") throw new Error(`expected advanced, got ${result.kind}`);
      expect(result.state.rulesContext.moveendState).toBe(17);
      expect(result.state.programCounter).toBe(instruction!.programCounter + 1);
    });

    it("moveendto (endMode 2, MOVEEND_NEXT_TARGET): stops exactly at the requested state", () => {
      const instruction = program.instructions.find(
        (i) => i.opcodeName === "B_SCR_OP_MOVEEND" && i.operands[0]?.expression === "2",
      );
      expect(instruction).toBeDefined();
      // Starts past the ordinary attacker/target visibility controller-return
      // pauses (states 9-10, see the RAGE/SYNCHRONIZE tests above) so this
      // isolates the endMode 2 postlude check itself: states 11-15 run, then
      // the loop stops before ever executing state 16's body.
      const rc = context(0, {}, { moveendState: 11 });
      const execution = createBattleScriptStatusRulesExecution(program, "BattleScript_MoveEnd", rc, 1, externalPorts());
      const patched = Object.freeze({ ...execution.state, programCounter: instruction!.programCounter });
      const result = stepBattleScriptMachine(program, patched, execution.handlers);
      if (result.kind !== "advanced") throw new Error(`expected advanced, got ${result.kind}`);
      expect(result.state.rulesContext.moveendState).toBe(17);
    });
  });
});
