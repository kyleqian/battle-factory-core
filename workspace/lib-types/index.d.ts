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
  /**
   * After `challenge-end`, the player confirmed the save at the Lobby attendant and the ROM's save dialog began (the player asked for
   * a new challenge). Fires at most once per mount, never before `challenge-end`. The game then HOLDS on that frame (input ignored,
   * the picture does not change) until the host calls `destroy()` and mounts the next challenge; if the host does nothing, it just
   * stays there. Nothing after `challenge-end` belongs in the uploaded trace. The host should prefetch the next server challenge at
   * `challenge-end` so the re-mount is instant.
   */
  | { type: "challenge-request"; frame: number }
  | { type: "contained-error"; message: string; frame: number };

export interface FactoryGameOptions {
  /** 240x160; the host page scales it with CSS. */
  canvas: HTMLCanvasElement;
  battleScene: BattleScene;
  /** u32 start of the gameplay RNG; absent = the ROM anchor's draft. */
  gameplaySeed?: number;
  /** u32 presentation-only seed; absent = the documented default. */
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
  /** An engine throw stops the game (the frame stays on screen); absent = logged only. */
  onError?: (error: { message: string; frame: number }) => void;
  /**
   * Battle pictures (additive, dl3). The library fetches one small file per species (`<SPECIES>.txt`, the files under `dist-lib/sprites/`)
   * when a screen needs it, instead of shipping every picture up front. By default the files are the ones the bundler emitted next to
   * the package (resolved with `new URL(..., import.meta.url)`, like the audio files, so a host bundler serves them with no configuration);
   * set `spriteBase` to a directory URL that serves a copy of `dist-lib/sprites/` to load them from there (relative URLs resolve against
   * the page). The game waits (no tick) for a picture that has not arrived, so the trace and replays are unchanged.
   */
  spriteBase?: string;
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
