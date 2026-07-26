import { describe, expect, it } from "vitest";
import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  createBattleScriptStatusRulesHandlers,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContext,
  type BattleScriptRulesContextInput,
  type BattleScriptStatusRulesExternalPorts,
} from "../src/engine/battleScriptRulesContext.ts";
import { loadBattleScriptProgram, resolveBattleScriptLabel } from "../src/engine/battleScriptProgram.ts";
import {
  acknowledgeBattleScriptMachineController,
  stepBattleScriptMachine,
  type BattleScriptMachineState,
} from "../src/engine/battleScriptMachine.ts";
import { runBattleEndTurnOrchestration } from "../src/engine/battleEndTurnOrchestration.ts";

const program = loadBattleScriptProgram();
/** include/constants/battle.h:78/210-217/232-244. */
const BATTLE_TYPE_FACTORY = 1 << 19;
const SIDE_STATUS_REFLECT = 1 << 0;
const SIDE_STATUS_LIGHTSCREEN = 1 << 1;
const SIDE_STATUS_SAFEGUARD = 1 << 5;
const B_WEATHER_SANDSTORM_TEMPORARY = 1 << 3;
const MOVE_RESULT_MISSED = 1 << 0;

function battler(changes: Partial<BattleScriptRulesBattler> & { maxHP?: number } = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 100,
    maxHP: changes.maxHP ?? changes.hp ?? 100,
    moves: changes.moves ?? Object.freeze([0, 0, 0, 0]),
    pp: changes.pp ?? Object.freeze([0, 0, 0, 0]),
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
  }) as unknown as BattleScriptRulesBattler;
}

function fullSlot(hp: number) {
  return { species: 261, isEgg: false, hp };
}
const EMPTY_SLOT = { species: 0, isEgg: false, hp: 0 };
function sixSlots(...alive: number[]) {
  const slots = [EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT];
  alive.forEach((hp, index) => { slots[index] = fullSlot(hp); });
  return slots;
}

function context(contextChanges: Partial<BattleScriptRulesContextInput> = {}): BattleScriptRulesContext {
  return createBattleScriptRulesContext({
    battlers: [battler({ side: 0 }), battler({ side: 1 }), battler({ side: 0 }), battler({ side: 1 })],
    selectorRoles: { attacker: 0, target: 1, effectBattler: 1, fainted: null },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: 0,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
    party: { player: sixSlots(100), opponent: sixSlots(100) },
    battleTopology: { battlersCount: 2, battleTypeFlags: BATTLE_TYPE_FACTORY, battlerPositions: [0, 1, 0xff, 0xff] },
    ...contextChanges,
  });
}

function externalPorts(): BattleScriptStatusRulesExternalPorts {
  return Object.freeze({
    isControllerIdle: (ctx: Readonly<{ state: { scheduler: { pendingControllerBattlers: readonly unknown[] } } }>) =>
      ctx.state.scheduler.pendingControllerBattlers.length === 0,
    prepareMessage: (_ctx: unknown, operand: Readonly<{ expression: string }>) =>
      operand.expression.startsWith("STRINGID_")
        ? Object.freeze({ kind: "message" as const, messageId: operand.expression, substitutions: Object.freeze([]) })
        : null,
    prepareSelectionMessage: () => null,
    prepareSelectionMessageFromTable: () => null,
    resolveAttackerBattler: () => 0,
    resolveBattlerAtPosition: () => null,
    resolveHalfwordOperand: (_ctx: unknown, operand: Readonly<{ expression: string }>) =>
      operand.expression === "B_WAIT_TIME_LONG" ? 64 : operand.expression === "B_WAIT_TIME_SHORT" ? 32 : null,
    resolveByteOperand: () => null,
  });
}

function findPc(opcodeName: string, sourceLabel: string): number {
  const found = program.instructions.find(
    (instruction) => instruction.opcodeName === opcodeName && instruction.source.label === sourceLabel,
  );
  if (!found) throw new Error(`no matching ${opcodeName} instruction found in ${sourceLabel}`);
  return found.programCounter;
}

