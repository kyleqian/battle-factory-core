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
  /**
   * rc1, `lobby: "skip"` only; for the host's eyes (never part of what a server records). The picture has just gone black and the game
   * holds there, the host's moment to draw its own result card over it. "loss": the lost (or forfeited) battle's fade has ended, after
   * `challenge-end` (the game stays black until the host destroys the mount). "retire": the RETIRE warp's fade has ended; the
   * `challenge-end` retire comes on the same frame, just before (and the game stays black). "round": a won round's battle room has faded out
   * (after `round-end`, and after Noland's symbol scene when there is one); the first A or START from half a second (30 frames,
   * `ROUND_HOLD_INPUT_DELAY`) into the hold deals the next round's draft with the streak carried on, and `round-continue` follows. After a
   * resume that ends inside a hold, it is reported again right after `ready`.
   */
  | { type: "result-screen"; reason: "loss" | "retire" | "round"; streak: number; frame: number }
  /** rc1, `lobby: "skip"` only, host-only like `result-screen`: the A / START that left a "round" hold; the next round's draft is on screen. */
  | { type: "round-continue"; frame: number }
  /** A contained presentation throw (the battle went on with that command drawn static). */
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
  /** The save's Factory record the challenge starts with (both starts); absent = a fresh save. A resume and `replayChallenge` must pass the same. */
  frontier?: FactoryFrontierRecord;
  /** rc1 (additive): absent / "walk" = the Lobby after a round, "skip" = result holds instead (`FactoryLobbyMode`). A resume and `replayChallenge` must pass the same. */
  lobby?: FactoryLobbyMode;
  /** Fast-forward through these before the player gets control; `ready` follows. */
  resume?: TraceSegment[];
  onEvent?: (event: FactoryEvent) => void;
  /**
   * An engine throw stops the game (the frame stays on screen); the host
   * decides what to show. Absent = the error is only logged.
   */
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
  /**
   * ffw1: play speed, game frames per display frame: 1 (normal) up to 8, rounded. Above 1 the loop ticks that many frames per
   * frame and the game is silent; back at 1 the music picks up where the game is. Every tick, the trace and the events are the
   * same at any speed: only the wall clock is shorter (a host that checks play time against real time must allow it).
   */
  setSpeed(speed: number): void;
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
  /** The save's Factory record at the end of the replay (the start record plus what the challenge earned): what the server keeps. */
  frontier: FactoryFrontierRecord;
}

export interface ReplayOptions {
  battleScene: BattleScene;
  gameplaySeed?: number;
  presentationSeed?: number;
  /** Same as `FactoryGameOptions.start`: the trace replays only with the start it was played from. */
  start?: "draft" | "after-save";
  /** Same as `FactoryGameOptions.frontier`: the trace replays only with the record it was played from. */
  frontier?: FactoryFrontierRecord;
  /** Same as `FactoryGameOptions.lobby`: the trace replays only with the Lobby mode it was played with. */
  lobby?: FactoryLobbyMode;
  segments: TraceSegment[];
}
