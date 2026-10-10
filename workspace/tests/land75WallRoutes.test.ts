import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

// land75 (hist73 Part A fold): the two wall routes the hist73 allocator receipt turns exact (tests/animation/liveWallMoveAdapters.test.ts
// seeds 10 / 260), dense-checked against the ROM through the production live renderer (tools/integration/land75Run.sh: the routes' body
// histories staged in the Scene ON lab with the routes' species, audit18Check.ts with two fresh direct-mGBA probe processes per scenario)
// and through the production orchestrator on the routes themselves (land75RouteCheck.ts).
const W = "tools/integration/fixtures/land75";
type Side = { live: boolean; rows: number; px: number; digests: string[]; allocatorInput: boolean; orderKnown: boolean };
type Row = { fixture: string; move: string; history: string[]; hideAgree: boolean; romInvisible: boolean[]; chain: Side };

describe("land75 wall routes (hist73 Part A)", () => {
  const rows = readdirSync(`${W}/check`).sort().flatMap((name) =>
    (JSON.parse(readFileSync(`${W}/check/${name}`, "utf8")) as { rows: Row[] }).rows);

  it("every wall body after the newly audited bodies is live, allocator known, 0 px on every row, r1 == r2", () => {
    expect(rows.map((r) => r.fixture)).toHaveLength(8);
    for (const r of rows) {
      expect(r.chain.live, r.fixture).toBe(true);
      expect(r.chain.allocatorInput, r.fixture).toBe(true);
      expect(r.chain.orderKnown, r.fixture).toBe(true);
      expect(r.chain.rows, r.fixture).toBe(76);
      expect(r.chain.px, r.fixture).toBe(0);
      expect(r.chain.digests[0], r.fixture).toBe(r.chain.digests[1]);
      expect(r.hideAgree, r.fixture).toBe(true);
    }
  });

  it("the route histories: Signal Beam 324 -> Barrier (both sides); Psywave 149 -> Dive setup -> Magic Coat at the hidden diver", () => {
    const by = (name: string) => rows.find((r) => r.fixture === name)!;
    expect(by("wall10-yanma-drowzee-barrier-opp-c0.json").history).toEqual(["324@0 HIT_ANIMATION@1 112@1"]);
    expect(by("wall10-yanma-drowzee-barrier-ply-c0.json").history).toEqual(["324@1 HIT_ANIMATION@0 112@0"]);
    const route260 = by("wall260-spoink-clamperl-magic-coat-opp-s1-c0.json");
    expect(route260.history).toEqual(["149@1 HIT_ANIMATION@0 291@0", "277@1"]);
    expect(route260.romInvisible).toEqual([true, false]);
  });

  it("the production orchestrator on routes 10 / 260: every wall row live with known allocator history; the diver hidden on 260", () => {
    const check = JSON.parse(readFileSync(`${W}/route-check.json`, "utf8")) as { routes: { seed: number; history: string[]; rows: number;
      distinct: { hidden: { player: boolean; opponent: boolean }; allocatorKnown: boolean; orderInput: boolean; live: boolean }[] }[] };
    expect(check.routes.map((r) => [r.seed, r.history, r.rows])).toEqual([[10, ["324@0", "112@1"], 76], [260, ["149@1", "291@0", "277@1"], 76]]);
    expect(check.routes[0]!.distinct).toEqual([{ hidden: { player: false, opponent: false }, allocatorKnown: true, orderInput: true, live: true }]);
    expect(check.routes[1]!.distinct).toEqual([{ hidden: { player: true, opponent: false }, allocatorKnown: true, orderInput: true, live: true }]);
  });
});
