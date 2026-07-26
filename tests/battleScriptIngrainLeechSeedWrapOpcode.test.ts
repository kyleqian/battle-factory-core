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

/** include/constants/moves.h. */
const MOVE_INGRAIN = 275;
const MOVE_LEECH_SEED = 73;
const MOVE_WRAP = 35;
/** include/constants/battle.h:158-159,167. */
const STATUS3_ROOTED = 1 << 10;
const STATUS3_LEECHSEED = 1 << 2;
/** include/constants/battle.h:310. */
const MOVE_EFFECT_CERTAIN = 1 << 7;
const MOVE_EFFECT_WRAP = 13;
const STATUS2_WRAPPED_MASK = (1 << 13) | (1 << 14) | (1 << 15);

function battler(changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 100,
    moves: changes.moves ?? Object.freeze([MOVE_INGRAIN, 0, 0, 0]),
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
    selectorRoles: { attacker: 0, target: 1, effectBattler: 1, fainted: null },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: MOVE_INGRAIN,
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

describe("Ingrain setter (BattleScript_EffectIngrain / Cmd_trysetroots)", () => {
  it("not yet rooted: trysetroots sets STATUS3_ROOTED, reaches BattleScript_MoveEnd, zero RNG", () => {
    const rc = context({ moves: [MOVE_INGRAIN, 0, 0, 0] }, { currentMove: MOVE_INGRAIN });
    const { execution, result } = runUntilLabel("BattleScript_EffectIngrain", "BattleScript_MoveEnd", rc);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battlers[0]!.status3 & STATUS3_ROOTED).not.toBe(0);
    expect(result.state.rng.calls).toBe(execution.state.rng.calls);
  });

  it("already rooted: trysetroots fails to BattleScript_ButItFailed, still reaches BattleScript_MoveEnd, status3 unchanged", () => {
    const rc = context(
      { moves: [MOVE_INGRAIN, 0, 0, 0], status3: STATUS3_ROOTED },
      { currentMove: MOVE_INGRAIN },
    );
    const { result } = runUntilLabel("BattleScript_EffectIngrain", "BattleScript_MoveEnd", rc);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battlers[0]!.status3).toBe(STATUS3_ROOTED);
  });
});

describe("Leech Seed setter (BattleScript_DoLeechSeed / Cmd_setseeded -- entering post-accuracycheck, per the doc's own scope note)", () => {
  it("success: seeds the target (STATUS3_LEECHSEED + seeder battler id), reaches BattleScript_MoveEnd, zero RNG", () => {
    const rc = context({ moves: [MOVE_LEECH_SEED, 0, 0, 0] }, { currentMove: MOVE_LEECH_SEED }, { status3: 0 });
    const { execution, result } = runUntilLabel("BattleScript_DoLeechSeed", "BattleScript_MoveEnd", rc);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    const targetState = result.state.rulesContext.battlers[1]!;
    expect(targetState.status3 & STATUS3_LEECHSEED).not.toBe(0);
    expect(targetState.status3 & 0b11).toBe(0); // attacker battler id 0
    expect(result.state.rng.calls).toBe(execution.state.rng.calls);
  });

  it("Grass-type target: setseeded fails (type immunity), no status3 write, still reaches BattleScript_MoveEnd", () => {
    const rc = context(
      { moves: [MOVE_LEECH_SEED, 0, 0, 0] },
      { currentMove: MOVE_LEECH_SEED },
      { status3: 0, types: ["TYPE_GRASS", "TYPE_NORMAL"] },
    );
    const { result } = runUntilLabel("BattleScript_DoLeechSeed", "BattleScript_MoveEnd", rc);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battlers[1]!.status3).toBe(0);
    expect(result.state.rulesContext.moveResultFlags & 1).not.toBe(0); // MOVE_RESULT_MISSED
  });

  it("already seeded: setseeded fails (re-seed attempt), status3 unchanged, still reaches BattleScript_MoveEnd", () => {
    const alreadySeededStatus3 = STATUS3_LEECHSEED | 1; // seeded by battler 1
    const rc = context(
      { moves: [MOVE_LEECH_SEED, 0, 0, 0] },
      { currentMove: MOVE_LEECH_SEED },
      { status3: alreadySeededStatus3 },
    );
    const { result } = runUntilLabel("BattleScript_DoLeechSeed", "BattleScript_MoveEnd", rc);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battlers[1]!.status3).toBe(alreadySeededStatus3);
  });
});