function stepAtProgramCounter(pc: number, rulesContext: BattleScriptRulesContext) {
  const execution = createBattleScriptStatusRulesExecution(program, "BattleScript_EffectHit", rulesContext, 1, externalPorts());
  const patched = Object.freeze({ ...execution.state, programCounter: pc });
  return { execution, result: stepBattleScriptMachine(program, patched, execution.handlers) };
}

function labelPc(label: string): number {
  const entry = resolveBattleScriptLabel(program, label);
  if (!entry) throw new Error(`committed Battle Script program does not define label ${label}`);
  return entry.programCounter;
}

function ackAllPending(
  state: BattleScriptMachineState<BattleScriptRulesContext>,
): BattleScriptMachineState<BattleScriptRulesContext> {
  let next = state;
  for (const battler of state.scheduler.pendingControllerBattlers) {
    next = acknowledgeBattleScriptMachineController(next, battler);
  }
  return next;
}

/**
 * One logical opcode step that transparently acknowledges any controller-
 * pending block(s) this file's real (non-stubbed) isControllerIdle port
 * produces, then retries the same instruction -- Brick Break's own chain
 * (attackanimation/waitanimation/hitanimation/waitstate/healthbarupdate/
 * critmessage/waitmessage/resultmessage) marks battlers pending exactly like
 * production, unlike battleScriptHitChainOpcode.test.ts's always-idle stub.
 */
function stepAcking(
  handlers: ReturnType<typeof createBattleScriptStatusRulesExecution>["handlers"],
  state: BattleScriptMachineState<BattleScriptRulesContext>,
) {
  let result = stepBattleScriptMachine(program, state, handlers);
  while (result.kind === "blocked" || result.kind === "scheduler-progressed") {
    const next = result.kind === "blocked" ? ackAllPending(result.state) : result.state;
    result = stepBattleScriptMachine(program, next, handlers);
  }
  return result;
}

/** Runs a script from `entryLabel`, acking controller-pending blocks, until `targetLabel` or `budget` opcodes. */
function runUntilLabelAcking(
  entryLabel: string,
  targetLabel: string,
  rulesContext: BattleScriptRulesContext,
  rngSeed = 1,
  budget = 60,
) {
  const execution = createBattleScriptStatusRulesExecution(program, entryLabel, rulesContext, rngSeed, externalPorts());
  const targetPc = labelPc(targetLabel);
  let result = stepAcking(execution.handlers, execution.state);
  let steps = 1;
  while (result.kind === "advanced" && result.state.programCounter !== targetPc && steps < budget) {
    result = stepAcking(execution.handlers, result.state);
    steps++;
  }
  return { execution, result, steps };
}

function scratchState(rulesContext: BattleScriptRulesContext) {
  return createBattleScriptStatusRulesExecution(program, "BattleScript_HandleFaintedMon", rulesContext, 1, externalPorts()).state;
}

