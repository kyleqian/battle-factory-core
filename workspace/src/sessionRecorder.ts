// Live-session input recorder. Every play session RLE-records its per-tick
// held-button sets in the exact trace `segments` schema the compare tooling
// replays, so a crash (or a "that looked wrong" moment) exports as a JSON
// blob that reproduces the session deterministically: the engine core is
// pure and createInitialState() starts from fixed anchor constants, so the
// button log is the complete session state.

import type { GbaButton } from "./input.ts";
import type { PresentationRngTraceMetadata } from "./engine/presentationRngHost.ts";
import type { ContainedPresentationError } from "./engine/presentationContainment.ts";

/** contain209: a contained presentation throw, stamped with the session frame (tick count) it was first seen after. */
export type SessionContainedError = ContainedPresentationError & Readonly<{ frame: number }>;

export interface RecordedSegment {
  frames: number;
  buttons: GbaButton[];
  /**
   * Wall-clock ms since mount at the run's first frame (library contract v2,
   * src/factoryContract.ts). Only runs recorded with a timestamp carry it;
   * toTrace() never exports it, so compare tooling and tests see the
   * historical `{ frames, buttons }` shape unchanged.
   */
  t?: number;
}

export interface SessionTrace {
  appRoute: string;
  oracleProfile: "battle-scene-off" | "battle-scene-on";
  battleScene?: "on" | "off";
  build: string;
  frame: number;
  error?: { name: string; message: string; stack?: string };
  /**
   * Presentation-only Random2 session seed + policy (docs/presentation-rng.md). Absent on legacy
   * exports, which replay with the documented default (presentationRngFromTrace).
   */
  presentationRng?: PresentationRngTraceMetadata;
  /** contain209: presentation throws the session contained (presentationContainment.ts); absent when there were none. */
  containedErrors?: SessionContainedError[];
  segments: RecordedSegment[];
}

// A multi-hour session stays small under RLE (one run per input change), but
// cap the run count so a pathological input source cannot grow unbounded.
// At the cap the recorder stops extending and marks the trace truncated.
const MAX_SEGMENTS = 500_000;

export interface SessionRecorderOptions {
  /**
   * Close a run once it reaches this many frames and start a new one with the
   * same buttons, so a long idle stretch still becomes a finished run that a
   * host can upload (library contract v2). Absent = runs grow without bound,
   * the historical behaviour the compare tooling and session exports use.
   */
  readonly maxRunFrames?: number;
}

export class SessionRecorder {
  private segments: RecordedSegment[] = [];
  private lastKey: string | null = null;
  private frames = 0;
  private truncated = false;
  /** Whether the last run may still be extended by the next tick. */
  private openRun = false;
  private readonly maxRunFrames: number;

  constructor(options: SessionRecorderOptions = {}) {
    this.maxRunFrames = options.maxRunFrames ?? Number.POSITIVE_INFINITY;
  }

  recordTick(buttons: ReadonlySet<GbaButton>, t?: number): void {
    this.frames += 1;
    if (this.truncated) return;
    const list = [...buttons].sort() as GbaButton[];
    const key = list.join("+");
    const last = this.segments[this.segments.length - 1];
    if (last !== undefined && key === this.lastKey && last.frames < this.maxRunFrames) {
      last.frames += 1;
      this.openRun = true;
      return;
    }
    if (this.segments.length >= MAX_SEGMENTS) {
      this.truncated = true;
      return;
    }
    this.segments.push(t === undefined ? { frames: 1, buttons: list } : { frames: 1, buttons: list, t });
    this.lastKey = key;
    this.openRun = true;
  }

  /**
   * Closes the current run: the next tick starts a new run even with the
   * same buttons. The library cuts at every game event so the finished runs
   * cover exactly the frames up to and including the event's frame.
   */
  cut(): void {
    this.lastKey = null;
    this.openRun = false;
  }

  /**
   * Seeds the log with runs that were already recorded elsewhere (a resumed
   * challenge's server-side trace). They are kept verbatim -- never merged
   * with each other or with the next live run -- so `segments(from)` keeps
   * counting from the caller's offsets.
   */
  preload(segments: readonly RecordedSegment[]): void {
    for (const segment of segments) {
      if (this.segments.length >= MAX_SEGMENTS) {
        this.truncated = true;
        return;
      }
      this.segments.push(
        segment.t === undefined
          ? { frames: segment.frames, buttons: [...segment.buttons] }
          : { frames: segment.frames, buttons: [...segment.buttons], t: segment.t },
      );
      this.frames += segment.frames;
    }
    this.lastKey = null;
    this.openRun = false;
  }

  /** Copies of the recorded runs from `fromSegment` on, timestamps included, the still-open run too. */
  segmentsFrom(fromSegment = 0): RecordedSegment[] {
    return this.copyRuns(fromSegment, this.segments.length);
  }

  /**
   * Copies of the FINISHED runs from `fromSegment` on: a run that may still
   * grow is left out, so two reads at different times never disagree about
   * a run already handed out (an upload boundary must not freeze a run short).
   */
  finishedSegmentsFrom(fromSegment = 0): RecordedSegment[] {
    return this.copyRuns(fromSegment, this.openRun ? this.segments.length - 1 : this.segments.length);
  }

  private copyRuns(from: number, to: number): RecordedSegment[] {
    return this.segments.slice(from, Math.max(from, to)).map((segment) =>
      segment.t === undefined
        ? { frames: segment.frames, buttons: [...segment.buttons] }
        : { frames: segment.frames, buttons: [...segment.buttons], t: segment.t },
    );
  }

  get segmentCount(): number {
    return this.segments.length;
  }

  get frameCount(): number {
    return this.frames;
  }

  get isTruncated(): boolean {
    return this.truncated;
  }

  reset(): void {
    this.segments = [];
    this.lastKey = null;
    this.frames = 0;
    this.truncated = false;
    this.openRun = false;
  }

  toTrace(options: {
    appRoute: string;
    build: string;
    battleScene?: "on" | "off";
    presentationRng?: PresentationRngTraceMetadata;
    error?: unknown;
    containedErrors?: readonly SessionContainedError[];
  }): SessionTrace {
    const trace: SessionTrace = {
      appRoute: options.appRoute,
      oracleProfile: options.battleScene === "on" ? "battle-scene-on" : "battle-scene-off",
      ...(options.battleScene ? { battleScene: options.battleScene } : {}),
      build: options.build,
      frame: this.frames,
      ...(options.presentationRng
        ? { presentationRng: { seed: options.presentationRng.seed, policy: options.presentationRng.policy } }
        : {}),
      ...(options.containedErrors !== undefined && options.containedErrors.length > 0
        ? { containedErrors: options.containedErrors.map((entry) => ({ ...entry })) }
        : {}),
      segments: this.segments.map((segment) => ({
        frames: segment.frames,
        buttons: [...segment.buttons],
      })),
    };
    if (options.error !== undefined) {
      const err = options.error;
      trace.error =
        err instanceof Error
          ? { name: err.name, message: err.message, stack: err.stack }
          : { name: "unknown", message: String(err) };
    }
    return trace;
  }
}
