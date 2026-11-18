// dl4: which animation asset files the current frame (and the next ones) may read, found from the moves the session names: both parties'
// move lists (known when the round controller builds the parties, before the Battle Room walk) and every move id the resolution / command
// presentation carries (which includes a move another move called: Metronome, Mimic, Sleep Talk, Assist...). The table maps a move id to the
// assets its animation reads (tools/bundle/animAssetNeeds.ts records it; src/assets/gen/anim-asset-moves.json). The scan is a prefetch plus
// the hold's trigger, not the guarantee: a read of an asset it missed is recorded by the store and the loop holds on it. Scene OFF plays no
// move animation, so it needs none. Not in the headless graph.
import type { EngineState } from "./core.ts";

export interface AnimAssetMoveTable {
  /** Move id -> the asset files its animation reads that are not part of the always-loaded set. */
  readonly byMove: Readonly<Record<string, readonly string[]>>;
}

const EMPTY: readonly number[] = Object.freeze([]);
const MAX_DEPTH = 16;
const memo = new WeakMap<object, readonly number[]>();
const MOVE_KEYS = new Set(["moveId", "calledMove", "currentMove", "chosenMove"]);

function walk(node: unknown, found: Set<number>, depth: number): void {
  if (node === null || typeof node !== "object" || depth > MAX_DEPTH) return;
  const cached = memo.get(node);
  if (cached !== undefined) {
    for (const id of cached) found.add(id);
    return;
  }
  memo.set(node, EMPTY); // a cycle terminates here
  const own = new Set<number>();
  if (Array.isArray(node)) {
    if (!(node.length > 0 && typeof node[0] === "number")) for (const item of node) walk(item, own, depth + 1);
  } else {
    for (const [key, value] of Object.entries(node)) {
      if (typeof value === "number") {
        if (MOVE_KEYS.has(key) && value > 0) own.add(value);
      } else if (key === "moves" && Array.isArray(value)) {
        for (const id of value) if (typeof id === "number" && id > 0) own.add(id);
      } else walk(value, own, depth + 1);
    }
  }
  memo.set(node, own.size === 0 ? EMPTY : [...own]);
  for (const id of own) found.add(id);
}

function presented(orchestrator: Record<string, unknown>, state: EngineState, found: Set<number>, withBattle: boolean): void {
  if (withBattle) walk(orchestrator.battle, found, 0);
  walk(orchestrator.battleCommandPresentation, found, 0);
  walk(orchestrator.battleResolutionPresentation, found, 0);
  walk(state.stagedBattleTurn, found, 0);
  walk(state.sceneOnPresentation, found, 0);
}

/** Move ids the battle's parties and presentation name (empty outside a battle and under Battle Scene OFF). */
export function neededMoveIds(state: EngineState): Set<number> {
  const found = new Set<number>();
  if (state.battleSceneMode !== "on") return found;
  const orchestrator = state.factoryRoundBattleOrchestrator as unknown as Record<string, unknown> | null;
  if (orchestrator === null) return found;
  walk((orchestrator.round as { rules?: unknown } | null)?.rules, found, 0);
  presented(orchestrator, state, found, true);
  return found;
}

/** Only the move ids the presentation names now (not the parties' move lists): the recording tool attributes a frame's reads to these. */
export function presentedMoveIds(state: EngineState): Set<number> {
  const found = new Set<number>();
  if (state.battleSceneMode !== "on") return found;
  const orchestrator = state.factoryRoundBattleOrchestrator as unknown as Record<string, unknown> | null;
  if (orchestrator !== null) presented(orchestrator, state, found, false);
  return found;
}

/** The asset files (names without `.json`) the moves of `state` read; `has` is the store's known-file test. */
export function neededAnimAssets(state: EngineState, table: AnimAssetMoveTable, has: (name: string) => boolean): Set<string> {
  const names = new Set<string>();
  for (const id of neededMoveIds(state)) for (const name of table.byMove[id] ?? []) if (has(name)) names.add(name);
  return names;
}
