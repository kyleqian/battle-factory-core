// The challenge session behind both library entries and the dev shell: the
// engine state, the input recorder, event detection (contract v2) and the
// kernel-events digest. No DOM and no renderer: src/lib.ts draws, this ticks.
//
// Event semantics (verified against the soak's winning policy, see
// tests/factoryLibrary.test.ts):
//   battle-end   the round's `lastBattle` changes; streak = the carried win
//                streak + battleIndex (+1 for a win), i.e. the Factory streak
//                as the ROM counts it
//   round-end    the round phase becomes `roundComplete` (7th win)
//   challenge-end loss   the phase becomes `roundLost`
//   challenge-end retire the player enters the Lobby free-roam (RETIRE + YES
//                at the attendant) without a lost battle
//   challenge-request   (lbr-c) after the challenge ended, the player confirmed
//                the save at the attendant and the ROM save dialog began
// After a loss / retire `challenge-end` the engine keeps running (the dev shell
// and soaks use the in-game new-challenge path) but the only further event is
// the one `challenge-request`. A 7-win (`round-end`) is not an end: the game
// returns to the Lobby (lbr-d1) and the attendant continues the streak; no
// `challenge-end` / `challenge-request` until a later loss or retire. With `challengeRequest:
// "hold"` (the default; the library mount and `replayChallenge`) the game then
// freezes on the save dialog's first frame until the host destroys the mount.
// rc1, `lobby: "skip"` (src/engine/resultHold.ts): no Lobby. `result-screen` when
// the picture has gone black and the game holds (loss: the battle's fade ended;
// retire: the warp's fade ended, and `challenge-end retire` moves there, the same
// tick; round: a won round's battle room faded out). From a round hold, A / START
// deals the next round's draft and `round-continue` reports it. `battle-end`,
// `round-end` and `challenge-end loss` stay where they are.
import { createInitialState, tick, type EngineState } from "./engine/core.ts";
import { ANCHOR_FACTORY_METADATA } from "./engine/factoryAnchorSession.ts";
import { createFactoryLobbyAttendantState } from "./engine/factoryLobbyAttendant.ts";
import { requireFactoryLvlMode, type FactoryLvlMode } from "./engine/factoryLevelMode.ts";
import { createFactoryLobbyFreeRoamState } from "./engine/factoryLobbyFreeRoam.ts";
import {
  createInitialFactoryCarry, factoryFrontierRecordOf, generateFactoryChallengeDraft, mergeFactoryHeardBrainSpeech, validateFactoryFrontierRecord,
} from "./engine/factoryRoundChaining.ts";
import {
  clearContainedPresentationErrors,
  containedPresentationErrorCount,
  containedPresentationErrors,
} from "./engine/presentationContainment.ts";
import { presentationRngTraceMetadata, type PresentationRngPolicyId } from "./engine/presentationRngHost.ts";
import { Sha256 } from "./engine/sha256.ts";
import { collectSoundTick, type SoundSink } from "./audio/soundEvents.ts";
import type { BattleScene, FactoryEvent, FactoryFrontierRecord, FactoryLobbyMode, ReplayBattle, TraceSegment } from "./factoryContract.ts";
import { normalizeButtons, type GbaButton } from "./input.ts";
import { SessionRecorder, type SessionContainedError, type SessionTrace } from "./sessionRecorder.ts";

/**
 * Content hash of the headless graph's built output (vite `define`,
 * tools/build/engineBuild.ts): equal for equal gameplay code, whatever the
 * commit. "dev" under the dev server, vitest and straight-from-source node.
 */
export const ENGINE_BUILD: string =
  typeof __POKEBENCH_ENGINE_BUILD__ === "string" ? __POKEBENCH_ENGINE_BUILD__ : "dev";

