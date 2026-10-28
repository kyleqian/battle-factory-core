import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import speciesNames from "../src/data/gen/species-names.json" with { type: "json" };
// apx219: these gate pins read the proven body (an unknown order / allocator history is drawn approximately by the production
// liveMoveAnimationPresentation; tests/apx219SpriteOrderAllocatorApproximate.test.ts).
import { liveMoveAnimationPresentationProven as liveMoveAnimationPresentation } from "../src/engine/liveMoveAnimation.ts";
import { FIRST_BODY_SCANLINE } from "../src/engine/liveOamMoves.ts";
import {
  applyLiveScanlineHistoryEvent, liveScanlineEntry, type LiveScanlineHistory, type LiveScanlineSide,
} from "../src/engine/liveScanlineHistory.ts";
import { advanceLiveSpriteOrderHost, createLiveSpriteOrderHost, lendLiveSpriteOrder } from "../src/engine/liveSpriteOrderHost.ts";
import { knownEntrySpriteOrderState } from "../src/engine/spriteOrderProvider.ts";
import { liveView, type Fixture } from "../tools/integration/liveAdapterFramebuffer.ts";

// land96: the scan93 scanline-buffer history (src/engine/liveScanlineHistory.ts) against scan93's committed RAM receipt
// (fixtures/scan93/history-receipt.json: 22 scenarios x 2 fresh runs, r1 == r2) and the Memento / Extrasensory later-body gates.
const S93 = "tools/integration/fixtures/scan93";
const receipt = JSON.parse(readFileSync(`${S93}/history-receipt.json`, "utf8")) as { rows: any[] };
const MOVE_OF: Record<string, number> = { EXTRASENSORY: 326, MEMENTO: 262, DRAGON_DANCE: 349 };
const symbolOf = (internal: number) => ((speciesNames as any).species[internal].species as string).replace(/^SPECIES_/, "");
const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i += 1) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h.toString(16).padStart(8, "0"); };
const digestOf = (buffers: readonly (readonly number[])[]) => hash(JSON.stringify(buffers));
const speciesOfScenario = (name: string) => {
  const p = JSON.parse(readFileSync(`${S93}/scenarios/${name}`, "utf8")).overrides.parties;
  return { player: symbolOf(p.player[0].species), opponent: symbolOf(p.opponent[0].species) } as Record<LiveScanlineSide, string>;
};
/** The history the order host would carry for a receipt row's `preceding` column (token = MOVE:side letter). */
const foldPreceding = (preceding: string): LiveScanlineHistory => {
  let h: LiveScanlineHistory = Object.freeze([]);
  for (const tok of preceding.split(" ").filter(Boolean)) {
    const [label, s] = tok.split(":") as [string, string];
    h = applyLiveScanlineHistoryEvent(h, { kind: "move-animation", moveId: MOVE_OF[label] ?? 1, attackerSide: s === "p" ? "player" : "opponent" });
  }
  return h;
};

