import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
// apx219: these gate pins read the proven body (an unknown order / allocator history is drawn approximately by the production
// liveMoveAnimationPresentation; tests/apx219SpriteOrderAllocatorApproximate.test.ts).
import { liveMoveAnimationPresentationProven as liveMoveAnimationPresentation } from "../../src/engine/liveMoveAnimation.ts";
import { prepareLiveMoveSpriteOrder } from "../../src/engine/liveMoveSpriteAllocator.ts";
import { knownEntrySpriteOrderState } from "../../src/engine/spriteOrderProvider.ts";
import { liveView, type Fixture } from "../../tools/integration/liveAdapterFramebuffer.ts";

// docs/next-adapters-prep48.md + tools/integration/fixtures/later48-live-receipt.json: Dig 91 (setup / unleash) and Return 216 at a
// LATER body: any known lend while both species front-idle rests are {0,0} (the x2 tracker reads an ONIX / RATTATA rest the ROM zeroed).
// The later48 fixtures follow allocator-non-net-zero predecessors (Will-O-Wisp / Toxic bodies + Status_Burn / Status_Poison).
type Pinned = { fixture: string; rows: [age: number, frame: number, sha256: string][] };
const receipt = JSON.parse(readFileSync("tools/integration/fixtures/later48-live-receipt.json", "utf8")) as { pinned: Record<string, Pinned> };
const fixture = (path: string) => JSON.parse(readFileSync(path, "utf8")) as Fixture & { precedingBodies?: unknown[] };
const presentation = (f: Fixture, age = 0) => {
  const view = liveView(f, age);
  const e = view.effect as unknown as { request: BattleMoveAnimationRequest; spriteAllocatorInput: never; spriteOrderInput: never; battlerX2Input: never };
  return liveMoveAnimationPresentation(e.request, view.field, age, undefined, e.spriteAllocatorInput, e.spriteOrderInput, undefined, e.battlerX2Input);
};
const rowSha = (f: Fixture, age: number) => {
  const rgba = new Uint8Array(240 * 160 * 4), rgb = new Uint8Array(240 * 160 * 3);
  renderBattleResolutionLiveView(rgba, liveView(f, age));
  for (let p = 0; p < 240 * 160; p++) { rgb[p * 3] = rgba[p * 4]!; rgb[p * 3 + 1] = rgba[p * 4 + 1]!; rgb[p * 3 + 2] = rgba[p * 4 + 2]!; }
  return createHash("sha256").update(rgb).digest("hex");
};
const PREP48 = "tools/integration/fixtures/prep48", LATER48 = "tools/integration/fixtures/later48";
const laterLend = () => prepareLiveMoveSpriteOrder(knownEntrySpriteOrderState("ordinary-factory"), {
  moveId: 91, attacker: 0, target: 1, turn: 0, power: 0, damage: 0, friendship: 70, multihit: 0 }).input!;

describe("later48: Dig / Return later bodies through the production renderer (committed ROM RGB sha256 per row)", () => {
  it("pins later setups, unleashes and Returns of both attacker sides, after net-zero and non-net-zero predecessors", () => {
    const names = Object.keys(receipt.pinned);
    expect(names).toHaveLength(8);
    for (const name of names) expect(fixture(receipt.pinned[name]!.fixture).precedingBodies?.length).toBeGreaterThan(0);
  });
  it.each(Object.keys(receipt.pinned))("%s: live at every age, every row equals the ROM frame", (name) => {
    const { fixture: path, rows } = receipt.pinned[name]!;
    const f = fixture(path);
    expect(rows.length).toBe(f.move === "RETURN" ? 282 : f.requestFields?.turn === 1 ? 68 : 195);
    expect(presentation(f)).not.toBeNull();
    expect(rows.filter(([age, , sha]) => rowSha(f, age) !== sha).map(([age]) => age)).toEqual([]);
  }, 180000);
});

describe("later48 gates", () => {
  it("a later body with an opponent ONIX (non-zero species rest) declines; its first body stays live", () => {
    expect(presentation(fixture(`${PREP48}/return-live/return-ply-dragonair-onix-x3-return0.json`))).not.toBeNull();
    for (const path of [`${PREP48}/return-live/return-ply-dragonair-onix-qa3-return1.json`,
      `${PREP48}/return-live/return-ply-dragonair-onix-x3-return1.json`, `${LATER48}/return-live/return-ply-dragonair-onix-wisp-return1.json`]) {
      expect(presentation(fixture(path))).toBeNull();
    }
    // Dig: the same later lend goes live against GOLEM and declines against an opponent ONIX.
    const setup = fixture(`${PREP48}/dig-live/dig-ply-flygon-golem-first4-dig2-setup.json`);
    expect(presentation(setup)).not.toBeNull();
    expect(presentation({ ...setup, target: { ...setup.target, species: "ONIX" } })).toBeNull();
    const first = fixture(`${PREP48}/dig-live/dig-ply-flygon-golem-first4-dig0-setup.json`);
    expect(presentation({ ...first, target: { ...first.target, species: "ONIX" } })).not.toBeNull();
  });

  it("an unknown lend declines; a later lend (no firstBody / afterDigSetup) is accepted on rest-free battlers only", () => {
    const setup = fixture(`${PREP48}/dig-live/dig-ply-flygon-golem-first4-dig2-setup.json`);
    const view = liveView(setup, 0), request = (view.effect as unknown as { request: BattleMoveAnimationRequest }).request;
    expect(liveMoveAnimationPresentation(request, view.field, 0)).toBeNull();
    expect(laterLend().firstBody).toBeUndefined();
    expect(liveMoveAnimationPresentation(request, view.field, 0, undefined, undefined, laterLend())?.config.move).toBe("DIG");
    expect(liveMoveAnimationPresentation({ ...request, turn: 1 }, view.field, 0, undefined, undefined, laterLend())?.config.move).toBe("DIG");
    const ret = fixture(`${LATER48}/return-live/return-opp-snorlax-golem-wisp-return1.json`);
    const rv = liveView(ret, 0), rr = (rv.effect as unknown as { request: BattleMoveAnimationRequest }).request;
    expect(liveMoveAnimationPresentation(rr, rv.field, 0, undefined, undefined, laterLend())?.config.move).toBe("RETURN");
    expect(liveMoveAnimationPresentation(rr, rv.field, 0)).toBeNull();
  });
});
