// @pokebench/factory/headless: replay a challenge from its seeds and input
// trace with no DOM, no canvas and no pixel assets. What a server verifies.
import { ENGINE_BUILD, FactorySession } from "./factorySession.ts";
import type { ReplayOptions, ReplayResult } from "./factoryContract.ts";

export type { BattleScene, FactoryFrontierRecord, GbaButton, ReplayBattle, ReplayOptions, ReplayResult, TraceSegment } from "./factoryContract.ts";
export { ENGINE_BUILD };

export function replayChallenge(options: ReplayOptions): ReplayResult {
  const session = new FactorySession({
    battleScene: options.battleScene,
    gameplaySeed: options.gameplaySeed,
    presentationSeed: options.presentationSeed,
    start: options.start,
    frontier: options.frontier,
  });
  session.resume(options.segments);
  return {
    frames: session.frame,
    streak: session.streak,
    ended: session.ended,
    battles: session.battles.map((battle) => ({ ...battle })),
    digest: session.digest(),
    frontier: session.frontierRecord(),
  };
}
