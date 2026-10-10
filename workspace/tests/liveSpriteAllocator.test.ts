import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  allocateEndLiveSprite, allocateFirstLiveSprite, createLiveSpriteAllocatorHost,
  destroyLiveSprite, invalidateLiveSpriteAllocatorHost, liveSpriteSlotForOwner,
  type LiveSpriteOwner,
} from "../src/engine/liveSpriteAllocator.ts";
import { createKnownEntrySpriteAllocatorProvider } from "../src/engine/knownEntrySpriteAllocator.ts";
import {
  LIVE_SPRITE_ALLOCATOR_NET_ZERO_MOVE_IDS, LIVE_SPRITE_ALLOCATOR_NET_ZERO_STATUS_ANIMATIONS,
  prepareLiveMoveSpriteAllocator,
} from "../src/engine/liveMoveSpriteAllocator.ts";

const move = (identity: string, index = 0): LiveSpriteOwner => ({ kind: "move", identity, index });

describe("live sprite allocator host", () => {
  it("uses first and end holes and immediately reuses a destroyed owner slot", () => {
    let host = createLiveSpriteAllocatorHost();
    const low = allocateFirstLiveSprite(host, move("low"));
    expect(low.slot).toBe(0);
    host = low.host;
    const high = allocateEndLiveSprite(host, move("high"));
    expect(high.slot).toBe(63);
    host = destroyLiveSprite(high.host, move("low"));
    const reused = allocateFirstLiveSprite(host, move("reuse"));
    expect(reused.slot).toBe(0);
    expect(liveSpriteSlotForOwner(reused.host, move("high"))).toBe(63);
  });

  it("rejects duplicate owners, missing destruction, exhaustion, and unknown history", () => {
    let host = createLiveSpriteAllocatorHost();
    host = allocateFirstLiveSprite(host, move("same")).host;
    expect(() => allocateFirstLiveSprite(host, move("same"))).toThrow(/already allocated/);
    expect(() => destroyLiveSprite(host, move("missing"))).toThrow(/not allocated/);
    for (let index = 1; index < 64; index += 1) host = allocateFirstLiveSprite(host, move("fill", index)).host;
    expect(() => allocateFirstLiveSprite(host, move("overflow"))).toThrow(/full/);
    expect(() => allocateFirstLiveSprite(invalidateLiveSpriteAllocatorHost(host), move("unknown")))
      .toThrow(/history is unknown/);
  });
});

