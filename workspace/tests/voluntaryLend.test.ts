import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { BattleKernelSemanticEvent } from "../src/engine/battleDecisionBoundary.ts";
import { createKnownEntrySpriteAllocatorProvider } from "../src/engine/knownEntrySpriteAllocator.ts";
import { invalidateLiveSpriteAllocatorHost } from "../src/engine/liveSpriteAllocator.ts";
import {
  advanceLiveSpriteOrderHost, beginLiveSpriteOrderTurn, createLiveSpriteOrderHost, lendLiveSpriteOrder,
  liveSpriteAllocatorReseedable, openLiveSpriteOrderHostPartyMenu, reseedLiveSpriteAllocatorAfterSendOut,
  returnLiveSpriteOrderHostFromPartyMenu,
} from "../src/engine/liveSpriteOrderHost.ts";
import {
  applySpriteOrderPresentationEvent, createSpriteOrderTracker, decodeSpriteOrderPlan, invalidateSpriteOrderTracker,
  spriteOrderRecallPlanText, spriteOrderTrackerLend, spriteOrderTrackerPostUnitView,
  type SpriteOrderPresentationEvent, type SpriteOrderTracker,
} from "../src/engine/spriteOrderEventTransform.ts";
import { applySpriteOrderUnitPlan, knownEntrySpriteOrderState } from "../src/engine/spriteOrderProvider.ts";
import { replayPostKoTurnsThroughHost, type PostKoTurn } from "../tools/integration/postkoHostReplay.ts";
import { VOLUNTARY_FIXTURES } from "../tools/integration/voluntaryLendHistory.ts";
import { SCENARIOS } from "../tools/integration/voluntaryModelCheck.ts";

// docs/voluntary-switch-lend-audit.md §4: reshowBoth sets the occupant roles from its survivors n2 / n5 / n8, the voluntary recall
// (`returnatktoball`, battler 0) is the tracker's switch-out unit and keeps the roles, and the allocator is re-seeded after the
// cancel return and after the voluntary switch-in.
const ROUTE = "battle-lab-ordinary-singles" as const;
const feed = (tracker: SpriteOrderTracker, ...events: SpriteOrderPresentationEvent[]) =>
  events.reduce(applySpriteOrderPresentationEvent, tracker);
const entry = () => createSpriteOrderTracker(knownEntrySpriteOrderState(ROUTE));
const RESHOW: SpriteOrderPresentationEvent[] = [{ kind: "party-menu-reset" }, { kind: "party-menu-reset" },
  { kind: "battle-reshow", playerBattlerPresent: true }];
const PROMPT: SpriteOrderPresentationEvent[] = [{ kind: "action-prompt" }, { kind: "actions-committed" }];
const SWITCH: SpriteOrderPresentationEvent[] = [{ kind: "switch-out" }, { kind: "switch-in-start" }, { kind: "switch-in-finish" }];
type Edge = { riseFrame: number; label: string; mismatches: number; roleLend: number[] | null; predicted: { free: number[] } };
const modelCheck = (key: string) => JSON.parse(readFileSync(`tools/integration/fixtures/voluntary/model-check-${key}.json`, "utf8")) as
  { scenario: string; edges: Edge[] };

