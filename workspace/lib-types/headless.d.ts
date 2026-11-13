// @pokebench/factory/headless — no DOM, no canvas, no sprite / tile assets. Mirrors src/factoryContract.ts.
import type { BattleScene, TraceSegment } from "./index.js";

export type { BattleScene, GbaButton, TraceSegment } from "./index.js";

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

export declare const ENGINE_BUILD: string;
export declare function replayChallenge(options: ReplayOptions): ReplayResult;
