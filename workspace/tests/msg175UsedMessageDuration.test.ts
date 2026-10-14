// msg175 (docs/msg175-used-message-duration.md): the "<mon> used <move>!" print lasts its printable length L (first glyph -> final
// glyph G, one glyph per row, the line break free), not the old 24-frame floor, in both scenes; and ISSUES #167 (a)'s Scene OFF Wish
// pause lands the next action's "used" first glyph on the ROM row. ROM truth = the committed off108 / off148 direct-mGBA receipts
// (r1 == r2), replayed through production by tools/integration/msg175Anchors.ts.
import { describe, expect, it } from "vitest";
import { msg175Measure } from "../tools/integration/msg175Anchors";

describe("msg175: the used-move print duration", () => {
  it("every ROM attackstring use runs first glyph -> final glyph in exactly production's printable length (both scenes)", () => {
    const { durations } = msg175Measure([
      "off108-confuse-ray-ply-primeape-snorlax", "off108-protect-ply-primeape-onix", "off108-dynamic-punch-opp-machamp-snorlax",
      "off108-rest-ply-snorlax-onix", "off148-wish-ply", "off148-wish-opp", "off148-baton-pass-opp",
    ]);
    const matched = durations.filter((d) => d.L !== null);
    // 16 .. 29 glyphs: both sides, short and long nicknames / move names.
    expect(new Set(matched.map((d) => d.L)).size).toBeGreaterThanOrEqual(7);
    expect(Math.min(...matched.map((d) => d.L))).toBeLessThan(24);
    expect(Math.max(...matched.map((d) => d.L))).toBeGreaterThan(24);
    for (const d of matched) expect([d.scenario, d.scene, d.romRows]).toEqual([d.scenario, d.scene, d.L]);
  });

  it("ISSUES #167 (a): the Scene OFF Wish pause lands the next action's used first glyph on the ROM row, both sides", () => {
    const { edges } = msg175Measure(["off148-wish-ply", "off148-wish-opp"]);
    expect(edges.map((e) => [e.scenario, e.scene, e.L1, e.rom, e.residual])).toEqual([
      ["off148-wish-ply", "off", 18, 68, 0],
      ["off148-wish-opp", "off", 22, 72, 0],
    ]);
  });

  it("named remainder: the Scene OFF no-hit -> next used edge is a uniform -12 (the action transition, not the print)", () => {
    const { edges } = msg175Measure([
      "off108-bulk-up-ply-primeape-onix", "off108-double-team-ply-primeape-onix", "off108-sand-attack-ply-primeape-snorlax",
      "off108-protect-ply-primeape-onix", "off108-detect-ply-primeape-onix", "off148-agility-ply",
    ]);
    const off = edges.filter((e) => e.scene === "off");
    expect(off).toHaveLength(6);
    for (const e of off) expect([e.scenario, e.residual]).toEqual([e.scenario, -12]);
  });
});