describe("land96 scanline history fold vs scan93 RAM receipt", () => {
  const rows = receipt.rows;
  it("receipt shape: 103 bodies, 22 scenarios, r1 == r2, 67/67 known equal", () => {
    expect(rows).toHaveLength(103);
    expect(new Set(rows.map((r) => r.scenario)).size).toBe(22);
    expect(rows.every((r) => r.r1EqualsR2)).toBe(true);
    expect(rows.filter((r) => r.predicted === "known").every((r) => r.equal)).toBe(true);
  });

  it("every body: the production fold is known exactly where RAM is predicted known, and its banks digest == the RAM digest (up to the display-neutral bank relabel)", () => {
    let known = 0, invalidated = 0;
    for (const r of rows) {
      const h = foldPreceding(r.preceding);
      if (r.predicted === "invalidated") { expect(h, `${r.scenario}#${r.body}`).toBeNull(); invalidated += 1; continue; }
      expect(h, `${r.scenario}#${r.body}`).not.toBeNull();
      const entry = liveScanlineEntry(FIRST_BODY_SCANLINE, h!, (side) => speciesOfScenario(r.scenario)[side]);
      const swapped = [entry.buffers[1]!, entry.buffers[0]!];
      expect([digestOf(entry.buffers), digestOf(swapped)], `${r.scenario}#${r.body}`).toContain(r.ram.digest);
      expect(entry.srcBuffer).toBe(1);
      known += 1;
    }
    expect([known, invalidated]).toEqual([67, 36]);
  });

  it("predecessor classes: S0 (none / Quick Attack / Psywave / Splash / Recover), after a player / opponent Extrasensory, after both, invalidation by Memento / Dragon Dance", () => {
    const sp = (side: LiveScanlineSide) => ({ player: "NUZLEAF", opponent: "SHUCKLE" })[side];
    const e = (h: LiveScanlineHistory) => liveScanlineEntry(FIRST_BODY_SCANLINE, h!, sp);
    const ev = (h: LiveScanlineHistory, moveId: number, side: LiveScanlineSide = "player") => applyLiveScanlineHistoryEvent(h, { kind: "move-animation", moveId, attackerSide: side });
    const none: LiveScanlineHistory = Object.freeze([]);
    expect(e(none)).toEqual(FIRST_BODY_SCANLINE);
    for (const neutral of [98, 149, 150, 105]) { // Quick Attack, Psywave, Splash, Recover: never write the scanline effect
      expect(ev(none, neutral)).toEqual([]);
      expect(ev(none, neutral, "opponent")).toEqual([]);
    }
    expect(applyLiveScanlineHistoryEvent(none, { kind: "general-animation" })).toEqual([]);
    const xsP = ev(none, 326, "player"), xsO = ev(none, 326, "opponent");
    expect(xsP).toEqual(["player"]);
    expect(xsO).toEqual(["opponent"]);
    expect(digestOf(e(xsP).buffers)).not.toBe(digestOf(e(none).buffers));
    expect(digestOf(e(xsP).buffers)).not.toBe(digestOf(e(xsO).buffers));
    expect(e(xsP).dmaDest).not.toBe(e(xsO).dmaDest);
    expect(ev(ev(none, 326, "player"), 326, "opponent")).toEqual(["player", "opponent"]);
    expect(digestOf(e(["player", "opponent"]).buffers)).not.toBe(digestOf(e(xsO).buffers));
    for (const writer of [262, 349, 229, 151, 91, 57, 330, 180, 166]) {
      expect(ev(none, writer)).toBeNull();
      expect(ev(xsP, writer)).toBeNull();
      expect(ev(null, 326)).toBeNull(); // once invalidated, never recovered
    }
    // a faint / switch after an Extrasensory body invalidates; at S0 it does not (no window geometry to go stale)
    for (const kind of ["faint", "switch-out", "forced-switch-out", "switch-in-start", "next-mon-send-out"]) {
      expect(applyLiveScanlineHistoryEvent(xsP, { kind })).toBeNull();
      expect(applyLiveScanlineHistoryEvent(none, { kind })).toEqual([]);
    }
  });
});

describe("land96 order host carries and lends the history", () => {
  it("a fresh host lends firstBody with no history; a null / absent history is never lent", () => {
    const host = createLiveSpriteOrderHost(knownEntrySpriteOrderState("ordinary-factory"));
    expect(host.scanline).toEqual([]);
    const first = lendLiveSpriteOrder({ ...host, bodies: 0 }) as any;
    expect(first.firstBody).toBe(true);
    expect(first.scanlineHistory).toBeUndefined();
    const later = lendLiveSpriteOrder({ ...host, bodies: 1, scanline: Object.freeze(["opponent"] as const) }) as any;
    expect(later.firstBody).toBeUndefined();
    expect(later.scanlineHistory).toEqual(["opponent"]);
    expect((lendLiveSpriteOrder({ ...host, bodies: 1, scanline: null }) as any).scanlineHistory).toBeUndefined();
    expect((lendLiveSpriteOrder({ ...host, bodies: 1, scanline: undefined }) as any).scanlineHistory).toBeUndefined();
    expect(typeof advanceLiveSpriteOrderHost).toBe("function");
  });
});