describe("known ordinary-singles entry sprite provider", () => {
  it("prepares Light Screen from the provider and restores the exact host after cleanup", () => {
    const provider = createKnownEntrySpriteAllocatorProvider("ordinary-factory");
    const request = {
      moveId: 113, attacker: 0, target: 0, turn: 0, power: 0,
      damage: 0, friendship: 0, multihit: 0,
    } as const;
    const prepared = prepareLiveMoveSpriteAllocator(provider.firstMove, request);
    expect(prepared.input).toEqual({
      historyKnown: true, wall: 3, sparkles: [4, 5, 7, 4, 5, 7],
    });
    expect(prepared.next).toEqual(provider.firstMove);
    expect(prepareLiveMoveSpriteAllocator(
      invalidateLiveSpriteAllocatorHost(provider.firstMove), request,
    ).input).toBeUndefined();
  });

  it.each([
    [112, 3, []], [277, 3, []], [182, 3, []],
    [115, 3, [4, 5, 4]], [243, 3, [4, 5, 7, 4, 5, 7]], [113, 3, [4, 5, 7, 4, 5, 7]],
  ] as const)("pins the banked wall-family plan for move %i", (moveId, wall, sparkles) => {
    const provider = createKnownEntrySpriteAllocatorProvider("ordinary-factory");
    const request = {
      moveId, attacker: 0, target: 0, turn: 0, power: 0,
      damage: 0, friendship: 0, multihit: 0,
    } as const;
    const prepared = prepareLiveMoveSpriteAllocator(provider.firstMove, request);
    expect(prepared.input).toEqual({ historyKnown: true, wall, sparkles });
    // Every audited wall move is net-zero against the known-entry baseline.
    expect(prepared.next).toEqual(provider.firstMove);
    expect(prepareLiveMoveSpriteAllocator(
      invalidateLiveSpriteAllocatorHost(provider.firstMove), request,
    ).input).toBeUndefined();
  });

  it.each(["ordinary-factory", "battle-lab-ordinary-singles"] as const)(
    "derives the bounded first-command and first-move topology for %s",
    route => {
      const provider = createKnownEntrySpriteAllocatorProvider(route);
      expect(provider.commandPrompt.occupants.map(({ slot }) => slot)).toEqual([
        0, 1, 2, 3, 4, 6, 8, 60, 61, 62, 63,
      ]);
      expect(provider.firstMove.occupants.map(({ slot }) => slot)).toEqual([
        0, 1, 2, 6, 8, 60, 61, 62, 63,
      ]);
      expect(provider.firstMove.occupants.map(({ owner }) => owner)).toEqual([
        { kind: "healthbox-main", side: "player" },
        { kind: "healthbox-main", side: "opponent" },
        { kind: "enemy-shadow", side: "opponent" },
        { kind: "battler", side: "player" },
        { kind: "battler", side: "opponent" },
        { kind: "healthbar", side: "opponent" },
        { kind: "healthbox-other", side: "opponent" },
        { kind: "healthbar", side: "player" },
        { kind: "healthbox-other", side: "player" },
      ]);
      const wall = allocateFirstLiveSprite(provider.firstMove, move("LIGHT_SCREEN:wall"));
      expect(wall.slot).toBe(3);
      const sparkle0 = allocateFirstLiveSprite(wall.host, move("LIGHT_SCREEN:sparkle", 0));
      const sparkle1 = allocateFirstLiveSprite(sparkle0.host, move("LIGHT_SCREEN:sparkle", 1));
      expect([sparkle0.slot, sparkle1.slot]).toEqual([4, 5]);
      const afterReuse = allocateFirstLiveSprite(
        destroyLiveSprite(sparkle1.host, move("LIGHT_SCREEN:sparkle", 0)),
        move("LIGHT_SCREEN:sparkle", 2),
      );
      expect(afterReuse.slot).toBe(4);
    },
  );

  it("retains distinct semantic owners for shared mutable templates", () => {
    const { firstMove } = createKnownEntrySpriteAllocatorProvider("battle-lab-ordinary-singles");
    expect(liveSpriteSlotForOwner(firstMove, { kind: "battler", side: "player" })).toBe(6);
    expect(liveSpriteSlotForOwner(firstMove, { kind: "battler", side: "opponent" })).toBe(8);
    expect(liveSpriteSlotForOwner(firstMove, { kind: "trainer", side: "player" })).toBeUndefined();
    expect(firstMove.occupants.some(({ owner }) => owner.kind === "ball-particle")).toBe(false);
    expect(firstMove.occupants.some(({ owner }) => owner.kind === "controller")).toBe(false);
  });

  it("pins the six-run exact-call receipt and source identities", () => {
    const receipt = JSON.parse(readFileSync(
      "tools/integration/fixtures/known-entry-sprite-allocator-provider-receipt.json", "utf8",
    ));
    const sha = (path: string) => createHash("sha256").update(readFileSync(path)).digest("hex");
    expect(receipt.schema).toBe("known-entry-sprite-allocator-provider-verification/v1");
    expect(receipt.runs).toHaveLength(6);
    expect(receipt.runs.map((run: { calls: number }) => run.calls)).toEqual([82, 82, 82, 82, 84, 84]);
    expect(receipt.probeSha256).toBe(sha("tools/compare/lightScreenAllocatorCallProbe.py"));
    expect(receipt.verifierSha256).toBe(sha("tools/integration/verifyKnownEntrySpriteAllocator.ts"));
    for (const [filename, digest] of Object.entries(receipt.referenceSha256)) {
      expect(sha(`reference/pokeemerald/${filename}`)).toBe(digest);
    }
    for (const [filename, digest] of Object.entries(receipt.sourceSha256)) {
      expect(sha(`reference/pokeemerald/${filename}`)).toBe(digest);
    }
    const provider = createKnownEntrySpriteAllocatorProvider("battle-lab-ordinary-singles");
    expect(receipt.provider.commandPromptSlots).toEqual(provider.commandPrompt.occupants.map(({ slot }) => slot));
    expect(receipt.provider.firstMoveSlots).toEqual(provider.firstMove.occupants.map(({ slot }) => slot));
    expect(receipt.provider.owners).toEqual(provider.firstMove.occupants);
    expect(receipt.unsupported).toEqual([
      "unknown entry", "switch", "in-battle summary", "substitute", "transform",
    ]);
  });
});