export interface FactorySessionOptions {
  readonly battleScene: BattleScene;
  /** u32 start of the gameplay RNG (gRngValue); absent = the pinned ROM anchor draft. */
  readonly gameplaySeed?: number | undefined;
  readonly presentationSeed?: number | undefined;
  readonly presentationRngPolicy?: PresentationRngPolicyId | undefined;
  /**
   * lbr-c: what the attendant's save dialog does after the challenge ended. "hold" (default) freezes the game there for the host to
   * destroy the mount; "continue" lets the dev shell / tests run the in-game new-challenge path as before. Either way one
   * `challenge-request` event is reported.
   */
  readonly challengeRequest?: "hold" | "continue" | undefined;
  /**
   * lbr-c: "draft" (default) starts at the draft screen. "after-save" starts in the Lobby at the attendant's "Please step this way."
   * (the save dialog already done), plays the door walk and fade, and deals a fresh challenge-0 draft exactly as the in-game new challenge
   * does (carry streak 0 / rents 0, nch231). `gameplaySeed` is then the Lobby's vblank RNG cursor on the first frame (absent = the
   * anchor's), and the draft comes from that cursor advanced by the walk's frames: deterministic from the seed, but not the deal a
   * plain `gameplaySeed` mount makes. See docs/lbrc-challenge-request.md.
   */
  readonly start?: "draft" | "after-save" | undefined;
  /** The save's Factory record the challenge starts with (symbols, heard-speech bits), both starts; absent = a fresh save. */
  readonly frontier?: FactoryFrontierRecord | undefined;
  /** rc1: "skip" = black result holds instead of the Lobby after a round (`FactoryLobbyMode`); absent / "walk" = the ROM's Lobby. */
  readonly lobby?: FactoryLobbyMode | undefined;
  /**
   * opl (not exposed to players yet): the level of the challenge this mount starts, "50" (default) or "open" (src/engine/factoryLevelMode.ts).
   * An Open Level "draft" start without `gameplaySeed` deals from `OPEN_LEVEL_DEFAULT_DEAL_RNG_VALUE`, the cursor the ROM's own route enters
   * GenerateInitialRentalMons with (no recorded Open Level anchor exists). "after-save" starts the Open Level challenge whose save was made.
   */
  readonly level?: FactoryLvlMode | undefined;
  /**
   * opl: the Lobby attendant's OPEN LEVEL can be chosen for a later challenge in this mount. Absent = true for an Open Level mount, false
   * for a Level 50 one (A on OPEN LEVEL does nothing, as before).
   */
  readonly openLevel?: boolean | undefined;
}

/**
 * opl: the gRngValue at GenerateInitialRentalMons' entry on the ROM's own route to the draft (frame 5796 of oracle/bootstrap/factory.json,
 * docs/anchor-draft-cursor-receipt.md section 3); the Open Level route (factory-open.json) differs only by a cursor press before it.
 */
export const OPEN_LEVEL_DEFAULT_DEAL_RNG_VALUE = 0x08a74230;

/**
 * The challenge's first state. Without a gameplay seed this is exactly the
 * production anchor (`createInitialState`). With one, the fresh challenge-0
 * draft is generated off that RNG value -- the same path the soak's
 * `--vary-rng` takes (tools/soak/randomRoundSoakDriver.ts
 * `createStartCarryState`), with the value itself instead of a walk.
 */
export function createChallengeState(options: FactorySessionOptions): EngineState {
  const level = requireFactoryLvlMode(options.level, "level");
  const openLevel = options.openLevel ?? level === "open";
  if (typeof openLevel !== "boolean") throw new Error(`openLevel must be a boolean, got ${String(openLevel)}`);
  if (level === "open" && !openLevel) throw new Error("an Open Level challenge needs openLevel (it cannot be false)");
  const base = createInitialState({
    battleScene: options.battleScene,
    ...(options.presentationSeed !== undefined ? { presentationSeed: options.presentationSeed } : {}),
    ...(options.presentationRngPolicy !== undefined ? { presentationRngPolicy: options.presentationRngPolicy } : {}),
    ...(options.lobby === "skip" ? { lobby: "skip" as const } : {}),
    ...(openLevel ? { openLevel: true } : {}),
  });
  const frontier = options.frontier === undefined ? undefined : validateFactoryFrontierRecord(options.frontier);
  if (options.start === "after-save") return createAfterSaveState(base, options.gameplaySeed, frontier, level);
  // The anchor draft: its round takes the record from the carry (core.ts createFactoryAnchorSession call). Open Level has no recorded
  // anchor: its draft is dealt from the ROM route's deal cursor (OPEN_LEVEL_DEFAULT_DEAL_RNG_VALUE).
  if (options.gameplaySeed === undefined && level === "50") {
    return frontier === undefined ? base : { ...base, factoryCarry: createInitialFactoryCarry(ANCHOR_FACTORY_METADATA.playerTrainerId, frontier) };
  }
  const seed = options.gameplaySeed ?? OPEN_LEVEL_DEFAULT_DEAL_RNG_VALUE;
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) {
    throw new Error(`gameplaySeed must be a u32, got ${seed}`);
  }
  const bootRngValue = seed >>> 0;
  const carry = createInitialFactoryCarry(ANCHOR_FACTORY_METADATA.playerTrainerId, frontier, level);
  const { generation, draftScreen } = generateFactoryChallengeDraft(carry, bootRngValue);
  return {
    ...base,
    draftScreen,
    rngValue: generation.rngValue,
    factoryCarry: carry,
    pendingGeneratedRound: Object.freeze({ rngValueBefore: bootRngValue, carry }),
  };
}

