import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createKnownEntrySpriteAllocatorProvider } from "../src/engine/knownEntrySpriteAllocator.ts";
import { invalidateLiveSpriteAllocatorHost } from "../src/engine/liveSpriteAllocator.ts";
import {
  createLiveSpriteOrderHost, liveSpriteAllocatorReseedable, reseedLiveSpriteAllocatorAfterSendOut,
} from "../src/engine/liveSpriteOrderHost.ts";
import {
  KNOWN_ENTRY_OCCUPANT_ROLES, applySpriteOrderPresentationEvent, createSpriteOrderTracker, spriteOrderEntryLabelRelabel,
  spriteOrderTrackerLend, spriteOrderTrackerPostUnitView, type SpriteOrderPresentationEvent, type SpriteOrderTracker,
} from "../src/engine/spriteOrderEventTransform.ts";
import { initSpriteOrderState, knownEntrySpriteOrderState } from "../src/engine/spriteOrderProvider.ts";
import { replayPostKoTurnsThroughHost } from "../tools/integration/postkoHostReplay.ts";
import { PLAYERFAINT_FIXTURES, playerfaintTurnsToEdge } from "../tools/integration/playerfaintLendHistory.ts";
import { PLAYER_FAINT_SWITCH, SCENARIOS, roleMap, type Roles } from "../tools/integration/playerfaintModelCheck.ts";

// Player-faint lends (docs/playerfaint-lend-audit.md §4): occupant roles in the tracker, the role relabel rho, the lend after a
// player faint + forced party menu + reshowPlayerGone + forced switch-in, and the allocator re-seed there. Hermetic: the audit's
// model-check / what-if fixtures and the drafts' recorded semantic histories only.
const FX = "tools/integration/fixtures/playerfaint/";
type View = { free: number[]; occupied: number[]; battlerSlots: number[] };
type Edge = { label: string; riseFrame: number; known: boolean; mismatches: number; predicted: View; roles: Roles;
  roleLend: number[] | null; productionLend: number[] | null };
type Check = { scenario: string; edges: Edge[] };
const modelChecks = () => readdirSync(FX).filter(name => name.startsWith("model-check-")).sort()
  .map(name => JSON.parse(readFileSync(FX + name, "utf8")) as Check);
const feed = (tracker: SpriteOrderTracker, ...events: SpriteOrderPresentationEvent[]) =>
  events.reduce(applySpriteOrderPresentationEvent, tracker);
const entry = () => createSpriteOrderTracker(knownEntrySpriteOrderState("battle-lab-ordinary-singles"));
const PROMPT: SpriteOrderPresentationEvent[] = [{ kind: "action-prompt" }, { kind: "actions-committed" }];
const FORCED = PLAYER_FAINT_SWITCH as SpriteOrderPresentationEvent[];