describe("net-zero move history persistence", () => {
  const req = (moveId: number) => ({
    moveId, attacker: 0, target: 0, turn: 0, power: 0,
    damage: 0, friendship: 0, multihit: 0,
  }) as const;
  const { firstMove } = createKnownEntrySpriteAllocatorProvider("ordinary-factory");

  it("pins the constant exactly to the union of the net-zero receipts", () => {
    const read = (name: string) => JSON.parse(readFileSync(`tools/integration/fixtures/${name}`, "utf8"));
    const receipt = read("allocator-net-zero-audit.json");
    const ext = read("allocator-net-zero-audit-ext.json");
    expect(receipt.summary.notNetZero).toEqual({});
    expect(ext.summary.notNetZero).toEqual({});
    // Fury Swipes (154) was audited on the player side only in the original
    // receipt; the extension audits the opponent side.
    const union = new Set<number>([...receipt.summary.netZeroIds, ...ext.summary.netZeroIds]);
    expect([...union].sort((a, b) => a - b)).toEqual(ext.combined.netZeroIds);
    const auditedLive = (ext.combined.netZeroIds as number[]).filter(id => union.has(id));
    // prep44 receipt (schema prep44-allocator-net-zero/v1): summary["NET-ZERO"] ids, minus Future Sight (248 is audited by the prep52 receipt below).
    const prep44 = read("prep44/net-zero-audit.json");
    expect(prep44.summary["NOT-NET-ZERO"]).toEqual([]);
    expect(prep44.summary.notAudited).toEqual({});
    const prep44Ids = (prep44.summary["NET-ZERO"] as number[]).filter(id => id !== 248);
    expect(prep44Ids).toHaveLength(50);
    expect(prep44.summary["NET-ZERO"]).toContain(248);
    // prep52 receipt (schema prep52-net-zero-audit/v1): numeric-keyed NET-ZERO units; Gust 16 / Transform 144 are net-zero
    // but not live adapters, so they are not listed. Future Sight 248 (setup body) + General_FutureSightHit (label) are both NET-ZERO.
    const prep52 = read("prep52/net-zero-audit.json");
    expect(prep52.schema).toBe("prep52-net-zero-audit/v1");
    type Unit = { unit: string; key: number | string; verdict: string; bodiesFromKnownEntry: { player: number; opponent: number }; rows: { identicalAB: boolean }[] };
    const units = prep52.units as Unit[];
    expect(units.filter(u => u.verdict !== "NET-ZERO")).toEqual([]);
    expect(units.find(u => u.key === "General_FutureSightHit")?.verdict).toBe("NET-ZERO");
    const prep52Ids = units.filter(u => typeof u.key === "number").map(u => u.key as number).filter(id => id !== 16 && id !== 144);
    expect(prep52Ids).toHaveLength(40);
    for (const unit of units) {
      expect(unit.bodiesFromKnownEntry.player).toBeGreaterThanOrEqual(1);
      expect(unit.bodiesFromKnownEntry.opponent).toBeGreaterThanOrEqual(1);
      expect(unit.rows.length).toBeGreaterThan(0);
      for (const row of unit.rows) expect(row.identicalAB).toBe(true);
    }
    expect(LIVE_SPRITE_ALLOCATOR_NET_ZERO_MOVE_IDS).toContain(248);
    for (const id of [16, 144]) expect(LIVE_SPRITE_ALLOCATOR_NET_ZERO_MOVE_IDS).not.toContain(id);
    // hist73 receipt (schema hist73-net-zero-audit/v1, folded by land75): 37 numeric-keyed live move bodies, every unit NET-ZERO
    // with >= 1 complete body per side from the known entry and every row identical across two fresh runs.
    const hist73 = read("hist73/net-zero-audit.json");
    expect(hist73.schema).toBe("hist73-net-zero-audit/v1");
    const hist73Units = hist73.units as Unit[];
    expect(hist73Units.filter(u => u.verdict !== "NET-ZERO")).toEqual([]);
    expect(hist73Units.every(u => typeof u.key === "number")).toBe(true);
    for (const unit of hist73Units) {
      expect(unit.bodiesFromKnownEntry.player).toBeGreaterThanOrEqual(1);
      expect(unit.bodiesFromKnownEntry.opponent).toBeGreaterThanOrEqual(1);
      expect(unit.rows.length).toBeGreaterThan(0);
      for (const row of unit.rows) expect(row.identicalAB).toBe(true);
    }
    const hist73Ids = hist73Units.map(u => u.key as number);
    expect(hist73Ids).toHaveLength(37);
    const expected = [...new Set<number>([...auditedLive, ...prep44Ids, ...prep52Ids, ...hist73Ids])].sort((a, b) => a - b);
    expect([...LIVE_SPRITE_ALLOCATOR_NET_ZERO_MOVE_IDS].sort((a, b) => a - b)).toEqual(expected);
    for (const id of prep44Ids) {
      const scenarios = prep44.moves[String(id)]?.scenarios ?? [];
      expect(scenarios.length).toBeGreaterThan(0);
      // This schema has no per-scenario netZero on a "window-incomplete" row (225's truncated
      // opponent trace, re-run lengthened as fixtures/prep44/scenarios/dragon-breath-opponent-long):
      // every row must be audited netZero, or incomplete with an audited netZero row of the same orientation.
      type Row = { netZero?: boolean; status: string; orientation: string };
      for (const row of scenarios as Row[]) {
        if (row.netZero === true) continue;
        expect(row.status).toBe("window-incomplete");
        expect((scenarios as Row[]).some(o => o.netZero === true && o.orientation === row.orientation)).toBe(true);
      }
      for (const orientation of ["player", "opponent"]) {
        expect((scenarios as Row[]).some(o => o.orientation === orientation && o.netZero === true)).toBe(true);
      }
    }
    expect(ext.combined.liveIdsNotCovered).toEqual([]);
    for (const id of auditedLive) {
      // The extension supersedes the original's "move-never-active" rows.
      const scenarios = (ext.moves[String(id)] ?? receipt.moves[String(id)])?.scenarios ?? [];
      expect(scenarios.length).toBeGreaterThan(0);
      expect(scenarios.every((s: { netZero: boolean }) => s.netZero)).toBe(true);
    }
    const status = JSON.parse(readFileSync("docs/animation-integration-live-status.json", "utf8"));
    // Live = scoped exact + faithful timing + faithful random (prep44 ids 24, 28, 142, 189, 240, 273, 352 are faithful-random adapters) (Crunch / Psychic / Extreme Speed were reclassified by a13fix; still the same live bodies).
    const live = new Set<number>([...status.implementedAdapters, ...status.faithfulTimingAdapters, ...status.faithfulRandomAdapters].map((a: { id: number }) => a.id));
    // Every audited id is a live adapter; later (unaudited) adapters stay out.
    for (const id of LIVE_SPRITE_ALLOCATOR_NET_ZERO_MOVE_IDS) expect(live.has(id)).toBe(true);
    // (203, 263, 86 moved IN with the prep44 receipt; Focus Energy 116 / Bulk Up 339 with the hist73 receipt.)
    for (const id of [16, 144]) {
      expect(LIVE_SPRITE_ALLOCATOR_NET_ZERO_MOVE_IDS).not.toContain(id);
    }
  });

  it("keeps a known host identical across a net-zero move and creates no input", () => {
    const prepared = prepareLiveMoveSpriteAllocator(firstMove, req(2));
    expect(prepared.next).toBe(firstMove);
    expect(prepared.input).toBeUndefined();
  });

  it("invalidates for non-audited moves and keeps unknown unknown", () => {
    // Karate Chop 4 is a live adapter no allocator receipt covers (116 is audited since hist73).
    for (const id of [4, 999]) {
      expect(prepareLiveMoveSpriteAllocator(firstMove, req(id)).next.historyKnown).toBe(false);
    }
    const unknown = invalidateLiveSpriteAllocatorHost(firstMove);
    expect(prepareLiveMoveSpriteAllocator(unknown, req(2)).next.historyKnown).toBe(false);
  });
});

