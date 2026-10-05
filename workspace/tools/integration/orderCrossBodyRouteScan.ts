// Cross-body sprite-order route scan (presentation-only): generated-rental ordinary battles driven by real command input,
// recording for every move body whether the live host lent a known free order, whether that order equals an independent
// pure-transform prediction from the battle's semantic events, and whether the order consumers' adapters were active.
//   run: node --experimental-strip-types tools/integration/orderCrossBodyRouteScan.ts [seeds=200] [slots=0,0,0]
import { generatedCommandAnimationReplay } from "./generatedCommandAnimationReplay.ts";
import { battleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import {
  applySpriteOrderPresentationEvent, createSpriteOrderTracker, spriteOrderStatusAnimationName, spriteOrderTrackerLend,
  type SpriteOrderPresentationEvent, type SpriteOrderTracker,
} from "../../src/engine/spriteOrderEventTransform.ts";
import { invalidateSpriteOrderState, knownEntrySpriteOrderState } from "../../src/engine/spriteOrderProvider.ts";

/** Order consumers live on master (return null when the order is unknown). */
export const ORDER_CONSUMER_MOVES: Readonly<Record<number, string>> = Object.freeze({
  288: "GRUDGE", 215: "HEAL_BELL", 348: "LEAF_BLADE", 88: "ROCK_THROW", 299: "BLAZE_KICK", 195: "PERISH_SONG",
});

type Replay = ReturnType<typeof generatedCommandAnimationReplay>;
interface SemanticEvent { sequence: number; payload: { kind: string; [key: string]: unknown }; provenance?: { opcodeName?: string } }

/** Independent re-statement of the §2 event mapping (not the host module) for the prediction. `units`: the battle units
 * of docs/sprite-order-uncovered-units.md §3 (faint / next-mon summary + send-out / player switch-in / win slide);
 * false = the earlier behaviour (every unit invalidates), kept for before/after counts. */
function mapEvent(event: SemanticEvent, hidden: boolean[], units = true): SpriteOrderPresentationEvent[] {
  const p = event.payload;
  if (p.kind === "animation") {
    const battler = p.battler as 0 | 1;
    if (p.animationId === "MOVE_ANIMATION") {
      return [{ kind: "move-animation", moveId: battleMoveAnimationRequest(battler, p.target as number | undefined, p.arguments as string[]).moveId,
        attackerSide: battler === 0 ? "player" : "opponent" }];
    }
    if (p.animationId === "HIT_ANIMATION") return [{ kind: "hit-animation", targetVisible: !hidden[battler] }];
    if (p.animationId === "STATS_CHANGE") return [{ kind: "stat-animation", argument: Number((p.arguments as string[])[0]) }];
    return [{ kind: "general-animation", animation: String(p.animationId) }];
  }
  if (p.kind === "status-animation") {
    const name = spriteOrderStatusAnimationName((p.isStatus2 as number) !== 0, p.status as number);
    return name === null ? [] : [{ kind: "status-animation", status: name }];
  }
  if (p.kind === "set-battler-sprite-visibility") {
    if (["B_SCR_OP_VARIOUS", "B_SCR_OP_RETURNATKTOBALL", "B_SCR_OP_RETURNTOBALL"].includes(event.provenance?.opcodeName ?? "")) {
      return [{ kind: "invalidate", reason: "recall" }];
    }
    hidden[p.battler as number] = p.invisible as boolean;
    return p.invisible ? [{ kind: "invalidate", reason: "hidden" }] : [];
  }
  const battler = p.battler as number | undefined;
  if (units && (battler === 0 || battler === 1)) {
    if (p.kind === "faint-animation") return [{ kind: "faint", side: battler === 0 ? "player" : "opponent" }];
    if (p.kind === "draw-party-status-summary") return battler === 1 ? [{ kind: "party-summary-next" }] : [];
    if (p.kind === "hide-party-status-summary") return battler === 1 ? [{ kind: "party-summary-hide" }] : [];
    if (p.kind === "switch-in-animation") {
      return battler === 1 ? [{ kind: "next-mon-send-out" }] : [{ kind: "switch-in-start" }, { kind: "switch-in-finish" }];
    }
  }
  if (units && p.kind === "switch") return [];
  if (units && p.kind === "trainer-slide-in") return [{ kind: "trainer-slide-end" }];
  if (["faint-animation", "switch", "switch-in-animation", "draw-party-status-summary", "hide-party-status-summary",
    "trainer-slide-in", "trainer-slide-out", "outcome"].includes(p.kind)) return [{ kind: "invalidate", reason: p.kind }];
  return [];
}

/**
 * Pure-transform tracker at every event position `"<requestId>:<segment>:<index>"` (= after `index` events of that
 * segment; earlier segments complete) and before every MOVE_ANIMATION event (keyed by sequence). Same prompt-cycle
 * assumption as `predictLentOrders`.
 */
export function predictTrackers(run: Replay, entryKnown: boolean, units = true) {
  let tracker: SpriteOrderTracker = createSpriteOrderTracker(entryKnown ? knownEntrySpriteOrderState("ordinary-factory")
    : invalidateSpriteOrderState(knownEntrySpriteOrderState("ordinary-factory")));
  const hidden = [false, false];
  const positions = new Map<string, SpriteOrderTracker>();
  const preBody = new Map<number, SpriteOrderTracker>();
  let request: number | null = null;
  let segment = "";
  let index = 0;
  for (const row of run.semanticEvents) {
    const event = row.event as SemanticEvent;
    if (row.requestId !== request) {
      request = row.requestId;
      tracker = applySpriteOrderPresentationEvent(applySpriteOrderPresentationEvent(tracker, { kind: "action-prompt" }), { kind: "actions-committed" });
    }
    if (`${row.requestId}:${row.segmentIndex}` !== segment) { segment = `${row.requestId}:${row.segmentIndex}`; index = 0; }
    positions.set(`${segment}:${index}`, tracker);
    if (event.payload.kind === "animation" && event.payload.animationId === "MOVE_ANIMATION") preBody.set(event.sequence, tracker);
    for (const mapped of mapEvent(event, hidden, units)) tracker = applySpriteOrderPresentationEvent(tracker, mapped);
    index += 1;
    positions.set(`${segment}:${index}`, tracker);
  }
  return { positions, preBody };
}

/**
 * Pure-transform prediction of the order lent at every MOVE_ANIMATION event (keyed by event sequence), assuming each
 * new request id is one action-prompt cycle. `invalidRequests` are requests the caller knows had no ordinary
 * prompt (party menu / switch submissions); the prediction invalidates there.
 */
export function predictLentOrders(run: Replay, entryKnown: boolean, invalidRequests: ReadonlySet<number> = new Set()) {
  let tracker: SpriteOrderTracker = createSpriteOrderTracker(entryKnown ? knownEntrySpriteOrderState("ordinary-factory")
    : invalidateSpriteOrderState(knownEntrySpriteOrderState("ordinary-factory")));
  const hidden = [false, false];
  const lent = new Map<number, readonly number[] | null>();
  let request: number | null = null;
  // A later segment of the same request (player locked-action follow-up: no prompt) applies no prompt cycle. The
  // host additionally declines after a retained opponent-locked continuation (a real prompt it does not model); the
  // prediction does not see that boundary, so `hostDeclines` disagreements are the host being more conservative.
  for (const row of run.semanticEvents) {
    const event = row.event as SemanticEvent;
    if (row.requestId !== request) {
      request = row.requestId;
      tracker = invalidRequests.has(request) ? applySpriteOrderPresentationEvent(tracker, { kind: "invalidate", reason: "no prompt" })
        : applySpriteOrderPresentationEvent(applySpriteOrderPresentationEvent(tracker, { kind: "action-prompt" }), { kind: "actions-committed" });
    }
    if (event.payload.kind === "animation" && event.payload.animationId === "MOVE_ANIMATION") lent.set(event.sequence, spriteOrderTrackerLend(tracker));
    for (const mapped of mapEvent(event, hidden)) tracker = applySpriteOrderPresentationEvent(tracker, mapped);
  }
  return lent;
}

export function scanRoute(seed: number, slots: readonly (0 | 1 | 2 | 3)[]) {
  const on = generatedCommandAnimationReplay(seed, "on", slots, 0, true);
  const first = on.boundaries[0] as unknown as {
    nextEventSequence: number; rules: { rulesContext: { battlers: readonly { moves: readonly number[] }[] } };
  };
  const entryKnown = first.nextEventSequence === 0;
  const predicted = predictLentOrders(on, entryKnown);
  const bodies = on.commands.filter(row => row.type === "move-animation").map((row, index) => {
    const command = row.command as { eventSequence: number; animation?: { moveId: number; attacker: number } };
    return {
      index, sequence: command.eventSequence, moveId: command.animation?.moveId ?? 0, side: command.animation?.attacker === 0 ? "player" : "opponent",
      known: row.spriteOrderInput !== undefined, predicted: predicted.get(command.eventSequence) ?? null,
      agrees: JSON.stringify(row.spriteOrderInput ?? null) === JSON.stringify(predicted.get(command.eventSequence) ?? null),
      /** Host lent an order that differs from the prediction (must never happen). */
      mismatch: row.spriteOrderInput !== undefined
        && JSON.stringify(row.spriteOrderInput) !== JSON.stringify(predicted.get(command.eventSequence) ?? null),
    };
  });
  const consumers = on.animations.filter(row => ORDER_CONSUMER_MOVES[row.moveId] !== undefined).map(row => ({
    moveId: row.moveId, attacker: row.attacker, ages: row.ages.length, activeEveryAge: row.adapterActive.every(Boolean),
    activeAny: row.adapterActive.some(Boolean),
  }));
  return { seed, slots, entryKnown, leadMoves: first.rules.rulesContext.battlers.slice(0, 2).map(b => b.moves), bodies, consumers,
    phase: on.state.battleCommandPresentation?.lifecycle.phase ?? null, on };
}

/** Routes where an order consumer is a LATER body: the player's lead knows a consumer (slot c) -> [x, c] for every
 * other slot x; the opponent's lead knows one -> [x, x, x]. */
export function findConsumerRoutes(seeds: number) {
  const routes: { seed: number; slots: number[]; consumer: number; side: string; index: number; known: boolean;
    agrees: boolean; activeEveryAge: boolean | null; activeAny: boolean | null; entryKnown: boolean; earlier: string[];
    endPhase: string | null }[] = [];
  let seedsWithConsumer = 0, seedsWithKnownLater = 0;
  for (let seed = 0; seed < seeds; seed += 1) {
    let base;
    try { base = scanRoute(seed, []); } catch { continue; }
    const [player, opponent] = base.leadMoves as [readonly number[], readonly number[]];
    const candidates: (0 | 1 | 2 | 3)[][] = [];
    player.forEach((move, c) => {
      if (ORDER_CONSUMER_MOVES[move] === undefined) return;
      for (const x of [0, 1, 2, 3] as const) if (x !== c && player[x]) candidates.push([x, c as 0 | 1 | 2 | 3]);
    });
    if (opponent.some(move => ORDER_CONSUMER_MOVES[move] !== undefined)) {
      for (const x of [0, 1, 2, 3] as const) if (player[x]) candidates.push([x, x, x]);
    }
    if (candidates.length === 0) continue;
    seedsWithConsumer += 1;
    let knownLater = false;
    for (const slots of candidates) {
      let run;
      try { run = scanRoute(seed, slots); } catch { continue; }
      for (const body of run.bodies.filter(b => ORDER_CONSUMER_MOVES[b.moveId] !== undefined && b.index > 0)) {
        const occurrence = run.bodies.filter(b => b.moveId === body.moveId && b.index < body.index).length;
        const anim = run.consumers.filter(c => c.moveId === body.moveId)[occurrence];
        routes.push({ seed, slots: [...slots], consumer: body.moveId, side: body.side, index: body.index, known: body.known,
          agrees: body.agrees, activeEveryAge: anim ? anim.activeEveryAge : null, activeAny: anim ? anim.activeAny : null,
          entryKnown: run.entryKnown, earlier: run.bodies.filter(b => b.index < body.index).map(b => `${b.moveId}:${b.side}`),
          endPhase: run.phase });
        if (body.known) knownLater = true;
      }
    }
    if (knownLater) seedsWithKnownLater += 1;
  }
  return { seeds, seedsWithConsumer, seedsWithKnownLater, routes };
}

if (import.meta.url === `file://${process.argv[1]}` && process.argv[2] === "routes") {
  const result = findConsumerRoutes(Number(process.argv[3] ?? 200));
  for (const route of result.routes) console.log(JSON.stringify(route));
  console.log(JSON.stringify({ seeds: result.seeds, seedsWithConsumer: result.seedsWithConsumer, seedsWithKnownLater: result.seedsWithKnownLater,
    laterConsumerBodies: result.routes.length, known: result.routes.filter(r => r.known).length,
    knownActiveEveryAge: result.routes.filter(r => r.known && r.activeEveryAge).length,
    unknownActiveAny: result.routes.filter(r => !r.known && r.activeAny).length,
    disagree: result.routes.filter(r => !r.agrees).length }));
} else if (import.meta.url === `file://${process.argv[1]}`) {
  const seeds = Number(process.argv[2] ?? 200);
  const slots = (process.argv[3] ?? "0,0,0").split(",").map(Number) as (0 | 1 | 2 | 3)[];
  let bodies = 0, later = 0, laterKnown = 0, disagree = 0, mismatch = 0;
  for (let seed = 0; seed < seeds; seed += 1) {
    let result;
    try { result = scanRoute(seed, slots); } catch (error) { console.log(seed, "error", String(error).slice(0, 120)); continue; }
    bodies += result.bodies.length;
    later += result.bodies.filter(b => b.index > 0).length;
    laterKnown += result.bodies.filter(b => b.index > 0 && b.known).length;
    disagree += result.bodies.filter(b => !b.agrees).length;
    mismatch += result.bodies.filter(b => b.mismatch).length;
    for (const b of result.bodies.filter(body => !body.agrees)) console.log(seed, "disagree", JSON.stringify([b.index, b.moveId, b.side, b.known, b.mismatch]));
    const hits = result.bodies.filter(b => ORDER_CONSUMER_MOVES[b.moveId] !== undefined);
    if (hits.length) console.log(seed, JSON.stringify(hits.map(b => [b.index, b.moveId, b.side, b.known])), JSON.stringify(result.consumers));
  }
  console.log(JSON.stringify({ seeds, slots, bodies, later, laterKnown, disagree, mismatch }));
}