describe("player-faint role relabel (presentation-only)", () => {
  it("rho is the identity at the known entry; entry roles 0 / 1 / 2 (omitted roles = entry roles = today's pi)", () => {
    const view = spriteOrderTrackerPostUnitView(feed(entry(), ...PROMPT))!;
    expect(view.occupantRoles).toEqual(KNOWN_ENTRY_OCCUPANT_ROLES);
    const rho = spriteOrderEntryLabelRelabel(view)!;
    expect(rho.size).toBe(64);
    expect([...rho].every(([from, to]) => from === to)).toBe(true);
    const { occupantRoles: _roles, ...withoutRoles } = view;
    expect(spriteOrderEntryLabelRelabel(withoutRoles)).toEqual(rho);
  });

  it("the post-switch view {0,1,2,3,5,60..63}, battlers 5 / 0, roles 1 / 2 / 3 gives roleLend of model-check edge 1 (4,3,21,20,...)", () => {
    const check = modelChecks().find(c => c.scenario === "playerfaint-sunnyday-dragondance-swift")!;
    const edge = check.edges[1]!;
    expect(edge.label).toBe("241:player");
    const view = { free: edge.predicted.free, occupied: edge.predicted.occupied, battlerSlots: { player: 5, opponent: 0 },
      occupantRoles: { healthboxMain: { player: 1, opponent: 2 }, shadow: 3 } };
    expect(view.occupied).toEqual([0, 1, 2, 3, 5, 60, 61, 62, 63]);
    const rho = spriteOrderEntryLabelRelabel(view)!;
    expect(view.free.map(slot => rho.get(slot))).toEqual(edge.roleLend);
    expect(edge.roleLend!.slice(0, 4)).toEqual([4, 3, 21, 20]);
    // free slots rank-for-rank: 0->8 (battler P 5 -> 6, O 0 -> 8, hb 1 -> 0, 2 -> 1, shadow 3 -> 2), 4->3, 6->4, 7->5, 8->7
    expect(Object.fromEntries([0, 1, 2, 3, 5, 4, 6, 7, 8, 9, 60].map(slot => [slot, rho.get(slot)])))
      .toEqual({ 0: 8, 1: 0, 2: 1, 3: 2, 5: 6, 4: 3, 6: 4, 7: 5, 8: 7, 9: 9, 60: 60 });
    // the same occupancy under the entry roles (today's fixed occupants) is not role-complete
    expect(spriteOrderEntryLabelRelabel({ ...view, occupantRoles: undefined })).toBeNull();
  });

  it("null when roles are unknown (reset, reshowBoth, recall), a battler is untracked, or roles collide", () => {
    const reset = feed(entry(), { kind: "party-menu-reset" });
    expect(reset.occupantRoles).toBeNull();
    expect(createSpriteOrderTracker(initSpriteOrderState()).occupantRoles).toBeNull(); // roles kept only while occupied
    const both = feed(reset, { kind: "battle-reshow", playerBattlerPresent: true });
    expect(both.occupantRoles).toBeNull();
    expect(spriteOrderTrackerLend(both)).toBeNull();
    const recalled = feed(both, { kind: "switch-out" }, { kind: "switch-in-start" }, { kind: "switch-in-finish" });
    expect(recalled.cursor.order.known).toBe(true);
    expect(recalled.occupantRoles).toBeNull();
    expect(spriteOrderTrackerLend(feed(recalled, ...PROMPT))).toBeNull(); // voluntary switch: declines
    const view = spriteOrderTrackerPostUnitView(feed(entry(), ...FORCED, ...PROMPT))!;
    expect(spriteOrderEntryLabelRelabel({ ...view, occupantRoles: null })).toBeNull();
    expect(spriteOrderEntryLabelRelabel({ ...view, battlerSlots: { player: null, opponent: 0 } })).toBeNull();
    expect(spriteOrderEntryLabelRelabel({ ...view, occupantRoles: { healthboxMain: { player: 1, opponent: 1 }, shadow: 3 } })).toBeNull();
    // mid-chain: after the reshow (no player battler) and between the switch-in units
    expect(spriteOrderTrackerLend(feed(entry(), ...FORCED.slice(0, 3)))).toBeNull();
    expect(spriteOrderTrackerLend(feed(entry(), ...FORCED.slice(0, 4)))).toBeNull();
  });

  it("rho == the reference roleMap of playerfaintModelCheck.ts and the production tracker lends roleLend at every known model-check edge", () => {
    const checks = modelChecks();
    expect(checks.map(c => c.scenario).sort()).toEqual(Object.keys(SCENARIOS).sort());
    let lent = 0, postSwitch = 0, entryLent = 0, unknown = 0, productionLentBefore = 0;
    for (const check of checks) {
      let tracker = entry();
      let index = 0;
      for (const step of SCENARIOS[check.scenario]!) {
        if (step.kind !== "edge") { tracker = applySpriteOrderPresentationEvent(tracker, step); continue; }
        const edge = check.edges[index++]!;
        expect(edge.label).toBe(step.label);
        const lend = spriteOrderTrackerLend(tracker);
        if (!edge.known) { expect(lend).toBeNull(); unknown += 1; continue; }
        expect(edge.mismatches, `${check.scenario} ${edge.label}`).toBe(0);
        const view = spriteOrderTrackerPostUnitView(tracker)!;
        expect([[...view.free], [...view.occupied], [view.battlerSlots.player, view.battlerSlots.opponent]])
          .toEqual([edge.predicted.free, edge.predicted.occupied, edge.predicted.battlerSlots]);
        const reference = roleMap(view, { ...edge.roles, battler: { player: view.battlerSlots.player, opponent: view.battlerSlots.opponent } })!;
        const rho = spriteOrderEntryLabelRelabel(view)!;
        expect([...rho].sort((l, r) => l[0] - r[0])).toEqual([...reference].sort((l, r) => l[0] - r[0]));
        expect(lend, `${check.scenario} ${edge.label} @${edge.riseFrame}`).toEqual(edge.roleLend);
        if (edge.productionLend !== null) { expect(lend).toEqual(edge.productionLend); productionLentBefore += 1; }
        lent += 1;
        if (view.battlerSlots.player === 5 && view.battlerSlots.opponent === 0) postSwitch += 1;
        if (step.geometry === "entry") entryLent += 1;
      }
      expect(index).toBe(check.edges.length);
    }
    // 41 known edges (7 entry + 27 after a forced switch-in + 7 after an opponent KO), all lent; 4 strict-unknown (202:player).
    expect({ lent, postSwitch, entryLent, unknown, productionLentBefore }).toEqual({ lent: 41, postSwitch: 27, entryLent: 7, unknown: 4, productionLentBefore: 14 });
  });
});

