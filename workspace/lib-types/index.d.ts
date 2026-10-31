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

export declare const ENGINE_BUILD: string;
export declare const SCREEN_WIDTH: 240;
export declare const SCREEN_HEIGHT: 160;
export declare const FRAME_HZ: number;
export declare function mountFactoryGame(options: FactoryGameOptions): FactoryGame;