describe("production screen/mist/weather setters (Cmd_setreflect/setlightscreen/setsafeguard/setmist/setrain/setsunny/setsandstorm/sethail)", () => {
  it("Cmd_setreflect succeeds: sets the bit, a fresh 5-turn timer, and the setting battler's id", () => {
    const pc = findPc("B_SCR_OP_SETREFLECT", "BattleScript_EffectReflect");
    const rc = context({ selectorRoles: { attacker: 1, target: 0, effectBattler: 0, fainted: null } });
    const { result } = stepAtProgramCounter(pc, rc);
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.sideStatuses[1] & SIDE_STATUS_REFLECT).toBe(SIDE_STATUS_REFLECT);
    expect(result.state.rulesContext.sideTimers[1].reflectTimer).toBe(5);
    expect(result.state.rulesContext.sideTimers[1].reflectBattlerId).toBe(1);
    expect(result.state.rulesContext.moveResultFlags).toBe(0);
  });

  it("Cmd_setreflect fails (MISSED, no state change) when Reflect is already up on that side", () => {
    const pc = findPc("B_SCR_OP_SETREFLECT", "BattleScript_EffectReflect");
    const rc = context({
      selectorRoles: { attacker: 0, target: 1, effectBattler: 1, fainted: null },
      sideStatuses: [SIDE_STATUS_REFLECT, 0],
      sideTimers: [{ reflectTimer: 3, reflectBattlerId: 0 }, {}],
    });
    const { result } = stepAtProgramCounter(pc, rc);
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.moveResultFlags & MOVE_RESULT_MISSED).toBe(MOVE_RESULT_MISSED);
    expect(result.state.rulesContext.sideTimers[0].reflectTimer).toBe(3); // unchanged, not reset
  });

  it("Cmd_setlightscreen succeeds with the same shape as Reflect", () => {
    const pc = findPc("B_SCR_OP_SETLIGHTSCREEN", "BattleScript_EffectLightScreen");
    const { result } = stepAtProgramCounter(pc, context());
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.sideStatuses[0] & SIDE_STATUS_LIGHTSCREEN).toBe(SIDE_STATUS_LIGHTSCREEN);
    expect(result.state.rulesContext.sideTimers[0].lightscreenTimer).toBe(5);
  });

  it("Cmd_setsafeguard succeeds with the same shape", () => {
    const pc = findPc("B_SCR_OP_SETSAFEGUARD", "BattleScript_EffectSafeguard");
    const { result } = stepAtProgramCounter(pc, context());
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.sideStatuses[0] & SIDE_STATUS_SAFEGUARD).toBe(SIDE_STATUS_SAFEGUARD);
    expect(result.state.rulesContext.sideTimers[0].safeguardTimer).toBe(5);
  });

  it("Cmd_setmist's guard is the raw mistTimer value, not a status bit -- succeeds from zero", () => {
    const pc = findPc("B_SCR_OP_SETMIST", "BattleScript_EffectMist");
    const { result } = stepAtProgramCounter(pc, context());
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.mistTimers[0]).toBe(5);
    expect(result.state.rulesContext.sideTimers[0].mistBattlerId).toBe(0);
  });

  it("Cmd_setmist fails (FAILED flag) while mistTimer is still nonzero", () => {
    const pc = findPc("B_SCR_OP_SETMIST", "BattleScript_EffectMist");
    const MOVE_RESULT_FAILED = 1 << 5;
    const { result } = stepAtProgramCounter(pc, context({ mistTimers: [2, 0] }));
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.moveResultFlags & MOVE_RESULT_FAILED).toBe(MOVE_RESULT_FAILED);
    expect(result.state.rulesContext.mistTimers[0]).toBe(2);
  });

  it("Cmd_setsandstorm succeeds: flat assignment (not OR), clobbering rain if it was active", () => {
    const B_WEATHER_RAIN_TEMPORARY = 1 << 0;
    const pc = findPc("B_SCR_OP_SETSANDSTORM", "BattleScript_EffectSandstorm");
    const { result } = stepAtProgramCounter(pc, context({ weather: B_WEATHER_RAIN_TEMPORARY, weatherTimer: 3 }));
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.weather).toBe(B_WEATHER_SANDSTORM_TEMPORARY);
    expect(result.state.rulesContext.weatherTimer).toBe(5);
  });

  it("Cmd_sethail fails (MISSED) when hail is already up", () => {
    const B_WEATHER_HAIL_TEMPORARY = 1 << 7;
    const pc = findPc("B_SCR_OP_SETHAIL", "BattleScript_EffectHail");
    const { result } = stepAtProgramCounter(pc, context({ weather: B_WEATHER_HAIL_TEMPORARY, weatherTimer: 4 }));
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.moveResultFlags & MOVE_RESULT_MISSED).toBe(MOVE_RESULT_MISSED);
    expect(result.state.rulesContext.weatherTimer).toBe(4); // unchanged
  });

  it("Cmd_setrain and Cmd_setsunny succeed from a clear field", () => {
    const B_WEATHER_RAIN_TEMPORARY = 1 << 0;
    const B_WEATHER_SUN_TEMPORARY = 1 << 5;
    const rainPc = findPc("B_SCR_OP_SETRAIN", "BattleScript_EffectRainDance");
    const { result: rainResult } = stepAtProgramCounter(rainPc, context());
    if (rainResult.kind !== "advanced") throw new Error("expected advance");
    expect(rainResult.state.rulesContext.weather).toBe(B_WEATHER_RAIN_TEMPORARY);

    const sunnyPc = findPc("B_SCR_OP_SETSUNNY", "BattleScript_EffectSunnyDay");
    const { result: sunnyResult } = stepAtProgramCounter(sunnyPc, context());
    if (sunnyResult.kind !== "advanced") throw new Error("expected advance");
    expect(sunnyResult.state.rulesContext.weather).toBe(B_WEATHER_SUN_TEMPORARY);
  });
});

