/**
 * Per-battler sprite x2 history for live move bodies (ISSUES #148, docs/x2-history-148.md; presentation-only: reads
 * battle events, never writes rules, RNG, damage, turn order or facility state, and is not a parity input).
 *
 * The ROM leaves a battler's OBJ x2/y2 at its species front-idle rest after a send-in (opponent ONIX 1, RATTATA 1,
 * every other species and every player back sprite 0) until a body runs an ABSOLUTE-reset task on it (ShakeMon,
 * ShakeMon2, ShakeAndSinkMon, TranslateMonElliptical, SlideMonToOriginalPos, SlideMonToOffsetAndBack, SwayMon,
 * ShakeTargetBasedOnMovePowerOrDmg each end `x2 = 0; y2 = 0`, battle_anim_mon_movement.c); relative tasks
 * (ShakeMonInPlace) return to the start value. Per side: `idle` (the species rest), `zeroed` ({0,0}) or `unknown`
 * (no information: consumers keep the species rest, the pre-#148 behaviour).
 *
 * Events (fed by factoryRoundBattleOrchestrator.ts from the same semantic events as liveSpriteOrderHost.ts):
 *   battle start; switch-in-animation (first send-out, replacement, voluntary / forced switch)  side := idle
 *   MOVE_ANIMATION (moveId, attacker side, turn): attacker role and target role (the opposing battler) by
 *     LIVE_BATTLER_X2_MOVE_TABLE (measured): zeroed -> zeroed; unchanged/transient -> keep;
 *     mixed (target: Razor Wind 13, Return 216, Dive 291; move 0 = non-move bodies) -> unknown;
 *     source-derived (LIVE_BATTLER_X2_SOURCE_ZEROED, scf117: status moves ending in an absolute reset) -> zeroed;
 *     not measured (rest0 / absent): attacker keep; target zeroed when the move deals damage (power > 0: every hit
 *     shakes its target) except a two-turn move's charge turn (keep), otherwise keep            (§0.6 fallback)
 *   HIT_ANIMATION, STATS_CHANGE, weather-continues animations                                  keep (blink / measured)
 *   B_ANIM_STATUS_* on a battler (sar131, LIVE_BATTLER_X2_STATUS_ANIMATION, source-derived)    zeroed / keep
 *   any other general animation on a battler                                                   that side := unknown
 *   SUBSTITUTE_FADE (General_SubstituteFade's trailing swap task ends at x2 0)                 that side := zeroed
 *   faint-animation                                                                            keep (send-in resets)
 *   party-menu return, unapplied events, battle advanced without a presented resolution        both := unknown
 */
import type { BattleKernelSemanticEvent } from "./battleDecisionBoundary.ts";
import { battleMoveAnimationRequest } from "./battleMoveAnimation.ts";
import movesData from "../data/gen/moves.json" with { type: "json" };
import { spriteOrderStatusAnimationName } from "./spriteOrderEventTransform.ts";
import { LIVE_MOVE_TIMING_USE_KEYED_IDS } from "./liveMoveTimingPolicy.ts";

export type LiveBattlerX2State = "idle" | "zeroed" | "unknown";
export type LiveBattlerX2Side = "player" | "opponent";
export type LiveBattlerX2History = Readonly<Record<LiveBattlerX2Side, LiveBattlerX2State>>;
/** Body input: the sides whose battler x2/y2 an earlier body left at 0 (absent = species front-idle rest). */
export type LiveMoveBattlerX2Input = Readonly<{
  zeroed: readonly LiveBattlerX2Side[];
  /** Endeavor (283) bodies only: the stale gBattleMovePower may have been written by the unported Battle TV loop (W3). */
  staleMovePowerUnknown?: true;
  /**
   * tmr136: use-keyed D4 timing moves only (liveMoveTimingPolicy.ts LIVE_MOVE_TIMING_USE_KEYED_IDS, Smokescreen 108): this body's ordinal
   * among the battle's bodies of the same move (1 = the battle's first), counted by the host from the battle's own MOVE_ANIMATION events.
   * Absent = unknown history (events unseen): the use-keyed policy falls back to the status quo.
   */
  moveUse?: number;
}>;

