import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { frs247ProductionReturn } from "../tools/integration/frs247Production.ts";
import { partySendOutBattleFadeBldy } from "../src/engine/partySelect.ts";

// ROM fixture: tools/integration/fixtures/frs247/rom-frames.json (frs247RomFrames.sh: mGBA on pokeemerald, battle-scene ON and OFF).
// The ROM's reshow after the forced party menu (CB2_SetUpReshowBattleScreenAfterMenu -> BeginHardwarePaletteFade(0xFF, 0, 16, 0, 1)) is a
// brightness DECREASE: black, then rising to full colour; Cmd_drawpartystatussummary (flags 1) never draws the player's ball bar.
const fixture = JSON.parse(readFileSync("tools/integration/fixtures/frs247/rom-frames.json", "utf8")) as {
  cases: { id: string; scene: "on" | "off"; faint: number; exactFrames: number; readyE: number; promptE: number; parties: any; meanBrightnessE17to70: number[]; romFrameSha256: string[] }[];
};
const rgb = (fb: Uint8Array) => {
  const out = Buffer.alloc(240 * 160 * 3);
  for (let i = 0; i < 240 * 160; i += 1) { out[i * 3] = fb[i * 4]!; out[i * 3 + 1] = fb[i * 4 + 1]!; out[i * 3 + 2] = fb[i * 4 + 2]!; }
  return out;
};
const mean = (b: Buffer) => { let s = 0; for (let i = 0; i < b.length; i += 1) s += b[i]!; return Math.round((s / b.length) * 1000) / 1000; };

describe("frs247 faint-replacement reshow rises from black and draws no player ball bar", () => {
  it("covers both scenes, first and second faint", () => {
    expect(fixture.cases.map((c) => c.id)).toEqual(["pidgey-on-f1", "pidgey-off-f1", "twice-on-f1", "twice-on-f2", "twice-off-f1"]);
  });

  for (const c of fixture.cases) {
    describe(c.id, () => {
      const prod = frs247ProductionReturn({ overrides: { parties: c.parties } }, c.scene === "on", c.faint);

      it("matches the ROM full frame (sha256) on every compared confirm-relative frame", () => {
        expect(c.romFrameSha256.length).toBe(c.exactFrames);
        expect(c.exactFrames).toBeGreaterThanOrEqual(50);
        const got = c.romFrameSha256.map((_, i) => createHash("sha256").update(rgb(prod.draw(56 + i))).digest("hex"));
        expect(got).toEqual(c.romFrameSha256);
      });

      it("fade-in e56..70 follows the ROM mean brightness and rises monotonically to full brightness", () => {
        const means: number[] = [];
        for (let e = 56; e <= 71; e += 1) means.push(mean(rgb(prod.draw(e))));
        expect(means.slice(0, 15)).toEqual(c.meanBrightnessE17to70.slice(56 - 17));
        for (let i = 1; i < means.length; i += 1) expect(means[i]!).toBeGreaterThanOrEqual(means[i - 1]!);
        expect(means[0]!).toBeLessThan(means[15]! * 0.5);
      });
    });
  }

  it("ROM fade is black for e17..55 then BLDY = 71 - e", () => {
    for (const c of fixture.cases) {
      expect(c.meanBrightnessE17to70.slice(0, 56 - 17).every((m) => m === 0)).toBe(true);
      expect(c.meanBrightnessE17to70[56 - 17]!).toBeGreaterThan(0);
    }
    for (let e = 56; e <= 71; e += 1) expect(partySendOutBattleFadeBldy(e)).toBe(Math.max(0, 71 - e));
  });
});