const BRICK_BREAK = 280; // EFFECT_BRICK_BREAK, power 75, accuracy 100, TYPE_FIGHTING
const MOVE_RESULT_MISSED_BIT = 1 << 0;

describe("production removelightscreenreflect (Cmd_removelightscreenreflect) dispatch", () => {
  it("registers B_SCR_OP_REMOVELIGHTSCREENREFLECT", () => {
    expect(program.instructions.find((i) => i.opcodeName === "B_SCR_OP_REMOVELIGHTSCREENREFLECT")).toBeDefined();
  });

  it("clears the opposing side's Reflect + Light Screen (bit + timer) and sets animTurn/animTargetsHit "
    + "to 1 when either is active", () => {
    const pc = findPc("B_SCR_OP_REMOVELIGHTSCREENREFLECT", "BattleScript_EffectBrickBreak");
    const rc = context({
      selectorRoles: { attacker: 0, target: 1, effectBattler: 1, fainted: null },
      sideStatuses: [0, SIDE_STATUS_REFLECT | SIDE_STATUS_LIGHTSCREEN],
      sideTimers: [{}, { reflectTimer: 4, lightscreenTimer: 5 }],
    });
    const { result } = stepAtProgramCounter(pc, rc);
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.sideStatuses[1] & (SIDE_STATUS_REFLECT | SIDE_STATUS_LIGHTSCREEN)).toBe(0);
    expect(result.state.rulesContext.sideTimers[1].reflectTimer).toBe(0);
    expect(result.state.rulesContext.sideTimers[1].lightscreenTimer).toBe(0);
    expect(result.state.rulesContext.animTurn).toBe(1);
    expect(result.state.rulesContext.animTargetsHit).toBe(1);
  });

  it("clears only Reflect when only Reflect is active (Light Screen's own timer stays at 0, no-op)", () => {
    const pc = findPc("B_SCR_OP_REMOVELIGHTSCREENREFLECT", "BattleScript_EffectBrickBreak");
    const rc = context({
      selectorRoles: { attacker: 0, target: 1, effectBattler: 1, fainted: null },
      sideStatuses: [0, SIDE_STATUS_REFLECT],
      sideTimers: [{}, { reflectTimer: 3 }],
    });
    const { result } = stepAtProgramCounter(pc, rc);
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.sideStatuses[1] & SIDE_STATUS_REFLECT).toBe(0);
    expect(result.state.rulesContext.sideTimers[1].reflectTimer).toBe(0);
    expect(result.state.rulesContext.animTurn).toBe(1);
  });

  it("no-op (leaves state alone) and sets animTurn/animTargetsHit to 0 when neither is active", () => {
    const pc = findPc("B_SCR_OP_REMOVELIGHTSCREENREFLECT", "BattleScript_EffectBrickBreak");
    const rc = context({
      selectorRoles: { attacker: 0, target: 1, effectBattler: 1, fainted: null },
      animTurn: 7, // pre-existing stale value -- source unconditionally overwrites it
    });
    const { result } = stepAtProgramCounter(pc, rc);
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.sideStatuses[1]).toBe(0);
    expect(result.state.rulesContext.animTurn).toBe(0);
    expect(result.state.rulesContext.animTargetsHit).toBe(0);
  });

  it("targets the OPPOSING side, not the attacker's own side", () => {
    const pc = findPc("B_SCR_OP_REMOVELIGHTSCREENREFLECT", "BattleScript_EffectBrickBreak");
    // attacker is on side 1 this time; its own side (1) has screens up, the opposing side (0) does not.
    const rc = context({
      selectorRoles: { attacker: 1, target: 0, effectBattler: 0, fainted: null },
      sideStatuses: [0, SIDE_STATUS_REFLECT],
      sideTimers: [{}, { reflectTimer: 3 }],
    });
    const { result } = stepAtProgramCounter(pc, rc);
    if (result.kind !== "advanced") throw new Error("expected advance");
    // attacker's own side (1) is untouched; the opposing side (0), which has nothing active, stays a no-op.
    expect(result.state.rulesContext.sideStatuses[1] & SIDE_STATUS_REFLECT).toBe(SIDE_STATUS_REFLECT);
    expect(result.state.rulesContext.animTurn).toBe(0);
  });
});