export type LiveBattlerX2Event =
  | Readonly<{ kind: "send-in"; side: LiveBattlerX2Side }>
  | Readonly<{ kind: "move-body"; moveId: number; attackerSide: LiveBattlerX2Side; turn?: number }>
  /** General_SubstituteFade: its trailing AnimTask_SwapMonSpriteToFromSubstitute ends at x2 0 (measured RATTATA, rest +1). */
  | Readonly<{ kind: "substitute-fade"; side: LiveBattlerX2Side }>
  /** sar131: a B_ANIM_STATUS_* script on the battler of `side` (LaunchStatusAnimation: attacker = target = the battler). */
  | Readonly<{ kind: "status-animation"; side: LiveBattlerX2Side; animation: string | null }>
  /**
   * fpp150: General_FocusPunchSetUp (B_ANIM_FOCUS_PUNCH_SETUP): AnimTask_ShakeMon2 writes the attacker's x2 absolutely and
   * ends at 0 (fps147 §1c, 7 / 7 windows); the other battler is untouched.
   */
  | Readonly<{ kind: "general-animation"; side: LiveBattlerX2Side }>
  | Readonly<{ kind: "unknown"; side: LiveBattlerX2Side | "both"; reason: string }>;

/**
 * Measured end-state classes by move id and role (tools/integration/fixtures/x2-history/move-end-state-x2-onix-pairs.json;
 * rows the pair run left rest0/absent filled from the target census move-end-state-x2.json). `keep` = unchanged or
 * transient (back at the start value at end+1).
 * aud118: Struggle 165's target is `keep` from source (Move_STRUGGLE shakes it only with the relative AnimTask_ShakeMonInPlace).
 */
export const LIVE_BATTLER_X2_MOVE_TABLE = Object.freeze({
  attacker: Object.freeze({
    zeroed: Object.freeze([
      20, 27, 34, 35, 36, 38, 48, 65, 67, 89, 93, 94, 116, 131, 136, 164, 172, 175, 200, 203, 211, 213, 218, 222, 280,
      282, 319, 321, 327, 341]),
    keep: Object.freeze([
      2, 3, 5, 24, 25, 29, 33, 37, 40, 42, 43, 51, 55, 61, 69, 72, 73, 74, 78, 79, 88, 90, 92, 95, 101, 107, 108, 109,
      111, 113, 114, 115, 118, 123, 124, 126, 133, 146, 147, 150, 151, 152, 157, 162, 163, 178, 182, 188, 193, 194,
      195, 197, 201, 202, 212, 216, 219, 225, 227, 231, 232, 238, 242, 247, 248, 250, 257, 258, 259, 260, 262, 263,
      266, 272, 273, 277, 288, 295, 302, 305, 306, 310, 312, 328, 330, 335, 342, 345, 348, 349, 352]),
    mixed: Object.freeze([0]),
  }),
  target: Object.freeze({
    zeroed: Object.freeze([
      2, 3, 4, 5, 11, 12, 18, 21, 23, 24, 25, 27, 29, 33, 34, 36, 38, 40, 42, 43, 46, 49, 51, 55, 56, 60, 61, 62, 63,
      65, 68, 69, 71, 72, 80, 83, 88, 89, 90, 94, 101, 103, 116, 122, 123, 124, 126, 129, 131, 136, 138, 146, 152,
      154, 157, 163, 164, 167, 172, 175, 188, 200, 202, 203, 205, 218, 222, 224, 227, 229, 231, 238, 242, 246, 247,
      250, 257, 265, 276, 284, 290, 295, 302, 305, 306, 309, 310, 317, 327, 328, 332, 341, 342, 345, 348, 352]),
    keep: Object.freeze([
      32, 35, 37, 39, 47, 48, 50, 59, 67, 73, 74, 78, 79, 92, 95, 107, 108, 109, 111, 113, 114, 115, 118, 133, 142,
      147, 148, 149, 150, 151, 165, 169, 178, 180, 182, 186, 190, 191, 193, 194, 195, 196, 197, 201, 211, 212, 213, 219,
      230, 232, 237, 253, 258, 259, 260, 262, 263, 266, 272, 273, 277, 280, 288, 312, 318, 319, 320, 321, 330, 335,
      337, 349]),
    mixed: Object.freeze([0, 13, 216, 291]),
  }),
});