describe("Wrap-family setter (Cmd_seteffectwithchance's MOVE_EFFECT_WRAP case)", () => {
  const setEffectWithChancePc = program.instructions.find(
    (instruction) => instruction.opcodeName === "B_SCR_OP_SETEFFECTWITHCHANCE",
  )!.programCounter;

  function stepAtSetEffectWithChance(rulesContext: BattleScriptRulesContext, rngSeed: number) {
    const execution = createBattleScriptStatusRulesExecution(program, "BattleScript_EffectHit", rulesContext, rngSeed, externalPorts());
    const patched = Object.freeze({ ...execution.state, programCounter: setEffectWithChancePc });
    return { execution, result: stepBattleScriptMachine(program, patched, execution.handlers) };
  }

  it("not yet wrapped: draws the (Random()&3)+3 duration, sets STATUS2_WRAPPED, stamps wrappedMove/wrappedBy, calls into BattleScript_MoveEffectWrap", () => {
    const rc = context(
      {},
      { currentMove: MOVE_WRAP, moveEffectByte: MOVE_EFFECT_WRAP | MOVE_EFFECT_CERTAIN },
      { status2: 0 },
    );
    const { execution, result } = stepAtSetEffectWithChance(rc, 1);
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rng.calls).toBe(execution.state.rng.calls + 1);
    const targetState = result.state.rulesContext.battlers[1]!;
    const turns = (targetState.status2 & STATUS2_WRAPPED_MASK) >>> 13;
    expect(turns).toBeGreaterThanOrEqual(3);
    expect(turns).toBeLessThanOrEqual(6);
    expect(targetState.wrappedMove).toBe(MOVE_WRAP);
    expect(targetState.wrappedBy).toBe(0);
    expect(result.state.rulesContext.multistringChooser).toBe(1); // MOVE_WRAP's own index in gTrappingMoves
    expect(result.state.programCounter).toBe(labelPc("BattleScript_MoveEffectWrap"));
  });

  it("already wrapped: skips the duration roll entirely, zero RNG, advances past the dispatch", () => {
    const rc = context(
      {},
      { currentMove: MOVE_WRAP, moveEffectByte: MOVE_EFFECT_WRAP | MOVE_EFFECT_CERTAIN },
      { status2: 5 << 13 },
    );
    const { execution, result } = stepAtSetEffectWithChance(rc, 1);
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rng.calls).toBe(execution.state.rng.calls);
    expect(result.state.rulesContext.battlers[1]!.status2).toBe(5 << 13);
    expect(result.state.programCounter).toBe(setEffectWithChancePc + 1);
  });

  it("BattleScript_MoveEffectWrap itself (printfromtable gWrappedStringIds/waitmessage/return) runs to completion and returns to the caller", () => {
    const rc = context(
      {},
      { currentMove: MOVE_WRAP, moveEffectByte: MOVE_EFFECT_WRAP | MOVE_EFFECT_CERTAIN },
      { status2: 0 },
    );
    const { execution: outerExecution, result: dispatched } = stepAtSetEffectWithChance(rc, 1);
    if (dispatched.kind !== "advanced") throw new Error("expected advance");
    // BattleScriptPush(cursor+1) landed the return address on the call stack -- confirm it's the instruction after the dispatch.
    expect(dispatched.state.callStack.at(-1)).toBe(setEffectWithChancePc + 1);

    let state = dispatched.state;
    let steps = 0;
    let result = stepBattleScriptMachine(program, state, outerExecution.handlers);
    while ((result.kind === "advanced" || result.kind === "scheduler-progressed") && result.state.programCounter !== setEffectWithChancePc + 1 && steps < 20) {
      state = result.state;
      result = stepBattleScriptMachine(program, state, outerExecution.handlers);
      steps += 1;
    }
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.programCounter).toBe(setEffectWithChancePc + 1);
    expect(result.state.callStack.length).toBe(dispatched.state.callStack.length - 1); // `return` popped the pushed frame
  });
});