describe(
  "EFFECT_BRICK_BREAK: full committed script, screens-up vs screens-down "
    + "(docs/fixed-damage-cluster-ground-truth.md §4 topology, typecalc-then-typecalc2 double-call shape)",
  () => {
    function brickBreakContext(defenderScreensUp: boolean) {
      return context({
        battlers: [
          battler({
            side: 0,
            attack: 40,
            level: 50,
            types: ["TYPE_FIGHTING", "TYPE_FIGHTING"],
            moves: [BRICK_BREAK, 0, 0, 0],
            pp: [16, 0, 0, 0],
          }),
          battler({ side: 1, defense: 40, level: 50, hp: 100, types: ["TYPE_WATER", "TYPE_WATER"] }),
          battler({ side: 0 }),
          battler({ side: 1 }),
        ],
        selectorRoles: { attacker: 0, target: 1, effectBattler: 1, fainted: null },
        currentMove: BRICK_BREAK,
        sideStatuses: defenderScreensUp ? [0, SIDE_STATUS_REFLECT | SIDE_STATUS_LIGHTSCREEN] : [0, 0],
        sideTimers: defenderScreensUp ? [{}, { reflectTimer: 5, lightscreenTimer: 5 }] : [{}, {}],
      });
    }

    it(
      "screens-up: removelightscreenreflect clears both, animTurn reaches 2 after attackanimation's own "
        + "increment so the doubles-only-looking \"wall shattered\" print actually fires in singles too "
        + "(a correction to this cluster's own prep-scout, which assumed sB_ANIM_TURN maxes at 1 here), "
        + "typecalc2 gates a non-immune neutral target through cleanly, and damage lands",
      () => {
        const rc = brickBreakContext(true);
        const { execution, result, steps } = runUntilLabelAcking(
          "BattleScript_EffectBrickBreak",
          "BattleScript_BrickBreakDoHit",
          rc,
        );
        if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
        expect(result.state.programCounter).toBe(labelPc("BattleScript_BrickBreakDoHit"));
        expect(result.state.rulesContext.sideStatuses[1] & (SIDE_STATUS_REFLECT | SIDE_STATUS_LIGHTSCREEN)).toBe(0);
        expect(result.state.rulesContext.sideTimers[1].reflectTimer).toBe(0);
        expect(result.state.rulesContext.sideTimers[1].lightscreenTimer).toBe(0);
        expect(result.state.rulesContext.animTurn).toBe(2); // 1 (screens cleared) + 1 (attackanimation's own ++)
        expect(
          result.state.events.some(
            (event) => "messageId" in event && event.messageId === "STRINGID_THEWALLSHATTERED",
          ),
        ).toBe(true);
        expect(result.state.rulesContext.moveResultFlags & MOVE_RESULT_MISSED_BIT).toBe(0);
        expect(steps).toBeLessThan(60);

        // typecalc2 -> effectivenesssound -> hitanimation -> waitstate -> healthbarupdate -> datahpupdate:
        // the actual hit lands and HP drops, proving the double typecalc/typecalc2 call shape resolves.
        let state = result.state;
        for (let i = 0; i < 6; i++) {
          const step = stepAcking(execution.handlers, state);
          if (step.kind !== "advanced") throw new Error(`post-BrickBreakDoHit step ${i} did not advance: ${step.kind}`);
          state = step.state;
        }
        expect(state.rulesContext.battlers[1]!.hp).toBeLessThan(100);
      },
    );

    it(
      "screens-down: removelightscreenreflect is a no-op, animTurn only reaches 1 (< 2) so the "
        + "\"wall shattered\" print is skipped, typecalc2 still gates cleanly, damage still lands",
      () => {
        const rc = brickBreakContext(false);
        const { result, steps } = runUntilLabelAcking(
          "BattleScript_EffectBrickBreak",
          "BattleScript_BrickBreakDoHit",
          rc,
        );
        if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
        expect(result.state.programCounter).toBe(labelPc("BattleScript_BrickBreakDoHit"));
        expect(result.state.rulesContext.animTurn).toBe(1); // 0 (no screens) + 1 (attackanimation's own ++)
        expect(
          result.state.events.some(
            (event) => "messageId" in event && event.messageId === "STRINGID_THEWALLSHATTERED",
          ),
        ).toBe(false);
        expect(result.state.rulesContext.moveResultFlags & MOVE_RESULT_MISSED_BIT).toBe(0);
        expect(steps).toBeLessThan(60);
      },
    );
  },
);