describe("player-faint lends through the production hosts (recorded histories + forced-party-menu marker)", () => {
  it("each fixture's precedingTurns are the scenario history; the host replay lends roleLend and supplies the re-seeded allocator input", () => {
    expect(PLAYERFAINT_FIXTURES).toHaveLength(13);
    const allocatorMoves: Record<string, unknown> = {};
    for (const path of PLAYERFAINT_FIXTURES) {
      const fixture = JSON.parse(readFileSync(path, "utf8")) as { move: string; modelCheck: string; edgeRiseFrame: number;
        precedingTurns: { events: Record<string, unknown>[] }[] };
      const check = JSON.parse(readFileSync(fixture.modelCheck, "utf8")) as Check;
      const index = check.edges.findIndex(e => e.riseFrame === fixture.edgeRiseFrame);
      const edge = check.edges[index]!;
      expect(fixture.precedingTurns, path).toEqual(JSON.parse(JSON.stringify(playerfaintTurnsToEdge(check.scenario, index))));
      const markers = fixture.precedingTurns.flatMap(t => t.events).filter(e => e.kind === "forced-party-menu");
      expect(markers.length, path).toBe(path.includes("secondko") ? 0 : path.includes("twice") ? 2 : 1);
      const lend = replayPostKoTurnsThroughHost(fixture.precedingTurns as never);
      expect(lend.host.tracker.cursor.order.known, path).toBe(true);
      expect(lend.spriteOrderInput?.free, path).toEqual(edge.roleLend);
      if (lend.spriteAllocatorInput !== undefined) allocatorMoves[fixture.move] = lend.spriteAllocatorInput;
      // the role what-if receipt rendered exactly this lend over the full window on both fresh runs
      const whatif = JSON.parse(readFileSync(`${FX}whatif-${path.replace(/^.*playerfaint-|\.json$/g, "")}.whatif-role.json`, "utf8")) as
        { lendFree?: number[]; rows: number; exactRows: number | number[] };
      if (whatif.lendFree) expect(lend.spriteOrderInput?.free, path).toEqual(whatif.lendFree);
    }
    // Light Screen / Protect after the forced switch-in: the re-seeded entry-label allocator host (wall 3, as at the entry).
    expect(allocatorMoves.LIGHT_SCREEN).toMatchObject({ wall: 3 });
    expect(allocatorMoves.PROTECT).toBeDefined();
  });

  it("allocator re-seed: after a forced switch-in (roles known) and after a send-out; never after the voluntary chain or mid-chain", () => {
    const firstMove = createKnownEntrySpriteAllocatorProvider("ordinary-factory").firstMove;
    const invalid = invalidateLiveSpriteAllocatorHost(firstMove);
    const at = (...events: SpriteOrderPresentationEvent[]) =>
      Object.freeze({ ...createLiveSpriteOrderHost(knownEntrySpriteOrderState("ordinary-factory")), tracker: feed(entry(), ...events) });
    expect(liveSpriteAllocatorReseedable(at(...FORCED))).toBe(true);
    expect(reseedLiveSpriteAllocatorAfterSendOut(invalid, at(...FORCED))).toEqual(firstMove);
    expect(reseedLiveSpriteAllocatorAfterSendOut(invalid, at(...FORCED, ...FORCED))).toEqual(firstMove); // second forced menu
    expect(reseedLiveSpriteAllocatorAfterSendOut(invalid, at(...FORCED.slice(0, 4)))).toBe(invalid); // switch-in start only
    expect(reseedLiveSpriteAllocatorAfterSendOut(invalid, at(...FORCED, { kind: "action-prompt" }))).toBe(invalid);
    expect(reseedLiveSpriteAllocatorAfterSendOut(firstMove, at(...FORCED))).toBe(firstMove);
    const voluntary = at({ kind: "party-menu-reset" }, { kind: "battle-reshow", playerBattlerPresent: true }, { kind: "switch-out" },
      { kind: "switch-in-start" }, { kind: "switch-in-finish" });
    expect(voluntary.tracker.lastUnit).toBe("switch-in");
    expect(liveSpriteAllocatorReseedable(voluntary)).toBe(false);
    expect(reseedLiveSpriteAllocatorAfterSendOut(invalid, voluntary)).toBe(invalid);
  });
});
