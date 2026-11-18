// dl3: which battle pictures the current frame (and the next ones) may show, found by scanning the parts of the session state that name
// species: the draft's six, the round's / battle's parties and the swap candidates. The scan is a prefetch plus the hold's trigger, not the
// guarantee: a read of a picture the scan missed throws MonPicPending (monPicPending.ts) and the lib loop holds on it. An over-match (a string
// that merely equals a species name) only fetches one more file. Not in the headless graph.
import type { EngineState } from "./core.ts";

const EMPTY: readonly string[] = Object.freeze([]);
const MAX_DEPTH = 14;
// Immutable states share their unchanged subtrees, so a per-node memo makes a rescan cost the changed nodes only.
const memo = new WeakMap<object, readonly string[]>();

function walk(node: unknown, isSpecies: (name: string) => boolean, found: Set<string>, depth: number): void {
  if (typeof node === "string") {
    const name = node.startsWith("SPECIES_") ? node.slice(8) : node;
    if (isSpecies(name)) found.add(name);
    return;
  }
  if (node === null || typeof node !== "object" || depth > MAX_DEPTH) return;
  const cached = memo.get(node);
  if (cached !== undefined) {
    for (const name of cached) found.add(name);
    return;
  }
  const own = new Set<string>();
  memo.set(node, EMPTY); // a cycle terminates here
  if (Array.isArray(node)) {
    if (node.length > 0 && typeof node[0] === "number") {
      memo.set(node, EMPTY);
      return;
    }
    for (const item of node) walk(item, isSpecies, own, depth + 1);
  } else {
    for (const value of Object.values(node)) walk(value, isSpecies, own, depth + 1);
  }
  memo.set(node, own.size === 0 ? EMPTY : [...own]);
  for (const name of own) found.add(name);
}

/** Species whose pictures the state's draft / party / swap parts name. `isSpecies` is the store's known-species test. */
export function neededMonPics(state: EngineState, isSpecies: (name: string) => boolean): Set<string> {
  const found = new Set<string>();
  walk(state.draftScreen.slots, isSpecies, found, 0);
  walk(state.draftScreen.rentals, isSpecies, found, 0);
  walk(state.battleSetup, isSpecies, found, 0);
  walk(state.roundController, isSpecies, found, 0);
  walk(state.factoryRoundBattleOrchestrator, isSpecies, found, 0);
  walk(state.factorySwap, isSpecies, found, 0);
  return found;
}
