// The game library's public contract (v2): what `@pokebench/factory` (src/lib.ts)
// and `@pokebench/factory/headless` (src/headless.ts) export. The website
// (factory-web) is built against exactly these names; lib-types/*.d.ts ships
// the same declarations with the package. Keep the three in sync.

import type { GbaButton } from "./input.ts";

export type { GbaButton };

export type BattleScene = "on" | "off";

/**
 * One run of held buttons in the input trace (the SessionRecorder's RLE
 * runs). `t` is wall-clock milliseconds since mount at the run's first frame:
 * written by the library, optional, and ignored by every replay.
 */
export interface TraceSegment {
  frames: number;
  buttons: GbaButton[];
  t?: number;
}

export type FactoryEvent =
  /** The player has control (after any resume). */
  | { type: "ready"; frame: number }
  /** A battle resolved; `streak` is the Factory win streak as the ROM counts it. */
  | { type: "battle-end"; result: "win" | "loss"; streak: number; frame: number }
  /** The 7th win of a round. */
  | { type: "round-end"; streak: number; frame: number }
  /** The challenge is over: a lost battle, or RETIRE confirmed at the attendant. */
  | { type: "challenge-end"; reason: "loss" | "retire"; streak: number; frame: number }
  /** A contained presentation throw (the battle went on with that command drawn static). */
  | { type: "contained-error"; message: string; frame: number };

export interface FactoryGameOptions {
  /** 240x160; the host page scales it with CSS. */
  canvas: HTMLCanvasElement;
  battleScene: BattleScene;
  /** u32 start of the gameplay RNG (gRngValue); absent = the ROM anchor's draft. */
  gameplaySeed?: number;
  /** u32 presentation-only Random2 seed (visuals); absent = the documented default. */
  presentationSeed?: number;
  /** Fast-forward through these before the player gets control; `ready` follows. */
  resume?: TraceSegment[];
  onEvent?: (event: FactoryEvent) => void;
  /**
   * An engine throw stops the game (the frame stays on screen); the host
   * decides what to show. Absent = the error is only logged.
   */
  onError?: (error: { message: string; frame: number }) => void;
}

export interface FactoryGame {
  /** Build stamp of this package. */
  readonly engine: string;
  /** Frames ticked so far (resumed frames included). */
  readonly frame: number;
  press(button: GbaButton): void;
  release(button: GbaButton): void;
  /**
   * The input trace so far, finished runs only, optionally just the tail from `fromSegment`.
   * The run still being extended is left out (reads at different times never disagree about a run
   * already handed out); every event cuts the current run, so a read right after an event ends at
   * the event's frame; idle runs are cut every 600 frames.
   */
  trace(fromSegment?: number): TraceSegment[];
  destroy(): void;
}

export interface ReplayBattle {
  result: "win" | "loss";
  streak: number;
  frame: number;
}

export interface ReplayResult {
  frames: number;
  streak: number;
  ended: "loss" | "retire" | null;
  battles: ReplayBattle[];
  /** The kernel-events digest the census computes (sha256 hex, 16 chars). */
  digest: string;
}

export interface ReplayOptions {
  battleScene: BattleScene;
  gameplaySeed?: number;
  presentationSeed?: number;
  segments: TraceSegment[];
}
