import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  statsChangeParams,
  statsChangeRow,
  statsChangeSpan,
} from "../src/animation/statsChange.ts";

// stat102 (ISSUES #166 slice a): the pure General_StatsChange reducer pinned
// against every row of the 20 committed stat101 ROM row tables (10 scenarios
// x Scene ON / OFF, rel A-1 .. E+3).

const FIXTURES = "tools/integration/fixtures/stat101/receipts";

interface ReceiptWindow {
  readonly arg: number;
  readonly A: number;
  readonly E: number;
  readonly rowsTsv: string;
}

function receiptWindows(): ReceiptWindow[] {
  const receipts = JSON.parse(readFileSync(join(FIXTURES, "stat-anim.json"), "utf8")) as Record<
    string,
    Record<string, { windows?: ReceiptWindow[] }>
  >;
  const windows: ReceiptWindow[] = [];
  for (const scenario of Object.values(receipts)) {
    for (const scene of ["on", "off"]) {
      windows.push(...(scenario[scene]?.windows ?? []));
    }
  }
  return windows;
}

type TsvRow = Record<string, string>;

function readRows(path: string): TsvRow[] {
  const [header, ...lines] = readFileSync(path, "utf8").trim().split("\n");
  const columns = header.split("\t");
  return lines.map((line) => {
    const cells = line.split("\t");
    return Object.fromEntries(columns.map((column, i) => [column, cells[i]]));
  });
}

describe("statsChangeParams (AnimTask_StatsChange switch)", () => {
  const stats = ["attack", "defense", "speed", "spAttack", "spDefense", "accuracy", "evasion"];

  it("maps every case of the source switch and rejects the rest", () => {
    const expected = new Map<number, [string, string, boolean]>();
    stats.forEach((palette, i) => {
      expected.set(15 + i, ["up", palette, false]);
      expected.set(22 + i, ["down", palette, false]);
      expected.set(39 + i, ["up", palette, true]);
      expected.set(46 + i, ["down", palette, true]);
    });
    expected.set(55, ["up", "multiple", false]);
    expected.set(56, ["up", "multiple", true]);
    expected.set(57, ["down", "multiple", false]);
    expected.set(58, ["down", "multiple", true]);
    for (let animArg = -1; animArg <= 70; animArg++) {
      const params = statsChangeParams(animArg);
      const want = expected.get(animArg);
      if (!want) {
        expect(params, `animArg ${animArg}`).toBeNull();
        continue;
      }
      expect(params && [params.direction, params.palette, params.sharply]).toEqual(want);
      expect(params?.targetBlend).toBe(want[2] ? 13 : 10);
      expect(params?.waitTime).toBe(want[2] ? 30 : 20);
      expect(params?.velocity).toBe(want[0] === "down" ? -3 : 3);
      expect(params?.bg1X).toBe(want[0] === "down" ? 64 : 0);
    }
    // PLUS1 + EVASION == MINUS1 + 0: the PLUS1 case comes first in the switch.
    expect(statsChangeParams(21)?.direction).toBe("up");
  });

  it("spans 75 / 89 active rows and adds 76 / 90 frames", () => {
    expect(statsChangeSpan(statsChangeParams(16)!)).toEqual({
      state3Rel: 67,
      endRel: 75,
      nextInstructionRel: 77,
      addedRows: 76,
    });
    expect(statsChangeSpan(statsChangeParams(58)!)).toEqual({
      state3Rel: 89,
      endRel: 89,
      nextInstructionRel: 91,
      addedRows: 90,
    });
  });

  it("hides an elevated opponent's shadow on rows 1 .. E+1 (stat102 pixel receipt)", () => {
    // tools/integration/fixtures/stat102/proto-compare.json: GOLBAT opponent, full screen 0 px on rows A-1 .. E+2 with this rule.
    for (const [animArg, endRel] of [[24, 75], [41, 89]] as const) {
      const params = statsChangeParams(animArg)!;
      const hidden = Array.from({ length: endRel + 5 }, (_, i) => i - 1).filter(
        (rel) => statsChangeRow(params, rel).enemyShadowHidden,
      );
      expect(hidden).toEqual(Array.from({ length: endRel + 1 }, (_, i) => i + 1));
    }
  });
});

describe("statsChangeRow vs the stat101 ROM row tables", () => {
  const windows = receiptWindows();

  it("covers all 20 committed tables", () => {
    const committed = readdirSync(join(FIXTURES, "rows")).filter((f) => f.endsWith(".tsv")).sort();
    expect(committed).toHaveLength(20);
    expect(windows.map((w) => w.rowsTsv.replace(/^rows\//, "")).sort()).toEqual(committed);
  });

  for (const window of windows) {
    it(`${window.rowsTsv} (animArg ${window.arg})`, () => {
      const params = statsChangeParams(window.arg);
      expect(params).not.toBeNull();
      const span = statsChangeSpan(params!);
      expect(span.endRel).toBe(window.E - window.A);
      const rows = readRows(join(FIXTURES, window.rowsTsv));
      expect(rows.map((r) => Number(r.rel))).toEqual(
        Array.from({ length: span.endRel + 5 }, (_, i) => i - 1),
      );
      const before = rows[0];
      let previous = before;
      let pinned = 0;
      for (const tsv of rows) {
        const rel = Number(tsv.rel);
        const row = statsChangeRow(params!, rel);
        const at = `${window.rowsTsv} rel ${rel}`;
        expect(row.active, at).toBe(tsv.act === "1");
        if (row.eva === null) {
          // Not written yet: the previous animation's BLDALPHA leftovers.
          expect([tsv.EVA, tsv.EVB], at).toEqual([before.EVA, before.EVB]);
        } else {
          expect([row.eva, row.evb], at).toEqual([Number(tsv.EVA), Number(tsv.EVB)]);
        }
        if (row.bg1X === null) {
          expect([tsv.bg1x, tsv.bg1y], at).toEqual([before.bg1x, before.bg1y]);
        } else {
          expect([row.bg1X, row.bg1YRam], at).toEqual([Number(tsv.bg1x), Number(tsv.bg1y)]);
        }
        if (row.bg1YVisible !== null) {
          expect([row.bg1XVisible, row.bg1YVisible], at).toEqual([
            Number(previous.bg1x),
            Number(previous.bg1y),
          ]);
        }
        expect(row.windowRegsVisible, at).toBe(tsv.winout === "3f3d" && tsv.bldcnt === "3f42");
        expect(row.copyAlive ? "3" : "-", at).toBe(tsv.slots);
        expect(row.maskOamVisible, at).toBe(tsv.ow !== "-");
        expect(row.bannerVisible, at).toBe(
          tsv.ow !== "-" && tsv.winout === "3f3d" && Number(tsv.EVA) > 0,
        );
        previous = tsv;
        pinned++;
      }
      expect(pinned).toBe(span.endRel + 5);
    });
  }
});