function createAfterSaveState(
  base: EngineState,
  gameplaySeed: number | undefined,
  frontier: FactoryFrontierRecord | undefined,
  level: FactoryLvlMode,
): EngineState {
  if (gameplaySeed !== undefined && (!Number.isInteger(gameplaySeed) || gameplaySeed < 0 || gameplaySeed > 0xffffffff)) {
    throw new Error(`gameplaySeed must be a u32, got ${gameplaySeed}`);
  }
  const attendant = createFactoryLobbyAttendantState(0, { openLevel: base.openLevel === true });
  return {
    ...base,
    lobbyFreeRoam: createFactoryLobbyFreeRoamState(),
    // opl: the save was made for this level (the attendant's level choice came before it).
    lobbyAttendant: Object.freeze({
      ...attendant,
      screen: "step" as const,
      page: 0,
      age: 0,
      lead: null,
      ...(level === "open" ? { chosenLevel: "open" as const } : {}),
    }),
    rngMode: "vblank",
    rngValue: (gameplaySeed ?? base.rngValue) >>> 0,
    factoryCarry: createInitialFactoryCarry(ANCHOR_FACTORY_METADATA.playerTrainerId, frontier, level),
  };
}

/** Idle runs are closed at this length so a host can upload them while the player waits (~10 s). */
export const MAX_TRACE_RUN_FRAMES = 600;

export class FactorySession {
  readonly options: FactorySessionOptions;
  state: EngineState;
  readonly recorder = new SessionRecorder({ maxRunFrames: MAX_TRACE_RUN_FRAMES });
  readonly battles: ReplayBattle[] = [];
  /** contain209: contained presentation throws, stamped with the session frame they were first seen after. */
  readonly containedErrors: SessionContainedError[] = [];
  streak = 0;
  ended: "loss" | "retire" | null = null;
  private hash = new Sha256();
  private hashed = new WeakSet<object>();
  private containedSeen = 0;
  private prevLastBattle: object | null = null;
  private prevPhase: string | null = null;
  private prevLobby = false;
  /** Set at `round-end`: the next Lobby entry is the ROM's won-script return (lbr-d1), not a retire. */
  private wonLobbyPending = false;
  private requestSent = false;
  /** rc1: the result hold's kind as of the last tick (`lobby: "skip"` only). */
  private prevHold: "end" | "round" | null = null;
  private soundSink: SoundSink | null = null;

  // No parameter properties: tools import src/ under node --experimental-strip-types, which cannot transform them.
  constructor(options: FactorySessionOptions) {
    this.options = options;
    clearContainedPresentationErrors();
    this.state = createChallengeState(options);
    this.syncMarkers();
    this.hashSegments();
  }

  get frame(): number {
    return this.state.frame;
  }

  /**
   * Attach (or detach with null) the write-only sound sink. Live `tick()` frames hand it the frame's
   * SoundEvents in emission order; `replayStep` / `resume` fast-forward frames never do. Nothing the sink
   * receives is read back: not by the engine, RNG, frame hash, digest, recorder, trace or export.
   */
  attachSoundSink(sink: SoundSink | null): void {
    this.soundSink = sink;
  }

  /** One live frame: recorded, then ticked. Returns the events it produced. */
  tick(buttons: ReadonlySet<GbaButton>, t?: number): FactoryEvent[] {
    this.recorder.recordTick(buttons, t);
    return this.step(buttons, this.soundSink);
  }

  /**
   * One fast-forward frame of a trace recorded earlier. Not recorded here:
   * the caller preloads the whole trace with `preloadTrace` once it has been
   * replayed, so the runs keep their original boundaries and timestamps.
   */
  replayStep(buttons: ReadonlySet<GbaButton>): FactoryEvent[] {
    return this.step(buttons);
  }

  preloadTrace(segments: readonly TraceSegment[]): void {
    this.recorder.preload(segments);
  }