describe("voluntary party menu: reshowBoth roles, recall switch-out (presentation-only)", () => {
  it("reshowBoth from any tracker: roles {2, 3, 4}, battlers 0 / 1, lend = cancel-slot1 edge 0; recall + switch-in: battlers 5 / 1, roles kept, lend = edge 4", () => {
    const edges = modelCheck("voluntary-cancel-slot1").edges;
    const forced = feed(entry(), { kind: "faint", side: "player" }, { kind: "party-menu-reset" },
      { kind: "battle-reshow", playerBattlerPresent: false }, { kind: "switch-in-start" }, { kind: "switch-in-finish" });
    for (const start of [entry(), invalidateSpriteOrderTracker(entry(), "test"), forced, feed(entry(), ...PROMPT)]) {
      const reshown = feed(start, ...RESHOW);
      expect(reshown.cursor.order.known).toBe(true);
      expect(reshown.battlerSlots).toEqual({ player: 0, opponent: 1 });
      expect(reshown.occupantRoles).toEqual({ healthboxMain: { player: 2, opponent: 3 }, shadow: 4 });
      expect(spriteOrderTrackerLend(reshown)).toEqual(edges[3]!.roleLend); // the recall edge: no prompt pair in between
      expect(spriteOrderTrackerLend(feed(reshown, ...PROMPT))).toEqual(edges[0]!.roleLend);
      expect(edges[0]!.roleLend!.slice(0, 6)).toEqual([3, 4, 5, 7, 9, 10]);
      const recalled = feed(reshown, { kind: "switch-out" });
      expect(recalled.lastUnit).toBe("recall");
      expect(recalled.occupantRoles).toEqual(reshown.occupantRoles);
      expect(spriteOrderTrackerLend(recalled)).toBeNull(); // mid-chain: player battler untracked
      const switched = feed(recalled, { kind: "switch-in-start" }, { kind: "switch-in-finish" });
      expect(switched.battlerSlots).toEqual({ player: 5, opponent: 1 });
      expect(switched.occupantRoles).toEqual(reshown.occupantRoles);
      expect(spriteOrderTrackerLend(switched)).toEqual(edges[4]!.roleLend);
      expect(edges[4]!.roleLend!.slice(0, 4)).toEqual([21, 20, 4, 19]);
    }
  });

  it("the production tracker lends roleLend at all 45 model-check edges of the 7 voluntary scenarios (before: null after a menu)", () => {
    let edgesSeen = 0, lent = 0, afterMenu = 0;
    for (const key of Object.keys(SCENARIOS)) {
      const check = modelCheck(key);
      let tracker = entry(), index = 0, menu = false;
      for (const step of SCENARIOS[key]!) {
        if (step.kind === "party-menu-reset") menu = true;
        if (step.kind !== "edge") { tracker = applySpriteOrderPresentationEvent(tracker, step); continue; }
        const edge = check.edges[index++]!;
        expect(edge.label).toBe(step.label);
        expect(edge.mismatches).toBe(0);
        edgesSeen += 1;
        expect(spriteOrderTrackerLend(tracker)).toEqual(edge.roleLend);
        expect(spriteOrderTrackerPostUnitView(tracker)?.free ?? null).toEqual(edge.predicted.free);
        if (edge.roleLend !== null) { lent += 1; if (menu) afterMenu += 1; }
      }
      expect(index).toBe(check.edges.length);
    }
    // afterMenu: every edge after a voluntary or forced party menu (all but the two faint-ko scenarios' entry bodies)
    expect({ edgesSeen, lent, afterMenu }).toEqual({ edgesSeen: 45, lent: 45, afterMenu: 43 });
  });

  it("recall group order (§2.3): the four candidate plans converge to the same F after the switch-in", () => {
    const tail = Array.from({ length: 13 }, (_, i) => `D${i + 3}`).join(";");
    const head = `${"Cf;".repeat(16)}D0;D1;`;
    const reshown = feed(entry(), ...RESHOW);
    const slot = reshown.battlerSlots.player!;
    const after = (text: string) => {
      let cursor = reshown.cursor;
      for (const plan of [decodeSpriteOrderPlan(text), decodeSpriteOrderPlan("Cff;Cf"),
        decodeSpriteOrderPlan("Cf;Cf;Cf;Cf;Cf;Cf;Cf;Cf;Cf;Cf;Cf;Cf;Cf;Dc1.2;Cf;Cf;Cf;Dc1.0;D0;D1;D2;D3;D4;D5;D6;D7;D8;D9;D10;D11;D12;D13;D14;D15")]) {
        cursor = applySpriteOrderUnitPlan(cursor, plan)!;
        expect(cursor.order.known).toBe(true);
      }
      return cursor.order.free;
    };
    const production = after(spriteOrderRecallPlanText(slot));
    expect(production).toEqual(spriteOrderTrackerPostUnitView(feed(reshown, ...SWITCH))!.free);
    for (const text of [`${head}Do${slot},2;${tail}`, `${head}Do${slot};D2;${tail}`, `${head}D2;${tail};Do${slot}`]) {
      expect(after(text)).toEqual(production);
    }
  });
});

