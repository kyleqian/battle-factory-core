import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createKnownEntrySpriteAllocatorProvider } from "../src/engine/knownEntrySpriteAllocator.ts";
import { invalidateLiveSpriteAllocatorHost } from "../src/engine/liveSpriteAllocator.ts";
import { createLiveSpriteOrderHost, reseedLiveSpriteAllocatorAfterSendOut } from "../src/engine/liveSpriteOrderHost.ts";
import {
  applySpriteOrderPresentationEvent, createSpriteOrderTracker, spriteOrderEntryLabelRelabel, spriteOrderTrackerLend,
  spriteOrderTrackerPostUnitView, spriteOrderTrackerRoleIsomorphic, type SpriteOrderPresentationEvent, type SpriteOrderTracker,
} from "../src/engine/spriteOrderEventTransform.ts";
import { KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER, knownEntrySpriteOrderState } from "../src/engine/spriteOrderProvider.ts";
import { replayPostKoTurnsThroughHost } from "../tools/integration/postkoHostReplay.ts";
import { POSTKO_DENSE_FIXTURES, postkoFixtureEdge, postkoTrackerSteps, postkoTurnsToEdge } from "../tools/integration/postkoLendHistory.ts";
import { SCENARIOS } from "../tools/integration/postkoModelCheck.ts";

// Rung 2 of the post-KO lends (docs/postko-consumer-audit.md §3.1 / §4): the lend gate is "known, no prompt pair, occupancy
// role-isomorphic to the known entry" and the lend is the entry-label relabel pi(F). Hermetic: model-check / what-if fixtures only.
const FX = "tools/integration/fixtures/postko/";
type View = { free: number[]; occupied: number[]; battlerSlots: number[] };
type Edge = { label: string; riseFrame?: number; known?: boolean; mismatches?: number; rung2Lend: View | null };
const modelCheck = (key: string) => JSON.parse(readFileSync(`${FX}model-check-${key}.json`, "utf8")) as { scenario: string; edges: Edge[] };

/** Independent reference relabel (= entryLabelLend of tools/integration/postkoWhatIf.ts). */
function referenceRelabel(view: View): number[] {
  const ENTRY_OCCUPIED = [0, 1, 2, 6, 8, 60, 61, 62, 63];
  const post = [...view.free].sort((l, r) => l - r);
  const entry = Array.from({ length: 64 }, (_, s) => s).filter(s => !ENTRY_OCCUPIED.includes(s));
  const pi = new Map(post.map((slot, i) => [slot, entry[i]!] as const));
  return view.free.map(slot => pi.get(slot)!);
}

function feed(tracker: SpriteOrderTracker, ...events: SpriteOrderPresentationEvent[]) {
  for (const event of events) tracker = applySpriteOrderPresentationEvent(tracker, event);
  return tracker;
}
const entry = () => createSpriteOrderTracker(knownEntrySpriteOrderState("ordinary-factory"));
const KO: SpriteOrderPresentationEvent[] = [{ kind: "faint", side: "opponent" }, { kind: "party-summary-next" },
  { kind: "party-summary-hide" }, { kind: "next-mon-send-out" }];

