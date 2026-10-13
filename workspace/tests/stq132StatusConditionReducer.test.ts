// stq132 (docs/stq132-status-condition-render-prep.md): the unwired SLP / BRN / INFATUATION reducers pinned against EVERY row of every
// committed dense ROM window (tools/integration/fixtures/stq132/rom-windows.json: direct mGBA, Scene ON, twice fresh r1 == r2):
// gAnimScriptActive, the controller hold, the battler's x2 / y2 / invisible flag, the BG shadows, BLDCNT / BLDALPHA, and every created
// sprite's position / x2 / y2 / invisible / priority / subpriority / animNum / animCmdIndex / tile frame / data[0..7] / affine matrix.
// The target geometry comes from the battler sprite alone (statusConditionTarget), never from the ROM's sprites.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  STATUS_CONDITION_SPANS,
  STATUS_PARTICLE_SPANS,
  statusAnimationDisplayRow,
  statusAnimationSpan,
  statusParticleDisplayRow,
  statusParticleSourceRow,
  statusConditionTarget,
  type StatusParticleAnimation,
  type StatusConditionTarget,
} from "../src/animation/statusConditionAnimations.ts";

interface RomRow { rel: number; act: number; x: number; io: Record<string, number>; bg: number[]; bat: number[]; sprites: number[][] }
interface RomWindow { scenario: string; animation: StatusParticleAnimation; side: "player" | "opponent"; E: number; rows: RomRow[] }

const rom = JSON.parse(readFileSync("tools/integration/fixtures/stq132/rom-windows.json", "utf8")) as { windows: Record<string, RomWindow> };
const windows = Object.entries(rom.windows);

/** The window's target geometry from the ROM row before the rise (the battler sprite's x / y / x2) only. */
export function stq132Target(w: RomWindow): StatusConditionTarget {
  const before = w.rows[0]!;
  return statusConditionTarget(w.side, before.bat[0]!, before.bat[1]!, before.bat[2]!);
}

function sourceAsRom(animation: StatusParticleAnimation, rel: number, target: StatusConditionTarget) {
  const s = statusParticleSourceRow(animation, rel, target);
  return {
    act: s.active ? 1 : 0, x: s.controllerBusy ? 1 : 0, bg: [...s.bg], bat: [s.battlerX2, s.battlerY2, s.battlerInvisible ? 1 : 0],
    bldcnt: s.bldcnt, bldalpha: s.bldalpha,
    sprites: s.sprites.map((p) => [p.x, p.y, p.x2, p.y2, p.invisible ? 1 : 0, p.priority, p.subpriority, p.animNum, p.animCmdIndex, p.tileOffset,
      ...p.data, p.affine ? 1 : 0, p.affine?.a ?? 0, p.affine?.b ?? 0, p.affine?.c ?? 0, p.affine?.d ?? 0]),
  };
}

