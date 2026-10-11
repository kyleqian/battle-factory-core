import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { liveMoveAnimationPresentation } from "../../src/engine/liveMoveAnimation.ts";
import { liveFuryCutterBlendRows } from "../../src/engine/liveOamMoves.ts";
import { liveView, type Fixture } from "../../tools/integration/liveAdapterFramebuffer.ts";

// docs/fury99-fury-cutter-counters.md + tools/integration/fixtures/fury99-live-receipt.json: Fury Cutter 210 at counters 2..5 (later bodies after
// the user's own Fury Cutter body; plans54's furyCutterCounter payload = request.rolloutCounter). Consecutive Fury Cutters, both attacker sides,
// GROVYLE -> BLISSEY, SCYTHER -> GOLEM and SCYTHER -> ONIX (an idle-rest target), the foe using Growl / Splash; direct mGBA twice fresh (10 / 10
// probes r1 == r2), 49 / 50 windows 0 px through the production renderer in two more fresh probes (the 50th: the opponent ONIX counter-1 first
// body, which still declines on its rest). The pinned rows are the ROM RGB sha256 of the r1 probe (all 43 rows).
type Pinned = { fixture: string; counter: number; rows: [age: number, frame: number, sha256: string][] };
const receipt = JSON.parse(readFileSync("tools/integration/fixtures/fury99-live-receipt.json", "utf8")) as {
  pinned: Record<string, Pinned>; blendRows: Record<string, Record<string, number[]>[]>; windows: { fixture: string; verdict: string; runs: number[][] }[] };
const LIVE = "tools/integration/fixtures/fury99/live";
type F = Fixture & { precedingBodies?: unknown[]; furyCutterCounter: number };
const fixture = (name: string) => JSON.parse(readFileSync(`${LIVE}/${name}.json`, "utf8")) as F;
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

describe("fury99 Fury Cutter 210 counters 2..5 at a later body", () => {
  it("the complex palette blend rows are the AnimComplexPaletteBlend schedule and equal the ROM palette RAM rows of every probed counter", () => {
    expect([...liveFuryCutterBlendRows(1)]).toEqual([]);
    expect([...liveFuryCutterBlendRows(2)]).toEqual([8, 9, 10]);
    for (const counter of [3, 4, 5]) expect([...liveFuryCutterBlendRows(counter)]).toEqual([8, 9, 10, 15, 16, 17, 18]);
    for (const counter of [1, 2, 3, 4, 5]) {
      const patterns = receipt.blendRows[String(counter)]!;
      expect(patterns).toHaveLength(1); // one pattern across both sides, both pairs, Growl / Splash
      for (const bank of ["1", "2", "3", "16", "17"]) expect(patterns[0]![bank]).toEqual([...liveFuryCutterBlendRows(counter)]);
    }
  });

  it.each(Object.keys(receipt.pinned))("%s: live, every row equals the ROM frame", (name) => {
    const { rows, counter } = receipt.pinned[name]!;
    const f = fixture(name);
    expect(f.furyCutterCounter).toBe(counter);
    expect(f.requestFields?.rolloutCounter).toBe(counter);
    expect(f.precedingBodies?.length).toBeGreaterThan(0);
    expect(presentation(f)?.config.move).toBe("FURY_CUTTER");
    expect(rows).toHaveLength(43);
    expect(rows.filter(([age, , sha]) => rowSha(f, age) !== sha).map(([age]) => age)).toEqual([]);
  }, 180000);

  it("every probed counter 1..5 body is live (but the rest-carrying first body) and every live window is 0 px in both runs", () => {
    const names = readdirSync(LIVE).map((n) => n.replace(/\.json$/, ""));
    expect(names).toHaveLength(50);
    expect(new Set(names.map((n) => fixture(n).furyCutterCounter))).toEqual(new Set([1, 2, 3, 4, 5]));
    const declined = "fury-cutter-pla-scyther-onix-splash-0";
    for (const name of names) expect(presentation(fixture(name))?.config.move).toBe(name === declined ? undefined : "FURY_CUTTER");
    expect(receipt.windows).toHaveLength(50);
    for (const w of receipt.windows) {
      if (w.fixture === declined) { expect(w.verdict).toBe("declined"); continue; }
      expect(w.verdict).toBe("exact");
      for (const [exact, rows, px] of w.runs) expect([exact, rows, px]).toEqual([43, 43, 0]);
    }
  });

  it("the gate: counter from the payload (1..5), the later58 power rule without it, rests and shiny unchanged", () => {
    const later = fixture("fury-cutter-pla-grovyle-blissey-splash-2");
    expect(later.requestFields?.rolloutCounter).toBe(3);
    // Out-of-range counters decline.
    for (const rolloutCounter of [0, 6]) expect(presentation({ ...later, requestFields: { ...later.requestFields, rolloutCounter } })).toBeNull();
    // Without the payload, a later body keeps the later58 rule: power 10 / 15 (counter 1) only.
    const { rolloutCounter: _omit, ...noCounter } = later.requestFields!;
    expect(presentation({ ...later, requestFields: { ...noCounter, power: 40 } })).toBeNull();
    expect(presentation({ ...later, requestFields: { ...noCounter, power: 15 } })?.config.move).toBe("FURY_CUTTER");
    // An opponent ONIX (front idle rest x2 1) at counter 2+: live once the x2 tracker has it zeroed by the user's earlier Fury Cutter
    // body (the ROM x2 is 0 there); not without that zeroing event, and never at a later counter-1 body (the species rule).
    const onix = fixture("fury-cutter-pla-scyther-onix-splash-1");
    expect([onix.target.species, onix.target.geometry.side, onix.furyCutterCounter]).toEqual(["ONIX", "opponent", 2]);
    expect(presentation(onix)?.config.move).toBe("FURY_CUTTER");
    expect(presentation({ ...onix, precedingX2Events: [{ kind: "move-body", moveId: 150, attackerSide: "opponent" }] })).toBeNull();
    expect(presentation({ ...onix, requestFields: { ...onix.requestFields, rolloutCounter: 1 } })).toBeNull();
    expect(presentation({ ...later, target: { ...later.target, species: "ONIX" } })?.config.move).toBe("FURY_CUTTER");
    expect(presentation({ ...later, target: { ...later.target, species: "ONIX" }, precedingX2Events: [] })).toBeNull();
    // The counter reaches the inputs (direction + blend).
    const inputs = (f: Fixture, age: number) => (presentation(f, age)?.config as unknown as { animationInputs: { counter: number; palette: { hardware: number[] } } } | undefined)?.animationInputs;
    expect(inputs(later, 0)?.counter).toBe(3);
    const c1 = { ...later, requestFields: { ...later.requestFields, rolloutCounter: 1 } };
    expect(inputs(later, 9)!.palette.hardware.slice(32, 48)).not.toEqual(inputs(c1, 9)!.palette.hardware.slice(32, 48));
    expect(inputs(later, 12)!.palette.hardware).toEqual(inputs(c1, 12)!.palette.hardware);
  });
});