describe("voluntary recall mapping in the live host (recorded opcodes)", () => {
  const ev = (sequence: number, payload: object, opcodeName?: string) =>
    ({ sequence, payload, provenance: opcodeName ? { opcodeName } : undefined }) as unknown as BattleKernelSemanticEvent;
  const resolve = (events: BattleKernelSemanticEvent[]) => {
    const host = beginLiveSpriteOrderTurn(createLiveSpriteOrderHost(knownEntrySpriteOrderState(ROUTE)), 1, true, true);
    expect(host.tracker.lastUnit).toBe("reshow");
    return advanceLiveSpriteOrderHost(host, { resolutionId: { requestId: 1 }, segmentIndex: 0, segments: [{ events }] },
      Number.POSITIVE_INFINITY);
  };
  const hide = (battler: 0 | 1, opcodeName: string) =>
    ev(-1, { kind: "set-battler-sprite-visibility", battler, invisible: true }, opcodeName);
  const sendIn = ev(2, { kind: "switch-in-animation", battler: 0, partyIndex: 1 });

  it("B_SCR_OP_RETURNATKTOBALL of battler 0 (synthesized-voluntary-switch) -> switch-out; the switch-in completes with roles kept", () => {
    const host = resolve([hide(0, "B_SCR_OP_RETURNATKTOBALL"), ev(0, { kind: "draw-party-status-summary", battler: 0 }),
      ev(1, { kind: "switch", battler: 0 }), sendIn]);
    expect(host.tracker.invalidReason).toBeNull();
    expect(host.tracker.lastUnit).toBe("switch-in");
    expect(host.tracker.battlerSlots).toEqual({ player: 5, opponent: 1 });
    expect(host.tracker.occupantRoles).toEqual({ healthboxMain: { player: 2, opponent: 3 }, shadow: 4 });
    expect(liveSpriteAllocatorReseedable(host)).toBe(true);
  });

  it("opponent recall, B_SCR_OP_VARIOUS, a recall after a body (Pursuit), Baton Pass's RETURNTOBALL of the attacker keep invalidating", () => {
    const body = ev(0, { kind: "animation", animationId: "MOVE_ANIMATION", battler: 1, target: 0, arguments: ["129", "0", "0", "0", "0", "0"] });
    const atkBody = ev(0, { kind: "animation", animationId: "MOVE_ANIMATION", battler: 0, target: 1, arguments: ["241", "0", "0", "0", "0", "0"] });
    for (const events of [[hide(1, "B_SCR_OP_RETURNATKTOBALL")], [hide(0, "B_SCR_OP_VARIOUS")],
      [body, { ...hide(0, "B_SCR_OP_RETURNATKTOBALL"), sequence: 1 }], [atkBody, { ...hide(0, "B_SCR_OP_RETURNTOBALL"), sequence: 1 }]]) {
      const host = resolve(events);
      expect(host.tracker.cursor.order.known).toBe(false);
      expect(host.tracker.invalidReason).toBe("return to ball");
    }
  });

  it("cancel return: reshow with roles, allocator re-seeded in entry labels; an invalid return stays invalid", () => {
    const firstMove = createKnownEntrySpriteAllocatorProvider("ordinary-factory").firstMove;
    const invalid = invalidateLiveSpriteAllocatorHost(firstMove);
    const opened = openLiveSpriteOrderHostPartyMenu(createLiveSpriteOrderHost(knownEntrySpriteOrderState("ordinary-factory")));
    const returned = returnLiveSpriteOrderHostFromPartyMenu(opened, { player: true, opponent: true });
    expect(returned.tracker.lastUnit).toBe("reshow");
    expect(liveSpriteAllocatorReseedable(returned)).toBe(true);
    expect(reseedLiveSpriteAllocatorAfterSendOut(invalid, returned)).toEqual(firstMove);
    expect(reseedLiveSpriteAllocatorAfterSendOut(invalid, opened)).toBe(invalid); // reset only
    const hidden = returnLiveSpriteOrderHostFromPartyMenu({ ...opened, hidden: [true, false] }, { player: true, opponent: true });
    expect(reseedLiveSpriteAllocatorAfterSendOut(invalid, hidden)).toBe(invalid);
    // the prompt cycle after the cancel keeps the lend defined
    const prompt = beginLiveSpriteOrderTurn(returned, 1, true);
    expect(lendLiveSpriteOrder(prompt)).toBeDefined();
  });
});

