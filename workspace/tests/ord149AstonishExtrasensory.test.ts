// ord149 (docs/ord149-astonish-extrasensory.md): evidence pins for the Astonish 310 words law (+ its banked words-unit patch) and the
// Extrasensory 326 player later-body scanout split. Hermetic: committed direct-mGBA receipts only (tools/integration/fixtures/ord149).
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { WORDS_ORDER_UNIT_MOVE_IDS } from "../src/engine/wordsOrderUnits";
import { ORD149_RISE_CLASSES, ord149CheckUnit, ord149DropletRise, ord149PlanText } from "../tools/integration/ord149Check";

const F = "tools/integration/fixtures/ord149";
const json = (name: string) => JSON.parse(readFileSync(`${F}/${name}`, "utf8"));

interface Win { f: number; C: [number, string][]; D: number[]; F: number[] }
interface Drop { slot: number; rise: number }
interface Unit { kind: string; label: string; frame: number; F0: number[]; truncated: boolean; strayFChanges: number; plan: string; windows: Win[];
  astonish?: { steps: number; droplets: Drop[]; romPair: number[] } | null }

const units = json("ord149-units.json") as { jobs: Record<string, { identicalAB: boolean; units: Unit[] }> };
const bodies = Object.values(units.jobs).flatMap((job) => job.units)
  .filter((unit) => unit.kind === "body" && !unit.truncated && /^body 310:(player|opponent)$/.test(unit.label));
// the creation row already shows the first step (3 px for every word): the 30-step rise is the observed rise + 3
const rises = (unit: Unit) => unit.astonish!.droplets.map((drop) => drop.rise + 3) as [number, number];

describe("ord149 A: Astonish 310 words law", () => {
  it("source: the v2 word decides the rise; 128 words fall in 8 rise classes, x / v1 never enter the sort key", () => {
    expect(ORD149_RISE_CLASSES).toEqual([22, 26, 30, 34, 38, 42, 45, 48]);
    expect(ord149DropletRise(0)).toBe(38);
    expect(ord149DropletRise(127)).toBe(48);
    expect(ord149DropletRise(126)).toBe(22);
    expect(ord149PlanText(26, 42)).toBe("Cf;D0;Cff;D1,2/P26,42");
  });

  it("ROM: every receipt body is A == B, 30 sorted steps, both rises a source class", () => {
    expect(Object.values(units.jobs).every((job) => job.identicalAB)).toBe(true);
    expect(bodies.length).toBe(36);
    for (const unit of bodies) {
      expect(unit.astonish?.steps).toBe(30);
      for (const rise of rises(unit)) expect(ORD149_RISE_CLASSES).toContain(rise);
    }
    const seen = new Set(bodies.flatMap(rises));
    expect([...seen].sort((l, r) => l - r)).toEqual(ORD149_RISE_CLASSES);
  });

  it("the law's plan text is exact per allocation window on 36 / 36 bodies (18 player, 18 opponent; one rise tie)", () => {
    let ties = 0;
    for (const unit of bodies) {
      const [r1, r2] = rises(unit);
      if (r1 === r2) ties += 1;
      expect(ord149CheckUnit(unit, ord149PlanText(r1, r2)), `${unit.label}@${unit.frame}`).toEqual([]);
    }
    expect(ties).toBe(1);
    expect(bodies.filter((unit) => unit.label.endsWith("player")).length).toBe(18);
  });

  it("controls fail: static D1,2 / D2,1 and the production 310:opponent row (tied P537: the lend order)", () => {
    const exact = (text: string, side?: string) => bodies.filter((unit) => (side === undefined || unit.label.endsWith(side))
      && ord149CheckUnit(unit, text).length === 0).length;
    expect(exact("Cf;D0;Cff;D1,2")).toBe(15);
    expect(exact("Cf;D0;Cff;D2,1")).toBe(21);
    expect(exact("Cf;D0;Cff;D1,2/P537,537", "opponent")).toBe(8);
    // reversing the words (the higher droplet first) fails every non-tied body
    expect(bodies.filter((unit) => { const [r1, r2] = rises(unit); return ord149CheckUnit(unit, ord149PlanText(r2, r1)).length === 0; }).length).toBe(1);
  });

  it("receipt pins: check, banked patch, census delta, windows after the bodies", () => {
    const check = json("ord149-check.json");
    expect(check.bodies.player.exact).toBe(18);
    expect(check.bodies.opponent.exact).toBe(18);
    const diff = readFileSync(`${F}/ord149-astonish-words-unit.diff`, "utf8");
    expect([...diff.matchAll(/^\+\+\+ b\/(\S+)/gm)].map((m) => m[1])).toEqual(["src/engine/liveMoveAnimation.ts", "src/engine/wordsOrderUnits.ts"]);
    expect(diff).toContain("+export const WORDS_ORDER_UNIT_MOVE_IDS: readonly number[] = Object.freeze([28, 189, 240, 260, 291, 301, 310]);");
    expect(diff).toContain("`Cf;D0;Cff;D1,2/P${liveAstonishDropletRise(words.words[1]! & 0x7f)},${liveAstonishDropletRise(words.words[3]! & 0x7f)}`");
    expect(createHash("sha256").update(diff).digest("hex")).toBe("20e4b3425c4d7dfa72eff750f47d9fc306a32f642ba840913962e34e61c22180");
    // asl155: the banked patch is landed (tests/ordl149AstonishWordsUnit.test.ts)
    expect(WORDS_ORDER_UNIT_MOVE_IDS).toContain(310);
    const delta = json("ord149-census-delta.json");
    expect(delta.commands).toBe(27256);
    expect(delta.lifted).toEqual({ commands: 6, frames: 983 });
    expect(delta.regressed).toBe(0);
    expect(delta.changed.length).toBe(7);
    expect(delta.changedWithoutEarlierPlayerAstonish).toBe(0);
    const pair = json("ord149-census-check.json");
    expect([pair.pairingMismatches, pair.regressionCount, pair.liveCountBefore, pair.liveCountAfter]).toEqual([0, 0, 27075, 27081]);
    expect(JSON.stringify(json("ord149-attr-patched.json"))).not.toContain("body 310:player");
    expect(JSON.stringify(json("ord149-attr-base.json"))).toContain("body 310:player");
    const total = (name: string) => readFileSync(`${F}/${name}`, "utf8").split("\n").find((line) => line.startsWith("TOTAL all"));
    expect(total("ord149-windows-base.txt")).toContain("windows=26 live=26 live-0px=23 r1==r2=26 lend==ROM=20");
    expect(total("ord149-windows-patched.txt")).toContain("windows=26 live=26 live-0px=23 r1==r2=26 lend==ROM=26");
  });
});

