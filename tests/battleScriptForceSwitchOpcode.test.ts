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
  createBattleScriptMachine,
  stepBattleScriptMachine,
  type BattleScriptMachineState,
} from "../src/engine/battleScriptMachine.ts";
import { createBattleScriptForceSwitchOpcodeHandlers } from "../src/engine/battleScriptForceSwitchOpcode.ts";

/**
 * EFFECT_ROAR: docs/roar-multihit-registration-scout.md §4 rungs 10-14.
 * Full committed-script walks through the real production handler
 * composition (`createBattleScriptStatusRulesExecution`), the same root the
 * multi-hit family's own tests use.
 *
 * Two hidden barriers found live running this exact committed script
 * (budgeted for by the brief, not in the scout dossier's own tables):
 * `BATTLE_TYPE_ARENA` was never actually added to `JUMPIFWORD_VALUES`
 * (`battleScriptJumpifwordOpcode.ts`) despite the scout's §1a table marking
 * it "already registered" -- it was only ever a local building block for
 * the `BATTLE_TYPE_FRONTIER` OR-mask, never exposed standalone. Widened
 * here (fixed in `battleScriptJumpifwordOpcode.ts`, not in this file).
 */

const program = loadBattleScriptProgram();
const MOVE_ROAR = 46;
const ABILITY_NATURAL_CURE = 30;
const ABILITY_SUCTION_CUPS = 21;
const STATUS3_ROOTED = 1 << 10;
/** battle_tower.c:2093 -- real Factory battles set exactly TRAINER|FACTORY, not the whole FRONTIER check-mask (BATTLE_TYPE_FRONTIER also ORs in BATTLE_TYPE_ARENA, which would spuriously trip Roar's own `jumpifbattletype BATTLE_TYPE_ARENA` guard). */
const BATTLE_TYPE_TRAINER = 1 << 3;
const BATTLE_TYPE_FACTORY = 1 << 19;

function battler(changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 100,
    maxHP: changes.maxHP ?? 100,
    moves: changes.moves ?? Object.freeze([MOVE_ROAR, 0, 0, 0]),
    pp: changes.pp ?? Object.freeze([15, 0, 0, 0]),
    status1: changes.status1 ?? 0,
    status2: changes.status2 ?? 0,
    status3: changes.status3 ?? 0,
    substituteHP: 0,
    rolloutTimer: 0,
    furyCutterCounter: 0,
    truantCounter: 0,
    rechargeTimer: 0,
    flinchImmobility: 0,
    disabledMove: 0,
    usedDisabledMove: 0,
    tauntTimer: 0,
    usedTauntedMove: 0,
    usedImprisonedMove: 0,
    item: 0,
    statStages: changes.statStages ?? [6, 6, 6, 6, 6, 6, 6, 6],
    types: changes.types ?? (["TYPE_NORMAL", "TYPE_NORMAL"] as const),
    species: changes.species ?? 1,
    attack: 50,
    defense: 50,
    spAttack: 50,
    spDefense: 50,
    level: changes.level ?? 50,
    friendship: 0,
    partyIndex: changes.partyIndex ?? 0,
  } as BattleScriptRulesBattler);
}

type ContextOverrides = Readonly<{
  attackerLevel?: number;
  targetLevel?: number;
  targetAbility?: number;
  targetStatus3?: number;
  targetEvasionStage?: number;
  opponentParty?: readonly Readonly<{ species: number; hp: number; isEgg?: boolean }>[];
  trainerBattle?: boolean;
}>;

const ALIVE_THREE_MON_BENCH = Object.freeze([
  Object.freeze({ species: 1, hp: 50, isEgg: false }),
  Object.freeze({ species: 2, hp: 50, isEgg: false }),
  Object.freeze({ species: 3, hp: 50, isEgg: false }),
  Object.freeze({ species: 0, hp: 0, isEgg: false }),
  Object.freeze({ species: 0, hp: 0, isEgg: false }),
  Object.freeze({ species: 0, hp: 0, isEgg: false }),
]);