  /** Synchronous resume: replays every run, then preloads them. Returns every event replayed. */
  resume(segments: readonly TraceSegment[]): FactoryEvent[] {
    const events: FactoryEvent[] = [];
    for (const segment of segments) {
      const held = new Set(normalizeButtons(segment.buttons));
      for (let i = 0; i < segment.frames; i += 1) events.push(...this.step(held));
    }
    this.preloadTrace(segments);
    return events;
  }

  /**
   * The input trace so far, FINISHED runs only, optionally just the tail from
   * `fromSegment`. The run still being extended is left out, so a host that
   * uploads tails at arbitrary moments never freezes a run short of the frames
   * it finally had; every game event cuts the current run first, so the trace
   * read right after an event ends exactly at the event's frame.
   */
  trace(fromSegment = 0): TraceSegment[] {
    return this.recorder.finishedSegmentsFrom(fromSegment);
  }

  /**
   * The save's Factory record as it stands now: the carry's (the start record plus every finished round) with the live round's own. A symbol
   * is the round outcome's as soon as the round ends (the ROM gives it in the battle room, before the Lobby); a heard bit as soon as the
   * speech showed. Both only grow.
   */
  frontierRecord(): FactoryFrontierRecord {
    const carried = factoryFrontierRecordOf(this.state.factoryCarry);
    const round = this.state.factoryRoundBattleOrchestrator;
    const symbols = Math.max(carried.symbols, round?.config.factorySymbolsCount ?? 0, round?.roundOutcome?.newSymbolsCount ?? 0) as 0 | 1 | 2;
    const heard = mergeFactoryHeardBrainSpeech(carried.heardBrainSpeech, round?.facilityState.heardBrainSpeech)!;
    // A symbol implies its speech was heard (the first meeting sets the bit before the battle, scripts.inc:118-121, :144-147): a round played
    // without its battle-room scene (a test round, a staged one) still reports a record a save can hold.
    return Object.freeze({ symbols, heardBrainSpeech: Object.freeze({ silver: heard.silver || symbols >= 1, gold: heard.gold || symbols === 2 }) });
  }

  /** The kernel-events digest so far: sha256 over each resolution segment's events, hex, 16 chars (as the census computes it). */
  digest(): string {
    return this.hash.clone().digest().slice(0, 16);
  }

  toTrace(error?: unknown): SessionTrace {
    return this.recorder.toTrace({
      appRoute: this.state.appRoute,
      battleScene: this.options.battleScene,
      build: ENGINE_BUILD,
      presentationRng: presentationRngTraceMetadata(this.state.presentationRng),
      error,
      containedErrors: this.containedErrors,
    });
  }

  /** Back to the challenge's first state (the bench ABI's reset()). */
  reset(): void {
    clearContainedPresentationErrors();
    this.state = createChallengeState(this.options);
    this.recorder.reset();
    this.battles.length = 0;
    this.containedErrors.length = 0;
    this.streak = 0;
    this.ended = null;
    this.wonLobbyPending = false;
    this.requestSent = false;
    this.prevHold = null;
    this.hash = new Sha256();
    this.hashed = new WeakSet();
    this.containedSeen = 0;
    this.syncMarkers();
    this.hashSegments();
  }

  private syncMarkers(): void {
    const round = this.state.factoryRoundBattleOrchestrator?.round.rules;
    this.prevLastBattle = round?.lastBattle ?? null;
    this.prevPhase = round?.phase ?? null;
    this.prevLobby = this.state.lobbyFreeRoam !== null;
    this.prevHold = this.state.resultHold?.kind ?? null;
  }

  /**
   * rc1: the result card the host should be showing now (`lobby: "skip"` only): the game holds black after a loss / retire or a won
   * round. The library mount reports it again after a resume that ends inside a hold (the fast-forward reports no events).
   */
  resultScreen(): { reason: "loss" | "retire" | "round"; streak: number } | null {
    const hold = this.state.resultHold;
    if (!hold) return null;
    return { reason: hold.kind === "round" ? "round" : (this.ended ?? "retire"), streak: this.streak };
  }

