// fps147 (docs/fps147-focus-punch-setup.md): the unwired General_FocusPunchSetUp reducer pinned to the committed dense Scene ON ROM
// windows (tools/integration/fixtures/fps147/rom-windows.json, fps147Probe.py, r1 == r2). Hermetic: committed fixtures only.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  FOCUS_PUNCH_SETUP_ROWS,
  focusPunchSetUpDisplayRow,
  focusPunchSetUpSourceRow,
} from "../src/animation/focusPunchSetUp.ts";

const FIX = "tools/integration/fixtures/fps147";
type Row = {
  rel: number; f: number; act: number; bs: number; box: number; d?: number[]; bat: number[][]; pal: number[];
  spr: number[][]; n: number; vt: number; sc: number[];
};
type Window = { side: "player" | "opponent"; species: string; S: number; R: number; E: number; battler: number; rows: Row[] };
const rom = JSON.parse(readFileSync(`${FIX}/rom-windows.json`, "utf8")) as { windows: Record<string, Window> };
const shas = JSON.parse(readFileSync(`${FIX}/probe-sha256.json`, "utf8")) as { jobs: Record<string, { equal: boolean }> };
const windows = Object.entries(rom.windows);
const coordOf = (side: "player" | "opponent") => side === "player" ? { x: 72, y: 80 } : { x: 176, y: 40 };
// RGB_RED BlendPalette on BGR555 words
const blend = (c: number, y: number) => {
  let o = 0;
  for (const [shift, target] of [[0, 31], [5, 0], [10, 0]] as const) {
    const from = (c >> shift) & 31;
    o |= (from + (((target - from) * y) >> 4)) << shift;
  }
  return o;
};

