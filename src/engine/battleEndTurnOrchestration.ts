/**
 * S10: `BattleTurnPassed` orchestration equivalent
 * (`reference/pokeemerald/src/battle_main.c:3956-4019`,
 * `docs/end-turn-ground-truth.md`). The sibling C-side state machine to
 * `battleScriptFaintedActionsOrchestration.ts`: everything between one
 * turn's last action and the next turn's action selection -- field timers,
 * per-battler status ticks, and the faint re-entry when an end-turn tick
 * kills something.
 *
 * Like its precedent, this drives the ENTIRE pass (field loop + every
 * battler's full 19-case loop + the fainted-actions re-entry) to completion
 * in one call rather than literally modeling source's frame-by-frame
 * resumable tracker -- behaviorally identical for every scenario this
 * engine can construct today, since none of the modeled cases ever block on
 * a controller mid-tick.
 *
 * **Load-bearing ordering rule (doc §1):** `DoFieldEndTurnEffects`/
 * `DoBattlerEndTurnEffects` are gated on `battleOutcome === 0`, but
 * `HandleFaintedMonActions` is NOT -- it always runs, exactly once, after
 * the field/battler passes stop (whether they completed cleanly or were
 * cut short by an inline `checkteamslost` deciding the battle). This module
 * mirrors that: the instant a fired tick script leaves `battleOutcome !==
 * 0`, the field/battler loop stops immediately (no further cases, no
 * further battlers), and control falls through to the SAME unconditional
 * `runBattleScriptFaintedActionsOrchestration` call the clean-completion
 * path also uses.
 *
 * Every case this doc marks Factory-L50-reachable but whose state this
 * engine doesn't model yet is a named barrier gated on its own real
 * trigger condition (never a blanket skip) -- see the per-case comments
 * below. `HandleWishPerishSongOnTurnEnd` and the ENDTURN_WISH field case
 * have no modeled trigger state anywhere in this engine at all (no
 * `wishCounter`/perish-song fields) and stay explicit, documented no-ops --
 * matching this step's own brief, which names Wish/Uproar as allowed
 * deferrals.
 */