/**
 * scf117 (ISSUES #166, docs/scf117-stats-change-finish.md): source-derived rows for unmeasured status moves (power 0, where the
 * fallback keeps both roles) whose script's last write to that battler's x2 / y2 is an absolute reset (battle_anim_scripts.s;
 * every task below ends `x2 = 0; y2 = 0`). Target: Growl 45 (AnimTask_ShakeMon2 ANIM_TARGET last; ROM: the stat101 Growl receipt
 * has the opponent ONIX, rest +1, at x2 0 by the stats change), Will-O-Wisp 261 (ShakeMon2, then fire sprites only), Trick 271
 * (StretchTargetUp, then ShakeMon). Attacker: Screech 103 (ShakeMon2, then rings and SwayMon on the target), Soft-Boiled 135
 * (ShakeMon, then egg / ring / star sprites), Belly Drum 187 (BellyDrumLeft's ShakeMon, then a note sprite and the blend clear),
 * Trick 271 (StretchAttackerUp, then ShakeMon).
 */
export const LIVE_BATTLER_X2_SOURCE_ZEROED = Object.freeze({
  attacker: Object.freeze([103, 135, 187, 271]),
  target: Object.freeze([45, 261, 271]),
});

/**
 * sar131 (S10A, ISSUES #168 slice SA4, docs/sar131-status-animation-render.md): the battler's x2 / y2 after each B_ANIM_STATUS_*
 * script (battle_anim_scripts.s; LaunchStatusAnimation, battle_anim_status_effects.c:543, sets attacker = target = the battler):
 *   zeroed  Status_Poison (10224) / Status_Paralysis (10268): AnimTask_ShakeMon2 ANIM_ATTACKER; Status_Curse (10285) /
 *           Status_Nightmare: AnimTask_ShakeMon2 ANIM_TARGET. AnimTask_ShakeMon2_Step's last toggle writes `x2 = 0; y2 = 0`
 *           (battle_anim_mon_movement.c:231-232), an absolute reset.
 *   keep    Status_Burn (10235: gBurnFlameSpriteTemplate only), Status_Sleep (gSleepLetterZSpriteTemplate only), Status_Infatuation
 *           (gMagentaHeartSpriteTemplate only), Status_Confusion (ConfusionEffect: create_confusion_duck_sprite only): sprite-only
 *           scripts never write the battler sprite's x2 / y2. Status_Freeze (10274): monbg / clearmonbg read x2 (MoveBattlerSpriteToBG,
 *           battle_anim.c:698 / 702) and toggle visibility (Task_ClearMonBg), AnimTask_FrozenIceCube (battle_anim_status_effects.c:381)
 *           and its steps write no battler x2 / y2.
 * Anything else (WRAPPED has no table entry; an unknown name) makes that side unknown.
 */
export const LIVE_BATTLER_X2_STATUS_ANIMATION: Readonly<Record<string, "zeroed" | "keep">> = Object.freeze({
  PSN: "zeroed", PRZ: "zeroed", CURSED: "zeroed", NIGHTMARE: "zeroed",
  BRN: "keep", SLP: "keep", INFATUATION: "keep", CONFUSION: "keep", FRZ: "keep",
});