describe("land96 Memento (262) / Extrasensory (326) later-body gates", () => {
  const load = (p: string) => JSON.parse(readFileSync(p, "utf8")) as Fixture;
  const memento = load("tools/integration/fixtures/s10a-live-declines/memento-later-player-weezing-chimecho.json");
  const call = (f: Fixture) => { const v = liveView(f, 0); const eff = v.effect as any; return { input: eff.spriteOrderInput, out: liveMoveAnimationPresentation(eff.request, v.field, 0, undefined, undefined, eff.spriteOrderInput), field: v.field, eff }; };

  it("Memento later body: live with a known history and rest-free battlers (after Psywave, Quick Attack, Extrasensory), declines after any invalidating writer", () => {
    expect(call(memento).out).not.toBeNull();
    for (const prior of [[{ moveId: 98, side: "opponent" }], [{ moveId: 326, side: "opponent" }, { moveId: 326, side: "player" }]] as const) {
      const r = call({ ...memento, precedingBodies: prior as never });
      expect(r.input.scanlineHistory, JSON.stringify(prior)).toBeDefined();
      expect(r.out, JSON.stringify(prior)).not.toBeNull();
    }
    for (const writer of [349, 262, 229, 151, 91]) {
      const r = call({ ...memento, precedingBodies: [{ moveId: writer, side: "opponent" }] as never });
      expect(r.input.scanlineHistory).toBeUndefined();
      expect(r.out, `writer ${writer}`).toBeNull();
    }
    // an unknown order, and a missing history on a non-first body, decline
    const { eff, field } = call(memento);
    expect(liveMoveAnimationPresentation(eff.request, field, 0, undefined, undefined, { ...eff.spriteOrderInput, scanlineHistory: undefined })).toBeNull();
    expect(liveMoveAnimationPresentation(eff.request, field, 0, undefined, undefined, { known: false } as never)).toBeNull();
  });

  const live = (n: string) => load(`${S93}/live/${n}.json`);
  it("Memento later body requires both battlers' idle rests to be zero: same known history, WEEZING-vs-ONIX with ONIX resting after the opponent's Quick Attack / Psywave declines", () => {
    for (const n of ["mem-pla-weezing-onix-qa-0", "mem-pla-weezing-onix-psywave-0"]) {
      const r = call(live(n));
      expect(r.input.scanlineHistory, n).toEqual([]);
      expect(r.out, n).toBeNull();
    }
    for (const n of ["mem-opp-weezing-onix-qa-0", "mem-opp-weezing-onix-psywave-0", "mem-opp-weezing-onix-xs-0", "xs-opp-nuzleaf-shuckle-memento-0", "xs-pla-nuzleaf-shuckle-memento-0"]) {
      expect(call(live(n)).out, n).not.toBeNull();
    }
    for (const n of ["mem-opp-weezing-onix-dd-0", "mem-pla-weezing-onix-dd-0"]) {
      const r = call(live(n));
      expect(r.input.scanlineHistory, n).toBeUndefined();
      expect(r.out, n).toBeNull();
    }
  });

  it("Extrasensory: opponent later bodies are live; player later bodies (asl155) live on SHUCKLE, declining on the elevated CROBAT", () => {
    for (const n of ["xs-opp-nuzleaf-shuckle-xs-1", "xs-opp-nuzleaf-shuckle-xs-2", "xs-opp-nuzleaf-shuckle-psywave-1", "xs-opp-nuzleaf-shuckle-qa-1", "xs-pla-espeon-crobat-xs-0"]) {
      const r = call(live(n));
      expect(r.input.firstBody, n).toBeUndefined();
      expect(r.out, n).not.toBeNull();
    }
    // asl155 (D4 faithful timing, docs/asl155-astonish-extrasensory-live.md): a known history + a target whose first visible monbg line is >= 27
    for (const n of ["xs-pla-nuzleaf-shuckle-xs-1", "xs-pla-nuzleaf-shuckle-xs-2", "xs-pla-nuzleaf-shuckle-psywave-1", "xs-pla-nuzleaf-shuckle-qa-0"]) {
      const r = call(live(n));
      expect(r.input.scanlineHistory, n).toBeDefined();
      expect(r.out, n).not.toBeNull();
    }
    for (const n of ["xs-pla-espeon-crobat-xs-1", "xs-pla-espeon-crobat-qa-0"]) {
      const r = call(live(n));
      expect(r.input.scanlineHistory, n).toBeDefined();
      expect(r.out, n).toBeNull();
    }
    // first bodies stay live on both sides
    for (const n of ["xs-opp-nuzleaf-shuckle-xs-0", "xs-pla-nuzleaf-shuckle-xs-0"]) expect(call(live(n)).out, n).not.toBeNull();
  });
});
