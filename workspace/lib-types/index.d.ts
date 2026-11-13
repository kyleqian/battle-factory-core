// @pokebench/factory — browser entry (contract v2). Mirrors src/factoryContract.ts.
export type GbaButton = "A" | "B" | "SELECT" | "START" | "RIGHT" | "LEFT" | "UP" | "DOWN" | "R" | "L";
export type BattleScene = "on" | "off";

/** One run of held buttons (RLE). `t` = wall-clock ms since mount at the run's first frame; optional, ignored by replays. */
export interface TraceSegment {
  frames: number;
  buttons: GbaButton[];
  t?: number;
}

export type FactoryEvent =
  | { type: "ready"; frame: number }
  | { type: "battle-end"; result: "win" | "loss"; streak: number; frame: number }
  | { type: "round-end"; streak: number; frame: number }
  | { type: "challenge-end"; reason: "loss" | "retire"; streak: number; frame: number }
  | { type: "contained-error"; message: string; frame: number };

export interface FactoryGameOptions {
  /** 240x160; the host page scales it with CSS. */
  canvas: HTMLCanvasElement;
  battleScene: BattleScene;
  /** u32 start of the gameplay RNG; absent = the ROM anchor's draft. */
  gameplaySeed?: number;
  /** u32 presentation-only seed; absent = the documented default. */
  presentationSeed?: number;
  /** Fast-forward through these before the player gets control; `ready` follows. */
  resume?: TraceSegment[];
  onEvent?: (event: FactoryEvent) => void;
  /** An engine throw stops the game (the frame stays on screen); absent = logged only. */
  onError?: (error: { message: string; frame: number }) => void;
  /**
   * Sound (additive, aud245). Absent or `enabled` false = muted: no audio file is fetched, no AudioContext is created. The player
   * (WebAudio, a lazily-loaded chunk) plays the session's sound events and has no effect on game frames. Browsers only start audio
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

/** What connectGamepad drives; a FactoryGame fits. */
export interface GamepadTarget {
  press(button: GbaButton): void;
  release(button: GbaButton): void;
}
/** The part of a W3C Gamepad the helper reads. */
export interface GamepadLike {
  readonly connected: boolean;
  readonly buttons: ReadonlyArray<{ readonly pressed: boolean }>;
  readonly axes: readonly number[];
}
export interface GamepadOptions {
  /** Left-stick dead zone, 0..1; an axis counts as a direction past it. Default 0.5. */
  deadZone?: number;
  /** Returns the current pads; default `navigator.getGamepads()`. */
  getGamepads?: () => ArrayLike<GamepadLike | null | undefined>;
  /** Schedules the next poll and returns a cancel function; default requestAnimationFrame. */
  schedule?: (poll: () => void) => () => void;
}

export declare const ENGINE_BUILD: string;
export declare const SCREEN_WIDTH: 240;
export declare const SCREEN_HEIGHT: 160;
export declare const FRAME_HZ: number;
export declare function mountFactoryGame(options: FactoryGameOptions): FactoryGame;
/**
 * Opt-in gamepad input (the mount never polls by itself): polls the first connected W3C Standard
 * Gamepad once per animation frame and calls game.press / game.release on edges only
 * (0 A, 1 B, 4 L, 5 R, 8 SELECT, 9 START, 12-15 d-pad, left stick past the dead zone as the d-pad).
 * Returns a disconnect function; it, or the pad disappearing, releases everything pressed.
 */
export declare function connectGamepad(game: GamepadTarget, options?: GamepadOptions): () => void;