describe("ord149 B: Extrasensory 326 player later bodies (scanout split)", () => {
  const split = json("ord149-xs-split.json").routes as Record<string, { rowKeys: number; rowKeysWithOneSplit: number; bodies: { split: number[][] }[] }>;

  it("the split is not a function of (stage, row) across the bodies of one route", () => {
    expect(Object.fromEntries(Object.entries(split).map(([name, route]) => [name, [route.rowKeysWithOneSplit, route.rowKeys]]))).toEqual({
      "xs-pla-xs-A": [7, 72], "xs-pla-qa-A": [7, 72], "xs-pla-crobat-xs-A": [0, 72] });
    // the first body's stage-3 write with data[1] 4 has S = 28: the renderer's one fitted split (extrasensory.ts splitScanout)
    expect(split["xs-pla-xs-A"]!.bodies[0]!.split[2]![4]).toBe(28);
    expect(split["xs-pla-xs-A"]!.bodies[1]!.split[2]![4]).toBe(25);
    // a player-target body (the CROBAT route's opponent attacker, window 48..112) never shows a previous-row line
    expect(split["xs-pla-crobat-xs-A"]!.bodies[1]!.split.flat().every((s) => s === 47)).toBe(true);
  });

  it("the ROM split predicts scan93's gate-lifted residual rows exactly (count and displayed ages) on 6 / 6 SHUCKLE bodies", () => {
    const predict = json("ord149-xs-predict.json") as { visibleLine: number; windows: { fixture: string | null; predictedSplitRows: number; lagRows: number;
      scan93AffectedRows: number | null; same: boolean; agesInSpan: boolean; displayedAges: number[] }[] };
    expect(predict.visibleLine).toBe(27);
    expect(predict.windows.map((w) => [w.fixture, w.predictedSplitRows, w.lagRows, w.scan93AffectedRows])).toEqual([
      [null, 0, 0, null],
      ["xs-pla-nuzleaf-shuckle-xs-1.json", 3, 0, 3],
      ["xs-pla-nuzleaf-shuckle-xs-2.json", 1, 0, 1],
      ["xs-pla-nuzleaf-shuckle-qa-0.json", 2, 16, 18],
      ["xs-pla-nuzleaf-shuckle-qa-1.json", 5, 16, 21],
      ["xs-pla-nuzleaf-shuckle-qa-2.json", 2, 0, 2],
    ]);
    expect(predict.windows.every((w) => w.same && w.agesInSpan)).toBe(true);
    expect(predict.windows[1]!.displayedAges).toEqual([95, 98, 101]);
  });
});
