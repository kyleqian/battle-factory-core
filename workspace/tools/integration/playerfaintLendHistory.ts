// Player-faint semantic histories + replay through the PRODUCTION live hosts (docs/playerfaint-lend-audit.md s4). Extends
// postkoLendHistory.ts / postkoHostReplay.ts: the history of each playerfaint scenario (playerfaintModelCheck.ts SCENARIOS, written from the
// battle script, never from masks) as BattleKernelSemanticEvent payload turns, plus one orchestrator marker the kernel stream does not carry:
//   { kind: "forced-party-menu", battlers }  = the forced party handoff after the player faint (orchestrator phase `forced-party-handoff`):
//   replayed as openLiveSpriteOrderHostPartyMenu + returnLiveSpriteOrderHostFromPartyMenu(battlers), i.e. reset + reshowPlayerGone.
// The replay reports, at each fixture's body edge, today's production lend (lendLiveSpriteOrder), today's allocator input, the host
// tracker's post-unit view vs the model check's prediction, and the role lend of that view (playerfaintModelCheck.ts roleMap).
//   npx vite-node tools/integration/playerfaintLendHistory.ts -- --run | --write   (records `precedingTurns` into the playerfaint fixtures + receipt)
import { readFileSync, writeFileSync } from "node:fs";
import type { BattleKernelSemanticEvent } from "../../src/engine/battleDecisionBoundary.ts";
import { battleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import { createKnownEntrySpriteAllocatorProvider } from "../../src/engine/knownEntrySpriteAllocator.ts";
import { prepareLiveMoveSpriteAllocator } from "../../src/engine/liveMoveSpriteAllocator.ts";
import { invalidateLiveSpriteAllocatorHost } from "../../src/engine/liveSpriteAllocator.ts";
import {
  advanceLiveSpriteOrderHost, beginLiveSpriteOrderTurn, createLiveSpriteOrderHost, lendLiveSpriteOrder, openLiveSpriteOrderHostPartyMenu,
  reseedLiveSpriteAllocatorAfterSendOut, returnLiveSpriteOrderHostFromPartyMenu,
} from "../../src/engine/liveSpriteOrderHost.ts";
import { spriteOrderTrackerPostUnitView } from "../../src/engine/spriteOrderEventTransform.ts";
import { knownEntrySpriteOrderState } from "../../src/engine/spriteOrderProvider.ts";
import { roleMap, SCENARIOS, type Roles, type Step } from "./playerfaintModelCheck.ts";

type Payload = Readonly<Record<string, unknown> & { kind: string }>;
type Turn = Readonly<{ events: readonly Payload[] }>;
const STATUS_BITS: Record<string, number> = { PRZ: 0x40, PSN: 0x8, SLP: 0x1 };

/** Semantic payload turns of `key` up to and including the body after model-check edge `edgeIndex` (one turn per action prompt). */
export function playerfaintTurnsToEdge(key: string, edgeIndex: number): Turn[] {
  const steps = SCENARIOS[key];
  if (!steps) throw new Error(`unknown scenario ${key}`);
  const turns: Payload[][] = [];
  let edge = -1, sideOfEdge: 0 | 1 = 0, lastAttacker: 0 | 1 = 0, done = false, sendOuts = 0;
  const push = (payload: Payload) => turns[turns.length - 1]!.push(Object.freeze(payload));
  for (const step of steps as Step[]) {
    if (done) break;
    switch (step.kind) {
      case "action-prompt": turns.push([]); break;
      case "actions-committed": case "battle-reshow": case "switch-in-start": case "party-summary-hide": break;
      case "edge": edge += 1; sideOfEdge = step.label.endsWith(":opponent") ? 1 : 0; break;
      case "move-animation": {
        const battler = step.attackerSide === "player" ? 0 : 1;
        lastAttacker = battler;
        push({ kind: "animation", animationId: "MOVE_ANIMATION", battler, target: 1 - battler, arguments: [String(step.moveId), "0", "0", "0", "0", "0"] });
        if (edge === edgeIndex) done = true;
        break;
      }
      case "hit-animation": push({ kind: "animation", animationId: "HIT_ANIMATION", battler: 1 - lastAttacker, target: 1 - lastAttacker, arguments: [] }); break;
      case "stat-animation": push({ kind: "animation", animationId: "STATS_CHANGE", battler: sideOfEdge, target: sideOfEdge, arguments: [String(step.argument)] }); break;
      case "status-animation": push({ kind: "status-animation", battler: sideOfEdge, isStatus2: 0, status: STATUS_BITS[step.status]! }); break;
      case "general-animation": push({ kind: "animation", animationId: step.animation, battler: 0, target: 0, arguments: [] }); break;
      case "faint": push({ kind: "faint-animation", battler: step.side === "player" ? 0 : 1 }); break;
      case "party-summary-next": push({ kind: "draw-party-status-summary", battler: 1 }); push({ kind: "hide-party-status-summary", battler: 1 }); break;
      case "next-mon-send-out": push({ kind: "switch-in-animation", battler: 1, partyIndex: ++sendOuts }); break;
      case "party-menu-reset": push({ kind: "forced-party-menu", battlers: { player: false, opponent: true } }); break;
      case "switch-in-finish": push({ kind: "switch-in-animation", battler: 0, partyIndex: key.includes("slot2") ? 2 : 1 }); break;
      default: throw new Error(`unmapped step ${step.kind}`);
    }
  }
  if (!done) throw new Error(`edge ${edgeIndex} of ${key} has no body`);
  return turns.map(events => Object.freeze({ events: Object.freeze(events) }));
}

const isBody = (p: Payload) => p.kind === "animation" && p.animationId === "MOVE_ANIMATION";
const requestOf = (p: Payload) => battleMoveAnimationRequest(p.battler as 0 | 1, p.target as number, p.arguments as string[]);

/** Replay through today's production hosts (orchestrator seam as postkoHostReplay.ts + the forced party-menu hooks). */
export function replayPlayerfaintTurns(turns: readonly Turn[]) {
  const route = "battle-lab-ordinary-singles" as const;
  let host = createLiveSpriteOrderHost(knownEntrySpriteOrderState(route));
  let allocator = createKnownEntrySpriteAllocatorProvider(route).firstMove;
  let sequence = 0;
  for (const [turnIndex, turn] of turns.entries()) {
    const requestId = turnIndex + 1;
    // the marker is not a kernel event: split it out, apply the hooks between the kernel events around it
    const events = turn.events.map(payload => Object.freeze({ sequence: sequence++, payload, provenance: undefined }) as unknown as BattleKernelSemanticEvent);
    const resolution = { resolutionId: { requestId }, segmentIndex: 0, segments: [{ events: events.filter(e => (e.payload as Payload).kind !== "forced-party-menu") }] };
    host = beginLiveSpriteOrderTurn(host, requestId, true);
    for (const [index, event] of events.entries()) {
      const payload = event.payload as unknown as Payload;
      if (payload.kind === "forced-party-menu") {
        host = returnLiveSpriteOrderHostFromPartyMenu(openLiveSpriteOrderHostPartyMenu(host), payload.battlers as { player: boolean; opponent: boolean });
        allocator = invalidateLiveSpriteAllocatorHost(allocator);
        continue;
      }
      if (turnIndex === turns.length - 1 && index === events.length - 1) {
        host = advanceLiveSpriteOrderHost(host, resolution, event.sequence, true);
        return { host, allocator, lend: lendLiveSpriteOrder(host, requestOf(payload).moveId),
          allocatorInput: prepareLiveMoveSpriteAllocator(allocator, requestOf(payload)).input };
      }
      if (isBody(payload)) allocator = prepareLiveMoveSpriteAllocator(allocator, requestOf(payload)).next;
      else if (payload.kind === "draw-party-status-summary" || payload.kind === "switch-in-animation" || payload.kind === "status-animation") {
        allocator = invalidateLiveSpriteAllocatorHost(allocator);
      }
      host = advanceLiveSpriteOrderHost(host, resolution, event.sequence);
      if (payload.kind === "switch-in-animation") allocator = reseedLiveSpriteAllocatorAfterSendOut(allocator, host, route);
    }
  }
  throw new Error("no body under test");
}

export const PLAYERFAINT_FIXTURES = ["sunny-day-player", "swift-opponent", "dragon-dance-player", "swift-player", "protect-player",
  "thunderbolt-opponent", "light-screen-player", "heal-bell-player", "giga-drain-player", "secondko-sunny-day-player", "slot2-sunny-day-player"]
  .map(name => `tools/integration/fixtures/playerfaint-${name}.json`);

if (process.argv.includes("--run") || process.argv.includes("--write")) {
  const receipt = [];
  for (const path of PLAYERFAINT_FIXTURES) {
    const fixture = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown> & { modelCheck: string; edgeRiseFrame: number };
    const check = JSON.parse(readFileSync(fixture.modelCheck, "utf8")) as { scenario: string; edges: { riseFrame: number; mismatches: number;
      predicted: { free: number[]; occupied: number[]; battlerSlots: number[] }; roles: Roles; roleLend: number[] | null }[] };
    const index = check.edges.findIndex(e => e.riseFrame === fixture.edgeRiseFrame);
    const edge = check.edges[index]!;
    const turns = playerfaintTurnsToEdge(check.scenario, index);
    const replay = replayPlayerfaintTurns(turns);
    const view = spriteOrderTrackerPostUnitView(replay.host.tracker);
    const rho = view ? roleMap(view, { ...edge.roles, battler: { player: view.battlerSlots.player, opponent: view.battlerSlots.opponent } }) : null;
    const row = { fixture: path, edge: fixture.edgeRiseFrame, hostKnown: replay.host.tracker.cursor.order.known, invalidReason: replay.host.tracker.invalidReason,
      hostViewEqualsModel: view !== null && JSON.stringify([view.free, view.occupied, [view.battlerSlots.player, view.battlerSlots.opponent]])
        === JSON.stringify([edge.predicted.free, edge.predicted.occupied, edge.predicted.battlerSlots]),
      todayOrderLend: replay.lend?.free ? "lent" : null, todayAllocatorInput: replay.allocatorInput ? "present" : null,
      todayLendEqualsRole: replay.lend?.free ? JSON.stringify(replay.lend.free) === JSON.stringify(edge.roleLend) : null,
      roleLendFromHostEqualsModel: rho && view ? JSON.stringify(view.free.map(s => rho.get(s))) === JSON.stringify(edge.roleLend) : false };
    console.log(JSON.stringify(row));
    receipt.push(row);
    if (process.argv.includes("--write")) writeFileSync(path, JSON.stringify({ ...fixture, precedingTurns: turns }, null, 1) + "\n");
  }
  if (process.argv.includes("--write")) writeFileSync("tools/integration/fixtures/playerfaint/host-replay-receipt.json", JSON.stringify(receipt, null, 1) + "\n");
}