describe("(b) unsupported-branch barriers -- COPYARRAY/JUMPIFABILITY/MANIPULATEDAMAGE are generic multi-site opcodes, narrowed to this slice's own operand tuple", () => {
  function stepAtProgramCounter(pc: number, rulesContext: BattleScriptRulesContext) {
    const execution = createBattleScriptStatusRulesExecution(program, "BattleScript_EffectHit", rulesContext, 1, externalPorts());
    const patched = Object.freeze({ ...execution.state, programCounter: pc });
    return { execution, result: stepBattleScriptMachine(program, patched, execution.handlers) };
  }

  it("Cmd_copyarray halts on any operand tuple other than gBattleMoveDamage<-gHpDealt, size 4 (e.g. Pain Split's own sPAINSPLIT_HP copy)", () => {
    const pc = program.instructions.find(
      (instruction) => instruction.source.label === "BattleScript_EffectPainSplit" && instruction.opcodeName === "B_SCR_OP_COPYARRAY",
    )!.programCounter;
    const { result } = stepAtProgramCounter(pc, context());
    expect(result.kind).toBe("halted");
    expect(result.state.haltReason).toMatchObject({ kind: "unsupported-branch" });
  });

  it("Cmd_jumpifability halts on any ability other than ABILITY_LIQUID_OOZE (e.g. Roar's own Suction Cups check)", () => {
    const pc = program.instructions.find(
      (instruction) => instruction.source.label === "BattleScript_EffectRoar" && instruction.opcodeName === "B_SCR_OP_JUMPIFABILITY",
    )!.programCounter;
    const { result } = stepAtProgramCounter(pc, context());
    expect(result.kind).toBe("halted");
    expect(result.state.haltReason).toMatchObject({ kind: "unsupported-branch" });
  });

  it("Cmd_manipulatedamage halts on any mode other than DMG_CHANGE_SIGN (e.g. Struggle's own recoil-from-miss halving)", () => {
    const pc = program.instructions.find(
      (instruction) => instruction.source.label === "BattleScript_MoveMissedDoDamage" && instruction.opcodeName === "B_SCR_OP_MANIPULATEDAMAGE",
    )!.programCounter;
    const { result } = stepAtProgramCounter(pc, context());
    expect(result.kind).toBe("halted");
    expect(result.state.haltReason).toMatchObject({ kind: "unsupported-branch" });
  });

  it(
    "Cmd_copyarray's widened universe (EFFECT_ENDEAVOR registration, seam-scout §9.2) also resolves "
      + "gHpDealt<-gBattleMoveDamage, the reverse of LeechSeedTurnDrain's own tuple",
    () => {
      const endeavorCopyarrayStarts = program.instructions.filter(
        (instruction) => instruction.source.label === "BattleScript_EffectEndeavor" && instruction.opcodeName === "B_SCR_OP_COPYARRAY",
      );
      expect(endeavorCopyarrayStarts).toHaveLength(2);
      expect(endeavorCopyarrayStarts.map((i) => i.operands.map((o) => o.expression))).toEqual([
        ["gHpDealt", "gBattleMoveDamage", "0x4"],
        ["gBattleMoveDamage", "gHpDealt", "0x4"],
      ]);

      const stashPc = endeavorCopyarrayStarts[0]!.programCounter;
      const { result: stashed } = stepAtProgramCounter(stashPc, context({}, { battleMoveDamage: 240, hpDealt: 0 }));
      expect(stashed.kind).toBe("advanced");
      if (stashed.kind !== "advanced") throw new Error("expected advance");
      expect(stashed.state.rulesContext.hpDealt).toBe(240);
      expect(stashed.state.rulesContext.battleMoveDamage).toBe(240); // untouched by this direction

      const restorePc = endeavorCopyarrayStarts[1]!.programCounter;
      const { result: restored } = stepAtProgramCounter(
        restorePc,
        context({}, { battleMoveDamage: 360, hpDealt: 240 }), // simulates typecalc having STAB-multiplied battleMoveDamage in between
      );
      expect(restored.kind).toBe("advanced");
      if (restored.kind !== "advanced") throw new Error("expected advance");
      expect(restored.state.rulesContext.battleMoveDamage).toBe(240); // restored from the stash, STAB undone
    },
  );
});
