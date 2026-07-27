import { describe, expect, it } from "vitest";
import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContext,
  type BattleScriptStatusRulesExternalPorts,
} from "../src/engine/battleScriptRulesContext.ts";
import { loadBattleScriptProgram } from "../src/engine/battleScriptProgram.ts";
import {
  acknowledgeBattleScriptMachineController,
  stepBattleScriptMachine,
  type BattleScriptMachineState,
} from "../src/engine/battleScriptMachine.ts";

/**
 * Full committed-script walks for the multi-hit family
 * (docs/roar-multihit-registration-scout.md §4 rungs 2-6):
 * EFFECT_MULTI_HIT/EFFECT_DOUBLE_HIT/EFFECT_TWINEEDLE, each reaching a
 * genuine {kind:"terminal", opcodeName:"B_SCR_OP_END"} halt through the real
 * production handler composition (`createBattleScriptStatusRulesHandlers`,
 * same composition root the production wiring files consume). Two real
 * hidden barriers beyond the scout's own list were found running these
 * scripts live (not by trusting the dossier) and widened this session:
 * `Cmd_addbyte`'s `sMULTIHIT_STRING + 4` write (every multi-hit iteration,
 * not just Triple Kick's own reader as the scout's §1d table claimed) and
 * `Cmd_copyarray`'s `gBattleTextBuff1 <- sMULTIHIT_STRING, 6` presentation
 * copy at `BattleScript_MultiHitPrintStrings`.
 */

const program = loadBattleScriptProgram();
/** src/data/gen/moves.json -- the family's own 100-accuracy members (scout §3's recipe), removing the accuracy roll's outcome as a confound. */
const MOVE_SPIKE_CANNON = 131; // EFFECT_MULTI_HIT, power 20
const MOVE_DOUBLE_KICK = 24; // EFFECT_DOUBLE_HIT, power 30
const MOVE_TWINEEDLE = 41; // EFFECT_TWINEEDLE, power 25

function battler(changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 999,
    maxHP: changes.maxHP ?? 999,
    moves: changes.moves ?? Object.freeze([MOVE_SPIKE_CANNON, 0, 0, 0]),
    pp: changes.pp ?? Object.freeze([15, 0, 0, 0]),
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
  } as BattleScriptRulesBattler);
}

function context(move: number): BattleScriptRulesContext {
  const battlers: BattleScriptRulesBattler[] = [
    battler({ side: 0, moves: [move, 0, 0, 0] }),
    battler({ side: 1 }),
    battler({ side: 0 }),
    battler({ side: 1 }),
  ];
  return createBattleScriptRulesContext({
    battlers,
    selectorRoles: { attacker: 0, target: 1, effectBattler: 1 },
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
    chosenMove: move,
  });
}

function externalPorts(): BattleScriptStatusRulesExternalPorts {
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
      // BattleScript_DoMultiHit's own `waitmessage 1` -- a bare frame-count literal, not a symbolic B_WAIT_TIME_*.
      return /^[0-9]+$/.test(operand.expression) ? Number(operand.expression) : null;
    },
    // BattleScript_EffectMultiHit's own `setmultihitcounter 0` and DoubleHit/Twineedle's `setmultihitcounter 2` -- bare decimal literals.
    resolveByteOperand: (_context, operand) => (/^[0-9]+$/.test(operand.expression) ? Number(operand.expression) : null),
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
    if (guard > 500) throw new Error("step() did not converge");
    const nextState = result.kind === "blocked" ? ackAllPending(result.state) : result.state;
    result = stepBattleScriptMachine(program, nextState, handlers);
  }
  return result;
}

function runToTerminal(entryLabel: string, rc: BattleScriptRulesContext, rngSeed: number) {
  const execution = createBattleScriptStatusRulesExecution(program, entryLabel, rc, rngSeed, externalPorts());
  let result = step(execution.state, execution.handlers);
  let steps = 0;
  while (result.kind === "advanced" && steps < 500) {
    steps += 1;
    result = step(result.state, execution.handlers);
  }
  if (result.kind !== "halted") throw new Error(`script did not reach its own end: ${result.kind}`);
  expect(result.state.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
  return result;
}

describe("EFFECT_MULTI_HIT: full committed script walk, genuine terminal halt", () => {
  it("Spike Cannon (100 acc) lands its RNG-drawn hit count, target HP drops, RNG ledger matches 1 accuracy + hit-count draw(s) + 2 rolls/hit + 1 final effect-chance roll", () => {
    const result = runToTerminal("BattleScript_EffectMultiHit", context(MOVE_SPIKE_CANNON), 1);
    expect(result.state.rulesContext.battlers[1]!.hp).toBe(960); // 3 hits landed
    expect(result.state.rng.calls).toBe(9); // 1(acc) + 1(hit-count draw) + 2*3(hits) + 1(final)
  });

  it("a different seed draws a different hit count (2 hit-count draws this time) and a different total damage/roll ledger -- composition is genuinely RNG-driven, not hardcoded", () => {
    const result = runToTerminal("BattleScript_EffectMultiHit", context(MOVE_SPIKE_CANNON), 3);
    expect(result.state.rulesContext.battlers[1]!.hp).toBe(943); // 4 hits landed
    expect(result.state.rng.calls).toBe(12); // 1(acc) + 2(hit-count draws) + 2*4(hits) + 1(final)
  });
});

describe("EFFECT_DOUBLE_HIT: full committed script walk, genuine terminal halt", () => {
  it("Double Kick (100 acc): fixed 2-hit count (setmultihitcounter 2, a literal -- zero hit-count RNG draws), target HP drops across both hits", () => {
    const result = runToTerminal("BattleScript_EffectDoubleHit", context(MOVE_DOUBLE_KICK), 1);
    expect(result.state.rulesContext.battlers[1]!.hp).toBe(945);
    expect(result.state.rng.calls).toBe(6); // 1(acc) + 0(literal counter) + 2*2(hits) + 1(final)
  });
});

describe("EFFECT_TWINEEDLE: full committed script walk, genuine terminal halt", () => {
  it("Twineedle (100 acc): fixed 2-hit count, no poison this seed", () => {
    const result = runToTerminal("BattleScript_EffectTwineedle", context(MOVE_TWINEEDLE), 1);
    expect(result.state.rulesContext.battlers[1]!.hp).toBe(976);
    expect(result.state.rulesContext.battlers[1]!.status1).toBe(0);
    expect(result.state.rng.calls).toBe(6); // 1(acc) + 0(literal counter) + 2*2(hits) + 1(final poison-chance roll, always drawn)
  });

  it("Twineedle's poison-chance composition: a seed whose final effect-chance roll actually poisons the target (STATUS1_POISON = 1 << 3)", () => {
    const result = runToTerminal("BattleScript_EffectTwineedle", context(MOVE_TWINEEDLE), 55);
    expect(result.state.rulesContext.battlers[1]!.status1).toBe(1 << 3);
    expect(result.state.rng.calls).toBe(6);
  });
});
