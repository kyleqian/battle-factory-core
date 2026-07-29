import { describe, expect, it } from "vitest";
import {
  BATTLE_SCRIPT_BATTLE_TYPE_DOUBLE,
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
 * EFFECT_EXPLOSION full committed-script walks (docs/executable-frontier-census.md's
 * EXPLOSION census set): `B_SCR_OP_TRYEXPLOSION` + `B_SCR_OP_SETATKHPTOZERO`
 * (`battleScriptExplosionOpcode.ts`) plus `damageCalc.ts`'s own
 * EFFECT_EXPLOSION defense-halving fix, each reaching a genuine
 * `{kind:"terminal", opcodeName:"B_SCR_OP_END"}` halt through the real
 * production handler composition. `BattleScript_EffectExplosion`
 * (`data/battle_scripts_1.s:374-408`) never calls `checkteamslost` itself --
 * only `BattleScript_HandleFaintedMon` does (`:2830-2831`), a separate script
 * this effect's own script body never reaches -- so there is no
 * checkteamslost outcome to pin here even for the simultaneous-KO walk
 * below; both faints resolve purely through `tryfaintmon` ->
 * `BattleScript_FaintTarget`/`BattleScript_FaintAttacker`'s own real
 * playfaintcry/dofaintanimation/cleareffectsonfaint chain.
 */

const program = loadBattleScriptProgram();
const MOVE_EXPLOSION = 153; // EFFECT_EXPLOSION, power 250, 100 acc, TYPE_NORMAL
/** include/constants/abilities.h. */
const ABILITY_DAMP = 6;

function battler(changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 999,
    maxHP: changes.maxHP ?? 999,
    moves: changes.moves ?? Object.freeze([MOVE_EXPLOSION, 0, 0, 0]),
    pp: changes.pp ?? Object.freeze([5, 0, 0, 0]),
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

function context(
  attackerChanges: Partial<BattleScriptRulesBattler> = {},
  targetChanges: Partial<BattleScriptRulesBattler> = {},
  otherBattlerChanges: readonly [Partial<BattleScriptRulesBattler>, Partial<BattleScriptRulesBattler>] = [{}, {}],
  battleTopology?: Readonly<{ battlersCount: 2 | 4; battleTypeFlags: number; battlerPositions: readonly number[] }>,
): BattleScriptRulesContext {
  const battlers: BattleScriptRulesBattler[] = [
    battler({ side: 0, moves: [MOVE_EXPLOSION, 0, 0, 0], ...attackerChanges }),
    battler({ side: 1, ...targetChanges }),
    battler({ side: 0, ...otherBattlerChanges[0] }),
    battler({ side: 1, ...otherBattlerChanges[1] }),
  ];
  return createBattleScriptRulesContext({
    battlers,
    battleTopology,
    selectorRoles: { attacker: 0, target: 1, effectBattler: 0 },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: MOVE_EXPLOSION,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
    chosenMove: MOVE_EXPLOSION,
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
      return /^[0-9]+$/.test(operand.expression) ? Number(operand.expression) : null;
    },
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

function runToTerminal(rc: BattleScriptRulesContext, rngSeed: number) {
  const execution = createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_EffectExplosion",
    rc,
    rngSeed,
    externalPorts(),
  );
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

describe("EFFECT_EXPLOSION: full committed script walk, genuine terminal halt", () => {
  it("success: attacker's HP is forced to 0 (setatkhptozero) and faints through the real tryfaintmon -> BattleScript_FaintAttacker machinery; target takes EFFECT_EXPLOSION's halved-defense damage", () => {
    const rc = context({ hp: 400 }, { hp: 900, defense: 50 });
    const result = runToTerminal(rc, 1);
    expect(result.state.rulesContext.battlers[0]!.hp).toBe(0); // attacker: setatkhptozero, unconditional
    expect(result.state.rulesContext.battlers[1]!.hp).toBeLessThan(900); // target took real damage
    // Halved-defense damage is far larger than an un-halved calc would produce
    // (~222 vs ~112 at these stats before STAB/the random 85-100% variance
    // roll) -- this pin is the fix's own regression guard: reverting
    // damageCalc.ts's EFFECT_EXPLOSION branch drops this well below 200.
    const damageDealt = 900 - result.state.rulesContext.battlers[1]!.hp;
    expect(damageDealt).toBe(329); // seed 1: 222 base * 1.5 STAB (normal/normal) = 333, * random 85-100% roll
    // party write-through: setatkhptozero's HP write lands in the party slice too.
    expect(result.state.rulesContext.party.player[0]!.hp).toBe(0);
    // RNG ledger: critcalc (1) + adjustnormaldamage's random 85-100% spread (1)
    // + accuracycheck (1) -- tryexplosion/setatkhptozero themselves draw zero.
    expect(result.state.rng.calls).toBe(3);
  });

  it("Damp-blocked: a battler with Damp (constructed directly per the brief's fallback -- no legal single-ability-slot Damp Factory set exists to reach this via a real species) stops the explosion before any damage or HP-to-zero write; jumps straight to BattleScript_DampStopsExplosion -> BattleScript_MoveEnd", () => {
    const rc = context({ hp: 400 }, { hp: 900, ability: ABILITY_DAMP });
    const result = runToTerminal(rc, 1);
    expect(result.state.rulesContext.battlers[0]!.hp).toBe(400); // attacker's HP untouched -- setatkhptozero never ran
    expect(result.state.rulesContext.battlers[1]!.hp).toBe(900); // target untouched -- damage chain never ran
    expect(result.state.rulesContext.lastUsedAbility).toBe(ABILITY_DAMP);
    expect(result.state.rulesContext.aiObservedAbilityIds[1]).toBe(ABILITY_DAMP);
  });

  it("Damp on a battler that is neither attacker nor target still blocks the explosion (ALL active battlers, not just the target -- Cmd_tryexplosion's own scan has no absent/role filter). This only has a live third battler slot in a doubles topology -- in singles (battlersCount 2, this main lane's exclusive scope) slots 2/3 are correctly excluded from the scan because gBattlersCount itself is 2, matching source exactly, not a special case this port carves out", () => {
    const rc = context(
      { hp: 400 },
      { hp: 900 },
      [{ ability: ABILITY_DAMP }, {}],
      { battlersCount: 4, battleTypeFlags: BATTLE_SCRIPT_BATTLE_TYPE_DOUBLE, battlerPositions: [0, 1, 2, 3] },
    );
    const result = runToTerminal(rc, 1);
    expect(result.state.rulesContext.battlers[0]!.hp).toBe(400);
    expect(result.state.rulesContext.battlers[1]!.hp).toBe(900);
    expect(result.state.rulesContext.lastUsedAbility).toBe(ABILITY_DAMP);
  });

  it("attacker-faints-but-target-survives: target's HP comfortably exceeds the halved-defense damage roll", () => {
    const rc = context({ hp: 1 }, { hp: 60000, maxHP: 60000, defense: 50 });
    const result = runToTerminal(rc, 7);
    expect(result.state.rulesContext.battlers[0]!.hp).toBe(0);
    expect(result.state.rulesContext.battlers[1]!.hp).toBeGreaterThan(59000);
    expect(result.state.rulesContext.battlers[1]!.hp).toBeLessThan(60000);
  });

  it("simultaneous KO: target's HP is at or below the halved-defense damage roll, so BOTH tryfaintmon BS_TARGET and tryfaintmon BS_ATTACKER take the real fainting path in one script walk -- BattleScript_EffectExplosion itself never calls checkteamslost (only BattleScript_HandleFaintedMon does, a separate script this one never reaches), so there is no checkteamslost outcome to pin here", () => {
    const rc = context({ hp: 1 }, { hp: 1, defense: 50 });
    const result = runToTerminal(rc, 7);
    expect(result.state.rulesContext.battlers[0]!.hp).toBe(0);
    expect(result.state.rulesContext.battlers[1]!.hp).toBe(0);
  });
});