describe("fps147 General_FocusPunchSetUp reducer vs dense ROM windows", () => {
  it("covers >= 2 attacker species per side, every window r1 == r2", () => {
    const species = (side: string) => new Set(windows.filter(([, w]) => w.side === side).map(([, w]) => w.species));
    expect(species("player").size).toBeGreaterThanOrEqual(2);
    expect(species("opponent").size).toBeGreaterThanOrEqual(2);
    expect(Object.keys(shas.jobs).sort()).toEqual(windows.map(([k]) => k).sort());
    expect(Object.values(shas.jobs).every((j) => j.equal)).toBe(true);
  });

  it.each(windows)("%s: script / box timing rows", (_key, w) => {
    const byRel = new Map(w.rows.map((r) => [r.rel, r]));
    expect(w.S - w.R).toBe(FOCUS_PUNCH_SETUP_ROWS.scriptStart);
    expect(w.E - w.R).toBe(FOCUS_PUNCH_SETUP_ROWS.activeRows);
    expect(w.rows.filter((r) => r.act).map((r) => r.rel)).toEqual(
      Array.from({ length: FOCUS_PUNCH_SETUP_ROWS.activeRows }, (_, i) => i));
    // the empty box: the first screen change since the row before the script
    expect(w.rows.find((r) => r.d && r.d[0])!.rel).toBe(FOCUS_PUNCH_SETUP_ROWS.emptyBoxDisplay);
    // printstring STRINGID_PKMNTIGHTENINGFOCUS (bs 16 = past printstring 0 / waitmessage 3 / playanimation 6 / ... ) and its first glyph
    expect(w.rows.find((r) => r.bs === 16)!.rel).toBe(FOCUS_PUNCH_SETUP_ROWS.focusPrintRow);
    expect(w.rows.find((r) => r.rel > 0 && r.box > 0)!.rel).toBe(FOCUS_PUNCH_SETUP_ROWS.focusFirstGlyphDisplay);
    expect(byRel.get(FOCUS_PUNCH_SETUP_ROWS.emptyBoxDisplay)!.box).toBeGreaterThan(0);
  });

  it.each(windows)("%s: every source row (script, sprites, tasks, x2) equals RAM", (_key, w) => {
    const b = w.battler;
    expect(w.side).toBe(b === 0 ? "player" : "opponent");
    for (const r of w.rows) {
      const s = focusPunchSetUpSourceRow(r.rel, w.side, coordOf(w.side));
      const romScript = r.rel < 0 ? null : r.sc[1] >= 0 && r.sc[1] < 0x60
        ? { label: "EndureEffect", offset: r.sc[1] } : { label: "General_FocusPunchSetUp", offset: r.sc[0] };
      expect({ rel: r.rel, act: r.act === 1, script: romScript, x2: r.bat[b]![3], vt: r.vt,
        sprites: r.spr.filter((x) => x[13]).map((x) => [x[0], x[1], x[2], x[9], x[11], x[12]]) }).toEqual({
        rel: r.rel, act: s.active, script: s.script, x2: s.attackerX2, vt: s.visualTaskCount,
        sprites: s.sprites.map((x) => [x.oamSlot, x.x, x.y, x.frame, x.data0, x.data1]) });
      // no other sprite is created inside the window
      expect(r.spr.every((x) => x[13] === 1)).toBe(true);
    }
  });

  it.each(windows)("%s: the displayed attacker palette is the RGB_RED blend at the display row's Y", (_key, w) => {
    const base = w.rows.find((r) => r.rel === -1)!.pal;
    for (const r of w.rows.filter((x) => x.rel >= -1)) {
      const y = focusPunchSetUpDisplayRow(r.rel, w.side, coordOf(w.side)).attackerPaletteY;
      expect([r.rel, r.pal]).toEqual([r.rel, base.map((c) => blend(c, y))]);
    }
  });

  it("the display row is production's Endure display at age rel (sprites / Y at rel - 1, x2 = attackerDisplayX2)", () => {
    const d = focusPunchSetUpDisplayRow(40, "player", { x: 72, y: 80 });
    const s = focusPunchSetUpSourceRow(39, "player", { x: 72, y: 80 });
    expect(d.sprites.map((x) => [x.oamSlot, x.y])).toEqual(s.sprites.filter((x) => !x.initOnly).map((x) => [x.oamSlot, x.y]));
    expect(d.attackerPaletteY).toBe(s.attackerPaletteY);
    // the shake shows two rows late (task after BuildOamBuffer, then the OAM copy)
    for (let rel = 0; rel < 125; rel++) {
      expect([rel, focusPunchSetUpDisplayRow(rel, "opponent", { x: 176, y: 40 }).attackerX2])
        .toEqual([rel, focusPunchSetUpSourceRow(rel - 2, "opponent", { x: 176, y: 40 }).attackerX2]);
    }
  });

  it("comparator receipts: 0 px on every scored row of every window (both arms); every control fails every window", () => {
    const read = (name: string) => JSON.parse(readFileSync(`${FIX}/${name}`, "utf8"));
    const main = read("compare.json");
    expect(main.summary).toMatchObject({ neg: null, windows: windows.length, reducerZeroPxWindows: windows.length,
      productionEndureZeroPxWindows: windows.length });
    for (const [key, w] of windows) {
      expect(main.result[key]).toMatchObject({ side: w.side, reducerPx: 0, animationRowsPx: 0, productionEndurePx: 0,
        scoredRows: { first: FOCUS_PUNCH_SETUP_ROWS.emptyBoxDisplay, last: FOCUS_PUNCH_SETUP_ROWS.focusFirstGlyphDisplay - 1, count: 127 },
        afterRows: { px: 0, productionPx: 0 } });
    }
    for (const neg of ["age+1", "wrong-side", "no-shake", "no-blend"]) {
      const control = read(`compare-${neg}.json`);
      expect(control.summary).toMatchObject({ neg, windows: windows.length, reducerZeroPxWindows: 0 });
      for (const [key] of windows) expect(control.result[key].animationRowsPx).toBeGreaterThan(0);
    }
  });

  it("is unwired: no production module imports it", () => {
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.tsx?$/.test(name) && p !== join("src", "animation", "focusPunchSetUp.ts")
          && readFileSync(p, "utf8").includes("focusPunchSetUp.ts")) hits.push(p);
      }
    };
    walk("src");
    expect(hits).toEqual([]);
  });
});