describe("post-KO entry-label lend (rung 2, presentation-only)", () => {
  it("pi is the identity at the known entry: the lend is the tracked free order itself", () => {
    const tracker = feed(entry(), { kind: "action-prompt" }, { kind: "actions-committed" });
    const view = spriteOrderTrackerPostUnitView(tracker)!;
    const pi = spriteOrderEntryLabelRelabel(view)!;
    expect([...pi.entries()].every(([from, to]) => from === to)).toBe(true);
    expect(pi.size).toBe(64);
    expect(spriteOrderTrackerLend(tracker)).toBe(tracker.cursor.order.free);
    expect(spriteOrderTrackerLend(tracker)).toEqual(KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER);
  });

  it("post-KO free [3,4,21,20,7,...] lends [3,4,21,20,5,...] (battler 5 -> 8, free 7 -> 5, 8 -> 7), never the raw F", () => {
    const tracker = feed(entry(), { kind: "action-prompt" }, { kind: "actions-committed" },
      { kind: "move-animation", moveId: 53, attackerSide: "player" }, { kind: "hit-animation", targetVisible: true }, ...KO,
      { kind: "action-prompt" }, { kind: "actions-committed" });
    const view = spriteOrderTrackerPostUnitView(tracker)!;
    expect(view.occupied).toEqual([0, 1, 2, 5, 6, 60, 61, 62, 63]);
    expect(view.battlerSlots).toEqual({ player: 6, opponent: 5 });
    expect(view.free.slice(0, 5)).toEqual([3, 4, 21, 20, 7]);
    const lend = spriteOrderTrackerLend(tracker)!;
    expect(lend.slice(0, 5)).toEqual([3, 4, 21, 20, 5]);
    expect(lend).toEqual(referenceRelabel({ ...view, free: [...view.free], occupied: [...view.occupied], battlerSlots: [6, 5] }));
    expect([...lend].sort((l, r) => l - r)).toEqual([...KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER].sort((l, r) => l - r));
    expect(spriteOrderEntryLabelRelabel(view)!.get(5)).toBe(8);
  });

  it("declines off the role-isomorphic occupancy: player-faint reshow {0,1,2,3,5,60..63}, mid-summary, prompt pair alive", () => {
    let tracker = feed(entry(), ...KO.slice(0, 2));
    expect(spriteOrderTrackerPostUnitView(tracker)).not.toBeNull();
    expect(spriteOrderTrackerLend(tracker)).toBeNull(); // mid-summary
    tracker = feed(tracker, ...KO.slice(2), { kind: "action-prompt" });
    expect(tracker.promptPair).not.toBeNull();
    expect(spriteOrderTrackerLend(tracker)).toBeNull(); // prompt pair alive
    tracker = feed(tracker, { kind: "actions-committed" });
    expect(spriteOrderTrackerLend(tracker)).not.toBeNull();
    tracker = feed(tracker, { kind: "faint", side: "player" });
    expect(spriteOrderTrackerLend(tracker)).toBeNull(); // player battler gone
    tracker = feed(tracker, { kind: "party-menu-reset" }, { kind: "party-menu-reset" }, { kind: "battle-reshow", playerBattlerPresent: false },
      { kind: "switch-in-start" }, { kind: "switch-in-finish" });
    expect(tracker.cursor.occupied).toEqual([0, 1, 2, 3, 5, 60, 61, 62, 63]);
    expect(tracker.battlerSlots).toEqual({ player: 5, opponent: 0 });
    expect(spriteOrderTrackerLend(tracker)).toBeNull(); // player-faint reshow geometry (out of scope)
    expect(spriteOrderTrackerRoleIsomorphic(tracker)).toBe(false);
    expect(spriteOrderEntryLabelRelabel({ free: [], occupied: [0, 1, 2, 5, 6, 60, 61, 62, 63], battlerSlots: { player: 6, opponent: null } })).toBeNull();
  });

  it("the production tracker fed each model-check scenario lends pi(F) of model-check-*.json at every known edge", () => {
    const files = readdirSync(FX).filter(name => name.startsWith("model-check-")).sort();
    expect(files).toHaveLength(8);
    let lent = 0, postKoLent = 0, declined = 0;
    for (const file of files) {
      const check = modelCheck(file.replace(/^model-check-|\.json$/g, ""));
      expect(Object.keys(SCENARIOS)).toContain(check.scenario);
      let tracker = createSpriteOrderTracker(knownEntrySpriteOrderState("battle-lab-ordinary-singles"));
      for (const step of postkoTrackerSteps(check.scenario)) {
        if (step.kind !== "edge") { tracker = applySpriteOrderPresentationEvent(tracker, step); continue; }
        const edge = check.edges[step.index]!;
        expect(edge.label).toBe(step.label);
        const lend = spriteOrderTrackerLend(tracker);
        if (edge.rung2Lend === null) { expect(lend, `${check.scenario} ${edge.label}`).toBeNull(); declined += 1; continue; }
        expect(edge.mismatches).toBe(0);
        expect([...spriteOrderTrackerPostUnitView(tracker)!.free]).toEqual(edge.rung2Lend.free);
        expect(lend, `${check.scenario} ${edge.label} @${edge.riseFrame}`).toEqual(referenceRelabel(edge.rung2Lend));
        lent += 1;
        if (edge.rung2Lend.battlerSlots[1] !== 8) postKoLent += 1;
      }
    }
    // 37 known edges (8 entry + 29 post-KO) of the audit, all lent; the 8 strict-unknown edges (no EXACT plan) decline.
    expect({ lent, postKoLent, declined }).toEqual({ lent: 37, postKoLent: 29, declined: 8 });
  });

  it("the production HOST replay of each dense fixture's history lends exactly whatif-*-relabel.json lendFree", () => {
    const relabels = readdirSync(FX).filter(name => name.endsWith(".whatif-relabel.json"));
    expect(relabels).toHaveLength(11);
    for (const path of POSTKO_DENSE_FIXTURES) {
      const fixture = JSON.parse(readFileSync(path, "utf8")) as { modelCheck: string; edgeRiseFrame: number; move: string;
        precedingTurns: { events: Record<string, unknown>[] }[] };
      const { key, index } = postkoFixtureEdge(fixture);
      expect(fixture.precedingTurns, path).toEqual(JSON.parse(JSON.stringify(postkoTurnsToEdge(key, index))));
      const lend = replayPostKoTurnsThroughHost(fixture.precedingTurns as never);
      const edge = modelCheck(key).edges[index]!;
      expect(lend.spriteOrderInput?.free, path).toEqual(edge.rung2Lend ? referenceRelabel(edge.rung2Lend) : undefined);
      const whatif = relabels.find(name => path.endsWith(`postko-${name.replace(/^whatif-|\.whatif-relabel\.json$/g, "")}.json`));
      if (whatif) {
        const receipt = JSON.parse(readFileSync(FX + whatif, "utf8")) as { lendFree: number[]; rows: number; exactRows: number };
        expect(lend.spriteOrderInput?.free, whatif).toEqual(receipt.lendFree);
        expect(receipt.exactRows).toBe(receipt.rows);
      }
    }
  });

  it("allocator host: re-seeded to the known-entry firstMove host after a modelled send-out, invalid otherwise", () => {
    const firstMove = createKnownEntrySpriteAllocatorProvider("ordinary-factory").firstMove;
    const invalid = invalidateLiveSpriteAllocatorHost(firstMove);
    const at = (...events: SpriteOrderPresentationEvent[]) =>
      Object.freeze({ ...createLiveSpriteOrderHost(knownEntrySpriteOrderState("ordinary-factory")), tracker: feed(entry(), ...events) });
    expect(reseedLiveSpriteAllocatorAfterSendOut(invalid, at(...KO))).toEqual(firstMove);
    expect(reseedLiveSpriteAllocatorAfterSendOut(invalid, at(...KO.slice(0, 3)))).toBe(invalid); // no send-out yet
    expect(reseedLiveSpriteAllocatorAfterSendOut(invalid, at(...KO, { kind: "action-prompt" }))).toBe(invalid); // prompt pair alive
    expect(reseedLiveSpriteAllocatorAfterSendOut(invalid, at({ kind: "invalidate", reason: "test" }, ...KO))).toBe(invalid);
    expect(reseedLiveSpriteAllocatorAfterSendOut(firstMove, at(...KO))).toBe(firstMove);
    // Light Screen after the opponent KO: the host replay hands the entry-label allocator slots (wall 3, sparkles 4,5,7).
    const lightScreen = JSON.parse(readFileSync("tools/integration/fixtures/postko-light-screen-player.json", "utf8"));
    expect(replayPostKoTurnsThroughHost(lightScreen.precedingTurns).spriteAllocatorInput).toMatchObject({ wall: 3 });
  });
});
