// Voluntary-switch semantic histories + replay through the PRODUCTION live hosts (docs/voluntary-switch-lend-audit.md s3.1/s4). Extends
// playerfaintLendHistory.ts: the history of each voluntary scenario (voluntaryModelCheck.ts SCENARIOS, written from the battle script, never
// from masks) as BattleKernelSemanticEvent payload turns (one turn per committed action), plus orchestrator markers the kernel stream does
// not carry:
//   { kind: "voluntary-party-menu", outcome: "cancel" }  first event of the turn whose prompt re-rose after a cancelled party menu:
//        replayed as openLiveSpriteOrderHostPartyMenu + returnLiveSpriteOrderHostFromPartyMenu({player: true, opponent: true}) (the
//        orchestrator's `party-handoff` open and `returnOrderHostFromPartyMenu` cancel), allocator invalidated, then the turn's prompt cycle;
//   { kind: "voluntary-party-menu", outcome: "switch" }  first event of a turn chosen in the party menu: openLiveSpriteOrderHostPartyMenu,
//        allocator invalidated, then beginLiveSpriteOrderTurn(..., fromPartyMenu = true) (reset + reshowBoth, no prompt cycle);
//   { kind: "forced-party-menu", battlers }  as in playerfaintLendHistory.ts.
// The recall is the synthesized `set-battler-sprite-visibility` {battler 0, invisible} whose provenance opcode is B_SCR_OP_RETURNATKTOBALL
// (battleResolutionPresentation.ts synthesized-voluntary-switch); the payload carries it as `provenanceOpcodeName` and the replay restores it.
// Modes: `today` = production hosts unchanged; `proposed` = the s4 change emulated around them: occupant roles kept from reshowBoth
// (survivors n2 / n5 / n8) through the recall and switch-in, the recall applied as the tracker's switch-out unit instead of invalidating, and
// the allocator re-seeded (known-entry firstMove) after the cancel return and after the voluntary switch-in when role-isomorphic.
//   npx vite-node tools/integration/voluntaryLendHistory.ts -- --run | --write   (records `precedingTurns` into the drafts + receipt)
import { readFileSync, writeFileSync } from "node:fs";
import type { BattleKernelSemanticEvent } from "../../src/engine/battleDecisionBoundary.ts";
import { battleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import { createKnownEntrySpriteAllocatorProvider } from "../../src/engine/knownEntrySpriteAllocator.ts";
import { prepareLiveMoveSpriteAllocator } from "../../src/engine/liveMoveSpriteAllocator.ts";
import { invalidateLiveSpriteAllocatorHost, type LiveSpriteAllocatorHost } from "../../src/engine/liveSpriteAllocator.ts";
import {
  advanceLiveSpriteOrderHost, beginLiveSpriteOrderTurn, createLiveSpriteOrderHost, lendLiveSpriteOrder, openLiveSpriteOrderHostPartyMenu,
  reseedLiveSpriteAllocatorAfterSendOut, returnLiveSpriteOrderHostFromPartyMenu, type LiveSpriteOrderHost,
} from "../../src/engine/liveSpriteOrderHost.ts";
import {
  applySpriteOrderPresentationEvent, spriteOrderTrackerPostUnitView, spriteOrderTrackerRoleIsomorphic, type SpriteOrderOccupantRoles,
} from "../../src/engine/spriteOrderEventTransform.ts";
import { knownEntrySpriteOrderState } from "../../src/engine/spriteOrderProvider.ts";
import { SCENARIOS, type Step } from "./voluntaryModelCheck.ts";

type Payload = Readonly<Record<string, unknown> & { kind: string }>;
type Turn = Readonly<{ events: readonly Payload[] }>;
const ROUTE = "battle-lab-ordinary-singles" as const;

/** Semantic payload turns of `key` up to and including the body after model-check edge `edgeIndex` (one turn per committed action). */
export function voluntaryTurnsToEdge(key: string, edgeIndex: number): Turn[] {
  const steps = SCENARIOS[key] as Step[] | undefined;
  if (!steps) throw new Error(`unknown scenario ${key}`);
  const turns: Payload[][] = [];
  let edge = -1, lastAttacker: 0 | 1 = 0, done = false, sendOuts = 0, playerSwitchIns = 0, pendingCancel = false, faintedPlayer = false;
  const push = (payload: Payload) => turns[turns.length - 1]!.push(Object.freeze(payload));
  for (let i = 0; i < steps.length && !done; i++) {
    const step = steps[i]!;
    switch (step.kind) {
      case "action-prompt": {
        if (steps[i + 1]?.kind === "party-menu-reset") {
          // voluntary menu: [P, reset, reset, reshow(true)] then P (cancel) or the recall edge (switch)
          i += 3;
          if (steps[i + 1]?.kind === "action-prompt") { pendingCancel = true; break; }
          turns.push([]);
          push({ kind: "voluntary-party-menu", outcome: "switch" });
          break;
        }
        turns.push([]);
        if (pendingCancel) { push({ kind: "voluntary-party-menu", outcome: "cancel" }); pendingCancel = false; }
        break;
      }
      case "actions-committed": case "battle-reshow": case "switch-in-start": case "party-summary-hide": break;
      case "edge": edge += 1; break;
      case "move-animation": {
        const battler = step.attackerSide === "player" ? 0 : 1;
        lastAttacker = battler;
        push({ kind: "animation", animationId: "MOVE_ANIMATION", battler, target: 1 - battler, arguments: [String(step.moveId), "0", "0", "0", "0", "0"] });
        if (edge === edgeIndex) done = true;
        break;
      }
      case "hit-animation": push({ kind: "animation", animationId: "HIT_ANIMATION", battler: 1 - lastAttacker, target: 1 - lastAttacker, arguments: [] }); break;
      case "general-animation": push({ kind: "animation", animationId: step.animation, battler: 0, target: 0, arguments: [] }); break;
      case "faint": faintedPlayer = step.side === "player"; push({ kind: "faint-animation", battler: step.side === "player" ? 0 : 1 }); break;
      case "party-summary-next": push({ kind: "draw-party-status-summary", battler: 1 }); push({ kind: "hide-party-status-summary", battler: 1 }); break;
      case "next-mon-send-out": push({ kind: "switch-in-animation", battler: 1, partyIndex: ++sendOuts }); break;
      case "party-menu-reset":
        if (!faintedPlayer) throw new Error("party-menu-reset outside a voluntary menu or a player faint");
        push({ kind: "forced-party-menu", battlers: { player: false, opponent: true } });
        faintedPlayer = false;
        break;
      case "switch-out":
        push({ kind: "set-battler-sprite-visibility", battler: 0, invisible: true, provenanceOpcodeName: "B_SCR_OP_RETURNATKTOBALL" });
        push({ kind: "switch", battler: 0 });
        break;
      case "switch-in-finish": push({ kind: "switch-in-animation", battler: 0, partyIndex: ++playerSwitchIns }); break;
      default: throw new Error(`unmapped step ${step.kind}`);
    }
  }
  if (!done) throw new Error(`edge ${edgeIndex} of ${key} has no body`);
  return turns.map(events => Object.freeze({ events: Object.freeze(events) }));
}

const isBody = (p: Payload) => p.kind === "animation" && p.animationId === "MOVE_ANIMATION";
const requestOf = (p: Payload) => battleMoveAnimationRequest(p.battler as 0 | 1, p.target as number, p.arguments as string[]);
const isRecall = (p: Payload) => p.kind === "set-battler-sprite-visibility" && p.provenanceOpcodeName === "B_SCR_OP_RETURNATKTOBALL";

/** Replay through the production hosts (orchestrator seam as playerfaintLendHistory.ts + the voluntary menu hooks). */
export function replayVoluntaryTurns(turns: readonly Turn[], mode: "today" | "proposed") {
  let host: LiveSpriteOrderHost = createLiveSpriteOrderHost(knownEntrySpriteOrderState(ROUTE));
  let allocator: LiveSpriteAllocatorHost = createKnownEntrySpriteAllocatorProvider(ROUTE).firstMove;
  let roles: SpriteOrderOccupantRoles | null = host.tracker.occupantRoles;
  let sequence = 0;
  const allocatorLostAfter: number[] = [], allocatorReseededAt: string[] = [];
  const proposed = mode === "proposed";
  // proposal emulation: roles from the reshowBoth survivors (n2 / n5 / n8), kept through the recall and the switch-in
  const withRoles = (h: LiveSpriteOrderHost): LiveSpriteOrderHost => {
    if (!proposed) return h;
    const t = h.tracker;
    if (t.lastUnit === "reset") roles = null;
    if (t.lastUnit === "reshow" && t.occupantRoles === null && t.cursor.order.known && t.battlerSlots.player !== null) {
      const s = t.cursor.survivors[t.cursor.units - 1]!;
      roles = { healthboxMain: { player: s[2]!, opponent: s[5]! }, shadow: s[8]! };
    } else if (t.occupantRoles !== null) roles = t.occupantRoles;
    return t.occupantRoles === roles ? h : { ...h, tracker: { ...t, occupantRoles: roles } };
  };
  const reseed = () => {
    if (proposed && !allocator.historyKnown && spriteOrderTrackerRoleIsomorphic(host.tracker)
      && (host.tracker.lastUnit === "reshow" || host.tracker.lastUnit === "switch-in")) {
      allocator = createKnownEntrySpriteAllocatorProvider(ROUTE).firstMove;
      allocatorReseededAt.push(host.tracker.lastUnit);
    }
  };
  for (const [turnIndex, turn] of turns.entries()) {
    const requestId = turnIndex + 1;
    const events = turn.events.map(payload => Object.freeze({ sequence: sequence++, payload,
      provenance: payload.provenanceOpcodeName ? { opcodeName: payload.provenanceOpcodeName } : undefined }) as unknown as BattleKernelSemanticEvent);
    const marker = (turn.events[0]?.kind === "voluntary-party-menu" ? turn.events[0].outcome : null) as "cancel" | "switch" | null;
    const kernel = events.filter(e => !["forced-party-menu", "voluntary-party-menu"].includes((e.payload as unknown as Payload).kind));
    const resolution = { resolutionId: { requestId }, segmentIndex: 0, segments: [{ events: kernel }] };
    if (marker) {
      host = withRoles(openLiveSpriteOrderHostPartyMenu(host));
      allocator = invalidateLiveSpriteAllocatorHost(allocator);
    }
    if (marker === "cancel") {
      host = withRoles(returnLiveSpriteOrderHostFromPartyMenu(host, { player: true, opponent: true }));
      reseed();
    }
    host = withRoles(beginLiveSpriteOrderTurn(host, requestId, true, marker === "switch"));
    if (marker === "switch") host = withRoles(host);
    for (const [index, event] of events.entries()) {
      const payload = event.payload as unknown as Payload;
      if (payload.kind === "voluntary-party-menu") continue;
      if (payload.kind === "forced-party-menu") {
        host = withRoles(returnLiveSpriteOrderHostFromPartyMenu(openLiveSpriteOrderHostPartyMenu(host), payload.battlers as { player: boolean; opponent: boolean }));
        allocator = invalidateLiveSpriteAllocatorHost(allocator);
        continue;
      }
      if (turnIndex === turns.length - 1 && index === events.length - 1) {
        host = withRoles(advanceLiveSpriteOrderHost(host, resolution, event.sequence, true));
        return { host, allocator, lend: lendLiveSpriteOrder(host, requestOf(payload).moveId),
          allocatorInput: prepareLiveMoveSpriteAllocator(allocator, requestOf(payload)).input, allocatorLostAfter, allocatorReseededAt };
      }
      if (isBody(payload)) {
        const known = allocator.historyKnown;
        allocator = prepareLiveMoveSpriteAllocator(allocator, requestOf(payload)).next;
        if (known && !allocator.historyKnown) allocatorLostAfter.push(requestOf(payload).moveId);
      } else if (payload.kind === "draw-party-status-summary" || payload.kind === "switch-in-animation" || payload.kind === "status-animation") {
        allocator = invalidateLiveSpriteAllocatorHost(allocator);
      }
      if (proposed && isRecall(payload)) {
        // proposal: the recall is the tracker's switch-out unit (today RECALL_OPCODES invalidates "return to ball")
        host = advanceLiveSpriteOrderHost(host, resolution, event.sequence, true);
        const cursor = host.cursor!;
        host = withRoles({ ...host, tracker: applySpriteOrderPresentationEvent(host.tracker, { kind: "switch-out" }),
          cursor: { ...cursor, nextEventIndex: cursor.nextEventIndex + 1 } });
        continue;
      }
      host = withRoles(advanceLiveSpriteOrderHost(host, resolution, event.sequence));
      if (payload.kind === "switch-in-animation") {
        const before = allocator;
        allocator = reseedLiveSpriteAllocatorAfterSendOut(allocator, host, ROUTE);
        if (allocator !== before) allocatorReseededAt.push(`${host.tracker.lastUnit} (reseedLiveSpriteAllocatorAfterSendOut)`);
        reseed();
      }
    }
  }
  throw new Error("no body under test");
}

export const VOLUNTARY_FIXTURES = ["sunny-day-player", "swift-opponent", "heal-bell-player", "light-screen-player", "thunderbolt-opponent",
  "giga-drain-opponent", "swift-opponent-cancel", "sunny-day-player-cancel2", "swift-opponent-slot2", "light-screen-player-slot2",
  "heal-bell-player-slot2", "light-screen-player-cancel", "heal-bell-player-cancel", "sunny-day-player-faintko"]
  .map(name => `tools/integration/fixtures/voluntary-${name}.json`);

if (process.argv.includes("--run") || process.argv.includes("--write")) {
  const receipt = [];
  for (const path of VOLUNTARY_FIXTURES) {
    const fixture = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown> & { modelCheck: string; edgeRiseFrame: number };
    const check = JSON.parse(readFileSync(fixture.modelCheck, "utf8")) as { scenario: string; edges: { riseFrame: number; mismatches: number;
      predicted: { free: number[]; occupied: number[]; battlerSlots: number[] }; roleLend: number[] | null }[] };
    const index = check.edges.findIndex(e => e.riseFrame === fixture.edgeRiseFrame);
    const edge = check.edges[index]!;
    const turns = voluntaryTurnsToEdge(check.scenario, index);
    const row: Record<string, unknown> = { fixture: path, edge: fixture.edgeRiseFrame, modelMismatches: edge.mismatches };
    for (const mode of ["today", "proposed"] as const) {
      const replay = replayVoluntaryTurns(turns, mode);
      const view = spriteOrderTrackerPostUnitView(replay.host.tracker);
      row[mode] = { hostKnown: replay.host.tracker.cursor.order.known, invalidReason: replay.host.tracker.invalidReason,
        hostViewEqualsModel: view !== null && JSON.stringify([view.free, view.occupied, [view.battlerSlots.player, view.battlerSlots.opponent]])
          === JSON.stringify([edge.predicted.free, edge.predicted.occupied, edge.predicted.battlerSlots]),
        orderLend: replay.lend?.free ? "lent" : null, allocatorInput: replay.allocatorInput ? "present" : null,
        allocatorReseededAt: replay.allocatorReseededAt, allocatorHistoryLostAfterBodies: replay.allocatorLostAfter,
        lendEqualsRole: replay.lend?.free ? JSON.stringify(replay.lend.free) === JSON.stringify(edge.roleLend) : null };
    }
    console.log(JSON.stringify(row));
    receipt.push(row);
    if (process.argv.includes("--write")) writeFileSync(path, JSON.stringify({ ...fixture, precedingTurns: turns }, null, 1) + "\n");
  }
  if (process.argv.includes("--write")) writeFileSync("tools/integration/fixtures/voluntary/host-replay-receipt.json", JSON.stringify(receipt, null, 1) + "\n");
}