import {
  acknowledgeBattleScriptMachineController,
  drawBattleScriptRng,
  stepBattleScriptMachine,
  type BattleScriptMachineState,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import {
  resolveBattleScriptLabel,
  type BattleScriptInstruction,
  type BattleScriptProgram,
} from "./battleScriptProgram.ts";
import type { BattleScriptBattlerId } from "./battleScriptEvents.ts";
import {
  resolveBattleScriptBattlerHoldEffect,
  withBattleScriptPartyMemberStatus1,
  type BattleScriptRulesContext,
  type BattleScriptSideTimerState,
} from "./battleScriptRulesContext.ts";
import { withBattler } from "./battleScriptHitChainOpcode.ts";
import {
  runBattleScriptFaintedActionsOrchestration,
  type BattleScriptFaintedActionsResult,
} from "./battleScriptFaintedActionsOrchestration.ts";
import {
  createEmptyCallbackStack,
  popEnd3,
  pushCursorAndCallback,
} from "./battleScriptCallbackStack.ts";
import {
  BATTLE_SCRIPT_STATUS1_SLEEP,
  BATTLE_SCRIPT_STATUS2_MASKS,
  BATTLE_SCRIPT_STATUS2_WRAPPED_MASK,
  BATTLE_SCRIPT_STATUS3_LEECHSEED,
  BATTLE_SCRIPT_STATUS3_LEECHSEED_BATTLER_MASK,
  BATTLE_SCRIPT_STATUS3_ROOTED,
} from "./battleScriptSourceConstants.ts";

const POISON_TURN_DMG_LABEL = "BattleScript_PoisonTurnDmg";
const BURN_TURN_DMG_LABEL = "BattleScript_BurnTurnDmg";
const INGRAIN_TURN_HEAL_LABEL = "BattleScript_IngrainTurnHeal";
const LEECH_SEED_TURN_DRAIN_LABEL = "BattleScript_LeechSeedTurnDrain";
const WRAP_TURN_DMG_LABEL = "BattleScript_WrapTurnDmg";
const WRAP_ENDS_LABEL = "BattleScript_WrapEnds";
/** `ItemBattleEffects(ITEMEFFECT_NORMAL, ...)`'s ten `BattleScriptExecute`+`end2` labels this registration wires (docs/endturn-abilities-items-ground-truth.md §1c/§5 slice 4). */
const ITEM_HEAL_HP_END2_LABEL = "BattleScript_ItemHealHP_End2";
const WHITE_HERB_END2_LABEL = "BattleScript_WhiteHerbEnd2";
const BERRY_CURE_PRLZ_END2_LABEL = "BattleScript_BerryCurePrlzEnd2";
const BERRY_CURE_PSN_END2_LABEL = "BattleScript_BerryCurePsnEnd2";
const BERRY_CURE_BRN_END2_LABEL = "BattleScript_BerryCureBrnEnd2";
const BERRY_CURE_FRZ_END2_LABEL = "BattleScript_BerryCureFrzEnd2";
const BERRY_CURE_SLP_END2_LABEL = "BattleScript_BerryCureSlpEnd2";
const BERRY_CURE_CONFUSION_END2_LABEL = "BattleScript_BerryCureConfusionEnd2";
const BERRY_CURE_CHOSEN_STATUS_END2_LABEL = "BattleScript_BerryCureChosenStatusEnd2";
/**
 * Higher than battleScriptFaintedActionsOrchestration.ts's own per-script
 * ceiling (64): the DoTurnDmg-family scripts' printstring/waitmessage pair
 * (STRINGID_PKMNHURTBYPOISON/BURN, B_WAIT_TIME_LONG) resolves via a run of
 * "scheduler-progressed" steps rather than a single controller round trip,
 * so a longer, still-bounded budget is needed to reach the script's own end.
 */
const SCRIPT_BUDGET = 256;

/** include/constants/battle.h:117-123. */
const STATUS1_POISON = 1 << 3;
const STATUS1_BURN = 1 << 4;
const STATUS1_FREEZE = 1 << 5;
const STATUS1_PARALYSIS = 1 << 6;
const STATUS1_TOXIC_POISON = 1 << 7;
const STATUS1_TOXIC_COUNTER = (1 << 8) | (1 << 9) | (1 << 10) | (1 << 11);
const STATUS1_TOXIC_TURN_1 = 1 << 8;
const STATUS1_TOXIC_TURN_15 = 15 << 8;
const STATUS1_PSN_ANY = STATUS1_POISON | STATUS1_TOXIC_POISON;
/** include/constants/battle.h:125 -- STATUS1_ANY, HOLD_EFFECT_CURE_STATUS's own gate. */
const STATUS1_ANY = BATTLE_SCRIPT_STATUS1_SLEEP | STATUS1_POISON | STATUS1_BURN
  | STATUS1_FREEZE | STATUS1_PARALYSIS | STATUS1_TOXIC_POISON;

/** include/item_effects.h:5-47 -- the ITEMEFFECT_NORMAL switch's own hold-effect ids (docs/endturn-abilities-items-ground-truth.md §1c/§2b). */
const HOLD_EFFECT_RESTORE_HP = 1;
const HOLD_EFFECT_CURE_PAR = 2;
const HOLD_EFFECT_CURE_SLP = 3;
const HOLD_EFFECT_CURE_PSN = 4;
const HOLD_EFFECT_CURE_BRN = 5;
const HOLD_EFFECT_CURE_FRZ = 6;
const HOLD_EFFECT_RESTORE_PP = 7;
const HOLD_EFFECT_CURE_CONFUSION = 8;
const HOLD_EFFECT_CURE_STATUS = 9;
const HOLD_EFFECT_CONFUSE_SPICY = 10;
const HOLD_EFFECT_CONFUSE_DRY = 11;
const HOLD_EFFECT_CONFUSE_SWEET = 12;
const HOLD_EFFECT_CONFUSE_BITTER = 13;
const HOLD_EFFECT_CONFUSE_SOUR = 14;
const HOLD_EFFECT_ATTACK_UP = 15;
const HOLD_EFFECT_DEFENSE_UP = 16;
const HOLD_EFFECT_SPEED_UP = 17;
const HOLD_EFFECT_SP_ATTACK_UP = 18;
const HOLD_EFFECT_SP_DEFENSE_UP = 19;
const HOLD_EFFECT_CRITICAL_UP = 20;
const HOLD_EFFECT_RANDOM_STAT_UP = 21;
const HOLD_EFFECT_RESTORE_STATS = 23;
const HOLD_EFFECT_CURE_ATTRACT = 28;
const HOLD_EFFECT_LEFTOVERS = 43;
const DEFAULT_STAT_STAGE = 6;
/** include/constants/abilities.h -- the four `ENDTURN_ABILITIES` switch cases (docs/endturn-abilities-items-ground-truth.md §1b, source-confirmed exhaustive). */
const ABILITY_SPEED_BOOST = 3;
const ABILITY_RAIN_DISH = 44;
const ABILITY_TRUANT = 54;
const ABILITY_SHED_SKIN = 61;
/** battleScriptDamagingWeatherOpcode.ts's own established `WEATHER_HAS_EFFECT` precedent (Cloud Nine only; Air Lock is Rayquaza-only and Frontier-absent, docs/screens-weather-ground-truth.md §2). */
const ABILITY_CLOUD_NINE = 13;
/** battleScriptStatBuffs.ts's own STAT_SPEED/MAX_STAT_STAGE convention. */
const STAT_SPEED = 3;
const MAX_STAT_STAGE = 12;
/** include/constants/battle.h -- STAT_ATK/STAT_SPATK. */
const STAT_ATK = 1;
const STAT_SPATK = 4;
/** reference/pokeemerald/src/data/items.h:2047-2097 -- Liechi/Salac/Petaya's real `holdEffectParam` (all three: 4), the HP-threshold divisor `TRY_EAT_STAT_UP_BERRY` reads (battle_util.c:3244-3255, doc §5 slice 5). */
const STAT_UP_BERRY_HOLD_EFFECT_PARAM = 4;
/** battle_anim.h:195. */
const STAT_ANIM_PLUS1 = 14;
/**
 * `BattleScript_BerryStatRaiseDoStatUp`'s own `setbyte cMULTISTRING_CHOOSER,
 * B_MSG_STAT_ROSE_ITEM` (battle_message.c:1012, battleScriptSetByte.ts's own
 * already-registered constant) overrides whatever `changeStatBuffs`' own
 * `statbuffchange` call just set, INSIDE the script -- no C-side
 * `multistringChooser` patch needed here, unlike every other family-A cure
 * tick.
 */
const BERRY_STAT_RAISE_END2_LABEL = "BattleScript_BerryStatRaiseEnd2";
/** battle_util.c:3429-3451 -- the 3 Factory-legal (doc §2b) `TRY_EAT_STAT_UP_BERRY`-shaped cases, each keyed by its own holdEffect id, doc §5 slice 5. Liechi (ATTACK_UP) is inlined in source rather than macro-expanded but is byte-for-byte the same shape. */
const STAT_UP_BERRIES: ReadonlyMap<number, number> = new Map([
  [HOLD_EFFECT_ATTACK_UP, STAT_ATK], // Liechi
  [HOLD_EFFECT_SPEED_UP, STAT_SPEED], // Salac
  [HOLD_EFFECT_SP_ATTACK_UP, STAT_SPATK], // Petaya
]);
const SPEED_BOOST_ACTIVATES_LABEL = "BattleScript_SpeedBoostActivates";
const RAIN_DISH_ACTIVATES_LABEL = "BattleScript_RainDishActivates";
const SHED_SKIN_ACTIVATES_LABEL = "BattleScript_ShedSkinActivates";
/** battle_message.c:1208-1212 -- gBerryEffectStringIds' own MULTISTRING_CHOOSER indices. */
const B_MSG_CURED_PROBLEM = 0;
const B_MSG_NORMALIZED_STATUS = 1;

/**
 * Hold effects real (Factory-legal, doc §2b) but out of this slice's own
 * ten-case registration, each barriered on its own genuine trigger
 * condition (never blanket "any holder"): `RESTORE_HP`'s heal-amount and
 * `RESTORE_PP`'s move-slot/PP-bonus machinery are both real extra plumbing
 * this slice's brief scoped to a later pass, not this doc's "no new opcode"
 * ten. Threading their own cheap gates (HP <= maxHP/2; a real zero-PP move)
 * costs nothing extra and keeps the barrier honest -- a full-HP Sitrus
 * holder or an undamaged-PP Leppa holder correctly advances silently, same
 * as source's own no-op case.
 */
function restoreHpGateFires(b: BattleScriptRulesBattlerLike): boolean {
  return b.hp <= Math.floor(b.maxHP / 2);
}
function restorePpGateFires(b: BattleScriptRulesBattlerLike): boolean {
  return b.moves.some((move, index) => move !== 0 && b.pp[index] === 0);
}

type BattleScriptRulesBattlerLike = BattleScriptRulesContext["battlers"][number];

/** include/constants/battle.h:210-217 -- gSideStatuses/gSideTimers bits this engine can already represent (sideStatuses/mistTimers are raw modeled fields). */
const SIDE_STATUS_REFLECT = 1 << 0;
const SIDE_STATUS_LIGHTSCREEN = 1 << 1;
const SIDE_STATUS_SAFEGUARD = 1 << 5;
const SIDE_STATUS_MIST = 1 << 8;

/** include/constants/battle.h:232-244 -- gBattleWeather bits (this engine's `weather` field is already the raw u32). */
const B_WEATHER_RAIN = (1 << 0) | (1 << 1) | (1 << 2);
const B_WEATHER_SANDSTORM = (1 << 3) | (1 << 4);
const B_WEATHER_SUN = (1 << 5) | (1 << 6);
const B_WEATHER_HAIL = 1 << 7;

/** battle_util.c:1181-1438 -- the field loop's own script labels this registration hosts (docs/screens-weather-ground-truth.md §3). */
const SIDE_STATUS_WORE_OFF_LABEL = "BattleScript_SideStatusWoreOff";
const SAFEGUARD_ENDS_LABEL = "BattleScript_SafeguardEnds";
const DAMAGING_WEATHER_CONTINUES_LABEL = "BattleScript_DamagingWeatherContinues";
const SANDSTORM_HAIL_ENDS_LABEL = "BattleScript_SandStormHailEnds";
/** battle_util.c:1340-1373 -- Rain is a single shared label, branching internally on the chooser (unlike Sandstorm/Hail/Sun's separate continues/ends labels). */
const RAIN_CONTINUES_OR_ENDS_LABEL = "BattleScript_RainContinuesOrEnds";
const SUNLIGHT_CONTINUES_LABEL = "BattleScript_SunlightContinues";
const SUNLIGHT_FADED_LABEL = "BattleScript_SunlightFaded";
/** battle_message.c:936-941, cMULTISTRING_CHOOSER values `BattleScript_RainContinuesOrEnds` itself branches on. B_MSG_DOWNPOUR_CONTINUES(1) is unreachable: `B_WEATHER_RAIN_DOWNPOUR` is source-marked "// unused" (include/constants/battle.h:233) and no opcode this engine registers (or plans to) ever sets it. */
const B_MSG_RAIN_CONTINUES = 0;
const B_MSG_RAIN_STOPPED = 2;

type MachineState = BattleScriptMachineState<BattleScriptRulesContext>;
type Handlers = BattleScriptOpcodeHandlers<BattleScriptRulesContext>;

export type BattleEndTurnCaseBarrier = Readonly<{
  /** The ENDTURN_* case name (doc §1a/§1b) whose real trigger condition fired. */
  caseName: string;
  detail: string;
}>;

export type BattleEndTurnResult =
  | Readonly<{ kind: "next-turn"; state: MachineState }>
  | Readonly<{ kind: "terminal"; state: MachineState }>
  | Readonly<{ kind: "resumed"; state: MachineState }>
  | Readonly<{ kind: "non-terminal-barrier"; state: MachineState; instruction: BattleScriptInstruction }>
  | Readonly<{ kind: "case-barrier"; state: MachineState } & BattleEndTurnCaseBarrier>
  | Readonly<{
    /**
     * A fainted battler is player-side with a healthy bench
     * (docs/forced-switch-ground-truth.md §3/§4 slice 10) -- the same
     * genuine `"player-choice-required"` halt
     * `factoryBattleScriptTerminalDecision.ts` resumes, surfaced here too
     * since end-turn KOs (Burn/Poison/Toxic) reuse the identical fainted-
     * actions orchestration. This reducer does not yet wire a forced-switch
     * continuation of its own -- callers name it as their own barrier.
     */
    kind: "player-choice-required";
    state: MachineState;
    battler: BattleScriptBattlerId;
    faintedPartyIndex: number;
    legalPartyIndexes: readonly number[];
  }>;

/** `BattleScriptExecute(script)` -- a fresh top-level script, callStack reset (identical to the fainted-actions precedent). */
function startBattleScriptExecute(
  program: BattleScriptProgram,
  entryLabel: string,
  priorState: MachineState,
): MachineState {
  const entry = resolveBattleScriptLabel(program, entryLabel);
  if (!entry) throw new Error(`unknown Battle Script entry label ${entryLabel}`);
  return Object.freeze({
    programCounter: entry.programCounter,
    callStack: Object.freeze([]),
    instructionsExecuted: 0,
    haltReason: null,
    scheduler: priorState.scheduler,
    rulesContext: priorState.rulesContext,
    rng: priorState.rng,
    events: priorState.events,
  });
}

function acknowledgeAllPendingControllers(state: MachineState): MachineState {
  let next = state;
  for (const battler of state.scheduler.pendingControllerBattlers) {
    next = acknowledgeBattleScriptMachineController(next, battler);
  }
  return next;
}

type RunToOwnEndResult =
  | Readonly<{ kind: "terminal"; state: MachineState }>
  | Readonly<{ kind: "barrier"; state: MachineState; instruction: BattleScriptInstruction }>;

/** Runs one already-started BattleScriptExecute script to its own end/end2 halt (same shape as the fainted-actions precedent's own helper). */
function runScriptToOwnEnd(program: BattleScriptProgram, handlers: Handlers, initialState: MachineState): RunToOwnEndResult {
  let state = initialState;
  for (let budget = 0; budget < SCRIPT_BUDGET; budget += 1) {
    const instruction = program.instructions[state.programCounter];
    if (!instruction) {
      throw new Error(`end-turn orchestration left the committed program at ${state.programCounter}`);
    }
    if (!handlers[instruction.opcodeId]) {
      return Object.freeze({ kind: "barrier", state, instruction });
    }
    const stepped = stepBattleScriptMachine(program, state, handlers);
    if (stepped.kind === "blocked") {
      const acknowledged = acknowledgeAllPendingControllers(stepped.state);
      if (acknowledged === stepped.state) {
        throw new Error(`end-turn orchestration blocked inside ${instruction.source.label} without a safe controller acknowledgement`);
      }
      state = acknowledged;
      continue;
    }
    if (stepped.kind === "halted") {
      if (stepped.state.haltReason?.kind === "terminal") {
        return Object.freeze({ kind: "terminal", state: stepped.state });
      }
      return Object.freeze({ kind: "barrier", state: stepped.state, instruction });
    }
    if (stepped.kind === "unsupported") {
      return Object.freeze({ kind: "barrier", state: stepped.state, instruction });
    }
    // "advanced" and "scheduler-progressed" both carry a legitimately-updated state to keep looping from.
    state = stepped.state;
  }
  throw new Error("end-turn orchestration exceeded its per-script instruction budget");
}

/** `gBattlerFainted`-style role reassignment, narrowed to `attacker` -- every DoTurnDmg-family script only ever reads BS_ATTACKER (doc §1c). */
function enterTickBattlerContext(state: MachineState, battler: BattleScriptBattlerId): MachineState {
  const roles = state.rulesContext.selectorRoles;
  if (roles.attacker === battler) return state;
  return Object.freeze({
    ...state,
    rulesContext: Object.freeze({ ...state.rulesContext, selectorRoles: Object.freeze({ ...roles, attacker: battler }) }),
  });
}

type TickOutcome =
  | Readonly<{ kind: "advance"; state: MachineState }>
  | Readonly<{ kind: "fired"; state: MachineState }>
  | Readonly<{ kind: "opcode-barrier"; state: MachineState; instruction: BattleScriptInstruction }>;

function runTickScript(
  program: BattleScriptProgram,
  handlers: Handlers,
  priorState: MachineState,
  rulesContextForScript: BattleScriptRulesContext,
  battler: BattleScriptBattlerId,
  entryLabel: string,
): TickOutcome {
  const withPatch: MachineState = Object.freeze({ ...priorState, rulesContext: rulesContextForScript });
  const ticking = enterTickBattlerContext(withPatch, battler);
  const started = startBattleScriptExecute(program, entryLabel, ticking);
  const run = runScriptToOwnEnd(program, handlers, started);
  if (run.kind === "barrier") {
    return Object.freeze({ kind: "opcode-barrier", state: run.state, instruction: run.instruction });
  }
  return Object.freeze({ kind: "fired", state: run.state });
}

type RunToEnd3Result =
  | Readonly<{ kind: "end3"; state: MachineState }>
  | Readonly<{ kind: "barrier"; state: MachineState; instruction: BattleScriptInstruction }>;

/** Same shape as `runScriptToOwnEnd`, but its stopping condition is the new `"end3"` halt kind instead of `"terminal"` -- `BattleScript_SpeedBoostActivates`/`RainDishActivates` (docs/end3-design.md) never reach end/end2. */
function runScriptToEnd3(program: BattleScriptProgram, handlers: Handlers, initialState: MachineState): RunToEnd3Result {
  let state = initialState;
  for (let budget = 0; budget < SCRIPT_BUDGET; budget += 1) {
    const instruction = program.instructions[state.programCounter];
    if (!instruction) {
      throw new Error(`end-turn orchestration left the committed program at ${state.programCounter}`);
    }
    if (!handlers[instruction.opcodeId]) {
      return Object.freeze({ kind: "barrier", state, instruction });
    }
    const stepped = stepBattleScriptMachine(program, state, handlers);
    if (stepped.kind === "blocked") {
      const acknowledged = acknowledgeAllPendingControllers(stepped.state);
      if (acknowledged === stepped.state) {
        throw new Error(`end-turn orchestration blocked inside ${instruction.source.label} without a safe controller acknowledgement`);
      }
      state = acknowledged;
      continue;
    }
    if (stepped.kind === "halted") {
      if (stepped.state.haltReason?.kind === "end3") {
        return Object.freeze({ kind: "end3", state: stepped.state });
      }
      return Object.freeze({ kind: "barrier", state: stepped.state, instruction });
    }
    if (stepped.kind === "unsupported") {
      return Object.freeze({ kind: "barrier", state: stepped.state, instruction });
    }
    state = stepped.state;
  }
  throw new Error("end-turn orchestration exceeded its per-script instruction budget");
}

/**
 * `BattleScriptPushCursorAndCallback` + `Cmd_end3` (`battle_util.c:3209-3215`,
 * `battle_script_commands.c:3966-3973`, docs/end3-design.md) -- the
 * push-cursor-and-resume-caller primitive `runTickScript`'s plain
 * `BattleScriptExecute`+end/end2 shape cannot host. Every end-turn-abilities
 * consumer of this helper preempts `BattleTurnPassed` itself, a bare C
 * function rather than a running script (design doc §1.4(a)): the callback-
 * stack cell is created empty, pushed, run to the new script's own `END3`,
 * and popped back to empty within this ONE synchronous call -- depth never
 * exceeds 1 and never survives past this function's return (design doc
 * §1.5/§2.2; this engine already runs each end-turn tick to completion in
 * one call, doc §2.1). An "underflow" pop or a resumed `"script"`
 * continuation would both mean a bug in THIS function's own push/pop
 * pairing (never a reachable real-play state down this call path) --
 * thrown loudly rather than silently resumed, matching the prototype's own
 * contract (`battleScriptCallbackStack.ts`).
 */
function runPushCursorAndCallbackTickScript(
  program: BattleScriptProgram,
  handlers: Handlers,
  priorState: MachineState,
  rulesContextForScript: BattleScriptRulesContext,
  battler: BattleScriptBattlerId,
  entryLabel: string,
): TickOutcome {
  const withPatch: MachineState = Object.freeze({ ...priorState, rulesContext: rulesContextForScript });
  const ticking = enterTickBattlerContext(withPatch, battler);
  const entry = resolveBattleScriptLabel(program, entryLabel);
  if (!entry) throw new Error(`unknown Battle Script entry label ${entryLabel}`);
  const pushed = pushCursorAndCallback(
    createEmptyCallbackStack(),
    Object.freeze({ programCounter: ticking.programCounter, callStack: ticking.callStack }),
    Object.freeze({ kind: "cCallback", name: "BattleTurnPassed" }),
    entry.programCounter,
  );
  const started: MachineState = Object.freeze({
    ...ticking,
    programCounter: pushed.programCounter,
    callStack: pushed.callStack,
    haltReason: null,
  });
  const run = runScriptToEnd3(program, handlers, started);
  if (run.kind === "barrier") {
    return Object.freeze({ kind: "opcode-barrier", state: run.state, instruction: run.instruction });
  }
  const popped = popEnd3(pushed.stack);
  if (popped.kind === "underflow") {
    throw new Error(`END3 for ${entryLabel} popped an empty callback stack -- push/pop mismatch in runPushCursorAndCallbackTickScript`);
  }
  if (popped.continuation.kind !== "cCallback") {
    throw new Error(`END3 for ${entryLabel} resumed a "script" continuation -- no end-turn ability path ever pushes one`);
  }
  const resumed: MachineState = Object.freeze({
    ...run.state,
    programCounter: popped.deadOrLiveScriptCursor.programCounter,
    callStack: popped.deadOrLiveScriptCursor.callStack,
    haltReason: null,
  });
  return Object.freeze({ kind: "fired", state: resumed });
}

/** `status1 += STATUS1_TOXIC_TURN(1)` capped at TURN(15) (battle_util.c:1542-1543), plus the party status1 mirror `datahpupdate`'s own sync already establishes for HP. */
function bumpToxicCounter(rulesContext: BattleScriptRulesContext, battler: BattleScriptBattlerId): BattleScriptRulesContext {
  const b = rulesContext.battlers[battler];
  const atCap = (b.status1 & STATUS1_TOXIC_COUNTER) === STATUS1_TOXIC_TURN_15;
  const nextStatus1 = atCap ? b.status1 : ((b.status1 + STATUS1_TOXIC_TURN_1) >>> 0);
  if (nextStatus1 === b.status1) return rulesContext;
  const withStatus = withBattler(rulesContext, battler, { status1: nextStatus1 });
  return Object.freeze({
    ...withStatus,
    party: withBattleScriptPartyMemberStatus1(withStatus.party, b.side, b.partyIndex, nextStatus1),
  });
}

function floorDivAtLeastOne(value: number, divisor: number): number {
  const result = Math.floor(value / divisor);
  return result === 0 ? 1 : result;
}

/**
 * `ENDTURN_POISON` / `ENDTURN_BAD_POISON` / `ENDTURN_BURN`
 * (`battle_util.c:1525-1560`) -- the doc's own live-verified burn/toxic
 * ledger (§2a/§2b). All three reuse the already-registered §0 opcode set
 * (`orword`/`healthbarupdate`/`datahpupdate`/`tryfaintmon`/`checkteamslost`)
 * via `BattleScript_PoisonTurnDmg`/`BurnTurnDmg` -- no new opcodes needed.
 */
function runBattlerStatusDamageTick(
  program: BattleScriptProgram,
  handlers: Handlers,
  state: MachineState,
  battler: BattleScriptBattlerId,
): TickOutcome {
  const b = state.rulesContext.battlers[battler];
  if (b.hp === 0) return Object.freeze({ kind: "advance", state });

  if ((b.status1 & STATUS1_POISON) !== 0) {
    const damage = floorDivAtLeastOne(b.maxHP, 8);
    const rc = Object.freeze({ ...state.rulesContext, battleMoveDamage: damage });
    return runTickScript(program, handlers, state, rc, battler, POISON_TURN_DMG_LABEL);
  }
  if ((b.status1 & STATUS1_TOXIC_POISON) !== 0) {
    const bumped = bumpToxicCounter(state.rulesContext, battler);
    const bumpedBattler = bumped.battlers[battler];
    const base = floorDivAtLeastOne(b.maxHP, 16);
    const counter = (bumpedBattler.status1 & STATUS1_TOXIC_COUNTER) >>> 8;
    const rc = Object.freeze({ ...bumped, battleMoveDamage: base * counter });
    return runTickScript(program, handlers, state, rc, battler, POISON_TURN_DMG_LABEL);
  }
  if ((b.status1 & STATUS1_BURN) !== 0) {
    const damage = floorDivAtLeastOne(b.maxHP, 8);
    const rc = Object.freeze({ ...state.rulesContext, battleMoveDamage: damage });
    return runTickScript(program, handlers, state, rc, battler, BURN_TURN_DMG_LABEL);
  }
  return Object.freeze({ kind: "advance", state });
}

/**
 * `ENDTURN_INGRAIN` (`battle_util.c:1480-1492`,
 * docs/ingrain-leechseed-wrap-ground-truth.md §2a) -- zero `Random()` draws,
 * heal capped at maxHP by `datahpupdate`'s own negative-damage branch, no
 * `tryfaintmon`/`checkteamslost` anywhere in `BattleScript_IngrainTurnHeal`
 * (healing can never decide the battle).
 */
function runIngrainTick(
  program: BattleScriptProgram,
  handlers: Handlers,
  state: MachineState,
  battler: BattleScriptBattlerId,
): TickOutcome {
  const b = state.rulesContext.battlers[battler];
  if ((b.status3 & BATTLE_SCRIPT_STATUS3_ROOTED) === 0 || b.hp === b.maxHP || b.hp === 0) {
    return Object.freeze({ kind: "advance", state });
  }
  const damage = -floorDivAtLeastOne(b.maxHP, 16);
  const rc = Object.freeze({ ...state.rulesContext, battleMoveDamage: damage });
  return runTickScript(program, handlers, state, rc, battler, INGRAIN_TURN_HEAL_LABEL);
}

/**
 * `ENDTURN_LEECH_SEED` (`battle_util.c:1509-1524`,
 * docs/ingrain-leechseed-wrap-ground-truth.md §2b) -- `BS_ATTACKER` is the
 * seeded battler (this tick's own `battler`, drains first); `BS_TARGET` is
 * the seeder (the HP receiver, per the C side's own comment), read back from
 * `status3`'s low two bits and threaded in as the `target` selector role
 * before the script runs. Zero `Random()` draws.
 */
function runLeechSeedTick(
  program: BattleScriptProgram,
  handlers: Handlers,
  state: MachineState,
  battler: BattleScriptBattlerId,
): TickOutcome {
  const b = state.rulesContext.battlers[battler];
  const seederId = (b.status3 & BATTLE_SCRIPT_STATUS3_LEECHSEED_BATTLER_MASK) as BattleScriptBattlerId;
  const seeder = state.rulesContext.battlers[seederId];
  if ((b.status3 & BATTLE_SCRIPT_STATUS3_LEECHSEED) === 0 || seeder.hp === 0 || b.hp === 0) {
    return Object.freeze({ kind: "advance", state });
  }
  const damage = floorDivAtLeastOne(b.maxHP, 8);
  const rc = Object.freeze({
    ...state.rulesContext,
    battleMoveDamage: damage,
    selectorRoles: Object.freeze({ ...state.rulesContext.selectorRoles, target: seederId }),
  });
  return runTickScript(program, handlers, state, rc, battler, LEECH_SEED_TURN_DRAIN_LABEL);
}

/**
 * `ENDTURN_WRAP` (`battle_util.c:1592-1621`,
 * docs/ingrain-leechseed-wrap-ground-truth.md §2c) -- the counter decrements
 * FIRST, then branches: still trapped fires the damage script
 * (`floor(maxHP/16)`, zero `Random()`), the decrement hitting zero fires the
 * release script instead (no damage). Both scripts only ever read
 * `BS_ATTACKER` (this tick's own `battler`, the trapped mon).
 */
function runWrapTick(
  program: BattleScriptProgram,
  handlers: Handlers,
  state: MachineState,
  battler: BattleScriptBattlerId,
): TickOutcome {
  const b = state.rulesContext.battlers[battler];
  if ((b.status2 & BATTLE_SCRIPT_STATUS2_WRAPPED_MASK) === 0 || b.hp === 0) {
    return Object.freeze({ kind: "advance", state });
  }
  const decrementedStatus2 = (b.status2 - (1 << 13)) >>> 0;
  const decrementedRc = withBattler(state.rulesContext, battler, { status2: decrementedStatus2 });
  if ((decrementedStatus2 & BATTLE_SCRIPT_STATUS2_WRAPPED_MASK) !== 0) {
    const damage = floorDivAtLeastOne(b.maxHP, 16);
    const rc = Object.freeze({ ...decrementedRc, battleMoveDamage: damage });
    return runTickScript(program, handlers, state, rc, battler, WRAP_TURN_DMG_LABEL);
  }
  return runTickScript(program, handlers, state, decrementedRc, battler, WRAP_ENDS_LABEL);
}

type ItemsTickOutcome =
  | TickOutcome
  | Readonly<{ kind: "case-barrier"; state: MachineState; detail: string }>;

/** `WEATHER_HAS_EFFECT` (include/battle_util.h:47), modeled the same as `battleScriptDamagingWeatherOpcode.ts`'s own `battlerCarriesCloudNine` precedent. */
function weatherHasEffect(rulesContext: BattleScriptRulesContext): boolean {
  const count = rulesContext.battleTopology.battlersCount;
  for (let i = 0; i < count; i += 1) {
    if (rulesContext.battlers[i]!.ability === ABILITY_CLOUD_NINE) return false;
  }
  return true;
}

/**
 * `ABILITY_SHED_SKIN` (`battle_util.c:2620-2641`, doc §5 slice 2) -- the one
 * `Random()`-bearing end-turn ability. `(Random() % 3) == 0` is a C-side
 * roll inside `AbilityBattleEffects` itself, not a script opcode, so it
 * draws via `drawBattleScriptRng` attributed to `BattleScript_
 * ShedSkinActivates`'s own entry instruction -- the same "C-side draw
 * attributed to the nearest concrete instruction in hand" convention
 * `battleScriptAttackCancelerOpcode.ts:328` already established for
 * `AtkCanceler_UnableToUseMove`'s own admission draws. Draws exactly once
 * per tick whenever `status1 & STATUS1_ANY`, win or lose (doc §3c/§4) -- the
 * miss branch still consumes the draw and returns `"advance"` with only the
 * RNG state changed. On success, `status1` clears unconditionally to 0 (ALL
 * bits, matching source's raw `= 0`, not a masked clear) plus the Nightmare-
 * glitch `STATUS2_NIGHTMARE` clear, synced to the party mirror the same way
 * every other cure tick already does, then `BattleScript_ShedSkinActivates`
 * runs via the END3 push-cursor-and-callback primitive (docs/end3-design.md),
 * same as Speed Boost/Rain Dish.
 */
function runShedSkinTick(
  program: BattleScriptProgram,
  handlers: Handlers,
  state: MachineState,
  battler: BattleScriptBattlerId,
): TickOutcome {
  const b = state.rulesContext.battlers[battler];
  if ((b.status1 & STATUS1_ANY) === 0) return Object.freeze({ kind: "advance", state });

  const entry = resolveBattleScriptLabel(program, SHED_SKIN_ACTIVATES_LABEL);
  if (!entry) throw new Error(`unknown Battle Script entry label ${SHED_SKIN_ACTIVATES_LABEL}`);
  const entryInstruction = program.instructions[entry.programCounter];
  if (!entryInstruction) throw new Error(`Battle Script program has no instruction at ${entry.programCounter}`);
  const { rng, randomValue } = drawBattleScriptRng(state.rng, entryInstruction, "endturn:shedskin");
  const drawnState: MachineState = Object.freeze({ ...state, rng });
  if (randomValue % 3 !== 0) {
    return Object.freeze({ kind: "advance", state: drawnState });
  }

  const clearedStatus2 = (b.status2 & ~BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_NIGHTMARE) >>> 0;
  const withStatus = withBattler(drawnState.rulesContext, battler, { status1: 0, status2: clearedStatus2 });
  const synced = Object.freeze({
    ...withStatus,
    party: withBattleScriptPartyMemberStatus1(withStatus.party, b.side, b.partyIndex, 0),
    scriptingBattler: battler,
  });
  return runPushCursorAndCallbackTickScript(program, handlers, drawnState, synced, battler, SHED_SKIN_ACTIVATES_LABEL);
}

/**
 * `ENDTURN_ABILITIES` (`AbilityBattleEffects(ABILITYEFFECT_ENDTURN, battler,
 * 0, 0, 0)`, `battle_util.c:2601-2658`, docs/endturn-abilities-items-ground-
 * truth.md §1b/§5): all four real switch cases. Rain Dish/Speed Boost/Shed
 * Skin all preempt `BattleTurnPassed` via `BattleScriptPushCursorAndCallback`
 * + `end3` (docs/end3-design.md), hosted by `runPushCursorAndCallbackTickScript`
 * rather than plain `runTickScript`. `ABILITY_TRUANT` (`battle_util.c:2653-
 * 2655`) is the odd one out: `gDisableStructs[gBattlerAttacker].truantCounter
 * ^= 1` with NO script queued (no `BattleScriptExecute`/
 * `BattleScriptPushCursorAndCallback` call) and NO `effect++` -- source's own
 * `gBattlerAttacker` is this tick's own `battler` (`battle_util.c:1471` sets
 * `gBattlerAttacker = gBattlerByTurnOrder[turnEffectsBattlerId]` before the
 * switch runs), so the toggle target is just `battler`. Returning `"advance"`
 * here (never `"fired"`) is what lets the SAME `runDoBattlerEndTurnEffects`
 * call fall through into `ENDTURN_ITEMS1` for the same battler in the same
 * tick, matching source's own "no effect, no early return" shape exactly.
 */
function runAbilitiesTick(
  program: BattleScriptProgram,
  handlers: Handlers,
  state: MachineState,
  battler: BattleScriptBattlerId,
): ItemsTickOutcome {
  const b = state.rulesContext.battlers[battler];
  if (b.hp === 0) return Object.freeze({ kind: "advance", state });

  if (b.ability === ABILITY_RAIN_DISH) {
    const rainActive = (state.rulesContext.weather & B_WEATHER_RAIN) !== 0;
    if (weatherHasEffect(state.rulesContext) && rainActive && b.maxHP > b.hp) {
      const heal = floorDivAtLeastOne(b.maxHP, 16);
      const rc = Object.freeze({ ...state.rulesContext, battleMoveDamage: -heal });
      return runPushCursorAndCallbackTickScript(program, handlers, state, rc, battler, RAIN_DISH_ACTIVATES_LABEL);
    }
    return Object.freeze({ kind: "advance", state });
  }

  if (b.ability === ABILITY_SPEED_BOOST) {
    if (b.statStages[STAT_SPEED]! < MAX_STAT_STAGE && b.isFirstTurn !== 2) {
      const stages = b.statStages.map((stage, stat) => (stat === STAT_SPEED ? stage + 1 : stage));
      const withStage = withBattler(state.rulesContext, battler, { statStages: stages as never });
      return runPushCursorAndCallbackTickScript(program, handlers, state, withStage, battler, SPEED_BOOST_ACTIVATES_LABEL);
    }
    return Object.freeze({ kind: "advance", state });
  }

  if (b.ability === ABILITY_SHED_SKIN) {
    return runShedSkinTick(program, handlers, state, battler);
  }

  if (b.ability === ABILITY_TRUANT) {
    const toggled = (b.truantCounter ^ 1) as 0 | 1;
    const withToggle = withBattler(state.rulesContext, battler, { truantCounter: toggled });
    return Object.freeze({ kind: "advance", state: Object.freeze({ ...state, rulesContext: withToggle }) });
  }

  return Object.freeze({ kind: "advance", state });
}

/** Clears a status1 bit, syncs the party mirror (same shape as `bumpToxicCounter`), and runs the named cure script with `scriptingBattler` set (every cure-berry script reads `BS_SCRIPTING`). */
function runStatus1CureTick(
  program: BattleScriptProgram,
  handlers: Handlers,
  state: MachineState,
  battler: BattleScriptBattlerId,
  nextStatus1: number,
  entryLabel: string,
  statusPatch?: Partial<BattleScriptRulesBattlerLike>,
): ItemsTickOutcome {
  const b = state.rulesContext.battlers[battler];
  const withStatus = withBattler(state.rulesContext, battler, { status1: nextStatus1, ...statusPatch });
  const synced = Object.freeze({
    ...withStatus,
    party: withBattleScriptPartyMemberStatus1(withStatus.party, b.side, b.partyIndex, nextStatus1),
    scriptingBattler: battler,
  });
  return runTickScript(program, handlers, state, synced, battler, entryLabel);
}

/**
 * `ENDTURN_ITEMS1` (`ItemBattleEffects(ITEMEFFECT_NORMAL, battler, FALSE)`,
 * `battle_util.c:3331-3622`, docs/endturn-abilities-items-ground-truth.md
 * §1c/§5 slices 4-5): Leftovers, the 8 zero-RNG cure berries, White Herb, and
 * (slice 5) Liechi/Salac/Petaya -- every reachable Factory-legal case this
 * doc names. Every other real switch case this function does not implement
 * barriers on its own genuine trigger condition (RESTORE_HP/RESTORE_PP) or on
 * mere possession (the 4 zero-carrier stat/crit berries + 5 confuse berries,
 * doc §2b -- their own HP-threshold gate needs an unmodeled per-item
 * `battlerHoldEffectParam` table no live Factory carrier will ever exercise).
 */
function runItemsTick(
  program: BattleScriptProgram,
  handlers: Handlers,
  state: MachineState,
  battler: BattleScriptBattlerId,
): ItemsTickOutcome {
  const b = state.rulesContext.battlers[battler];
  if (b.hp === 0) return Object.freeze({ kind: "advance", state });
  const holdEffect = resolveBattleScriptBattlerHoldEffect(state.rulesContext, battler);

  if (holdEffect === HOLD_EFFECT_LEFTOVERS) {
    if (b.hp >= b.maxHP) return Object.freeze({ kind: "advance", state });
    const heal = Math.min(floorDivAtLeastOne(b.maxHP, 16), b.maxHP - b.hp);
    const rc = Object.freeze({ ...state.rulesContext, battleMoveDamage: -heal });
    return runTickScript(program, handlers, state, rc, battler, ITEM_HEAL_HP_END2_LABEL);
  }

  if (holdEffect === HOLD_EFFECT_RESTORE_STATS) {
    const stages = b.statStages;
    if (!stages.some((stage) => stage < DEFAULT_STAT_STAGE)) return Object.freeze({ kind: "advance", state });
    const resetStages = Object.freeze(stages.map((stage) => (stage < DEFAULT_STAT_STAGE ? DEFAULT_STAT_STAGE : stage)));
    const withStages = withBattler(state.rulesContext, battler, { statStages: resetStages as never });
    const rc = Object.freeze({ ...withStages, scriptingBattler: battler });
    return runTickScript(program, handlers, state, rc, battler, WHITE_HERB_END2_LABEL);
  }

  if (holdEffect === HOLD_EFFECT_CURE_PAR) {
    if ((b.status1 & STATUS1_PARALYSIS) === 0) return Object.freeze({ kind: "advance", state });
    return runStatus1CureTick(program, handlers, state, battler, b.status1 & ~STATUS1_PARALYSIS, BERRY_CURE_PRLZ_END2_LABEL);
  }
  if (holdEffect === HOLD_EFFECT_CURE_PSN) {
    if ((b.status1 & STATUS1_PSN_ANY) === 0) return Object.freeze({ kind: "advance", state });
    return runStatus1CureTick(program, handlers, state, battler, b.status1 & ~(STATUS1_PSN_ANY | STATUS1_TOXIC_COUNTER), BERRY_CURE_PSN_END2_LABEL);
  }
  if (holdEffect === HOLD_EFFECT_CURE_BRN) {
    if ((b.status1 & STATUS1_BURN) === 0) return Object.freeze({ kind: "advance", state });
    return runStatus1CureTick(program, handlers, state, battler, b.status1 & ~STATUS1_BURN, BERRY_CURE_BRN_END2_LABEL);
  }
  if (holdEffect === HOLD_EFFECT_CURE_FRZ) {
    if ((b.status1 & STATUS1_FREEZE) === 0) return Object.freeze({ kind: "advance", state });
    return runStatus1CureTick(program, handlers, state, battler, b.status1 & ~STATUS1_FREEZE, BERRY_CURE_FRZ_END2_LABEL);
  }
  if (holdEffect === HOLD_EFFECT_CURE_SLP) {
    if ((b.status1 & BATTLE_SCRIPT_STATUS1_SLEEP) === 0) return Object.freeze({ kind: "advance", state });
    return runStatus1CureTick(
      program, handlers, state, battler, b.status1 & ~BATTLE_SCRIPT_STATUS1_SLEEP, BERRY_CURE_SLP_END2_LABEL,
      { status2: (b.status2 & ~BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_NIGHTMARE) >>> 0 },
    );
  }
  if (holdEffect === HOLD_EFFECT_CURE_CONFUSION) {
    if ((b.status2 & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_CONFUSION) === 0) return Object.freeze({ kind: "advance", state });
    const withStatus2 = withBattler(state.rulesContext, battler, {
      status2: (b.status2 & ~BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_CONFUSION) >>> 0,
    });
    const rc = Object.freeze({ ...withStatus2, scriptingBattler: battler });
    return runTickScript(program, handlers, state, rc, battler, BERRY_CURE_CONFUSION_END2_LABEL);
  }
  if (holdEffect === HOLD_EFFECT_CURE_STATUS) {
    const hasStatus1 = (b.status1 & STATUS1_ANY) !== 0;
    const hasConfusion = (b.status2 & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_CONFUSION) !== 0;
    if (!hasStatus1 && !hasConfusion) return Object.freeze({ kind: "advance", state });
    const clearedStatus2 = (b.status2
      & ~BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_NIGHTMARE
      & ~BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_CONFUSION) >>> 0;
    const withStatus = withBattler(state.rulesContext, battler, { status1: 0, status2: clearedStatus2 });
    const synced = Object.freeze({
      ...withStatus,
      party: withBattleScriptPartyMemberStatus1(withStatus.party, b.side, b.partyIndex, 0),
      scriptingBattler: battler,
      // battle_util.c:3572-3577: >1 condition cleared at once (a status1 bit AND confusion together) prints the "normalized" variant.
      multistringChooser: hasStatus1 && hasConfusion ? B_MSG_NORMALIZED_STATUS : B_MSG_CURED_PROBLEM,
    });
    return runTickScript(program, handlers, state, synced, battler, BERRY_CURE_CHOSEN_STATUS_END2_LABEL);
  }
  if (holdEffect === HOLD_EFFECT_CURE_ATTRACT) {
    if ((b.status2 & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_INFATUATION) === 0) return Object.freeze({ kind: "advance", state });
    const withStatus2 = withBattler(state.rulesContext, battler, {
      status2: (b.status2 & ~BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_INFATUATION) >>> 0,
    });
    const rc = Object.freeze({ ...withStatus2, scriptingBattler: battler, multistringChooser: B_MSG_CURED_PROBLEM });
    return runTickScript(program, handlers, state, rc, battler, BERRY_CURE_CHOSEN_STATUS_END2_LABEL);
  }

  if (holdEffect === HOLD_EFFECT_RESTORE_HP && restoreHpGateFires(b)) {
    return Object.freeze({
      kind: "case-barrier", state,
      detail: "HOLD_EFFECT_RESTORE_HP (Sitrus/Oran/Berry Juice): heal-amount holdEffectParam lookup + removeitem's own end2 variant is not wired this slice (battle_util.c:3335-3345)",
    });
  }
  if (holdEffect === HOLD_EFFECT_RESTORE_PP && restorePpGateFires(b)) {
    return Object.freeze({
      kind: "case-barrier", state,
      detail: "HOLD_EFFECT_RESTORE_PP (Leppa): move-slot/PP-bonus recompute + BtlController_EmitSetMonData(REQUEST_PPMOVE1_BATTLE) is not wired this slice (battle_util.c:3347-3373)",
    });
  }
  const statUpStatId = STAT_UP_BERRIES.get(holdEffect);
  if (statUpStatId !== undefined) {
    if (b.hp > Math.floor(b.maxHP / STAT_UP_BERRY_HOLD_EFFECT_PARAM) || b.statStages[statUpStatId]! >= MAX_STAT_STAGE) {
      return Object.freeze({ kind: "advance", state });
    }
    // battle_util.c:3244-3255/3429-3442 (SET_STATCHANGER(stat, 1, FALSE) = statId | (1 << 4)) -- Cmd_statbuffchange
    // itself reads this scratch field, so the +1 stage change happens inside the script, not here (unlike Speed
    // Boost's C-side bump: BattleScript_BerryStatRaiseEnd2 is opcode-driven).
    const rc = Object.freeze({
      ...state.rulesContext,
      statChanger: statUpStatId | (1 << 4),
      animArg1: STAT_ANIM_PLUS1 + statUpStatId,
      effectBattler: battler,
    });
    return runTickScript(program, handlers, state, rc, battler, BERRY_STAT_RAISE_END2_LABEL);
  }
  const UNREACHABLE_AT_FACTORY_L50 = new Set([
    HOLD_EFFECT_CONFUSE_SPICY, HOLD_EFFECT_CONFUSE_DRY, HOLD_EFFECT_CONFUSE_SWEET,
    HOLD_EFFECT_CONFUSE_BITTER, HOLD_EFFECT_CONFUSE_SOUR,
    HOLD_EFFECT_DEFENSE_UP, HOLD_EFFECT_SP_DEFENSE_UP, HOLD_EFFECT_CRITICAL_UP, HOLD_EFFECT_RANDOM_STAT_UP,
  ]);
  if (UNREACHABLE_AT_FACTORY_L50.has(holdEffect)) {
    return Object.freeze({
      kind: "case-barrier", state,
      detail: `HOLD_EFFECT ${holdEffect}: zero Factory L50 carriers (doc §2b) -- not wired, barriered on mere `
        + "possession since its own HP-threshold gate needs an unmodeled holdEffectParam table",
    });
  }
  return Object.freeze({ kind: "advance", state });
}

/** Folds a fired/opcode-barrier `TickOutcome` into the battler loop's own result shape, uniformly across every ENDTURN_* tick. */
type TickApplyResult =
  | Readonly<{ kind: "continue"; state: MachineState }>
  | Readonly<{ kind: "opcode-barrier"; state: MachineState; instruction: BattleScriptInstruction }>
  | Readonly<{ kind: "outcome-decided"; state: MachineState }>;

function applyTickOutcome(tick: TickOutcome): TickApplyResult {
  if (tick.kind === "opcode-barrier") {
    return Object.freeze({ kind: "opcode-barrier", state: tick.state, instruction: tick.instruction });
  }
  if (tick.kind === "fired" && tick.state.rulesContext.battleOutcome !== 0) {
    // doc §1: an inline checkteamslost/tryfaintmon deciding the battle stops all further field/battler processing this turn.
    return Object.freeze({ kind: "outcome-decided", state: tick.state });
  }
  return Object.freeze({ kind: "continue", state: tick.state });
}

type BattlerLoopResult =
  | Readonly<{ kind: "clean"; state: MachineState }>
  | Readonly<{ kind: "outcome-decided"; state: MachineState }>
  | Readonly<{ kind: "opcode-barrier"; state: MachineState; instruction: BattleScriptInstruction }>
  | Readonly<{ kind: "case-barrier"; state: MachineState } & BattleEndTurnCaseBarrier>;

/**
 * `DoBattlerEndTurnEffects` (`battle_util.c:1464-1783`): per battler (turn
 * order), all 19 `ENDTURN_*` cases in real enum/execution order (INGRAIN,
 * ABILITIES, ITEMS1, LEECH_SEED, POISON, BAD_POISON, BURN, NIGHTMARES,
 * CURSE, WRAP, UPROAR, THRASH, DISABLE, ENCORE, LOCK_ON, CHARGE, TAUNT,
 * YAWN, ITEMS2 -- the C switch's own textual case ordering differs from
 * this, but `turnEffectsTracker` walks the enum's integer values, not
 * source-file position). Ingrain/Leech Seed/Wrap are now fully wired
 * (docs/ingrain-leechseed-wrap-ground-truth.md §5 slices 1-3); every other
 * reachable-but-unmodeled case gates on whatever real bit/field this engine
 * already tracks and barriers if it's ever actually set (currently never,
 * since no move/ability effect in this engine sets any of them yet) -- a
 * real, live check, not a blanket skip. Cases with no modeled trigger state
 * at all (Uproar, Encore, Charge, Yawn) are documented, permanently-inert
 * no-ops today; Lock-On is skipped per the doc's own dead-for-Factory
 * finding (B15); Abilities/Items1/Items2 are pure-C breadth explicitly out
 * of this doc's scope (B2/B3/B19).
 */
function runDoBattlerEndTurnEffects(
  program: BattleScriptProgram,
  handlers: Handlers,
  initialState: MachineState,
  battlerOrder: readonly BattleScriptBattlerId[],
): BattlerLoopResult {
  let state = initialState;
  for (const battler of battlerOrder) {
    if ((state.rulesContext.absentBattlerFlags & (1 << battler)) !== 0) continue;

    const ingrain = applyTickOutcome(runIngrainTick(program, handlers, state, battler));
    if (ingrain.kind === "opcode-barrier") {
      return Object.freeze({ kind: "opcode-barrier", state: ingrain.state, instruction: ingrain.instruction });
    }
    if (ingrain.kind === "outcome-decided") return Object.freeze({ kind: "outcome-decided", state: ingrain.state });
    state = ingrain.state;

    const abilities = runAbilitiesTick(program, handlers, state, battler);
    if (abilities.kind === "opcode-barrier") {
      return Object.freeze({ kind: "opcode-barrier", state: abilities.state, instruction: abilities.instruction });
    }
    if (abilities.kind === "case-barrier") {
      return Object.freeze({ kind: "case-barrier", state: abilities.state, caseName: "ENDTURN_ABILITIES", detail: abilities.detail });
    }
    if (abilities.kind === "fired" && abilities.state.rulesContext.battleOutcome !== 0) {
      return Object.freeze({ kind: "outcome-decided", state: abilities.state });
    }
    state = abilities.state;

    const items1 = runItemsTick(program, handlers, state, battler);
    if (items1.kind === "opcode-barrier") {
      return Object.freeze({ kind: "opcode-barrier", state: items1.state, instruction: items1.instruction });
    }
    if (items1.kind === "case-barrier") {
      return Object.freeze({ kind: "case-barrier", state: items1.state, caseName: "ENDTURN_ITEMS1", detail: items1.detail });
    }
    if (items1.kind === "fired" && items1.state.rulesContext.battleOutcome !== 0) {
      return Object.freeze({ kind: "outcome-decided", state: items1.state });
    }
    state = items1.state;

    const leechSeed = applyTickOutcome(runLeechSeedTick(program, handlers, state, battler));
    if (leechSeed.kind === "opcode-barrier") {
      return Object.freeze({ kind: "opcode-barrier", state: leechSeed.state, instruction: leechSeed.instruction });
    }
    if (leechSeed.kind === "outcome-decided") return Object.freeze({ kind: "outcome-decided", state: leechSeed.state });
    state = leechSeed.state;

    const statusDamage = applyTickOutcome(runBattlerStatusDamageTick(program, handlers, state, battler));
    if (statusDamage.kind === "opcode-barrier") {
      return Object.freeze({ kind: "opcode-barrier", state: statusDamage.state, instruction: statusDamage.instruction });
    }
    if (statusDamage.kind === "outcome-decided") return Object.freeze({ kind: "outcome-decided", state: statusDamage.state });
    state = statusDamage.state;

    const b = state.rulesContext.battlers[battler];
    if ((b.status2 & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_NIGHTMARE) !== 0) {
      return Object.freeze({ kind: "case-barrier", state, caseName: "ENDTURN_NIGHTMARES", detail: "STATUS2_NIGHTMARE set but BattleScript_NightmareTurnDmg is not wired" });
    }
    void BATTLE_SCRIPT_STATUS1_SLEEP; // real Nightmare guard also requires STATUS1_SLEEP; the NIGHTMARE bit alone already can't be set today, so this sub-guard is moot until Nightmare's own move effect exists.
    if ((b.status2 & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_CURSED) !== 0) {
      return Object.freeze({ kind: "case-barrier", state, caseName: "ENDTURN_CURSE", detail: "STATUS2_CURSED set but BattleScript_CurseTurnDmg is not wired" });
    }

    const wrap = applyTickOutcome(runWrapTick(program, handlers, state, battler));
    if (wrap.kind === "opcode-barrier") {
      return Object.freeze({ kind: "opcode-barrier", state: wrap.state, instruction: wrap.instruction });
    }
    if (wrap.kind === "outcome-decided") return Object.freeze({ kind: "outcome-decided", state: wrap.state });
    state = wrap.state;
    // ENDTURN_UPROAR: no modeled uproar timer -- permanently inert no-op today (doc B11).

    const b2 = state.rulesContext.battlers[battler];
    if ((b2.status2 & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_LOCK_CONFUSE) !== 0) {
      return Object.freeze({ kind: "case-barrier", state, caseName: "ENDTURN_THRASH", detail: "STATUS2_LOCK_CONFUSE set but BattleScript_ThrashConfuses is not wired" });
    }
    if (b2.disabledMove !== 0) {
      return Object.freeze({ kind: "case-barrier", state, caseName: "ENDTURN_DISABLE", detail: "disabledMove set but the disableTimer decrement/BattleScript_DisabledNoMore path is not wired" });
    }
    // ENDTURN_ENCORE: no modeled encoreTimer/encoredMove -- inert no-op today (doc B14).
    // ENDTURN_LOCK_ON: doc-proven dead for Factory (zero MOVE_LOCK_ON/MOVE_MIND_READER carriers, B15) -- skipped, not silently ignored.
    // ENDTURN_CHARGE: no modeled chargeTimer/STATUS3_CHARGED_UP -- inert no-op today (doc B16).
    if (b2.tauntTimer !== 0) {
      return Object.freeze({ kind: "case-barrier", state, caseName: "ENDTURN_TAUNT", detail: "tauntTimer set but its decrement/BattleScript_EncoredNoMore-sibling clear is not wired" });
    }
    // ENDTURN_YAWN: no modeled yawn counter -- inert no-op today (doc B18; also the only Random() draw in the whole end-turn phase, deferred with it).
    // ENDTURN_ITEMS2: pure-C item breadth, explicitly out of scope (doc B3/B19) -- no-op.
  }
  return Object.freeze({ kind: "clean", state });
}

type FieldCaseOutcome =
  | Readonly<{ kind: "advance"; state: MachineState }>
  | Readonly<{ kind: "fired"; state: MachineState }>
  | Readonly<{ kind: "opcode-barrier"; state: MachineState; instruction: BattleScriptInstruction }>;

function withSideTimersPatch(
  rulesContext: BattleScriptRulesContext,
  side: 0 | 1,
  changes: Partial<BattleScriptSideTimerState>,
): BattleScriptRulesContext {
  const sideTimers = [...rulesContext.sideTimers] as [BattleScriptSideTimerState, BattleScriptSideTimerState];
  sideTimers[side] = Object.freeze({ ...sideTimers[side], ...changes });
  return Object.freeze({
    ...rulesContext,
    sideTimers: Object.freeze(sideTimers) as readonly [BattleScriptSideTimerState, BattleScriptSideTimerState],
  });
}

function withSideStatusClear(rulesContext: BattleScriptRulesContext, side: 0 | 1, bit: number): BattleScriptRulesContext {
  const sideStatuses = [...rulesContext.sideStatuses] as [number, number];
  sideStatuses[side] = (sideStatuses[side] & ~bit) >>> 0;
  return Object.freeze({
    ...rulesContext,
    sideStatuses: Object.freeze(sideStatuses) as readonly [number, number],
  });
}

/**
 * F2/F3/F5 (`ENDTURN_REFLECT`/`LIGHT_SCREEN`/`SAFEGUARD`, `battle_util.c:
 * 1221-1318`, docs/screens-weather-ground-truth.md §3a): structurally
 * identical shape. The timer decrements every tick while the bit is set;
 * `BattleScript_SideStatusWoreOff`/`SafeguardEnds` only fire on the ONE tick
 * the timer reaches 0 (doc §3d/§3f's live ledgers -- ticks 1-4 are silent
 * state-only decrements, no script, no message).
 */
function runScreenFieldCase(
  program: BattleScriptProgram,
  handlers: Handlers,
  state: MachineState,
  side: 0 | 1,
  bit: number,
  readTimer: (timers: BattleScriptSideTimerState) => number,
  patchDecrement: (nextTimer: number) => Partial<BattleScriptSideTimerState>,
  battlerIdOf: (timers: BattleScriptSideTimerState) => BattleScriptBattlerId,
  expiryLabel: string,
): FieldCaseOutcome {
  const rc = state.rulesContext;
  if ((rc.sideStatuses[side] & bit) === 0) return Object.freeze({ kind: "advance", state });
  const timers = rc.sideTimers[side];
  const nextTimer = readTimer(timers) - 1;
  const decremented = withSideTimersPatch(rc, side, patchDecrement(nextTimer));
  if (nextTimer !== 0) {
    return Object.freeze({ kind: "advance", state: Object.freeze({ ...state, rulesContext: decremented }) });
  }
  const cleared = withSideStatusClear(decremented, side, bit);
  const battler = battlerIdOf(timers);
  const run = runTickScript(program, handlers, state, cleared, battler, expiryLabel);
  if (run.kind === "opcode-barrier") return run;
  return Object.freeze({ kind: "fired", state: run.state });
}

/**
 * F4 (`ENDTURN_MIST`, `battle_util.c:1272-1294`) -- the one screen case
 * whose fail-check (and end-turn guard) is the raw `mistTimer` value, not a
 * `SIDE_STATUS_MIST` bit check, per its setter's own different shape
 * (doc §2/§3a). Doc-proven zero real Frontier `MOVE_MIST` carriers (F4 row)
 * -- wired anyway since it shares the screens' cheap shape and the field
 * already exists.
 */
function runMistFieldCase(
  program: BattleScriptProgram,
  handlers: Handlers,
  state: MachineState,
  side: 0 | 1,
): FieldCaseOutcome {
  const rc = state.rulesContext;
  if (rc.mistTimers[side] === 0) return Object.freeze({ kind: "advance", state });
  const nextTimer = rc.mistTimers[side] - 1;
  const mistTimers = [...rc.mistTimers] as [number, number];
  mistTimers[side] = nextTimer;
  const decremented = Object.freeze({ ...rc, mistTimers: Object.freeze(mistTimers) as readonly [number, number] });
  if (nextTimer !== 0) {
    return Object.freeze({ kind: "advance", state: Object.freeze({ ...state, rulesContext: decremented }) });
  }
  const cleared = withSideStatusClear(decremented, side, SIDE_STATUS_MIST);
  const battler = rc.sideTimers[side].mistBattlerId;
  const run = runTickScript(program, handlers, state, cleared, battler, SIDE_STATUS_WORE_OFF_LABEL);
  if (run.kind === "opcode-barrier") return run;
  return Object.freeze({ kind: "fired", state: run.state });
}

/** battle_message.c:918-922 -- shared by gSandStormHailContinuesStringIds/DmgStringIds/EndStringIds. */
const B_MSG_SANDSTORM = 0;
const B_MSG_HAIL = 1;
/** include/constants/battle_animation.h. */
const B_ANIM_SANDSTORM_CONTINUES = 3;
const B_ANIM_HAIL_CONTINUES = 5;

/**
 * F7 (`ENDTURN_RAIN`, `battle_util.c:1340-1373`). No `weatherdamage` loop
 * (Rain deals no passive damage) -- just the shared decrement/chooser/
 * playanimation shape `docs/screens-weather-ground-truth.md` §1c/§5 already
 * confirmed adds zero new opcodes beyond the setter + this widened
 * PLAYANIMATION. `B_WEATHER_RAIN_PERMANENT` (Drizzle, KYOGRE-only) is not
 * checked here -- unreachable given this engine's setter only ever writes
 * the `_TEMPORARY` bit (docs/screens-weather-ground-truth.md §2), same
 * scope limit `runDamagingWeatherFieldCase` below already accepts for
 * Sandstorm's own PERMANENT bit (Tyranitar's Sand Stream switch-in trigger
 * is unwired).
 */
function runRainFieldCase(
  program: BattleScriptProgram,
  handlers: Handlers,
  state: MachineState,
): FieldCaseOutcome {
  const rc = state.rulesContext;
  const nextTimer = rc.weatherTimer - 1;
  const battler = rc.selectorRoles.attacker ?? 0;
  if (nextTimer === 0) {
    const ended = Object.freeze({ ...rc, weather: 0, weatherTimer: 0, multistringChooser: B_MSG_RAIN_STOPPED });
    const run = runTickScript(program, handlers, state, ended, battler, RAIN_CONTINUES_OR_ENDS_LABEL);
    if (run.kind === "opcode-barrier") return run;
    return Object.freeze({ kind: "fired", state: run.state });
  }
  const continuing = Object.freeze({ ...rc, weatherTimer: nextTimer, multistringChooser: B_MSG_RAIN_CONTINUES });
  const run = runTickScript(program, handlers, state, continuing, battler, RAIN_CONTINUES_OR_ENDS_LABEL);
  if (run.kind === "opcode-barrier") return run;
  return Object.freeze({ kind: "fired", state: run.state });
}

/**
 * F9 (`ENDTURN_SUN`, `battle_util.c:1394-1411`). Unlike Rain, the C case
 * picks between two entirely separate labels (`SunlightContinues`/
 * `SunlightFaded`) rather than one shared label branching on a chooser byte
 * -- neither script reads `cMULTISTRING_CHOOSER` at all (each is a single
 * fixed `printstring`). `B_WEATHER_SUN_PERMANENT` (Drought, GROUDON-only) is
 * out of scope for the same reason as Rain's PERMANENT bit above.
 */
function runSunFieldCase(
  program: BattleScriptProgram,
  handlers: Handlers,
  state: MachineState,
): FieldCaseOutcome {
  const rc = state.rulesContext;
  const nextTimer = rc.weatherTimer - 1;
  const battler = rc.selectorRoles.attacker ?? 0;
  if (nextTimer === 0) {
    const ended = Object.freeze({ ...rc, weather: 0, weatherTimer: 0 });
    const run = runTickScript(program, handlers, state, ended, battler, SUNLIGHT_FADED_LABEL);
    if (run.kind === "opcode-barrier") return run;
    return Object.freeze({ kind: "fired", state: run.state });
  }
  const continuing = Object.freeze({ ...rc, weatherTimer: nextTimer });
  const run = runTickScript(program, handlers, state, continuing, battler, SUNLIGHT_CONTINUES_LABEL);
  if (run.kind === "opcode-barrier") return run;
  return Object.freeze({ kind: "fired", state: run.state });
}

/**
 * F8/F10 (`ENDTURN_SANDSTORM`/`HAIL`, `battle_util.c:1372-1420`,
 * docs/screens-weather-ground-truth.md §1c/§3b/§3e's live-verified ledger).
 * `gBattleScripting.animArg1`/`gBattleCommunication[MULTISTRING_CHOOSER]`
 * are stamped (`B_ANIM_*_CONTINUES`/`B_MSG_SANDSTORM`|`HAIL`) before EITHER
 * branch executes -- both `DamagingWeatherContinues` and `SandStormHailEnds`
 * read the same chooser value. `weatherHasEffect`, both weather bits, and
 * the six-opcode per-battler damage loop live entirely in the already-
 * registered `battleScriptDamagingWeatherOpcode.ts` handlers; this only
 * hosts the C-side decrement/branch choice.
 */
function runDamagingWeatherFieldCase(
  program: BattleScriptProgram,
  handlers: Handlers,
  state: MachineState,
  animArg1: number,
  chooser: number,
): FieldCaseOutcome {
  const rc = state.rulesContext;
  const nextTimer = rc.weatherTimer - 1;
  if (nextTimer === 0) {
    const ended = Object.freeze({ ...rc, weather: 0, weatherTimer: 0, multistringChooser: chooser });
    const run = runTickScript(program, handlers, state, ended, rc.selectorRoles.attacker ?? 0, SANDSTORM_HAIL_ENDS_LABEL);
    if (run.kind === "opcode-barrier") return run;
    return Object.freeze({ kind: "fired", state: run.state });
  }
  const continuing = Object.freeze({
    ...rc,
    weatherTimer: nextTimer,
    animArg1,
    multistringChooser: chooser,
  });
  const run = runTickScript(program, handlers, state, continuing, rc.selectorRoles.attacker ?? 0, DAMAGING_WEATHER_CONTINUES_LABEL);
  if (run.kind === "opcode-barrier") return run;
  return Object.freeze({ kind: "fired", state: run.state });
}

/**
 * `DoFieldEndTurnEffects`'s 9 non-ENDTURN_ORDER cases (`battle_util.c:1181
 * -1438`). REFLECT/LIGHT_SCREEN/MIST/SAFEGUARD (F2-F5), RAIN/SUN (F7/F9),
 * and SANDSTORM/HAIL (F8/F10) are all fully wired
 * (docs/screens-weather-ground-truth.md §6 slices 1-3/4/5) -- RAIN/SUN's own
 * `playanimation BS_ATTACKER, B_ANIM_RAIN_CONTINUES`/`B_ANIM_SUN_CONTINUES`
 * calls are now covered by `battleScriptStatbuffchangeOpcode.ts`'s widened
 * PLAYANIMATION handler. `ENDTURN_WISH` has no modeled trigger state at all
 * (no `wishCounter` field) and is an explicit, documented no-op (this step's
 * brief names Wish as an allowed deferral alongside Uproar/Leech Seed).
 */
function runDoFieldEndTurnEffects(
  program: BattleScriptProgram,
  handlers: Handlers,
  initialState: MachineState,
): BattlerLoopResult {
  let state = initialState;
  for (const side of [0, 1] as const) {
    const reflect = runScreenFieldCase(
      program, handlers, state, side, SIDE_STATUS_REFLECT,
      (t) => t.reflectTimer, (nextTimer) => ({ reflectTimer: nextTimer }),
      (t) => t.reflectBattlerId, SIDE_STATUS_WORE_OFF_LABEL,
    );
    if (reflect.kind === "opcode-barrier") return Object.freeze({ kind: "opcode-barrier", state: reflect.state, instruction: reflect.instruction });
    state = reflect.state;
    if (reflect.kind === "fired" && state.rulesContext.battleOutcome !== 0) return Object.freeze({ kind: "outcome-decided", state });

    const lightscreen = runScreenFieldCase(
      program, handlers, state, side, SIDE_STATUS_LIGHTSCREEN,
      (t) => t.lightscreenTimer, (nextTimer) => ({ lightscreenTimer: nextTimer }),
      (t) => t.lightscreenBattlerId, SIDE_STATUS_WORE_OFF_LABEL,
    );
    if (lightscreen.kind === "opcode-barrier") return Object.freeze({ kind: "opcode-barrier", state: lightscreen.state, instruction: lightscreen.instruction });
    state = lightscreen.state;
    if (lightscreen.kind === "fired" && state.rulesContext.battleOutcome !== 0) return Object.freeze({ kind: "outcome-decided", state });

    const mist = runMistFieldCase(program, handlers, state, side);
    if (mist.kind === "opcode-barrier") return Object.freeze({ kind: "opcode-barrier", state: mist.state, instruction: mist.instruction });
    state = mist.state;
    if (mist.kind === "fired" && state.rulesContext.battleOutcome !== 0) return Object.freeze({ kind: "outcome-decided", state });

    const safeguard = runScreenFieldCase(
      program, handlers, state, side, SIDE_STATUS_SAFEGUARD,
      (t) => t.safeguardTimer, (nextTimer) => ({ safeguardTimer: nextTimer }),
      (t) => t.safeguardBattlerId, SAFEGUARD_ENDS_LABEL,
    );
    if (safeguard.kind === "opcode-barrier") return Object.freeze({ kind: "opcode-barrier", state: safeguard.state, instruction: safeguard.instruction });
    state = safeguard.state;
    if (safeguard.kind === "fired" && state.rulesContext.battleOutcome !== 0) return Object.freeze({ kind: "outcome-decided", state });
    // ENDTURN_WISH: no modeled wishCounter field -- explicit deferred no-op (this step's brief).
  }

  const rc = state.rulesContext;
  if ((rc.weather & B_WEATHER_RAIN) !== 0) {
    const result = runRainFieldCase(program, handlers, state);
    if (result.kind === "opcode-barrier") return Object.freeze({ kind: "opcode-barrier", state: result.state, instruction: result.instruction });
    state = result.state;
    if (result.kind === "fired" && state.rulesContext.battleOutcome !== 0) return Object.freeze({ kind: "outcome-decided", state });
  } else if ((rc.weather & B_WEATHER_SANDSTORM) !== 0) {
    const result = runDamagingWeatherFieldCase(program, handlers, state, B_ANIM_SANDSTORM_CONTINUES, B_MSG_SANDSTORM);
    if (result.kind === "opcode-barrier") return Object.freeze({ kind: "opcode-barrier", state: result.state, instruction: result.instruction });
    state = result.state;
    if (result.kind === "fired" && state.rulesContext.battleOutcome !== 0) return Object.freeze({ kind: "outcome-decided", state });
  } else if ((rc.weather & B_WEATHER_SUN) !== 0) {
    const result = runSunFieldCase(program, handlers, state);
    if (result.kind === "opcode-barrier") return Object.freeze({ kind: "opcode-barrier", state: result.state, instruction: result.instruction });
    state = result.state;
    if (result.kind === "fired" && state.rulesContext.battleOutcome !== 0) return Object.freeze({ kind: "outcome-decided", state });
  } else if ((rc.weather & B_WEATHER_HAIL) !== 0) {
    const result = runDamagingWeatherFieldCase(program, handlers, state, B_ANIM_HAIL_CONTINUES, B_MSG_HAIL);
    if (result.kind === "opcode-barrier") return Object.freeze({ kind: "opcode-barrier", state: result.state, instruction: result.instruction });
    state = result.state;
    if (result.kind === "fired" && state.rulesContext.battleOutcome !== 0) return Object.freeze({ kind: "outcome-decided", state });
  }

  return Object.freeze({ kind: "clean", state });
}

/**
 * `ENDTURN_ORDER`'s `gBattlerByTurnOrder` recompute, narrowed to what this
 * engine can actually determine: `gBattleMons[].speed` has no home anywhere
 * in `BattleScriptRulesContext` (a wholly separate subsystem from
 * `turnOrder.ts`'s own speed model), so relative tick order between two
 * battlers that BOTH have a live end-turn condition is not resolvable here
 * yet -- this defaults to ascending battler id, documented, not silently
 * guessed. Both this doc's own live scenarios (§2a/§2b) and this rung's
 * integration proofs only ever give ONE battler a live end-turn condition,
 * so this simplification is not exercised by anything this rung asserts.
 */
function computeBattlerOrder(rulesContext: BattleScriptRulesContext): readonly BattleScriptBattlerId[] {
  const count = rulesContext.battleTopology.battlersCount;
  const order: BattleScriptBattlerId[] = [];
  for (let i = 0; i < count; i += 1) order.push(i as BattleScriptBattlerId);
  return Object.freeze(order);
}

function mapFaintedActionsResult(result: BattleScriptFaintedActionsResult): BattleEndTurnResult {
  if (result.kind === "no-fainted-battlers") return Object.freeze({ kind: "next-turn", state: result.state });
  if (result.kind === "terminal") return Object.freeze({ kind: "terminal", state: result.state });
  if (result.kind === "resumed") return Object.freeze({ kind: "resumed", state: result.state });
  if (result.kind === "player-choice-required") {
    return Object.freeze({
      kind: "player-choice-required",
      state: result.state,
      battler: result.battler,
      faintedPartyIndex: result.faintedPartyIndex,
      legalPartyIndexes: result.legalPartyIndexes,
    });
  }
  return Object.freeze({ kind: "non-terminal-barrier", state: result.state, instruction: result.instruction });
}

/**
 * The C-side `BattleTurnPassed` loop equivalent. Call once both of a turn's
 * actions have finished (their own move scripts, and any mid-turn faints'
 * own `HandleFaintedMonActions`, already resolved to a real continuation
 * point) and before the next turn's decision boundary is computed.
 *
 * `TurnValuesCleanUp(TRUE)`'s only effect this engine can represent is
 * clearing each battler's `flinchImmobility` (`STATUS2_FLINCHED`);
 * `TurnValuesCleanUp(FALSE)`'s ProtectStruct-wide reset and
 * `HandleWishPerishSongOnTurnEnd` (no modeled Perish Song/Future Sight
 * state) are both out of this rung's modeled scope and are not applied --
 * callers that need a fresh `ProtectStruct` for the next turn must not rely
 * on this function for that yet.
 */
export function runBattleEndTurnOrchestration(
  program: BattleScriptProgram,
  handlers: Handlers,
  initialState: MachineState,
): BattleEndTurnResult {
  let state = initialState;
  for (let i = 0; i < state.rulesContext.battleTopology.battlersCount; i += 1) {
    const battler = i as BattleScriptBattlerId;
    if (state.rulesContext.battlers[battler].flinchImmobility !== 0) {
      state = Object.freeze({ ...state, rulesContext: withBattler(state.rulesContext, battler, { flinchImmobility: 0 }) });
    }
  }

  if (state.rulesContext.battleOutcome === 0) {
    const battlerOrder = computeBattlerOrder(state.rulesContext);
    // ENDTURN_ORDER (doc §1a): gBattlerByTurnOrder is (re)computed once for the whole end-turn pass, ahead of both the field and battler loops -- Cmd_copyarraywithindex's own read (BattleScript_DamagingWeatherLoop) is this field's only consumer.
    state = Object.freeze({
      ...state,
      rulesContext: Object.freeze({
        ...state.rulesContext,
        battlerByTurnOrder: Object.freeze([0, 1, 2, 3].map((i) => battlerOrder[i] ?? i)) as unknown as readonly [number, number, number, number],
      }),
    });

    const fieldResult = runDoFieldEndTurnEffects(program, handlers, state);
    if (fieldResult.kind === "opcode-barrier") {
      return Object.freeze({ kind: "non-terminal-barrier", state: fieldResult.state, instruction: fieldResult.instruction });
    }
    if (fieldResult.kind === "case-barrier") {
      return Object.freeze({ kind: "case-barrier", state: fieldResult.state, caseName: fieldResult.caseName, detail: fieldResult.detail });
    }
    if (fieldResult.kind === "outcome-decided") {
      const faintedResult = runBattleScriptFaintedActionsOrchestration(program, handlers, fieldResult.state);
      return mapFaintedActionsResult(faintedResult);
    }
    state = fieldResult.state;

    const battlerResult = runDoBattlerEndTurnEffects(program, handlers, state, battlerOrder);
    if (battlerResult.kind === "opcode-barrier") {
      return Object.freeze({ kind: "non-terminal-barrier", state: battlerResult.state, instruction: battlerResult.instruction });
    }
    if (battlerResult.kind === "case-barrier") {
      return Object.freeze({ kind: "case-barrier", state: battlerResult.state, caseName: battlerResult.caseName, detail: battlerResult.detail });
    }
    state = battlerResult.state;
  }

  // HandleFaintedMonActions() always runs, gBattleOutcome gate or not (doc §1) -- reuse the already-landed orchestration verbatim.
  const faintedResult = runBattleScriptFaintedActionsOrchestration(program, handlers, state);
  return mapFaintedActionsResult(faintedResult);
  // HandleWishPerishSongOnTurnEnd: no modeled Wish/Perish Song/Future Sight state -- explicit deferred no-op (this step's brief).
}