export type LiveBattlerX2RoleClass = "zeroed" | "keep" | "unknown";
const roleSets = (role: "attacker" | "target") => ({
  zeroed: new Set<number>(LIVE_BATTLER_X2_MOVE_TABLE[role].zeroed),
  keep: new Set<number>(LIVE_BATTLER_X2_MOVE_TABLE[role].keep),
  mixed: new Set<number>(LIVE_BATTLER_X2_MOVE_TABLE[role].mixed),
  sourceZeroed: new Set<number>(LIVE_BATTLER_X2_SOURCE_ZEROED[role]),
});
const ROLE_SETS = { attacker: roleSets("attacker"), target: roleSets("target") };
const MOVE_ROWS = new Map(movesData.moves.map((row) => [row.id, row] as const));
const TWO_TURN_EFFECTS: ReadonlySet<string> = new Set([
  "EFFECT_RAZOR_WIND", "EFFECT_SOLAR_BEAM", "EFFECT_SKY_ATTACK", "EFFECT_SKULL_BASH", "EFFECT_SEMI_INVULNERABLE",
]);
/** Animations that leave both battlers' x2 alone (hit blink: visibility only; stat / weather bodies measured unchanged). */
const KEEP_ANIMATIONS: ReadonlySet<string> = new Set([
  "HIT_ANIMATION", "STATS_CHANGE", "RAIN_CONTINUES", "SUN_CONTINUES", "SANDSTORM_CONTINUES", "HAIL_CONTINUES",
]);

/** End-of-body class of `role` for move `moveId` (measured table, then the documented fallback). */
export function liveBattlerX2MoveRoleClass(moveId: number, role: "attacker" | "target", turn = 1): LiveBattlerX2RoleClass {
  const sets = ROLE_SETS[role];
  if (sets.zeroed.has(moveId)) return "zeroed";
  if (sets.keep.has(moveId)) return "keep";
  if (sets.mixed.has(moveId)) return "unknown";
  if (sets.sourceZeroed.has(moveId)) return "zeroed";
  if (role === "attacker") return "keep";
  const row = MOVE_ROWS.get(moveId);
  if (row === undefined) return "unknown";
  if (row.power <= 0) return "keep";
  return TWO_TURN_EFFECTS.has(row.effect) && (turn & 1) === 0 ? "keep" : "zeroed";
}

export const LIVE_BATTLER_X2_IDLE: LiveBattlerX2History = Object.freeze({ player: "idle", opponent: "idle" });

const other = (side: LiveBattlerX2Side): LiveBattlerX2Side => side === "player" ? "opponent" : "player";
const roleNext = (state: LiveBattlerX2State, cls: LiveBattlerX2RoleClass): LiveBattlerX2State =>
  cls === "zeroed" ? "zeroed" : cls === "unknown" ? "unknown" : state;

export function applyLiveBattlerX2Event(history: LiveBattlerX2History, event: LiveBattlerX2Event): LiveBattlerX2History {
  let next: Record<LiveBattlerX2Side, LiveBattlerX2State>;
  switch (event.kind) {
    case "send-in":
      next = { ...history, [event.side]: "idle" };
      break;
    case "move-body": {
      // MOVE_SUBSTITUTE animates its attacker as gBattleAnimTarget (self-target): the table's target row was measured on the
      // attacker; the other battler keeps its x2 (subst-swap-live-receipt.json: opponent ONIX at +1 through rows 157..1520).
      const targetSide = event.moveId === 164 ? event.attackerSide : other(event.attackerSide);
      next = {
        ...history,
        [event.attackerSide]: roleNext(history[event.attackerSide],
          liveBattlerX2MoveRoleClass(event.moveId, "attacker", event.turn)),
        [targetSide]: roleNext(history[targetSide], liveBattlerX2MoveRoleClass(event.moveId, "target", event.turn)),
      };
      break;
    }
    case "substitute-fade":
    case "general-animation":
      next = { ...history, [event.side]: "zeroed" };
      break;
    case "status-animation": {
      const cls = event.animation === null ? undefined : LIVE_BATTLER_X2_STATUS_ANIMATION[event.animation];
      next = { ...history, [event.side]: cls === "zeroed" ? "zeroed" : cls === "keep" ? history[event.side] : "unknown" };
      break;
    }
    case "unknown":
      next = event.side === "both" ? { player: "unknown", opponent: "unknown" } : { ...history, [event.side]: "unknown" };
      break;
  }
  return next.player === history.player && next.opponent === history.opponent ? history : Object.freeze(next);
}