  private step(buttons: ReadonlySet<GbaButton>, sink: SoundSink | null = null): FactoryEvent[] {
    if (this.ended !== null && !this.state.attendantRequestHold && (this.options.challengeRequest ?? "hold") === "hold") {
      this.state = { ...this.state, attendantRequestHold: true };
    }
    if (sink === null) {
      this.state = tick(this.state, buttons);
    } else {
      // 1-based probe convention: the frame this tick produces is state.frame + 1 (tools/audio/soundEventProbe.py).
      const ticked = collectSoundTick(this.state.frame + 1, () => tick(this.state, buttons));
      this.state = ticked.result;
      for (const event of ticked.events) {
        try {
          sink.push(event);
        } catch (error) {
          console.error("POKEBENCH sound sink threw (ignored; the game is unaffected):", error);
        }
      }
    }
    const frame = this.state.frame;
    const events: FactoryEvent[] = [];
    const orchestrator = this.state.factoryRoundBattleOrchestrator;
    const lastBattle = orchestrator?.round.rules.lastBattle ?? null;
    const phase = orchestrator?.round.rules.phase ?? null;
    if (orchestrator !== null && lastBattle !== null && lastBattle !== this.prevLastBattle && this.ended === null) {
      const carry = orchestrator.config.factoryWinStreak;
      const index = orchestrator.round.rules.battleIndex;
      const streak = lastBattle.outcome === "win" ? carry + index + 1 : carry + index;
      this.streak = streak;
      this.battles.push({ result: lastBattle.outcome, streak, frame });
      events.push({ type: "battle-end", result: lastBattle.outcome, streak, frame });
    }
    if (phase !== this.prevPhase && this.ended === null) {
      if (phase === "roundComplete") {
        this.wonLobbyPending = true;
        events.push({ type: "round-end", streak: this.streak, frame });
      } else if (phase === "roundLost") {
        this.ended = "loss";
        events.push({ type: "challenge-end", reason: "loss", streak: this.streak, frame });
      }
    }
    const lobby = this.state.lobbyFreeRoam !== null;
    if (lobby && !this.prevLobby && this.ended === null) {
      if (this.wonLobbyPending) {
        this.wonLobbyPending = false;
      } else {
        this.ended = "retire";
        events.push({ type: "challenge-end", reason: "retire", streak: this.streak, frame });
      }
    }
    const hold = this.state.resultHold?.kind ?? null;
    if (hold !== this.prevHold) {
      if (hold === "end") {
        // A loss ended the challenge at its battle-end; a hold with no end yet is the RETIRE warp's (it never reaches the Lobby).
        if (this.ended === null) {
          this.ended = "retire";
          events.push({ type: "challenge-end", reason: "retire", streak: this.streak, frame });
        }
        events.push({ type: "result-screen", reason: this.ended, streak: this.streak, frame });
      } else if (hold === "round") {
        // No won Lobby entry follows: nothing for the retire guard to swallow.
        this.wonLobbyPending = false;
        events.push({ type: "result-screen", reason: "round", streak: this.streak, frame });
      } else if (this.prevHold === "round") {
        events.push({ type: "round-continue", frame });
      }
    }
    if (this.ended !== null && !this.requestSent && this.state.lobbyAttendant?.saveDialogStarted === true) {
      this.requestSent = true;
      events.push({ type: "challenge-request", frame });
    }
    this.prevLastBattle = lastBattle;
    this.prevPhase = phase;
    this.prevLobby = lobby;
    this.prevHold = hold;
    this.hashSegments();
    this.collectContained(events, frame);
    // The trace through this frame must be readable (and uploadable) as soon as the host hears the event.
    if (events.length > 0) this.recorder.cut();
    return events;
  }

  private hashSegments(): void {
    const presentation = this.state.factoryRoundBattleOrchestrator?.battleResolutionPresentation ?? null;
    if (presentation === null) return;
    for (const segment of presentation.segments) {
      if (this.hashed.has(segment)) continue;
      this.hashed.add(segment);
      this.hash.update(JSON.stringify(segment.events));
    }
  }

  private collectContained(events: FactoryEvent[], frame: number): void {
    const count = containedPresentationErrorCount();
    if (count === this.containedSeen) return;
    for (const entry of containedPresentationErrors()) {
      if (entry.ordinal <= this.containedSeen) continue;
      const stamped = Object.freeze({ ...entry, frame });
      this.containedErrors.push(stamped);
      console.error("POKEBENCH contained presentation error (the battle continues; copy __POKEBENCH_SESSION__()):", stamped);
      events.push({ type: "contained-error", message: `${entry.site}/${entry.commandType}: ${entry.message}`, frame });
    }
    this.containedSeen = count;
  }
}