describe("stq132 SLP / BRN / INFATUATION reducers vs every ROM row", () => {
  it("covers each animation on both sides with at least two species pairs (incl. an elevated GOLBAT opponent) and every listed path", () => {
    const pairs = new Map<string, Set<string>>();
    for (const [, w] of windows) {
      const key = `${w.animation}/${w.side}`;
      if (!pairs.has(key)) pairs.set(key, new Set());
      pairs.get(key)!.add(w.scenario.replace(/-(ply|opp)-/, "-"));
    }
    for (const animation of ["SLP", "BRN", "INFATUATION"]) {
      for (const side of ["player", "opponent"]) {
        expect(pairs.get(`${animation}/${side}`)?.size ?? 0).toBeGreaterThanOrEqual(2);
        expect([...pairs.get(`${animation}/${side}`)!].some((s) => s.includes("golbat"))).toBe(true);
      }
    }
    // SLP: Spore's inflict + 3 sleep turns; BRN: Will-O-Wisp's inflict + 2 end-turn ticks, + Fire Punch's secondary; INFATUATION: 2 in-love checks
    expect(windows.filter(([k]) => k.includes("spore")).length).toBe(16);
    expect(windows.filter(([k]) => k.includes("will-o-wisp")).length).toBe(12);
    expect(windows.filter(([k]) => k.includes("fire-punch")).length).toBe(1);
    expect(windows.filter(([k]) => k.includes("attract")).length).toBe(8);
    expect(windows.length).toBe(37);
  });

  for (const [key, w] of windows) {
    it(`${key} (${w.animation}, ${w.side}): ${w.rows.length} rows rel ${w.rows[0]!.rel} .. ${w.rows.at(-1)!.rel}`, () => {
      const target = stq132Target(w);
      const span = statusAnimationSpan(w.animation);
      expect(w.E).toBe(span.activeRows);
      const bad: string[] = [];
      for (const r of w.rows) {
        const got = sourceAsRom(w.animation, r.rel, target);
        // before rel 0 and after the release row the controller flag belongs to other instructions
        const want = { act: r.act, x: r.rel >= 0 && r.rel <= span.controllerRows ? r.x : got.x, bg: r.bg, bat: r.bat.slice(2, 5),
          bldcnt: r.io.bldcnt, bldalpha: r.io.bldalpha, sprites: r.sprites };
        if (JSON.stringify(got) !== JSON.stringify(want)) bad.push(`rel ${r.rel}: got ${JSON.stringify(got)} want ${JSON.stringify(want)}`);
      }
      expect(bad.slice(0, 3)).toEqual([]);
    });
  }

  it("spans: SLP / INFATUATION 97 controller rows, BRN 39; the stp128 table is unchanged; the all-seven dispatcher", () => {
    expect(Object.fromEntries(Object.entries(STATUS_PARTICLE_SPANS).map(([k, v]) => [k, [v.activeRows, v.controllerRows, v.createRow]])))
      .toEqual({ SLP: [96, 97, 3], BRN: [38, 39, 3], INFATUATION: [96, 97, 3] });
    expect(Object.keys(STATUS_CONDITION_SPANS)).toEqual(["CURSED", "NIGHTMARE", "CONFUSION", "FRZ"]);
    expect(statusAnimationSpan("FRZ", { freezeLoadLagRows: 0 }).controllerRows).toBe(116);
    const t = statusConditionTarget("opponent", 176, 42, 1);
    expect(statusAnimationDisplayRow("SLP", 40, t)).toEqual(statusParticleDisplayRow("SLP", 40, t));
  });

  it("display rows: sprites show 2 rows after their create row with the previous row's state; the battler keeps its idle x2", () => {
    const t = statusConditionTarget("opponent", 176, 42, 1);
    expect(statusParticleDisplayRow("SLP", 4, t).sprites).toEqual([]);
    expect(statusParticleDisplayRow("SLP", 5, t).sprites.map((s) => [s.left, s.top, s.affine])).toEqual([[156, 16, { a: 1771, b: -1528, c: 1528, d: 1771 }]]);
    expect(statusParticleDisplayRow("SLP", 36, t).sprites).toHaveLength(1);
    expect(statusParticleDisplayRow("SLP", 37, t).sprites).toHaveLength(2);
    expect(statusParticleDisplayRow("BRN", 5, t).sprites.map((s) => [s.left, s.top, s.tileOffset])).toEqual([[136, 48, 0]]);
    expect(statusParticleDisplayRow("INFATUATION", 5, t).sprites.map((s) => [s.left, s.top])).toEqual([[169, 51]]);
    expect(statusParticleDisplayRow("BRN", 20, t).battlerOffset).toEqual({ x: 1, y: 0 });
    expect(statusParticleDisplayRow("BRN", 39, t).enemyShadowHidden).toBe(true);
    expect(statusParticleDisplayRow("BRN", 40, t).enemyShadowHidden).toBe(false);
  });
});