/** The tracked input a move body reads at its activation edge (sides left at 0 by an earlier body; none = undefined). */
/**
 * sub157 (ISSUES #153): Battle Scene OFF has no x2 history host. BattleAnimateFrontSprite (pokemon.c:6805) skips every front
 * animation under HITMARKER_NO_ANIMATIONS, so no battler ever stands at a species front idle rest: the bodies source still plays
 * in Scene OFF (Cmd_attackanimation's Transform / Substitute exemption, General_SubstituteFade) read both sides at {0,0}.
 */
export const LIVE_BATTLER_X2_SCENE_OFF_INPUT: LiveMoveBattlerX2Input = Object.freeze({ zeroed: Object.freeze(["player", "opponent"] as const) });

export function liveMoveBattlerX2Input(history: LiveBattlerX2History): LiveMoveBattlerX2Input | undefined {
  const zeroed = (["player", "opponent"] as const).filter((side) => history[side] === "zeroed");
  return zeroed.length === 0 ? undefined : Object.freeze({ zeroed: Object.freeze(zeroed) });
}

const ZERO_REST = Object.freeze({ x2: 0, y2: 0 });
/** Front idle rest after the tracked history: {0,0} on a zeroed side, else the species rest (same object). */
export function liveTrackedFrontIdleRest(
  side: LiveBattlerX2Side, speciesRest: Readonly<{ x2: number; y2: number }>, input?: LiveMoveBattlerX2Input,
): Readonly<{ x2: number; y2: number }> {
  return input?.zeroed.includes(side) && (speciesRest.x2 !== 0 || speciesRest.y2 !== 0) ? ZERO_REST : speciesRest;
}

/** Tracker events of one semantic battle event (empty = no x2 effect). */
export function liveBattlerX2EventsOf(event: BattleKernelSemanticEvent): readonly LiveBattlerX2Event[] {
  const payload = event.payload;
  const sideOf = (battler: number | null | undefined): LiveBattlerX2Side | null =>
    battler === 0 ? "player" : battler === 1 ? "opponent" : null;
  if (payload.kind === "switch-in-animation") {
    const side = sideOf(payload.battler);
    return side === null ? [{ kind: "unknown", side: "both", reason: "switch-in battler" }] : [{ kind: "send-in", side }];
  }
  if (payload.kind === "animation") {
    const side = sideOf(payload.battler);
    if (side === null) return [{ kind: "unknown", side: "both", reason: `animation battler ${payload.battler}` }];
    if (payload.animationId === "MOVE_ANIMATION") {
      try {
        const request = battleMoveAnimationRequest(payload.battler as 0 | 1, payload.target, payload.arguments);
        return [{ kind: "move-body", moveId: request.moveId, attackerSide: side, turn: request.turn }];
      } catch {
        return [{ kind: "unknown", side: "both", reason: "unparsed move animation" }];
      }
    }
    if (KEEP_ANIMATIONS.has(payload.animationId)) return [];
    if (payload.animationId === "SUBSTITUTE_FADE") return [{ kind: "substitute-fade", side }];
    if (payload.animationId === "FOCUS_PUNCH_SETUP") return [{ kind: "general-animation", side }];
    const target = sideOf(payload.target);
    const unknown = (at: LiveBattlerX2Side): LiveBattlerX2Event => ({ kind: "unknown", side: at, reason: payload.animationId });
    return target === null || target === side ? [unknown(side)] : [unknown(side), unknown(target)];
  }
  if (payload.kind === "status-animation") {
    const side = sideOf(payload.battler);
    if (side === null) return [{ kind: "unknown", side: "both", reason: "status animation" }];
    return [{ kind: "status-animation", side, animation: spriteOrderStatusAnimationName(payload.isStatus2 !== 0, payload.status) }];
  }
  return [];
}