describe(
  "runBattleEndTurnOrchestration -- screens/weather field-loop lifecycles "
    + "(docs/screens-weather-ground-truth.md §3d/§3e/§3f fixture-pinned shapes)",
  () => {
    it(
      "Light Screen: set -> 4 silent decrement ticks -> expiry message on tick 5 -> re-set succeeds "
        + "(doc §3d: timer 5->4->3->2->1->0, sideStatuses clears only on the expiry tick)",
      () => {
        const rc = context({
          sideStatuses: [SIDE_STATUS_LIGHTSCREEN, 0],
          sideTimers: [{ lightscreenTimer: 5, lightscreenBattlerId: 0 }, {}],
        });
        const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts());
        let state = scratchState(rc);

        for (const expectedTimerAfter of [4, 3, 2, 1]) {
          const result = runBattleEndTurnOrchestration(program, handlers, state);
          expect(result.kind).toBe("next-turn");
          if (result.kind !== "next-turn") throw new Error("expected next-turn");
          expect(result.state.rulesContext.sideTimers[0].lightscreenTimer).toBe(expectedTimerAfter);
          expect(result.state.rulesContext.sideStatuses[0] & SIDE_STATUS_LIGHTSCREEN).toBe(SIDE_STATUS_LIGHTSCREEN);
          expect(result.state.rng.calls).toBe(state.rng.calls); // zero Random() draws (doc §4)
          state = result.state;
        }

        // Tick 5: timer reaches 0 -> BattleScript_SideStatusWoreOff fires, bit clears.
        const expiry = runBattleEndTurnOrchestration(program, handlers, state);
        expect(expiry.kind).toBe("next-turn");
        if (expiry.kind !== "next-turn") throw new Error("expected next-turn");
        expect(expiry.state.rulesContext.sideTimers[0].lightscreenTimer).toBe(0);
        expect(expiry.state.rulesContext.sideStatuses[0] & SIDE_STATUS_LIGHTSCREEN).toBe(0);
        expect(expiry.state.rng.calls).toBe(state.rng.calls);

        // Re-set from scratch succeeds (timer 0 -> 5 again, doc §3d's final row).
        const rePc = findPc("B_SCR_OP_SETLIGHTSCREEN", "BattleScript_EffectLightScreen");
        const { result: reset } = stepAtProgramCounter(rePc, expiry.state.rulesContext);
        if (reset.kind !== "advanced") throw new Error("expected advance");
        expect(reset.state.rulesContext.sideTimers[0].lightscreenTimer).toBe(5);
        expect(reset.state.rulesContext.sideStatuses[0] & SIDE_STATUS_LIGHTSCREEN).toBe(SIDE_STATUS_LIGHTSCREEN);
      },
    );

    it(
      "Safeguard: identical 5-turn decrement/expiry shape to Light Screen, distinct expiry script "
        + "(BattleScript_SafeguardEnds, not SideStatusWoreOff) -- doc §3f",
      () => {
        const rc = context({
          sideStatuses: [SIDE_STATUS_SAFEGUARD, 0],
          sideTimers: [{ safeguardTimer: 5, safeguardBattlerId: 0 }, {}],
        });
        const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts());
        let state = scratchState(rc);

        for (const expectedTimerAfter of [4, 3, 2, 1]) {
          const result = runBattleEndTurnOrchestration(program, handlers, state);
          if (result.kind !== "next-turn") throw new Error("expected next-turn");
          expect(result.state.rulesContext.sideTimers[0].safeguardTimer).toBe(expectedTimerAfter);
          expect(result.state.rulesContext.sideStatuses[0] & SIDE_STATUS_SAFEGUARD).toBe(SIDE_STATUS_SAFEGUARD);
          state = result.state;
        }

        const expiry = runBattleEndTurnOrchestration(program, handlers, state);
        if (expiry.kind !== "next-turn") throw new Error("expected next-turn");
        expect(expiry.state.rulesContext.sideTimers[0].safeguardTimer).toBe(0);
        expect(expiry.state.rulesContext.sideStatuses[0] & SIDE_STATUS_SAFEGUARD).toBe(0);

        const rePc = findPc("B_SCR_OP_SETSAFEGUARD", "BattleScript_EffectSafeguard");
        const { result: reset } = stepAtProgramCounter(rePc, expiry.state.rulesContext);
        if (reset.kind !== "advanced") throw new Error("expected advance");
        expect(reset.state.rulesContext.sideTimers[0].safeguardTimer).toBe(5);
      },
    );

    it(
      "Sandstorm: set -> 4 damage ticks (immune ONIX untouched, chipped SUNKERN loses floor(maxHP/16)) -> "
        + "expiry with no further damage (doc §3e: weatherTurns 5->4->3->2->1->0, opponent HP 105->99->93->87->81, unchanged on the ends tick)",
      () => {
        const rc = context({
          battlers: [
            battler({ side: 0, ability: 0, types: ["TYPE_ROCK", "TYPE_GROUND"] }), // ONIX, immune
            battler({ side: 1, hp: 105, maxHP: 105, types: ["TYPE_GRASS", "TYPE_GRASS"], partyIndex: 0 }), // SUNKERN, chipped
            battler({ side: 0 }),
            battler({ side: 1 }),
          ],
          party: { player: sixSlots(100), opponent: sixSlots(105) },
          weather: B_WEATHER_SANDSTORM_TEMPORARY,
          weatherTimer: 5,
        });
        const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts());
        let state = scratchState(rc);
        let expectedHp = 105;

        for (const expectedTurnsAfter of [4, 3, 2, 1]) {
          const result = runBattleEndTurnOrchestration(program, handlers, state);
          expect(result.kind).toBe("next-turn");
          if (result.kind !== "next-turn") throw new Error("expected next-turn");
          expect(result.state.rulesContext.weatherTimer).toBe(expectedTurnsAfter);
          expect(result.state.rulesContext.weather).toBe(B_WEATHER_SANDSTORM_TEMPORARY);
          expect(result.state.rulesContext.battlers[0]!.hp).toBe(100); // ONIX untouched every tick
          expectedHp -= 6; // floor(105/16)
          expect(result.state.rulesContext.battlers[1]!.hp).toBe(expectedHp);
          expect(result.state.rulesContext.party.opponent[0]!.hp).toBe(expectedHp);
          expect(result.state.rng.calls).toBe(state.rng.calls); // zero Random() draws (doc §4)
          state = result.state;
        }
        expect(expectedHp).toBe(81);

        // 5th tick: weather ends, NO damage (doc §3e's own live-verified finding).
        const ends = runBattleEndTurnOrchestration(program, handlers, state);
        expect(ends.kind).toBe("next-turn");
        if (ends.kind !== "next-turn") throw new Error("expected next-turn");
        expect(ends.state.rulesContext.weather).toBe(0);
        expect(ends.state.rulesContext.weatherTimer).toBe(0);
        expect(ends.state.rulesContext.battlers[1]!.hp).toBe(81); // unchanged
        expect(ends.state.rng.calls).toBe(state.rng.calls);

        // Re-set from scratch succeeds.
        const rePc = findPc("B_SCR_OP_SETSANDSTORM", "BattleScript_EffectSandstorm");
        const { result: reset } = stepAtProgramCounter(rePc, ends.state.rulesContext);
        if (reset.kind !== "advanced") throw new Error("expected advance");
        expect(reset.state.rulesContext.weather).toBe(B_WEATHER_SANDSTORM_TEMPORARY);
        expect(reset.state.rulesContext.weatherTimer).toBe(5);
      },
    );

    it(
      "Rain: set -> 4 continues ticks (weather bit stays set, chooser stays RAIN_CONTINUES) -> "
        + "expiry tick (weather clears, chooser RAIN_STOPPED) -> re-set succeeds "
        + "(F7, battle_util.c:1340-1373; weatherTimer 5->4->3->2->1->0)",
      () => {
        const B_WEATHER_RAIN_TEMPORARY = 1 << 0;
        const rc = context({ weather: B_WEATHER_RAIN_TEMPORARY, weatherTimer: 5 });
        const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts());
        let state = scratchState(rc);

        for (const expectedTimerAfter of [4, 3, 2, 1]) {
          const result = runBattleEndTurnOrchestration(program, handlers, state);
          expect(result.kind).toBe("next-turn");
          if (result.kind !== "next-turn") throw new Error("expected next-turn");
          expect(result.state.rulesContext.weatherTimer).toBe(expectedTimerAfter);
          expect(result.state.rulesContext.weather).toBe(B_WEATHER_RAIN_TEMPORARY);
          expect(result.state.rulesContext.multistringChooser).toBe(0); // B_MSG_RAIN_CONTINUES
          expect(result.state.rng.calls).toBe(state.rng.calls); // zero Random() draws (doc §4)
          state = result.state;
        }

        // 5th tick: weather ends, chooser flips to RAIN_STOPPED, weatherTimer/weather both clear.
        const ends = runBattleEndTurnOrchestration(program, handlers, state);
        expect(ends.kind).toBe("next-turn");
        if (ends.kind !== "next-turn") throw new Error("expected next-turn");
        expect(ends.state.rulesContext.weather).toBe(0);
        expect(ends.state.rulesContext.weatherTimer).toBe(0);
        expect(ends.state.rulesContext.multistringChooser).toBe(2); // B_MSG_RAIN_STOPPED
        expect(ends.state.rng.calls).toBe(state.rng.calls);

        // Re-set from scratch succeeds.
        const rePc = findPc("B_SCR_OP_SETRAIN", "BattleScript_EffectRainDance");
        const { result: reset } = stepAtProgramCounter(rePc, ends.state.rulesContext);
        if (reset.kind !== "advanced") throw new Error("expected advance");
        expect(reset.state.rulesContext.weather).toBe(B_WEATHER_RAIN_TEMPORARY);
        expect(reset.state.rulesContext.weatherTimer).toBe(5);
      },
    );

    it(
      "Sun: set -> 4 continues ticks (BattleScript_SunlightContinues, weather bit stays set) -> "
        + "expiry tick (BattleScript_SunlightFaded, weather clears) -> re-set succeeds "
        + "(F9, battle_util.c:1394-1411; weatherTimer 5->4->3->2->1->0)",
      () => {
        const B_WEATHER_SUN_TEMPORARY = 1 << 5;
        const rc = context({ weather: B_WEATHER_SUN_TEMPORARY, weatherTimer: 5 });
        const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts());
        let state = scratchState(rc);

        for (const expectedTimerAfter of [4, 3, 2, 1]) {
          const result = runBattleEndTurnOrchestration(program, handlers, state);
          expect(result.kind).toBe("next-turn");
          if (result.kind !== "next-turn") throw new Error("expected next-turn");
          expect(result.state.rulesContext.weatherTimer).toBe(expectedTimerAfter);
          expect(result.state.rulesContext.weather).toBe(B_WEATHER_SUN_TEMPORARY);
          expect(result.state.rng.calls).toBe(state.rng.calls); // zero Random() draws (doc §4)
          state = result.state;
        }

        const ends = runBattleEndTurnOrchestration(program, handlers, state);
        expect(ends.kind).toBe("next-turn");
        if (ends.kind !== "next-turn") throw new Error("expected next-turn");
        expect(ends.state.rulesContext.weather).toBe(0);
        expect(ends.state.rulesContext.weatherTimer).toBe(0);
        expect(ends.state.rng.calls).toBe(state.rng.calls);

        const rePc = findPc("B_SCR_OP_SETSUNNY", "BattleScript_EffectSunnyDay");
        const { result: reset } = stepAtProgramCounter(rePc, ends.state.rulesContext);
        if (reset.kind !== "advanced") throw new Error("expected advance");
        expect(reset.state.rulesContext.weather).toBe(B_WEATHER_SUN_TEMPORARY);
        expect(reset.state.rulesContext.weatherTimer).toBe(5);
      },
    );
  },
);
