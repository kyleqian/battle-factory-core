// stp128 (docs/stp128-status-condition-render-prep.md): the unwired status-condition reducers pinned against EVERY row of every committed
// dense ROM window (tools/integration/fixtures/stp128/rom-windows.json: direct mGBA, Scene ON, twice fresh r1 == r2): gAnimScriptActive,
// the controller hold, the battler's x2 / y2 / invisible flag, the monbg BG shadows, BLDCNT / BLDALPHA, and every created sprite's
// position / x2 / y2 / invisible / priority / subpriority / animNum / animCmdIndex / tile frame / data[0..7].
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  STATUS_CONDITION_SPANS,
  statusConditionDisplayRow,
  statusConditionSourceRow,
  statusConditionSpan,
  statusConditionTarget,
  type StatusConditionOptions,
  type StatusConditionAnimation,
  type StatusConditionTarget,
} from "../src/animation/statusConditionAnimations.ts";

interface RomRow {
  rel: number; act: number; x: number; io: Record<string, number>; bg: number[]; bat: number[]; sprites: number[][]; p7?: number[];
}
interface RomWindow { scenario: string; animation: StatusConditionAnimation; side: "player" | "opponent"; E: number; rows: RomRow[] }

const rom = JSON.parse(readFileSync("tools/integration/fixtures/stp128/rom-windows.json", "utf8")) as { windows: Record<string, RomWindow> };
const windows = Object.entries(rom.windows);
/** FRZ: the frozen-turn windows lose one row in loadspritegfx (E 116), the windows after Ice Beam do not (E 115). */
const optionsOf = (w: RomWindow): StatusConditionOptions => (w.animation === "FRZ" ? { freezeLoadLagRows: w.E === 116 ? 1 : 0 } : {});

/** The window's target geometry, from the ROM row before the rise (battler sprite) and the first created sprite (createsprite origin). */
export function stp128Target(w: RomWindow): StatusConditionTarget {
  const before = w.rows[0]!;
  const first = w.rows.find((r) => r.sprites.length)!.sprites[0]!;
  const dx = w.animation === "FRZ" ? 32 : 0, dy = w.animation === "CONFUSION" ? 15 : w.animation === "FRZ" ? 36 : 0;
  return { side: w.side, spriteX: before.bat[0]!, spriteY: before.bat[1]!, animX: first[0]! + dx, animY: first[1]! + dy, idleX2: before.bat[2]! };
}

function sourceAsRom(animation: StatusConditionAnimation, rel: number, target: StatusConditionTarget, options: StatusConditionOptions) {
  const s = statusConditionSourceRow(animation, rel, target, options);
  return {
    act: s.active ? 1 : 0, x: s.controllerBusy ? 1 : 0, bg: [...s.bg], bat: [s.battlerX2, s.battlerY2, s.battlerInvisible ? 1 : 0],
    bldcnt: s.bldcnt, bldalpha: s.bldalpha,
    sprites: s.sprites.map((p) => [p.x, p.y, p.x2, p.y2, p.invisible ? 1 : 0, p.priority, p.subpriority, p.animNum, p.animCmdIndex, p.tileOffset, ...p.data]),
  };
}