/**
 * Endeavor W3 (docs/next-adapters-prep27.md s0.2 item 3): battle_tv.c TrySetBattleSeminarShow (reached from the player controller's
 * BattleTv_SetDataBasedOnString for STRINGID_ITDOESNTAFFECT, or STRINGID_NOTVERYEFFECTIVE with the defender alive) overwrites
 * gBattleMovePower, which a later Endeavor body reads stale for its shake amplitude. Production does not port that loop, so the host
 * conservatively marks the register unknown on every such print whose attacker is not the opponent (the HP / stage / slot
 * conditions are not evaluated). Presentation-only; never read by rules, RNG or the queue.
 */
export function liveStaleMovePowerTaintedBy(event: BattleKernelSemanticEvent): boolean {
  const payload = event.payload;
  return payload.kind === "message"
    && (payload.messageId === "STRINGID_NOTVERYEFFECTIVE" || payload.messageId === "STRINGID_ITDOESNTAFFECT")
    && payload.actionSnapshot?.attacker !== 1;
}

export interface LiveBattlerX2Host {
  readonly history: LiveBattlerX2History;
  /** Set once the battle's event history may contain a W3 register write (liveStaleMovePowerTaintedBy) or unseen events. */
  readonly staleMovePowerUnknown?: true;
  /** Next unapplied semantic event of the presented resolution; `drained` once its last segment is applied. */
  readonly cursor: Readonly<{ requestId: number; segmentIndex: number; nextEventIndex: number; drained: boolean }> | null;
  /** tmr136: applied MOVE_ANIMATION bodies of the use-keyed moves in this battle, by move id (absent = none yet). */
  readonly moveUses?: Readonly<Record<number, number>>;
  /** tmr136: set once events were unseen (the use counts are unknown for the rest of the battle). */
  readonly moveUsesUnknown?: true;
}

interface ResolutionView {
  readonly resolutionId: Readonly<{ requestId: number }>;
  readonly segmentIndex: number;
  readonly segments: readonly Readonly<{ events: readonly BattleKernelSemanticEvent[] }>[];
}

/** Battle start: both battlers were just sent in (idle). */
export function createLiveBattlerX2Host(
  history: LiveBattlerX2History = LIVE_BATTLER_X2_IDLE, staleMovePowerUnknown = false,
): LiveBattlerX2Host {
  return Object.freeze({ history, cursor: null, ...(staleMovePowerUnknown ? { staleMovePowerUnknown: true as const } : {}) });
}

/** `eventsUnseen`: semantic events were skipped (they may hide a W3 print), so the stale register is unknown too. */
export function invalidateLiveBattlerX2Host(host: LiveBattlerX2Host, reason: string, eventsUnseen = false): LiveBattlerX2Host {
  const history = applyLiveBattlerX2Event(host.history, { kind: "unknown", side: "both", reason });
  const stale = host.staleMovePowerUnknown === true || eventsUnseen;
  const usesUnknown = host.moveUsesUnknown === true || eventsUnseen;
  return history === host.history && stale === (host.staleMovePowerUnknown === true) && usesUnknown === (host.moveUsesUnknown === true)
    ? host : Object.freeze({ ...host, history, ...(stale ? { staleMovePowerUnknown: true as const } : {}),
      ...(usesUnknown ? { moveUsesUnknown: true as const } : {}) });
}

