import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContext,
  type BattleScriptStatusRulesExternalPorts,
} from "../../src/engine/battleScriptRulesContext.ts";
import { loadBattleScriptProgram } from "../../src/engine/battleScriptProgram.ts";
import {
  acknowledgeBattleScriptMachineController,
  createBattleScriptMachine,
  stepBattleScriptMachine,
  type BattleScriptMachineState,
} from "../../src/engine/battleScriptMachine.ts";

/**
 * Real committed battle-script walker for the rng244 rate checks: same
 * production handler composition as tests/battleScriptMultiHitFamily.test.ts,
 * but each machine step is observed so a test can read the ENGINE's outcome
 * (critMultiplier, battleMoveDamage, multiHitCounter, status1) right after each
 * RNG ledger entry, rather than re-deriving it from the raw roll.
 */

export const program = loadBattleScriptProgram();

type Handlers = ReturnType<typeof createBattleScriptStatusRulesExecution>["handlers"];
type MachineState = BattleScriptMachineState<BattleScriptRulesContext>;

export function battler(changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 999,
    maxHP: changes.maxHP ?? 999,
    moves: changes.moves ?? Object.freeze([0, 0, 0, 0]),
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

export function singlesContext(
  move: number,
  attacker: Partial<BattleScriptRulesBattler> = {},
  target: Partial<BattleScriptRulesBattler> = {},
): BattleScriptRulesContext {
  const battlers: BattleScriptRulesBattler[] = [
    battler({ side: 0, moves: [move, 0, 0, 0], ...attacker }),
    battler({ side: 1, ...target }),
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
      return /^[0-9]+$/.test(operand.expression) ? Number(operand.expression) : null;
    },
    resolveByteOperand: (_context, operand) => (/^[0-9]+$/.test(operand.expression) ? Number(operand.expression) : null),
  });
}

function ackAllPending(state: MachineState): MachineState {
  let next = state;
  for (const battlerId of state.scheduler.pendingControllerBattlers) {
    next = acknowledgeBattleScriptMachineController(next, battlerId);
  }
  return next;
}

function step(state: MachineState, handlers: Handlers) {
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

/** One RNG draw as the engine consumed it, with the engine-side outcome read right after it. */
export type ObservedDraw = Readonly<{
  reason: string;
  randomValue: number;
  critMultiplier: number;
  battleMoveDamageBefore: number;
  battleMoveDamageAfter: number;
  multiHitCounter: number;
}>;

export type ObservedRun = Readonly<{
  draws: readonly ObservedDraw[];
  hp: number;
  status1: number;
  rngCalls: number;
}>;

/** The handler table is rebuilt from ~100 opcode families (28 ms); it is stateless, so build it once. */
let sharedHandlers: Handlers | null = null;
function handlersOnce(rc: BattleScriptRulesContext): Handlers {
  sharedHandlers ??= createBattleScriptStatusRulesExecution(program, "BattleScript_EffectHit", rc, 1, externalPorts()).handlers;
  return sharedHandlers;
}

/** `stopAfterDraws` ends the walk once that many RNG draws were consumed (the early-draw checks do not need the script's tail). */
export function runObserved(
  entryLabel: string,
  rc: BattleScriptRulesContext,
  rngSeed: number,
  stopAfterDraws = Infinity,
): ObservedRun {
  const execution = {
    state: createBattleScriptMachine(program, entryLabel, rc, rngSeed),
    handlers: handlersOnce(rc),
  };
  const draws: ObservedDraw[] = [];
  let state = execution.state;
  let before = state;
  let result = step(state, execution.handlers);
  for (let steps = 0; ; steps += 1) {
    if (steps > 600) throw new Error(`${entryLabel} did not terminate`);
    const after = result.state;
    for (let call = before.rng.calls; call < after.rng.calls; call += 1) {
      const entry = after.rng.ledger[call]!;
      draws.push({
        reason: entry.reason,
        randomValue: entry.randomValue,
        critMultiplier: after.rulesContext.critMultiplier,
        battleMoveDamageBefore: before.rulesContext.battleMoveDamage,
        battleMoveDamageAfter: after.rulesContext.battleMoveDamage,
        multiHitCounter: after.rulesContext.multiHitCounter,
      });
    }
    if (result.kind !== "advanced") break;
    if (after.rng.calls >= stopAfterDraws) {
      return { draws, hp: after.rulesContext.battlers[1]!.hp, status1: after.rulesContext.battlers[1]!.status1, rngCalls: after.rng.calls };
    }
    before = result.state;
    result = step(result.state, execution.handlers);
  }
  if (result.kind !== "halted") throw new Error(`${entryLabel} did not reach its own end: ${result.kind}`);
  const target = result.state.rulesContext.battlers[1]!;
  return { draws, hp: target.hp, status1: target.status1, rngCalls: result.state.rng.calls };
}

/** mulberry32: a fixed, well-mixed 32-bit stream so the "random RNG starts" are identical on every run. */
export function seedList(salt: number, count: number): number[] {
  let a = (0x9e3779b9 ^ Math.imul(salt, 0x85ebca6b)) >>> 0;
  const seeds: number[] = [];
  for (let i = 0; i < count; i += 1) {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    seeds.push(((t ^ (t >>> 14)) >>> 0));
  }
  return seeds;
}

/** |count - n*p| <= sigmas * sqrt(n*p*(1-p)); returns the margin in SD units for failure messages. */
export function binomialZ(count: number, trials: number, p: number): number {
  const sd = Math.sqrt(trials * p * (1 - p));
  return sd === 0 ? (count === trials * p ? 0 : Infinity) : (count - trials * p) / sd;
}
