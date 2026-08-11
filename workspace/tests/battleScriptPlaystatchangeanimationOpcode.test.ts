import { describe, expect, it } from "vitest";
import {
  createBattleScriptRulesContext,
  resolveRulesBattlerForBattleScript,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContext,
  type BattleScriptRulesContextInput,
} from "../src/engine/battleScriptRulesContext.ts";
import { loadBattleScriptProgram } from "../src/engine/battleScriptProgram.ts";
import { createBattleScriptPlaystatchangeanimationOpcodeHandlers } from "../src/engine/battleScriptPlaystatchangeanimationOpcode.ts";
import { createBattleScriptSchedulerState } from "../src/engine/battleScriptMachine.ts";

const program = loadBattleScriptProgram();
const TICKLE = 321;
const ABILITY_CLEAR_BODY = 29;
const ABILITY_WHITE_SMOKE = 73;
const ABILITY_KEEN_EYE = 51;
const ABILITY_HYPER_CUTTER = 52;

function battler(changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 50,
    maxHP: changes.maxHP ?? 100,
    moves: changes.moves ?? Object.freeze([TICKLE, 0, 0, 0]),
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
  contextChanges: Partial<BattleScriptRulesContextInput> = {},
  attackerChanges: Partial<BattleScriptRulesBattler> = {},
): BattleScriptRulesContext {
  const battlers: BattleScriptRulesBattler[] = [
    battler({ side: 0, ...attackerChanges }),
    battler({ side: 1 }),
    battler({ side: 0 }),
    battler({ side: 1 }),
  ];
  return createBattleScriptRulesContext({
    battlers,
    selectorRoles: { attacker: 0, target: 1, effectBattler: 0 },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: TICKLE,
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

const handlers = createBattleScriptPlaystatchangeanimationOpcodeHandlers(program, {
  isControllerIdle: (ctx) => ctx.state.scheduler.pendingControllerBattlers.length === 0,
  resolveBattlerForBattleScript: resolveRulesBattlerForBattleScript,
});

function findInstruction(predicate: (operands: readonly string[]) => boolean) {
  const instruction = program.instructions.find(
    (i) => i.opcodeName === "B_SCR_OP_PLAYSTATCHANGEANIMATION" && predicate(i.operands.map((o) => o.expression)),
  );
  if (!instruction) throw new Error("no matching B_SCR_OP_PLAYSTATCHANGEANIMATION instruction found");
  return instruction;
}

function dispatch(
  instruction: ReturnType<typeof findInstruction>,
  rulesContext: BattleScriptRulesContext,
  schedulerOverrides: Partial<ReturnType<typeof createBattleScriptSchedulerState>> = {},
) {
  const scheduler = createBattleScriptSchedulerState({
    messageDisplayActive: false,
    pauseCounterBattle: 0,
    activeBattler: null,
    pendingControllerBattlers: [],
    ...schedulerOverrides,
  });
  const state = Object.freeze({
    programCounter: instruction.programCounter,
    callStack: Object.freeze([]),
    instructionsExecuted: 0,
    haltReason: null,
    scheduler,
    rulesContext,
    rng: Object.freeze({ value: 1, calls: 0, ledger: Object.freeze([]) }),
    events: Object.freeze([]),
  });
  const handler = handlers[instruction.opcodeId]!;
  return handler({ program, instruction, state });
}

describe("production playstatchangeanimation (Cmd_playstatchangeanimation) registration", () => {
  it("registers B_SCR_OP_PLAYSTATCHANGEANIMATION across all 15 concrete committed call sites", () => {
    const starts = program.instructions.filter((i) => i.opcodeName === "B_SCR_OP_PLAYSTATCHANGEANIMATION");
    expect(starts.length).toBe(15);
    expect(Object.keys(handlers).length).toBe(1);
  });
});

describe("goes-up family (no STAT_CHANGE_NEGATIVE) -- no ability/Mist gate at all", () => {
  // CosmicPower: BS_ATTACKER, BIT_DEF | BIT_SPDEF, 0
  const cosmicPower = findInstruction(
    (ops) => ops[0] === "BS_ATTACKER" && ops[1] === "BIT_DEF | BIT_SPDEF" && ops[2] === "0",
  );

  it("no changeable stat (both already at MAX_STAT_STAGE): advances, no emit, no controller mark", () => {
    const rc = context({}, { statStages: [6, 6, 12, 6, 6, 12, 6, 6] });
    const transition = dispatch(cosmicPower, rc);
    expect(transition.control).toEqual({ kind: "advance" });
    expect(transition.events).toEqual([]);
    expect(transition.scheduler.pendingControllerBattlers).toEqual([]);
    expect(transition.rulesContext.statAnimPlayed).toBe(0);
  });

  it("exactly one changeable stat: emits a single-stat animation id (STAT_ANIM_PLUS1(14) + STAT_SPDEF(5) = 19)", () => {
    const rc = context({}, { statStages: [6, 6, 12, 6, 6, 6, 6, 6] }); // DEF maxed, SPDEF not
    const transition = dispatch(cosmicPower, rc);
    expect(transition.control).toEqual({ kind: "advance" });
    expect(transition.events).toEqual([
      { kind: "animation", animationId: "STATS_CHANGE", battler: 0, arguments: ["19"] },
    ]);
    expect(transition.scheduler.pendingControllerBattlers).toEqual([0]);
    // STAT_CHANGE_MULTIPLE_STATS bit isn't set on this call (flags=0) -- statAnimPlayed stays FALSE even after emitting.
    expect(transition.rulesContext.statAnimPlayed).toBe(0);
  });

  it("both stats changeable: emits the MULTIPLE_PLUS1(55) gray-color id, not a per-stat id", () => {
    const rc = context({}, { statStages: [6, 6, 6, 6, 6, 6, 6, 6] });
    const transition = dispatch(cosmicPower, rc);
    expect(transition.events).toEqual([
      { kind: "animation", animationId: "STATS_CHANGE", battler: 0, arguments: ["55"] },
    ]);
  });

  it("already played this move (statAnimPlayed=1): no emit even though stats are changeable", () => {
    const rc = createBattleScriptRulesContext({
      ...context(),
      statAnimPlayed: 1,
    } as never);
    const transition = dispatch(cosmicPower, rc);
    expect(transition.control).toEqual({ kind: "advance" });
    expect(transition.events).toEqual([]);
    expect(transition.scheduler.pendingControllerBattlers).toEqual([]);
  });
});

describe("goes-down family (STAT_CHANGE_NEGATIVE) without STAT_CHANGE_CANT_PREVENT -- Mist/ability gate applies", () => {
  // Tickle's own single-stat DEF call: BS_TARGET, BIT_DEF, STAT_CHANGE_NEGATIVE
  const tickleDef = findInstruction(
    (ops) => ops[0] === "BS_TARGET" && ops[1] === "BIT_DEF" && ops[2] === "STAT_CHANGE_NEGATIVE",
  );

  function targetContext(targetChanges: Partial<BattleScriptRulesBattler> = {}, mistTimers: readonly [number, number] = [0, 0]) {
    const rc = context();
    const battlers = rc.battlers.map((b, i) => (i === 1 ? { ...b, ...targetChanges } : b));
    return createBattleScriptRulesContext({ ...rc, battlers, mistTimers } as never);
  }

  it("blocked by Mist (target's own side mistTimer nonzero): no emit", () => {
    const rc = targetContext({}, [0, 3]); // battler 1 is side 1
    const transition = dispatch(tickleDef, rc);
    expect(transition.events).toEqual([]);
  });

  it("blocked by Clear Body: no emit", () => {
    const rc = targetContext({ ability: ABILITY_CLEAR_BODY });
    const transition = dispatch(tickleDef, rc);
    expect(transition.events).toEqual([]);
  });

  it("blocked by White Smoke: no emit", () => {
    const rc = targetContext({ ability: ABILITY_WHITE_SMOKE });
    const transition = dispatch(tickleDef, rc);
    expect(transition.events).toEqual([]);
  });

  it("Hyper Cutter only blocks ATK, not DEF: DEF-lowering animation still queues", () => {
    const rc = targetContext({ ability: ABILITY_HYPER_CUTTER });
    const transition = dispatch(tickleDef, rc);
    expect(transition.events.length).toBe(1);
  });

  it("Keen Eye only blocks ACC, not DEF: DEF-lowering animation still queues", () => {
    const rc = targetContext({ ability: ABILITY_KEEN_EYE });
    const transition = dispatch(tickleDef, rc);
    expect(transition.events.length).toBe(1);
  });

  it("not blocked, DEF already at MIN_STAT_STAGE: no emit (not > MIN_STAT_STAGE)", () => {
    const rc = targetContext({ statStages: [6, 6, 0, 6, 6, 6, 6, 6] });
    const transition = dispatch(tickleDef, rc);
    expect(transition.events).toEqual([]);
  });

  it("not blocked, DEF above MIN_STAT_STAGE: emits STAT_ANIM_MINUS1(21) + STAT_DEF(2) = 23", () => {
    const rc = targetContext();
    const transition = dispatch(tickleDef, rc);
    expect(transition.events).toEqual([
      { kind: "animation", animationId: "STATS_CHANGE", battler: 1, arguments: ["23"] },
    ]);
  });
});

describe("STAT_CHANGE_CANT_PREVENT bypasses the Mist/ability gate entirely (BattleScript_AtkDefDown's own call)", () => {
  // AtkDefDown: BS_ATTACKER, BIT_ATK, STAT_CHANGE_CANT_PREVENT | STAT_CHANGE_NEGATIVE
  const atkDefDownAtk = findInstruction(
    (ops) => ops[0] === "BS_ATTACKER" && ops[1] === "BIT_ATK"
      && ops[2] === "STAT_CHANGE_CANT_PREVENT | STAT_CHANGE_NEGATIVE",
  );

  it("still emits even though the attacker has Clear Body", () => {
    const rc = context({}, { ability: ABILITY_CLEAR_BODY });
    const transition = dispatch(atkDefDownAtk, rc);
    expect(transition.events.length).toBe(1);
  });

  it("still emits even under an active Mist timer on the attacker's own side", () => {
    const rc = createBattleScriptRulesContext({ ...context(), mistTimers: [5, 0] } as never);
    const transition = dispatch(atkDefDownAtk, rc);
    expect(transition.events.length).toBe(1);
  });

  it("still gates on the stage bound: no emit once ATK is already at MIN_STAT_STAGE", () => {
    const rc = context({}, { statStages: [6, 0, 6, 6, 6, 6, 6, 6] });
    const transition = dispatch(atkDefDownAtk, rc);
    expect(transition.events).toEqual([]);
  });
});

describe("STAT_CHANGE_BY_TWO selects the -2/+2 decorative animation id family", () => {
  // SAtkDown2: BS_ATTACKER, BIT_SPATK, STAT_CHANGE_CANT_PREVENT | STAT_CHANGE_NEGATIVE | STAT_CHANGE_BY_TWO
  const sAtkDown2 = findInstruction(
    (ops) => ops[0] === "BS_ATTACKER" && ops[1] === "BIT_SPATK"
      && ops[2] === "STAT_CHANGE_CANT_PREVENT | STAT_CHANGE_NEGATIVE | STAT_CHANGE_BY_TWO",
  );

  it("emits STAT_ANIM_MINUS2(45) + STAT_SPATK(4) = 49, not the by-one id", () => {
    const rc = context();
    const transition = dispatch(sAtkDown2, rc);
    expect(transition.events).toEqual([
      { kind: "animation", animationId: "STATS_CHANGE", battler: 0, arguments: ["49"] },
    ]);
  });
});

describe("STAT_CHANGE_MULTIPLE_STATS gates on changeableStatsCount < 2 (Tickle's own two-stat opener)", () => {
  // Tickle: BS_TARGET, BIT_ATK | BIT_DEF, STAT_CHANGE_NEGATIVE | STAT_CHANGE_MULTIPLE_STATS
  const tickleOpener = findInstruction(
    (ops) => ops[0] === "BS_TARGET" && ops[1] === "BIT_ATK | BIT_DEF"
      && ops[2] === "STAT_CHANGE_NEGATIVE | STAT_CHANGE_MULTIPLE_STATS",
  );

  function targetContext(targetChanges: Partial<BattleScriptRulesBattler> = {}) {
    const rc = context();
    const battlers = rc.battlers.map((b, i) => (i === 1 ? { ...b, ...targetChanges } : b));
    return createBattleScriptRulesContext({ ...rc, battlers } as never);
  }

  it("only one of ATK/DEF changeable: skips entirely -- no emit, no controller mark, statAnimPlayed untouched", () => {
    const rc = targetContext({ statStages: [6, 0, 6, 6, 6, 6, 6, 6] }); // ATK already at MIN
    const transition = dispatch(tickleOpener, rc);
    expect(transition.control).toEqual({ kind: "advance" });
    expect(transition.events).toEqual([]);
    expect(transition.scheduler.pendingControllerBattlers).toEqual([]);
    expect(transition.rulesContext).toBe(rc);
  });

  it("both ATK and DEF changeable: emits the gray MULTIPLE_MINUS1(57) id and flips statAnimPlayed to 1", () => {
    const rc = targetContext();
    const transition = dispatch(tickleOpener, rc);
    expect(transition.events).toEqual([
      { kind: "animation", animationId: "STATS_CHANGE", battler: 1, arguments: ["57"] },
    ]);
    expect(transition.rulesContext.statAnimPlayed).toBe(1);
    expect(transition.scheduler.pendingControllerBattlers).toEqual([1]);
  });
});

describe("controller-busy and unresolved-battler blocks", () => {
  const cosmicPower = findInstruction(
    (ops) => ops[0] === "BS_ATTACKER" && ops[1] === "BIT_DEF | BIT_SPDEF" && ops[2] === "0",
  );

  it("blocks with controller-busy when the scheduler already has a pending battler", () => {
    const rc = context();
    const transition = dispatch(cosmicPower, rc, { pendingControllerBattlers: [2] });
    expect(transition.control).toMatchObject({ kind: "block", reason: { kind: "controller-busy" } });
  });
});
