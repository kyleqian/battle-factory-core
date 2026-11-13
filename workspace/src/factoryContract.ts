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
  /**
   * lbr-c. After `challenge-end`, the player confirmed the save at the Lobby attendant and the ROM's save dialog began. Fires at most
   * once per mount. The game then holds on that frame (ignores input) until the host destroys the mount and mounts the next challenge.
   */
  | { type: "challenge-request"; frame: number }
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
  /**
   * lbr-c (additive). Absent / "draft": the mount starts at the draft screen. "after-save": it starts in the Lobby at the attendant's
   * "Please step this way." (the save dialog already done), the door walk and fade follow, then a fresh challenge-0 draft is dealt.
   * `gameplaySeed` is then the Lobby RNG cursor on the first frame; the resulting draft is a deterministic function of it
   * (not the deal a plain `gameplaySeed` mount makes). A resume trace, and `replayChallenge`, must pass the same `start`.
   */
  start?: "draft" | "after-save";
  /** Fast-forward through these before the player gets control; `ready` follows. */
  resume?: TraceSegment[];
  onEvent?: (event: FactoryEvent) => void;
  /**
   * An engine throw stops the game (the frame stays on screen); the host
   * decides what to show. Absent = the error is only logged.
   */
  onError?: (error: { message: string; frame: number }) => void;
  /**
   * Sound (aud245). Absent or `enabled` false = muted: no audio file is fetched, no AudioContext is created. The player (WebAudio,
   * a separate lazily-loaded chunk) plays the session's sound events and has no effect on game frames. Browsers only start audio
   * after a user gesture; the first key press / click on the page resumes it.
   */
  audio?: {
    /** Start with sound on (default false). */
    enabled?: boolean;
    /** Master volume 0..1 (default 1). */
    volume?: number;
    /** Fetch the audio files from `${baseUrl}/<file>` (and `aac/` for the Safari fallback) instead of the bundled asset URLs. */
    baseUrl?: string;
  };
}

/** What `getAudio()` reports. */
export interface FactoryAudioState {
  enabled: boolean;
  volume: number;
  /** "off": never started (muted, nothing loaded); "suspended": waiting for a user gesture; "running": audible. */
  state: "off" | "loading" | "suspended" | "running" | "closed" | "unsupported";
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
  /** Sound on / off at any time (a mute button). Switching on loads the audio player on first use; call it from a click. */
  setAudio(enabled: boolean): void;
  getAudio(): FactoryAudioState;
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
  /** Same as `FactoryGameOptions.start`: the trace replays only with the start it was played from. */
  start?: "draft" | "after-save";
  segments: TraceSegment[];
}