describe("stp128 status-condition reducers vs every ROM row", () => {
  it("covers CURSED / NIGHTMARE / CONFUSION on both sides with at least two species pairs each, FRZ on both sides and both paths", () => {
    const pairs = new Map<string, Set<string>>();
    for (const [, w] of windows) {
      const key = `${w.animation}/${w.side}`;
      if (!pairs.has(key)) pairs.set(key, new Set());
      pairs.get(key)!.add(w.scenario.replace(/-(ply|opp)-/, "-"));
    }
    for (const animation of ["CURSED", "NIGHTMARE", "CONFUSION"]) {
      for (const side of ["player", "opponent"]) expect(pairs.get(`${animation}/${side}`)?.size ?? 0).toBeGreaterThanOrEqual(2);
    }
    expect(windows.length).toBe(34);
    for (const side of ["player", "opponent"]) {
      expect(windows.filter(([, w]) => w.animation === "FRZ" && w.side === side).map(([, w]) => w.E).sort()).toEqual(side === "player" ? [115, 116, 116] : [115, 116]);
    }
  });

  for (const [key, w] of windows) {
    it(`${key} (${w.animation}, ${w.side} target): ${w.rows.length} rows rel ${w.rows[0]!.rel} .. ${w.rows.at(-1)!.rel}`, () => {
      const target = stp128Target(w);
      const options = optionsOf(w);
      const span = statusConditionSpan(w.animation, options);
      expect(statusConditionTarget(w.side, target.spriteX, target.spriteY, target.idleX2)).toEqual(target);
      expect(w.E).toBe(span.activeRows);
      const bad: string[] = [];
      for (const r of w.rows) {
        const got = sourceAsRom(w.animation, r.rel, target, options);
        // before rel 0 (an IsBattleSEPlaying gate) and after the release row the controller flag belongs to other instructions
        const want = { act: r.act, x: r.rel >= 0 && r.rel <= span.controllerRows ? r.x : got.x, bg: r.bg, bat: r.bat.slice(2, 5), bldcnt: r.io.bldcnt, bldalpha: r.io.bldalpha, sprites: r.sprites };
        if (JSON.stringify(got) !== JSON.stringify(want)) bad.push(`rel ${r.rel}: got ${JSON.stringify(got)} want ${JSON.stringify(want)}`);
      }
      expect(bad.slice(0, 3)).toEqual([]);
      if (w.animation === "FRZ") {
        // the ice cube palette rotation (entries 13..15) reaches OBJ palette RAM exactly on the rows the display reducer advances it
        const romChanges = w.rows.filter((r) => r.rel > w.rows[0]!.rel && r.p7).map((r) => r.rel);
        const rot = (rel: number) => statusConditionDisplayRow("FRZ", rel, target, options).objPaletteRotation;
        const changes = w.rows.filter((r) => r.rel > w.rows[0]!.rel && rot(r.rel) !== rot(r.rel - 1)).map((r) => r.rel);
        expect(changes).toEqual(romChanges);
      }
    });
  }

  it("spans equal sta123's controller rows (CURSED / NIGHTMARE 75, CONFUSION 100, FRZ 117 frozen turn / 116 + the SE gate after Ice Beam)", () => {
    expect(Object.fromEntries(Object.entries(STATUS_CONDITION_SPANS).map(([k, v]) => [k, v.controllerRows])))
      .toEqual({ CURSED: 75, NIGHTMARE: 75, CONFUSION: 100, FRZ: 117 });
    expect(statusConditionSpan("FRZ")).toEqual(STATUS_CONDITION_SPANS.FRZ);
    expect(statusConditionSpan("FRZ", { freezeLoadLagRows: 0 }).controllerRows).toBe(116);
  });

  it("display rows: the shake shows one row late, created sprites two rows after their create row, the shadow hides on rel 1 .. E + 1", () => {
    const target: StatusConditionTarget = { side: "opponent", spriteX: 176, spriteY: 42, animX: 176, animY: 42 };
    expect(statusConditionDisplayRow("CURSED", 7, target).battlerOffset).toEqual({ x: 2, y: 0 });
    expect(statusConditionDisplayRow("CURSED", 7, target).sprites).toEqual([]);
    expect(statusConditionDisplayRow("CURSED", 8, target).sprites.map((s) => [s.left, s.top, s.blend])).toEqual([[159, 24, { eva: 11, evb: 5 }]]);
    expect(statusConditionDisplayRow("CURSED", 0, target).enemyShadowHidden).toBe(false);
    expect(statusConditionDisplayRow("CURSED", 75, target).enemyShadowHidden).toBe(true);
    expect(statusConditionDisplayRow("CURSED", 76, target).enemyShadowHidden).toBe(false);
    expect(statusConditionDisplayRow("CONFUSION", 4, target).sprites).toEqual([]);
    expect(statusConditionDisplayRow("CONFUSION", 5, target).sprites).toHaveLength(5);
    expect(statusConditionDisplayRow("CONFUSION", 93, target).sprites).toEqual([]);
  });
});
