// S11 audio: the SoundEvent type, a write-only sink, a tick-scoped collector and the
// move-animation pan law. Pure: no DOM, no WebAudio, no engine state. Nothing in the engine,
// RNG, frame hash, digest, recorder or replay may ever READ what is pushed here (docs/s11-audio-design.md
// sections 3 and 6); a session with no sink attached never collects at all.

/**
 * One sound the ROM would start (or stop / fade / duck) on a session frame.
 *
 * `frame` is the session frame the ROM runs the call on, with the oracle probe's 1-based convention
 * (tools/audio/soundEventProbe.py): an event produced while the k-th advance runs reports k, i.e.
 * the same value `FactorySession.frame` has once that tick returns, and the first frame whose capture
 * can show the effect. `id` is the m4a song number for se / bgm / fanfare / stop / fade / duck and the
 * species for a cry (null for a song-less stop). `pan` is the m4a pan (-64 hard left .. 63 hard right) or null when the call has none.
 */
export interface SoundEvent {
  readonly frame: number;
  readonly kind: "se" | "bgm" | "fanfare" | "cry" | "stop" | "fade" | "duck" | "continue";
  readonly id: number | null;
  readonly pan: number | null;
  /** Cry mode (PlayCry_ByMode), cries only. */
  readonly mode?: number;
  /** Cry volume or duck volume (0-256). */
  readonly volume?: number;
  /** Cry priority. */
  readonly priority?: number;
  /** The m4a player a song-less stop acts on (`StopCryAndClearCrySongs`: "cry"; then `id` is null), or the SE player a panned SE call is routed to (`PlaySE1WithPanning` "SE1", `PlaySE2WithPanning` "SE2", `PlaySE12WithPanning` "SE12" = both). */
  readonly player?: string;
}

/** Write-only: a sink receives events and nothing reads them back into the game. */
export interface SoundSink {
  push(event: SoundEvent): void;
}

/** An emitter's event: the collector stamps `frame` unless the emitter already knows a later one. */
export type SoundEmission = Omit<SoundEvent, "frame"> & { readonly frame?: number };

/** Collects one tick's events. */
export class SoundTickCollector {
  readonly frame: number;
  private readonly events: SoundEvent[] = [];

  constructor(frame: number) {
    this.frame = frame;
  }

  push(emission: SoundEmission): void {
    this.events.push(Object.freeze({ ...emission, frame: emission.frame ?? this.frame }));
  }

  take(): readonly SoundEvent[] {
    return this.events;
  }
}

let active: SoundTickCollector | null = null;

/**
 * Run one engine tick with a collector installed (`frame` = the 1-based session frame that tick produces).
 * Returns what the emitters pushed, in call order. Not re-entrant: ticks are synchronous.
 */
export function collectSoundTick<T>(frame: number, run: () => T): { result: T; events: readonly SoundEvent[] } {
  const previous = active;
  const collector = new SoundTickCollector(frame);
  active = collector;
  try {
    const result = run();
    return { result, events: collector.take() };
  } finally {
    active = previous;
  }
}

/** What emitters call. A no-op unless a tick is being collected, so tools, soaks and headless pay nothing. */
export function emitSound(emission: SoundEmission): void {
  if (active !== null) active.push(emission);
}

/** True while a sink wants this tick's events (lets an emitter skip building the event). */
export function soundCollecting(): boolean {
  return active !== null;
}

// ---- Move-animation panning: reference/pokeemerald/src/battle_anim.c ----

/** include/constants/battle_anim.h:324 */
export const SOUND_PAN_ATTACKER = -64;
/** include/constants/battle_anim.h:325 */
export const SOUND_PAN_TARGET = 63;

export type AnimBattleSide = "player" | "opponent";

/**
 * The inputs BattleAnimAdjustPanning / BattleAnimAdjustPanning2 read: GetBattlerSide(gBattleAnimAttacker),
 * GetBattlerSide(gBattleAnimTarget) and healthBoxesData[gBattleAnimAttacker].statusAnimActive
 * (battle_anim.c:1265, set by battle_gfx_sfx_util.c:423 for the duration of a status animation).
 * IsContest() is always false in the Factory, so the contest branches (:1272-1276, and `|| IsContest()` at :1316) are not ported.
 * gAnimMoveTurn is not read by any of these functions.
 */
export interface AnimPanContext {
  readonly attackerSide: AnimBattleSide;
  readonly targetSide: AnimBattleSide;
  readonly statusAnimActive?: boolean;
}

/** C `s8` store: wrap to -128..127 (`pan *= -1` and `-pan` on an s8 are the only places this can differ). */
function s8(value: number): number {
  return (value << 24) >> 24;
}

/** battle_anim.c:1263-1303 BattleAnimAdjustPanning(s8 pan): used by Cmd_playsewithpan :1356, Cmd_setpan :1366, Cmd_panse :1391-1392, loop / waitplaysewithpan :1533,:1589 and C-side PlaySE12WithPanning. */
export function animSoundPan(pan: number, context: AnimPanContext): number {
  let result = s8(pan);
  if (context.statusAnimActive === true) {
    // :1265-1271
    result = context.attackerSide !== "player" ? SOUND_PAN_TARGET : SOUND_PAN_ATTACKER;
  } else if (context.attackerSide === "player") {
    // :1277-1286 (only when the target is also on the player side)
    if (context.targetSide === "player") {
      if (result === SOUND_PAN_TARGET) result = SOUND_PAN_ATTACKER;
      else if (result !== SOUND_PAN_ATTACKER) result = s8(result * -1);
    }
  } else if (context.targetSide === "opponent") {
    // :1287-1291
    if (result === SOUND_PAN_ATTACKER) result = SOUND_PAN_TARGET;
  } else {
    // :1292-1295
    result = s8(result * -1);
  }
  // :1297-1300
  if (result > SOUND_PAN_TARGET) result = SOUND_PAN_TARGET;
  else if (result < SOUND_PAN_ATTACKER) result = SOUND_PAN_ATTACKER;
  return result;
}

/** battle_anim.c:1305-1320 BattleAnimAdjustPanning2(s8 pan): used by Cmd_panse_adjustall (:1491-1493) and the stat-change SE (battle_anim_utility_funcs.c:562,564). */
export function animSoundPan2(pan: number, context: AnimPanContext): number {
  if (context.statusAnimActive === true) {
    // :1307-1313
    return context.attackerSide !== "player" ? SOUND_PAN_TARGET : SOUND_PAN_ATTACKER;
  }
  // :1314-1318 (IsContest() false)
  return context.attackerSide !== "player" ? s8(-pan) : s8(pan);
}

/** battle_anim.c:1322-1332 KeepPanInRange(s16 panArg, int oldPan); oldPan is unused by the source. */
export function keepPanInRange(pan: number): number {
  if (pan > SOUND_PAN_TARGET) return SOUND_PAN_TARGET;
  if (pan < SOUND_PAN_ATTACKER) return SOUND_PAN_ATTACKER;
  return pan;
}

/** battle_anim.c:1334-1347 CalculatePanIncrement(s16 sourcePan, s16 targetPan, s16 incrementPan). */
export function calculatePanIncrement(sourcePan: number, targetPan: number, incrementPan: number): number {
  if (sourcePan < targetPan) return incrementPan < 0 ? -incrementPan : incrementPan;
  if (sourcePan > targetPan) return -(incrementPan < 0 ? -incrementPan : incrementPan);
  return 0;
}