/** The x2 input of one move body; an Endeavor body also carries the host's stale-power status. */
export function liveMoveBattlerX2InputForBody(
  host: LiveBattlerX2Host, request: Readonly<{ moveId: number }>,
): LiveMoveBattlerX2Input | undefined {
  const input = liveMoveBattlerX2Input(host.history);
  // tmr136: a use-keyed move's body carries its use ordinal (the host was advanced strictly before this body's own event).
  if (LIVE_MOVE_TIMING_USE_KEYED_IDS.has(request.moveId) && host.moveUsesUnknown !== true) {
    return Object.freeze({ zeroed: input?.zeroed ?? Object.freeze([]), moveUse: (host.moveUses?.[request.moveId] ?? 0) + 1 });
  }
  if (request.moveId !== 283 || !host.staleMovePowerUnknown) return input;
  return Object.freeze({ zeroed: input?.zeroed ?? Object.freeze([]), staleMovePowerUnknown: true as const });
}

/**
 * Apply the presented resolution's events up to `throughSequence` (inclusive; strictly before it when `before`), earlier
 * segments first, each event once (the cursor discipline of advanceLiveSpriteOrderHost). A new resolution while the
 * previous one is not drained: its remaining events are unknown history (both sides unknown).
 */
export function advanceLiveBattlerX2Host(
  host: LiveBattlerX2Host, resolution: ResolutionView, throughSequence: number, before = false,
): LiveBattlerX2Host {
  const requestId = resolution.resolutionId.requestId;
  let history = host.history;
  let stale = host.staleMovePowerUnknown === true;
  let uses = host.moveUses;
  let usesUnknown = host.moveUsesUnknown === true;
  let cursor = host.cursor;
  if (cursor?.requestId !== requestId) {
    if (cursor !== null && !cursor.drained) {
      history = applyLiveBattlerX2Event(history, { kind: "unknown", side: "both", reason: "previous resolution not fully applied" });
      stale = true;
      usesUnknown = true;
    }
    cursor = { requestId, segmentIndex: 0, nextEventIndex: 0, drained: false };
  }
  const apply = (events: readonly BattleKernelSemanticEvent[], from: number, limit: number, strict: boolean) => {
    let index = from;
    while (index < events.length && (strict ? events[index]!.sequence < limit : events[index]!.sequence <= limit)) {
      for (const event of liveBattlerX2EventsOf(events[index]!)) {
        history = applyLiveBattlerX2Event(history, event);
        if (event.kind === "move-body" && LIVE_MOVE_TIMING_USE_KEYED_IDS.has(event.moveId)) {
          uses = Object.freeze({ ...uses, [event.moveId]: (uses?.[event.moveId] ?? 0) + 1 });
        }
      }
      if (liveStaleMovePowerTaintedBy(events[index]!)) stale = true;
      index += 1;
    }
    return index;
  };
  while (cursor.segmentIndex < resolution.segmentIndex) {
    apply(resolution.segments[cursor.segmentIndex]?.events ?? [], cursor.nextEventIndex, Number.POSITIVE_INFINITY, false);
    cursor = { requestId, segmentIndex: cursor.segmentIndex + 1, nextEventIndex: 0, drained: false };
  }
  if (cursor.segmentIndex === resolution.segmentIndex) {
    const events = resolution.segments[cursor.segmentIndex]?.events ?? [];
    const nextEventIndex = apply(events, cursor.nextEventIndex, throughSequence, before);
    cursor = {
      requestId, segmentIndex: cursor.segmentIndex, nextEventIndex,
      drained: nextEventIndex >= events.length && cursor.segmentIndex === resolution.segments.length - 1,
    };
  }
  if (history === host.history && stale === (host.staleMovePowerUnknown === true) && uses === host.moveUses
    && usesUnknown === (host.moveUsesUnknown === true) && cursor.requestId === host.cursor?.requestId
    && cursor.segmentIndex === host.cursor.segmentIndex && cursor.nextEventIndex === host.cursor.nextEventIndex
    && cursor.drained === host.cursor.drained) return host;
  return Object.freeze({ history, cursor: Object.freeze(cursor), ...(stale ? { staleMovePowerUnknown: true as const } : {}),
    ...(uses === undefined ? {} : { moveUses: uses }), ...(usesUnknown ? { moveUsesUnknown: true as const } : {}) });
}