function context(overrides: ContextOverrides = {}): BattleScriptRulesContext {
  const battlers: BattleScriptRulesBattler[] = [
    battler({ side: 0, moves: [MOVE_ROAR, 0, 0, 0], level: overrides.attackerLevel ?? 50 }),
    battler({
      side: 1,
      level: overrides.targetLevel ?? 50,
      species: 1,
      partyIndex: 0,
      ability: overrides.targetAbility ?? 0,
      status3: overrides.targetStatus3 ?? 0,
      statStages: [6, 6, 6, 6, 6, 6, 6, overrides.targetEvasionStage ?? 6],
    }),
    battler({ side: 0 }),
    battler({ side: 1 }),
  ];
  return createBattleScriptRulesContext({
    battlers,
    selectorRoles: { attacker: 0, target: 1, effectBattler: 1 },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: MOVE_ROAR,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
    chosenMove: MOVE_ROAR,
    battleTopology: overrides.trainerBattle
      ? { battlersCount: 2, battleTypeFlags: BATTLE_TYPE_TRAINER | BATTLE_TYPE_FACTORY, battlerPositions: [0, 1, 0xff, 0xff] }
      : undefined,
    party: { opponent: overrides.opponentParty ?? ALIVE_THREE_MON_BENCH },
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

function runToHalt(entryLabel: string, rc: BattleScriptRulesContext, rngSeed: number) {
  const execution = createBattleScriptStatusRulesExecution(program, entryLabel, rc, rngSeed, externalPorts());
  let result = step(execution.state, execution.handlers);
  let steps = 0;
  while (result.kind === "advanced" && steps < 500) {
    steps += 1;
    result = step(result.state, execution.handlers);
  }
  if (result.kind !== "halted") throw new Error(`script did not reach its own end: ${result.kind}`);
  return result;
}

describe("EFFECT_ROAR: full committed script walk, genuine terminal halt", () => {
  it("attacker level == target level: TryDoForceSwitchOut's unconditional-success branch (zero level-check draws), target actually leaves, replacement actually enters, RNG ledger pinned", () => {
    const result = runToHalt("BattleScript_EffectRoar", context({ attackerLevel: 50, targetLevel: 50, trainerBattle: true }), 1);
    expect(result.state.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
    const target = result.state.rulesContext.battlers[1]!;
    expect(target.species).toBe(2);
    expect(target.partyIndex).toBe(1);
    expect(target.hp).toBe(50); // rebuilt from the bench record's own HP, not the outgoing battler's
    expect(result.state.rulesContext.monToSwitchIntoId[1]).toBe(1);
    expect(result.state.rng.calls).toBe(2); // 1(ACC_CURR_MOVE) + 1(rejection-sampling pick, first draw lands)
  });

  it("target out-levels attacker, level-check roll succeeds: switch-out proceeds through the real rejection-sampling pick", () => {
    const result = runToHalt("BattleScript_EffectRoar", context({ attackerLevel: 5, targetLevel: 100, trainerBattle: true }), 2);
    expect(result.state.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
    const target = result.state.rulesContext.battlers[1]!;
    expect(target.species).toBe(3);
    expect(target.partyIndex).toBe(2);
    expect(result.state.rng.calls).toBe(3); // 1(acc) + 1(level-check, passes) + 1(pick)
  });

  it("target out-levels attacker, level-check roll fails: BattleScript_ButItFailed tail, target never leaves, hand-verified roll=14 <= threshold=25", () => {
    const result = runToHalt("BattleScript_EffectRoar", context({ attackerLevel: 5, targetLevel: 100, trainerBattle: true }), 1);
    expect(result.state.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
    const target = result.state.rulesContext.battlers[1]!;
    expect(target.species).toBe(1); // unchanged
    expect(target.partyIndex).toBe(0);
    expect(result.state.rulesContext.monToSwitchIntoId[1]).toBe(6); // BATTLE_SCRIPT_PARTY_SIZE sentinel, still undecided
    expect(result.state.rng.calls).toBe(2); // 1(acc) + 1(level-check, fails)
  });

  it("miss tail: max target evasion stage (+6) drops calc to 33/100, this seed's roll (39) misses -- real per-move accuracycheck, zero forcerandomswitch draws", () => {
    const result = runToHalt("BattleScript_EffectRoar", context({ attackerLevel: 50, targetLevel: 50, trainerBattle: true, targetEvasionStage: 12 }), 1);
    expect(result.state.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
    expect(result.state.rulesContext.moveResultFlags & 1).toBe(1); // MOVE_RESULT_MISSED
    const target = result.state.rulesContext.battlers[1]!;
    expect(target.species).toBe(1); // unchanged
    expect(result.state.rng.calls).toBe(1); // 1(acc, missed) -- forcerandomswitch never runs
  });

  it("both bench mons fainted: validMons <= 1 fails before any Random() call, matching TryDoForceSwitchOut's own check order (validMons gate precedes the level-check roll in source)", () => {
    const result = runToHalt("BattleScript_EffectRoar", context({
      trainerBattle: true,
      opponentParty: [
        { species: 1, hp: 50, isEgg: false },
        { species: 2, hp: 0, isEgg: false },
        { species: 3, hp: 0, isEgg: false },
        { species: 0, hp: 0, isEgg: false },
        { species: 0, hp: 0, isEgg: false },
        { species: 0, hp: 0, isEgg: false },
      ],
    }), 1);
    expect(result.state.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
    expect(result.state.rulesContext.battlers[1]!.species).toBe(1); // unchanged
    expect(result.state.rng.calls).toBe(1); // 1(acc) + 0(forcerandomswitch never draws -- validMons<=1 short-circuits first)
  });

  it("Suction Cups block: jumpifability BS_TARGET fires before either accuracycheck runs, zero RNG draws at all", () => {
    const result = runToHalt("BattleScript_EffectRoar", context({ trainerBattle: true, targetAbility: ABILITY_SUCTION_CUPS }), 1);
    expect(result.state.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
    expect(result.state.rulesContext.battlers[1]!.species).toBe(1); // unchanged
    expect(result.state.rng.calls).toBe(0);
  });

  it("STATUS3_ROOTED (Ingrain) block: jumpifstatus3 fires before either accuracycheck runs, zero RNG draws at all", () => {
    const result = runToHalt("BattleScript_EffectRoar", context({ trainerBattle: true, targetStatus3: STATUS3_ROOTED }), 1);
    expect(result.state.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
    expect(result.state.rulesContext.battlers[1]!.species).toBe(1); // unchanged
    expect(result.state.rng.calls).toBe(0);
  });

  it("non-trainer battle: BattleScript_SuccessForceOut writes the Teleport outcome, then reaches its still-deferred B_SCR_OP_FINISHACTION barrier -- structurally unreachable for Factory", () => {
    const result = runToHalt("BattleScript_EffectRoar", context({ attackerLevel: 50, targetLevel: 50, trainerBattle: false }), 1);
    expect(result.state.haltReason).toMatchObject({
      kind: "unsupported-branch",
      opcodeName: "B_SCR_OP_FINISHACTION",
    });
    // forcerandomswitch's own success path and setoutcomeonteleport both ran
    // before the unrelated deferred scheduler handoff.
    expect(result.state.rulesContext.monToSwitchIntoId[1]).not.toBe(4);
    expect(result.state.rulesContext.battleOutcome).toBe(5);
    expect(result.state.rng.calls).toBe(2); // 1(acc) + 1(pick, equal levels so zero level-check draws)
  });
});

describe("B_SCR_OP_SWITCHOUTABILITIES dispatch (Cmd_switchoutabilities, battle_script_commands.c:9590-9607)", () => {
  // 4 concrete call sites share this opcode (BatonPass/FaintedMonTryChoose/DoSwitchOut all use BS_ATTACKER);
  // Roar's own is BattleScript_SuccessForceOut's BS_TARGET form.
  const instruction = program.instructions.find(
    (candidate) => candidate.opcodeName === "B_SCR_OP_SWITCHOUTABILITIES" && candidate.source.label === "BattleScript_SuccessForceOut",
  )!;

  function stateAt(rc: BattleScriptRulesContext) {
    const initial = createBattleScriptMachine(program, instruction.source.label, rc, 1);
    return Object.freeze({ ...initial, programCounter: instruction.programCounter });
  }

  it("Natural Cure present: clears status1, marks the battler controller-pending", () => {
    const rc = context({ targetAbility: ABILITY_NATURAL_CURE, trainerBattle: true });
    const withStatus = Object.freeze({
      ...rc,
      battlers: Object.freeze(rc.battlers.map((b, i) => (i === 1 ? Object.freeze({ ...b, status1: 1 << 3 }) : b))),
    }) as BattleScriptRulesContext;
    const handlers = createBattleScriptForceSwitchOpcodeHandlers(program, { isControllerIdle: () => true });
    const transition = handlers[instruction.opcodeId]!({ program, instruction, state: stateAt(withStatus) });
    expect(transition.control).toEqual({ kind: "advance" });
    expect(transition.rulesContext?.battlers[1]!.status1).toBe(0);
    expect(transition.scheduler?.pendingControllerBattlers).toEqual([1]);
  });

  it("any other ability: pure advance, zero rules/scheduler mutation", () => {
    const rc = context({ targetAbility: 0, trainerBattle: true });
    const handlers = createBattleScriptForceSwitchOpcodeHandlers(program, { isControllerIdle: () => true });
    const initial = stateAt(rc);
    const transition = handlers[instruction.opcodeId]!({ program, instruction, state: initial });
    expect(transition.control).toEqual({ kind: "advance" });
    expect(transition.rulesContext).toBe(initial.rulesContext);
    expect(transition.scheduler).toBe(initial.scheduler);
  });
});

describe("B_SCR_OP_FINISHACTION dispatch (Cmd_finishaction, battle_script_commands.c:10308-10311)", () => {
  it("unconditional (b) barrier -- never reached by any real committed-script path (VARIOUS_SET_TELEPORT_OUTCOME barriers first), registered only so a direct call never degrades to the generic unsupported-opcode halt", () => {
    const instruction = program.instructions.find((candidate) => candidate.opcodeName === "B_SCR_OP_FINISHACTION")!;
    const rc = context({ trainerBattle: true });
    const initial = createBattleScriptMachine(program, instruction.source.label, rc, 1);
    const state = Object.freeze({ ...initial, programCounter: instruction.programCounter });
    const handlers = createBattleScriptForceSwitchOpcodeHandlers(program, { isControllerIdle: () => true });
    const transition = handlers[instruction.opcodeId]!({ program, instruction, state });
    expect(transition.control).toMatchObject({
      kind: "halt",
      reason: { kind: "unsupported-branch", opcodeName: "B_SCR_OP_FINISHACTION", sourceLine: 10308 },
    });
  });
});
