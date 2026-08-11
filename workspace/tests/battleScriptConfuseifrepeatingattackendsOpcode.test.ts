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

/** include/constants/moves.h -- Thrash-family MOVE_EFFECT_RAMPAGE carriers (docs/yawn-thrash-endturn-design.md §3's table). */
const MOVE_THRASH = 37;
/** include/constants/battle.h:137-139. */
const STATUS2_LOCK_CONFUSE = (1 << 10) | (1 << 11);
const STATUS2_MULTIPLETURNS = 1 << 12;
/** include/constants/battle.h:300,309. */
const MOVE_EFFECT_THRASH = 53;
const MOVE_EFFECT_AFFECTS_USER = 1 << 6;

function battler(changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 100,
    moves: changes.moves ?? Object.freeze([MOVE_THRASH, 0, 0, 0]),
    pp: changes.pp ?? Object.freeze([20, 0, 0, 0]),
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
    attack: changes.attack ?? 0,
    defense: changes.defense ?? 0,
    spAttack: changes.spAttack ?? 0,
    spDefense: changes.spDefense ?? 0,
    level: changes.level ?? 50,
    friendship: changes.friendship ?? 0,
    partyIndex: changes.partyIndex ?? 0,
    wrappedMove: changes.wrappedMove,
    wrappedBy: changes.wrappedBy,
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
    currentMove: MOVE_THRASH,
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
    prepareMessage: (_ctx, operand) =>
      operand.expression.startsWith("STRINGID_")
        ? Object.freeze({ kind: "message" as const, messageId: operand.expression, substitutions: Object.freeze([]) })
        : null,
    prepareSelectionMessage: () => null,
    prepareSelectionMessageFromTable: () => null,
    resolveAttackerBattler: () => null,
    resolveBattlerAtPosition: () => null,
    resolveHalfwordOperand: (_ctx, operand) =>
      operand.expression === "B_WAIT_TIME_LONG" || operand.expression === "B_WAIT_TIME_SHORT" ? 1 : null,
    resolveByteOperand: () => null,
  });
}

function labelPc(label: string): number {
  const entry = resolveBattleScriptLabel(program, label);
  if (!entry) throw new Error(`committed Battle Script program does not define label ${label}`);
  return entry.programCounter;
}

/** Walks the real committed script from `entryLabel` until `targetLabel`'s own programCounter is reached. */
function runUntilLabel(
  entryLabel: string,
  targetLabel: string,
  rulesContext: BattleScriptRulesContext,
  rngSeed = 1,
  ports = externalPorts(),
  budget = 100,
) {
  const execution = createBattleScriptStatusRulesExecution(program, entryLabel, rulesContext, rngSeed, ports);
  const targetPc = labelPc(targetLabel);
  let result = stepBattleScriptMachine(program, execution.state, execution.handlers);
  let steps = 1;
  while (
    (result.kind === "advanced" || result.kind === "scheduler-progressed")
    && result.state.programCounter !== targetPc
    && steps < budget
  ) {
    result = stepBattleScriptMachine(program, result.state, execution.handlers);
    steps++;
  }
  return { execution, result, steps };
}

describe("Thrash-family lock-in start (Cmd_confuseifrepeatingattackends, docs/yawn-thrash-endturn-design.md §3, Rung 4)", () => {
  const confuseIfRepeatingAttackEndsPc = program.instructions.find(
    (instruction) => instruction.opcodeName === "B_SCR_OP_CONFUSEIFREPEATINGATTACKENDS",
  )!.programCounter;

  function stepAtConfuseIfRepeatingAttackEnds(rulesContext: BattleScriptRulesContext, rngSeed = 1) {
    const execution = createBattleScriptStatusRulesExecution(program, "BattleScript_EffectRampage", rulesContext, rngSeed, externalPorts());
    const patched = Object.freeze({ ...execution.state, programCounter: confuseIfRepeatingAttackEndsPc });
    return { execution, result: stepBattleScriptMachine(program, patched, execution.handlers) };
  }

  it("registers B_SCR_OP_CONFUSEIFREPEATINGATTACKENDS", () => {
    expect(confuseIfRepeatingAttackEndsPc).toBeGreaterThanOrEqual(0);
  });

  it("not yet locked: stages MOVE_EFFECT_THRASH|MOVE_EFFECT_AFFECTS_USER into moveEffectByte, zero RNG, plain advance", () => {
    const rc = context({ status2: 0 });
    const { execution, result } = stepAtConfuseIfRepeatingAttackEnds(rc);
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.moveEffectByte).toBe(MOVE_EFFECT_THRASH | MOVE_EFFECT_AFFECTS_USER);
    expect(result.state.rng.calls).toBe(execution.state.rng.calls);
    expect(result.state.programCounter).toBe(confuseIfRepeatingAttackEndsPc + 1);
    // the opcode itself never touches status2 -- only stages the byte MOVE_EFFECT_THRASH's own SetMoveEffect case writes it.
    expect(result.state.rulesContext.battlers[0]!.status2).toBe(0);
  });

  it("already locked (mid-Thrash, STATUS2_LOCK_CONFUSE set): does NOT restage moveEffectByte, leaves it at whatever the caller passed in", () => {
    const rc = context({ status2: STATUS2_LOCK_CONFUSE | STATUS2_MULTIPLETURNS }, { moveEffectByte: 0xAB });
    const { execution, result } = stepAtConfuseIfRepeatingAttackEnds(rc);
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.moveEffectByte).toBe(0xAB);
    expect(result.state.rng.calls).toBe(execution.state.rng.calls);
  });

  it("real script wiring: from BattleScript_EffectRampage, a fresh (unlocked) attacker's move threads attackcanceler/accuracycheck/attackstring/ppreduce and reaches BattleScript_HitFromCritCalc with the byte staged -- the lock-in START runs to completion (Rung 4's own scope; the confusion END is Rung 5)", () => {
    const rc = context({ status2: 0, pp: [20, 0, 0, 0] });
    const { result } = runUntilLabel("BattleScript_EffectRampage", "BattleScript_HitFromCritCalc", rc, 1, externalPorts(), 20);
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.programCounter).toBe(labelPc("BattleScript_HitFromCritCalc"));
    expect(result.state.rulesContext.moveEffectByte).toBe(MOVE_EFFECT_THRASH | MOVE_EFFECT_AFFECTS_USER);
    expect(result.state.rulesContext.battlers[0]!.pp[0]).toBe(19); // ppreduce ran (not skipped -- this is the first use, STATUS2_MULTIPLETURNS was clear)
    expect(result.state.rulesContext.battlers[0]!.status2).toBe(0); // lock-in state itself is MOVE_EFFECT_THRASH's own job (Rung 4's SetMoveEffect case), not this opcode's
  });

  it("real script wiring, already mid-lock (STATUS2_MULTIPLETURNS set): jumpifstatus2 skips straight to BattleScript_EffectRampage2, ppreduce does NOT run again", () => {
    const rc = context({ status2: STATUS2_LOCK_CONFUSE | STATUS2_MULTIPLETURNS, pp: [20, 0, 0, 0] });
    const { result } = runUntilLabel("BattleScript_EffectRampage", "BattleScript_HitFromCritCalc", rc, 1, externalPorts(), 20);
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.programCounter).toBe(labelPc("BattleScript_HitFromCritCalc"));
    expect(result.state.rulesContext.battlers[0]!.pp[0]).toBe(20); // ppreduce skipped -- BattleScript_EffectRampage2 entry bypasses it
    expect(result.state.rulesContext.moveEffectByte).toBe(0); // already locked -- confuseifrepeatingattackends leaves the byte untouched (still its context default, 0)
  });
});

