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
  /**
   * rc1, `lobby: "skip"` only; for the host's eyes (never part of what a server records). The picture has just gone black and the game
   * holds there, the host's moment to draw its own result card over it. "loss": the lost (or forfeited) battle's fade has ended, after
   * `challenge-end` (the game stays black until the host destroys the mount). "retire": the RETIRE warp's fade has ended; the
   * `challenge-end` retire comes on the same frame, just before (and the game stays black). "round": a won round's battle room has faded
   * out (after `round-end`, and after Noland's symbol scene when there is one); the first A or START from half a second (30 frames) into
   * the hold deals the next round's draft with the streak carried on, and `round-continue` follows. After a resume that ends inside a
   * hold, it is reported again right after `ready`.
   */
  | { type: "result-screen"; reason: "loss" | "retire" | "round"; streak: number; frame: number }
  /** rc1, `lobby: "skip"` only, host-only like `result-screen`: the A / START that left a "round" hold; the next round's draft is on screen. */
  | { type: "round-continue"; frame: number }
  | { type: "contained-error"; message: string; frame: number };

/**
 * rc1: where a challenge goes after its round ends. "walk" (the default, the ROM's way): a loss, a forfeit or a retire warps to the
 * walkable Lobby (the attendant's lines, the save, free walking, `challenge-request` at the attendant); a 7-win warps there too and the
 * attendant continues the streak. "skip": no Lobby. The game holds on a black frame and reports `result-screen` instead: after a loss at
 * the end of the battle's fade, after a retire at the end of the RETIRE warp's fade (and `challenge-end` retire moves there, from the
 * Lobby's free walking), after a 7-win once the battle room has faded out; from that last hold, A or START deals the next round's draft
 * (the streak, symbols, Battle Points and rent count carried as the won Lobby banks them; no PreBattleRoom briefing, as on a "draft"
 * mount). Changes what the game does after a round, so a resume and `replayChallenge` must pass the same value.
 */
export type FactoryLobbyMode = "walk" | "skip";

/**
 * The save's Factory record that outlives a challenge (singles, Level 50; the real save keeps it whatever the streak): the symbol count
 * (FLAG_SYS_FACTORY_SILVER / GOLD) and whether Noland's first silver / gold speech was heard (FRONTIER_DATA_HEARD_BRAIN_SPEECH, two
 * `battledBrainFlags` bits). With 1 symbol battle 21 is an ordinary trainer and battle 42 gold Noland; with 2 symbols Noland returns at 21,
 * 42, 63 (every 21 after 42) with no first speech and no symbol; a heard speech is not shown again. Only the records a save can hold are
 * accepted: a symbol needs the silver speech heard, two symbols the gold speech, and the gold speech a symbol.
 */
export interface FactoryFrontierRecord {
  symbols: 0 | 1 | 2;
  heardBrainSpeech: { silver: boolean; gold: boolean };
}

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
  /** The save's Factory record the challenge starts with (both starts); absent = a fresh save. A resume and `replayChallenge` must pass the same. */
  frontier?: FactoryFrontierRecord;
  /** rc1 (additive): absent / "walk" = the Lobby after a round, "skip" = result holds instead (`FactoryLobbyMode`). A resume and `replayChallenge` must pass the same. */
  lobby?: FactoryLobbyMode;
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
   * the page). The move-animation files (dl4) are in the `anim/` subdirectory of the same directory (`<spriteBase>/anim/<asset>.txt`). The game
   * waits (no tick) for a picture or an animation file that has not arrived, so the trace and replays are unchanged.
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
