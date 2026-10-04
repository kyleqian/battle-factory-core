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
  LIVE_SPRITE_ALLOCATOR_NET_ZERO_MOVE_IDS, prepareLiveMoveSpriteAllocator,
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
    expect([...LIVE_SPRITE_ALLOCATOR_NET_ZERO_MOVE_IDS]).toEqual(auditedLive);
    expect(ext.combined.liveIdsNotCovered).toEqual([]);
    for (const id of LIVE_SPRITE_ALLOCATOR_NET_ZERO_MOVE_IDS) {
      // The extension supersedes the original's "move-never-active" rows.
      const scenarios = (ext.moves[String(id)] ?? receipt.moves[String(id)])?.scenarios ?? [];
      expect(scenarios.length).toBeGreaterThan(0);
      expect(scenarios.every((s: { netZero: boolean }) => s.netZero)).toBe(true);
    }
    const live = new Set<number>(JSON.parse(readFileSync(
      "docs/animation-integration-live-status.json", "utf8",
    )).implementedAdapters.map((a: { id: number }) => a.id));
    // Every audited id is a live adapter; later (unaudited) adapters stay out.
    for (const id of LIVE_SPRITE_ALLOCATOR_NET_ZERO_MOVE_IDS) expect(live.has(id)).toBe(true);
    for (const id of [203, 116, 263, 107, 87, 86, 207, 339]) {
      expect(LIVE_SPRITE_ALLOCATOR_NET_ZERO_MOVE_IDS).not.toContain(id);
    }
  });

  it("keeps a known host identical across a net-zero move and creates no input", () => {
    const prepared = prepareLiveMoveSpriteAllocator(firstMove, req(2));
    expect(prepared.next).toBe(firstMove);
    expect(prepared.input).toBeUndefined();
  });

  it("invalidates for non-audited moves and keeps unknown unknown", () => {
    for (const id of [203, 116, 999]) {
      expect(prepareLiveMoveSpriteAllocator(firstMove, req(id)).next.historyKnown).toBe(false);
    }
    const unknown = invalidateLiveSpriteAllocatorHost(firstMove);
    expect(prepareLiveMoveSpriteAllocator(unknown, req(2)).next.historyKnown).toBe(false);
  });
});