describe("SetMoveEffect MOVE_EFFECT_THRASH case (Cmd_seteffectwithchance's dispatch, docs/yawn-thrash-endturn-design.md §3, Rung 4)", () => {
  const setEffectWithChancePc = program.instructions.find(
    (instruction) => instruction.opcodeName === "B_SCR_OP_SETEFFECTWITHCHANCE",
  )!.programCounter;

  function stepAtSetEffectWithChance(rulesContext: BattleScriptRulesContext, rngSeed: number) {
    const execution = createBattleScriptStatusRulesExecution(program, "BattleScript_EffectHit", rulesContext, rngSeed, externalPorts());
    const patched = Object.freeze({ ...execution.state, programCounter: setEffectWithChancePc });
    return { execution, result: stepBattleScriptMachine(program, patched, execution.handlers) };
  }

  it("not yet locked: draws the duration and sets STATUS2_MULTIPLETURNS|STATUS2_LOCK_CONFUSE + gLockedMoves on the ATTACKER, plain advance", () => {
    const rc = context(
      { status2: 0 },
      {
        currentMove: MOVE_THRASH,
        lockedMoves: [7, 8, 9, 10],
        moveEffectByte: MOVE_EFFECT_THRASH | MOVE_EFFECT_AFFECTS_USER,
      },
    );
    const { execution, result } = stepAtSetEffectWithChance(rc, 1);
    if (result.kind !== "advanced") throw new Error("expected advance");
    // 2 draws: seteffectwithchance's own percentChance roll (secondaryEffectChance=100 for
    // MOVE_THRASH, so it always succeeds but still calls Random() -- house convention, see
    // createSeteffectwithchanceOpcodeHandler's own doc comment), then applyThrashMoveEffect's
    // own (Random()&1)+2 duration draw.
    expect(result.state.rng.calls).toBe(execution.state.rng.calls + 2);
    const attackerState = result.state.rulesContext.battlers[0]!;
    expect(attackerState.status2 & STATUS2_MULTIPLETURNS).not.toBe(0);
    const turns = (attackerState.status2 & STATUS2_LOCK_CONFUSE) >>> 10;
    expect(turns).toBeGreaterThanOrEqual(2);
    expect(turns).toBeLessThanOrEqual(3);
    expect(result.state.rulesContext.lockedMoves).toEqual([MOVE_THRASH, 8, 9, 10]);
    // target (the OTHER battler) is untouched -- MOVE_EFFECT_AFFECTS_USER routes gEffectBattler to the attacker, not the target.
    expect(result.state.rulesContext.battlers[1]!.status2).toBe(0);
    // no script call: SetMoveEffect's own switch just `break`s for this case -- the transition is the opcode after seteffectwithchance, not a call/jump.
    expect(result.state.programCounter).toBe(setEffectWithChancePc + 1);
  });

  it("already locked: SetMoveEffect's family-B early-out (status2 & sStatusFlagsForMoveEffects[MOVE_EFFECT_THRASH] == STATUS2_LOCK_CONFUSE) passes through untouched -- exactly the outer seteffectwithchance roll, no nested duration draw", () => {
    const existingLock = STATUS2_MULTIPLETURNS | (3 << 10); // mid-lock, 3 turns left
    const rc = context(
      { status2: existingLock },
      {
        currentMove: MOVE_THRASH,
        lockedMoves: [7, 8, 9, 10],
        moveEffectByte: MOVE_EFFECT_THRASH | MOVE_EFFECT_AFFECTS_USER,
      },
    );
    const { execution, result } = stepAtSetEffectWithChance(rc, 1);
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rng.calls).toBe(execution.state.rng.calls + 1);
    expect(result.state.rulesContext.battlers[0]!.status2).toBe(existingLock);
    expect(result.state.rulesContext.lockedMoves).toEqual([7, 8, 9, 10]);
  });
});
