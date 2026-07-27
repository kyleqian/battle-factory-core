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
const REST = 156; // EFFECT_REST
const STATUS1_POISON = 1 << 3;
const STATUS1_SLEEP_TURN_3 = 3;

function battler(changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 50,
    maxHP: changes.maxHP ?? 100,
    moves: changes.moves ?? Object.freeze([REST, 0, 0, 0]),
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
  attacker: 0 | 1,
  attackerChanges: Partial<BattleScriptRulesBattler> = {},
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
  battlers[target] = battler({ side: target });
  return createBattleScriptRulesContext({
    battlers,
    selectorRoles: { attacker, target, effectBattler: attacker },
    scriptingBattler: attacker,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: REST,
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

function labelPc(label: string): number {
  const entry = resolveBattleScriptLabel(program, label);
  if (!entry) throw new Error(`committed Battle Script program does not define label ${label}`);
  return entry.programCounter;
}

const TRYSETREST_PC = program.instructions.find(
  (instruction) => instruction.opcodeName === "B_SCR_OP_TRYSETREST",
)!.programCounter;

/** Lands directly on the committed program's one B_SCR_OP_TRYSETREST instruction. */
function stepAtTrysetrest(rulesContext: BattleScriptRulesContext) {
  const execution = createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_EffectRest",
    rulesContext,
    1,
    externalPorts(),
  );
  const patched = Object.freeze({ ...execution.state, programCounter: TRYSETREST_PC });
  return stepBattleScriptMachine(program, patched, execution.handlers);
}

describe("production trysetrest (Cmd_trysetrest) dispatch", () => {
  it("registers B_SCR_OP_TRYSETREST", () => {
    expect(program.instructions.find((i) => i.opcodeName === "B_SCR_OP_TRYSETREST")).toBeDefined();
  });

  it("full HP: jumps to the operand's fail pointer (BattleScript_AlreadyAtFullHp), no status1 write, but selectorRoles.target and battleMoveDamage are still reassigned (source writes them unconditionally before the HP check)", () => {
    const rc = context(0, { hp: 100, maxHP: 100 });
    const result = stepAtTrysetrest(rc);
    if (result.kind !== "advanced") throw new Error(`did not advance: ${result.kind}`);
    expect(result.state.programCounter).toBe(labelPc("BattleScript_AlreadyAtFullHp"));
    expect(result.state.rulesContext.battlers[0]!.status1).toBe(0);
    expect(result.state.rulesContext.selectorRoles.target).toBe(0); // reassigned to attacker even on fail
    expect(result.state.rulesContext.battleMoveDamage).toBe(-100); // -maxHP, written unconditionally
    expect(result.state.rng.calls).toBe(0);
  });

  it("not full HP, no pre-existing status: succeeds, status1 becomes STATUS1_SLEEP_TURN(3), B_MSG_REST chooser, party mirror synced, set-battler-status-data event emitted", () => {
    const rc = context(0, { hp: 60, maxHP: 100, status1: 0, partyIndex: 2, side: 0 });
    const result = stepAtTrysetrest(rc);
    if (result.kind !== "advanced") throw new Error(`did not advance: ${result.kind}`);
    expect(result.state.rulesContext.battlers[0]!.status1).toBe(STATUS1_SLEEP_TURN_3);
    expect(result.state.rulesContext.multistringChooser).toBe(0); // B_MSG_REST
    expect(result.state.rulesContext.selectorRoles.target).toBe(0);
    expect(result.state.rulesContext.battleMoveDamage).toBe(-100);
    expect(result.state.rulesContext.party.player[2]!.status1).toBe(STATUS1_SLEEP_TURN_3);
    expect(result.state.events).toMatchObject([
      { kind: "set-battler-status-data", battler: 0, status1: STATUS1_SLEEP_TURN_3 },
    ]);
  });

  it("not full HP, pre-existing non-sleep status (Poison): status1 is REPLACED (not OR'd) with STATUS1_SLEEP_TURN(3) -- Rest cures the poison in the same write -- B_MSG_REST_STATUSED chooser", () => {
    const rc = context(0, { hp: 60, maxHP: 100, status1: STATUS1_POISON });
    const result = stepAtTrysetrest(rc);
    if (result.kind !== "advanced") throw new Error(`did not advance: ${result.kind}`);
    expect(result.state.rulesContext.battlers[0]!.status1).toBe(STATUS1_SLEEP_TURN_3); // poison bit cleared
    expect(result.state.rulesContext.multistringChooser).toBe(1); // B_MSG_REST_STATUSED
  });

  it("draws no RNG on the success path either", () => {
    const rc = context(0, { hp: 60, maxHP: 100 });
    const result = stepAtTrysetrest(rc);
    if (result.kind !== "advanced") throw new Error(`did not advance: ${result.kind}`);
    expect(result.state.rng.calls).toBe(0);
  });
});

describe(
  "EFFECT_REST: full committed script, the census's next-ranked blocker after EFFECT_ABSORB/EFFECT_DREAM_EATER "
    + "(B_SCR_OP_TRYSETREST, 49 weighted)",
  () => {
    function runToTerminal(rc: BattleScriptRulesContext, rngSeed = 1) {
      const execution = createBattleScriptStatusRulesExecution(
        program,
        "BattleScript_EffectRest",
        rc,
        rngSeed,
        externalPorts(),
      );
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

    it("succeeds end to end: heals to full HP, status1 set to STATUS1_SLEEP_TURN(3), no RNG anywhere in the walk, genuine terminal end", () => {
      const rc = context(0, { hp: 40, maxHP: 100, status1: 0 });
      const result = runToTerminal(rc);
      expect(result.state.rulesContext.battlers[0]!.hp).toBe(100);
      expect(result.state.rulesContext.battlers[0]!.status1).toBe(STATUS1_SLEEP_TURN_3);
      expect(result.state.rng.calls).toBe(0);
      expect(result.state.rulesContext.moveendState).toBe(17);
    });

    it("cures a pre-existing status (Burn) while healing to full, end to end", () => {
      const STATUS1_BURN = 1 << 4;
      const rc = context(0, { hp: 1, maxHP: 100, status1: STATUS1_BURN });
      const result = runToTerminal(rc);
      expect(result.state.rulesContext.battlers[0]!.hp).toBe(100);
      expect(result.state.rulesContext.battlers[0]!.status1).toBe(STATUS1_SLEEP_TURN_3);
    });

    it("fails at full HP end to end via BattleScript_AlreadyAtFullHp (STRINGID_PKMNHPFULL), no status1 write, genuine terminal end", () => {
      const rc = context(0, { hp: 100, maxHP: 100, status1: 0 });
      const result = runToTerminal(rc);
      expect(result.state.rulesContext.battlers[0]!.hp).toBe(100);
      expect(result.state.rulesContext.battlers[0]!.status1).toBe(0); // trysetrest's fail branch never writes status1
      expect(result.state.rulesContext.moveendState).toBe(17);
    });

    it("choosing Rest directly while already asleep never reaches BattleScript_RestIsAlreadyAsleep -- the script's own leading attackcanceler intercepts first (AtkCanceler_UnableToUseMove's CANCELER_ASLEEP case, battle_util.c:2015-2058: Rest is neither MOVE_SNORE nor MOVE_SLEEP_TALK, so a still-nonzero sleep counter after this turn's decrement redirects straight to BattleScript_MoveUsedIsAsleep, never reaching this script's own jumpifstatus check) -- verified rather than assumed, matching entry 507's standing policy", () => {
      const rc = context(0, { hp: 50, maxHP: 100, status1: STATUS1_SLEEP_TURN_3 });
      const result = runToTerminal(rc);
      expect(result.state.rulesContext.battlers[0]!.status1).toBe(STATUS1_SLEEP_TURN_3 - 1); // attackcanceler's own sleep-turn decrement, not trysetrest
      expect(result.state.rulesContext.alreadyStatusedMoveAttempt).toBe(0); // setalreadystatusedmoveattempt never reached this way
      expect(result.state.rulesContext.moveendState).toBe(17);
    });

    it("BattleScript_RestIsAlreadyAsleep itself (reached in real hardware only via Cmd_jumptocalledmove -- e.g. Sleep Talk randomly selecting Rest while the user is still asleep, which bypasses this script's own leading attackcanceler gate; Sleep Talk is unregistered and out of this step's scope, so this drives the label directly): setalreadystatusedmoveattempt's newly-widened VARIOUS case fires, no HP/status1 change, genuine terminal end", () => {
      const rc = context(0, { hp: 50, maxHP: 100, status1: STATUS1_SLEEP_TURN_3 });
      const execution = createBattleScriptStatusRulesExecution(
        program,
        "BattleScript_RestIsAlreadyAsleep",
        rc,
        1,
        externalPorts(),
      );
      let result = step(execution.state, execution.handlers);
      let steps = 0;
      while (result.kind === "advanced" && steps < 80) {
        steps += 1;
        result = step(result.state, execution.handlers);
      }
      if (result.kind !== "halted") throw new Error(`script did not reach its own end: ${result.kind}`);
      expect(result.state.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
      expect(result.state.rulesContext.battlers[0]!.hp).toBe(50); // untouched -- trysetrest never runs on this branch
      expect(result.state.rulesContext.battlers[0]!.status1).toBe(STATUS1_SLEEP_TURN_3); // unchanged
      expect(result.state.rulesContext.alreadyStatusedMoveAttempt).toBe(1 << 0); // battler 0's own bit set
      expect(result.state.rulesContext.moveendState).toBe(17);
    });
  },
);