describe("voluntary drafts through the production harness replay (postkoHostReplay.ts, voluntary-party-menu markers)", () => {
  it("all 15 drafts: lend defined and == roleLend; Light Screen @325 gets the re-seeded allocator, the later Light Screens decline it", () => {
    const allocator: Record<string, boolean> = {};
    for (const path of VOLUNTARY_FIXTURES) {
      const fixture = JSON.parse(readFileSync(path, "utf8")) as { move: string; modelCheck: string; edgeRiseFrame: number;
        precedingTurns: PostKoTurn[] };
      const check = JSON.parse(readFileSync(fixture.modelCheck, "utf8")) as { edges: Edge[] };
      const edge = check.edges.find(e => e.riseFrame === fixture.edgeRiseFrame)!;
      const lend = replayPostKoTurnsThroughHost(fixture.precedingTurns, ROUTE);
      expect(lend.host.tracker.invalidReason, path).toBeNull();
      expect(lend.spriteOrderInput?.free, path).toEqual(edge.roleLend);
      if (fixture.move === "LIGHT_SCREEN") allocator[`${path.split("voluntary-")[1]}@${fixture.edgeRiseFrame}`] = lend.spriteAllocatorInput !== undefined;
    }
    // allocator history is lost after non-net-zero bodies (Sunny Day 241, Swift 129) before the later Light Screens (§3.1 caveat)
    expect(allocator).toEqual({ "light-screen-player-cancel.json@325": true, "light-screen-player.json@3153": false,
      "light-screen-player-slot2.json@2432": false });
  });
});

describe("voluntary dense receipt (tools/integration/voluntaryLendDense.ts, two fresh direct-mGBA runs per fixture)", () => {
  it("13 bodies exact through the production lend (0 px, adapter active every row); the two later Light Screens decline", () => {
    const receipt = JSON.parse(readFileSync("tools/integration/fixtures/voluntary-lend-receipt.json", "utf8")) as { dense: {
      rows: { fixture: string; rows: number; exactRows: number[]; residualPixels: number[]; freshRunsIdentical: boolean;
        lendEqualsRole: boolean; adapterActiveRows: number; verdict: string; digest: string }[] } };
    const rows = receipt.dense.rows;
    expect(rows.map(r => r.fixture).sort()).toEqual([...VOLUNTARY_FIXTURES].sort());
    expect(rows.every(r => r.freshRunsIdentical && r.lendEqualsRole)).toBe(true);
    for (const r of rows) {
      if (r.verdict === "exact") expect([r.exactRows, r.residualPixels, r.adapterActiveRows]).toEqual([[r.rows, r.rows], [0, 0], r.rows]);
      else expect([r.verdict, r.adapterActiveRows]).toEqual(["declines", 0]);
    }
    expect(rows.filter(r => r.verdict === "declines").map(r => r.fixture.split("/").at(-1)).sort())
      .toEqual(["voluntary-light-screen-player-slot2.json", "voluntary-light-screen-player.json"]);
    expect(rows.filter(r => r.verdict === "exact").reduce((n, r) => n + r.rows, 0)).toBe(2132);
  });
});
