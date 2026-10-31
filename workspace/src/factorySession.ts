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
// After `challenge-end` the engine keeps running (the dev shell and soaks use
// the in-game new-challenge path) but no further events are produced: one
// mount is one challenge.
import { createInitialState, tick, type EngineState } from "./engine/core.ts";
import { ANCHOR_FACTORY_METADATA } from "./engine/factoryAnchorSession.ts";
import { createInitialFactoryCarry, generateFactoryChallengeDraft } from "./engine/factoryRoundChaining.ts";
import {
  clearContainedPresentationErrors,
  containedPresentationErrorCount,
  containedPresentationErrors,
} from "./engine/presentationContainment.ts";
import { presentationRngTraceMetadata, type PresentationRngPolicyId } from "./engine/presentationRngHost.ts";
import { Sha256 } from "./engine/sha256.ts";
import type { BattleScene, FactoryEvent, ReplayBattle, TraceSegment } from "./factoryContract.ts";
import { normalizeButtons, type GbaButton } from "./input.ts";
import { SessionRecorder, type SessionContainedError, type SessionTrace } from "./sessionRecorder.ts";

/** Build stamp of this package (vite `define`); "dev" when run straight from source. */
export const ENGINE_BUILD: string =
  typeof __POKEBENCH_BUILD_STAMP__ === "string" ? __POKEBENCH_BUILD_STAMP__ : "dev";

export interface FactorySessionOptions {
  readonly battleScene: BattleScene;
  /** u32 start of the gameplay RNG (gRngValue); absent = the pinned ROM anchor draft. */
  readonly gameplaySeed?: number | undefined;
  readonly presentationSeed?: number | undefined;
  readonly presentationRngPolicy?: PresentationRngPolicyId | undefined;
}

/**
 * The challenge's first state. Without a gameplay seed this is exactly the
 * production anchor (`createInitialState`). With one, the fresh challenge-0
 * draft is generated off that RNG value -- the same path the soak's
 * `--vary-rng` takes (tools/soak/randomRoundSoakDriver.ts
 * `createStartCarryState`), with the value itself instead of a walk.
 */
export function createChallengeState(options: FactorySessionOptions): EngineState {
  const base = createInitialState({
    battleScene: options.battleScene,
    ...(options.presentationSeed !== undefined ? { presentationSeed: options.presentationSeed } : {}),
    ...(options.presentationRngPolicy !== undefined ? { presentationRngPolicy: options.presentationRngPolicy } : {}),
  });
  if (options.gameplaySeed === undefined) return base;
  if (!Number.isInteger(options.gameplaySeed) || options.gameplaySeed < 0 || options.gameplaySeed > 0xffffffff) {
    throw new Error(`gameplaySeed must be a u32, got ${options.gameplaySeed}`);
  }
  const bootRngValue = options.gameplaySeed >>> 0;
  const carry = createInitialFactoryCarry(ANCHOR_FACTORY_METADATA.playerTrainerId);
  const { generation, draftScreen } = generateFactoryChallengeDraft(carry, bootRngValue);
  return {
    ...base,
    draftScreen,
    rngValue: generation.rngValue,
    factoryCarry: carry,
    pendingGeneratedRound: Object.freeze({ rngValueBefore: bootRngValue, carry }),
  };
}

export class FactorySession {
  readonly options: FactorySessionOptions;
  state: EngineState;
  readonly recorder = new SessionRecorder();
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

  /** One live frame: recorded, then ticked. Returns the events it produced. */
  tick(buttons: ReadonlySet<GbaButton>, t?: number): FactoryEvent[] {
    this.recorder.recordTick(buttons, t);
    return this.step(buttons);
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

  /** The input trace so far (finished runs), optionally only the tail from `fromSegment`. */
  trace(fromSegment = 0): TraceSegment[] {
    return this.recorder.segmentsFrom(fromSegment);
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
  }

  private step(buttons: ReadonlySet<GbaButton>): FactoryEvent[] {
    this.state = tick(this.state, buttons);
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
        events.push({ type: "round-end", streak: this.streak, frame });
      } else if (phase === "roundLost") {
        this.ended = "loss";
        events.push({ type: "challenge-end", reason: "loss", streak: this.streak, frame });
      }
    }
    const lobby = this.state.lobbyFreeRoam !== null;
    if (lobby && !this.prevLobby && this.ended === null) {
      this.ended = "retire";
      events.push({ type: "challenge-end", reason: "retire", streak: this.streak, frame });
    }
    this.prevLastBattle = lastBattle;
    this.prevPhase = phase;
    this.prevLobby = lobby;
    this.hashSegments();
    this.collectContained(events, frame);
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
