// @pokebench/factory/headless — no DOM, no canvas, no sprite / tile assets. Mirrors src/factoryContract.ts.
import type { BattleScene, FactoryFrontierRecord, TraceSegment } from "./index.js";

export type { BattleScene, FactoryFrontierRecord, GbaButton, TraceSegment } from "./index.js";

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
  segments: TraceSegment[];
}

export declare const ENGINE_BUILD: string;
export declare function replayChallenge(options: ReplayOptions): ReplayResult;
