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
  type BattleScriptMachineState,
} from "../src/engine/battleScriptMachine.ts";

const program = loadBattleScriptProgram();

/** include/constants/moves.h:285. */
const MOVE_YAWN = 281;
/** include/constants/battle.h:168-169 -- the 2-bit yawn-countdown field and its fresh (2-turn) write value. */
const STATUS3_YAWN = (1 << 11) | (1 << 12);
const STATUS3_YAWN_TURN_2 = (2 << 11) & STATUS3_YAWN;
const STATUS3_YAWN_TURN_1 = (1 << 11) & STATUS3_YAWN;
/** include/constants/battle.h:117-123,125. */
const STATUS1_PARALYSIS = 1 << 6;
/** include/abilities.h. */
const ABILITY_VITAL_SPIRIT = 72;
const ABILITY_INSOMNIA = 15;

function battler(changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 100,
    moves: changes.moves ?? Object.freeze([MOVE_YAWN, 0, 0, 0]),
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
    currentMove: MOVE_YAWN,
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

function ackAllPending(
  state: BattleScriptMachineState<BattleScriptRulesContext>,
): BattleScriptMachineState<BattleScriptRulesContext> {
  let next = state;
  for (const battlerId of state.scheduler.pendingControllerBattlers) {
    next = acknowledgeBattleScriptMachineController(next, battlerId);
  }
  return next;
}

function runToTerminal(rulesContext: BattleScriptRulesContext) {
  const execution = createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_EffectYawn",
    rulesContext,
    1,
    externalPorts(),
  );
  let result = stepBattleScriptMachine(program, execution.state, execution.handlers);
  let steps = 1;
  while (result.kind !== "halted" && steps < 1000) {
    result = stepBattleScriptMachine(program, ackAllPending(result.state), execution.handlers);
    steps++;
  }
  if (result.kind !== "halted") throw new Error(`Yawn did not reach END after ${steps} steps`);
  expect(result.state.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
  return result;
}

describe("Yawn setter (BattleScript_EffectYawn / Cmd_setyawn, docs/yawn-thrash-endturn-design.md §1a)", () => {
  it("ordinary landing executes the complete first stage through its drowsy message and END; end-turn tests pin the second-stage countdown/sleep transition", () => {
    const result = runToTerminal(context());
    expect(result.state.rulesContext.battlers[1]!.status3).toBe(STATUS3_YAWN_TURN_2);
    expect(result.state.events).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "message", messageId: "STRINGID_PKMNWASMADEDROWSY" }),
    ]));
    expect(result.state.rng.calls).toBe(0);
  });

  it("ability gate executes sBATTLER <- sBATTLER_WITH_ABILITY and emits the ability-holder message through END", () => {
    const rc = context(
      {},
      { scriptingBattler: 3, battlerWithAbility: 2 },
      { ability: ABILITY_INSOMNIA },
    );
    const result = runToTerminal(rc);
    expect(result.state.rulesContext.battlerWithAbility).toBe(1);
    expect(result.state.rulesContext.scriptingBattler).toBe(1);
    expect(result.state.events).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "message", messageId: "STRINGID_PKMNSXMADEITINEFFECTIVE" }),
    ]));
    expect(result.state.rng.calls).toBe(0);
  });

  it("canonical replay preserves both Yawn stages' first-stage state/events and its zero-draw ledger", () => {
    const rc = context();
    const first = runToTerminal(rc).state;
    const replay = runToTerminal(rc).state;
    expect(replay.rulesContext).toEqual(first.rulesContext);
    expect(replay.events).toEqual(first.events);
    expect(replay.rng).toEqual(first.rng);
  });

  it("ordinary landing: setyawn sets STATUS3_YAWN_TURN(2), reaches BattleScript_MoveEnd, zero RNG (Yawn's own accuracycheck uses NO_ACC_CALC_CHECK_LOCK_ON, which never rolls -- battle_script_commands.c:1103-1113)", () => {
    const rc = context();
    const { result } = runUntilLabel("BattleScript_EffectYawn", "BattleScript_MoveEnd", rc);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battlers[1]!.status3).toBe(STATUS3_YAWN_TURN_2);
    expect(result.state.rng.calls).toBe(0);
  });

  it("already yawning (1 turn left on the countdown): setyawn fails to BattleScript_ButItFailed, status3 unchanged", () => {
    const rc = context({}, {}, { status3: STATUS3_YAWN_TURN_1 });
    const { result } = runUntilLabel("BattleScript_EffectYawn", "BattleScript_ButItFailed", rc);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battlers[1]!.status3).toBe(STATUS3_YAWN_TURN_1);
  });

  it("target already statused (e.g. paralyzed): setyawn fails to BattleScript_ButItFailed, status3 unchanged", () => {
    const rc = context({}, {}, { status1: STATUS1_PARALYSIS });
    const { result } = runUntilLabel("BattleScript_EffectYawn", "BattleScript_ButItFailed", rc);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battlers[1]!.status3).toBe(0);
    expect(result.state.rulesContext.battlers[1]!.status1).toBe(STATUS1_PARALYSIS);
  });

  it("Vital Spirit target: jumpifability blocks before setyawn ever runs (BattleScript_PrintBankAbilityMadeIneffective), reveals the ability", () => {
    const rc = context({}, {}, { ability: ABILITY_VITAL_SPIRIT });
    const { result } = runUntilLabel("BattleScript_EffectYawn", "BattleScript_PrintBankAbilityMadeIneffective", rc);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battlers[1]!.status3).toBe(0);
    expect(result.state.rulesContext.lastUsedAbility).toBe(ABILITY_VITAL_SPIRIT);
    expect(result.state.rng.calls).toBe(0);
  });

  it("Insomnia target: jumpifability blocks before setyawn ever runs (BattleScript_PrintBankAbilityMadeIneffective), reveals the ability", () => {
    const rc = context({}, {}, { ability: ABILITY_INSOMNIA });
    const { result } = runUntilLabel("BattleScript_EffectYawn", "BattleScript_PrintBankAbilityMadeIneffective", rc);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battlers[1]!.status3).toBe(0);
    expect(result.state.rulesContext.lastUsedAbility).toBe(ABILITY_INSOMNIA);
    expect(result.state.rng.calls).toBe(0);
  });
});
