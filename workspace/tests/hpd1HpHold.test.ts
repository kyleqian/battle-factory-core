// hpd1 (docs/hpd1-hp-hold.md): ROM receipts of 20 fixed-damage hit windows (damage 10..90, shapes a / c, Scene ON and OFF). The ROM's hold after the bar is
// damage + a per-shape constant: no 28-frame floor, no bar-size term. The production change that matches it (commit bab95ae43) is NOT landed: it made
// rol1-rollout5-on worse (docs/hpd1-hp-hold.md), so this test pins the ROM side only.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type Case = { case: string; scene: "on" | "off"; shape: "a" | "c"; playerLevel: number; moveId: number; foeLevel: number; damage: number;
  rom: { barStart: number; barEnd: number; boxChange: number; menu: number } };
const cases = (JSON.parse(readFileSync("tools/integration/fixtures/hpd1/rom-holds.json", "utf8")) as { cases: Case[] }).cases;

describe("hpd1: ROM post-hit hold over 20 fixed-damage windows", () => {
  it("ROM: drain start -> next text-box change is damage + a per-shape constant (c 17, a 18), the same in both scenes (no floor, no bar-size term)", () => {
    for (const shape of ["a", "c"] as const) {
      const rows = cases.filter((c) => c.shape === shape);
      expect(new Set(rows.map((c) => c.damage)).size).toBeGreaterThanOrEqual(4);
      for (const c of rows) expect([c.case, c.scene, c.rom.boxChange - c.rom.barStart - c.damage]).toEqual([c.case, c.scene, shape === "c" ? 17 : 18]);
    }
    expect(cases.filter((c) => c.shape === "c").map((c) => c.rom.menu - c.rom.boxChange)).toEqual(Array(12).fill(8));
  });
});