describe("net-zero status animations", () => {
  it("pins the set to the prep50 + prep52 receipts' NET-ZERO labels", () => {
    const receipt = JSON.parse(readFileSync("tools/integration/fixtures/prep50/status-net-zero-audit.json", "utf8"));
    const names: Record<string, string> = {
      Status_Sleep: "SLP", Status_Confusion: "CONFUSION", Status_Poison: "PSN",
      Status_Paralysis: "PRZ", Status_Burn: "BRN",
    };
    const audited50 = (receipt.summary as { label: string; verdict: string }[])
      .filter(row => row.verdict === "NET-ZERO").map(row => names[row.label]);
    expect(audited50).toHaveLength(5);
    const prep52 = JSON.parse(readFileSync("tools/integration/fixtures/prep52/net-zero-audit.json", "utf8"));
    const names52: Record<string, string> = {
      Status_Freeze: "FRZ", Status_Infatuation: "INFATUATION", Status_Curse: "CURSED", Status_Nightmare: "NIGHTMARE",
    };
    const audited52 = (prep52.units as { key: number | string; verdict: string }[])
      .filter(u => typeof u.key === "string" && u.key in names52 && u.verdict === "NET-ZERO").map(u => names52[u.key as string]);
    expect(audited52).toHaveLength(4);
    const audited = [...audited50, ...audited52];
    expect(audited).toHaveLength(9);
    expect(LIVE_SPRITE_ALLOCATOR_NET_ZERO_STATUS_ANIMATIONS.has("WRAPPED")).toBe(false);
    expect([...LIVE_SPRITE_ALLOCATOR_NET_ZERO_STATUS_ANIMATIONS].sort()).toEqual([...audited].sort());
  });
});
