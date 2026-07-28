import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { thunderWaveAtAge } from "../../src/animation/thunderWave.ts";

describe("MOVE_THUNDER_WAVE source-relative reducer", () => {
  const player = (age: number) =>
    thunderWaveAtAge(age, "player", { x: 176, y: 49 }, { x: 176, y: 40 });
  const opponent = (age: number) =>
    thunderWaveAtAge(age, "opponent", { x: 72, y: 91 }, { x: 72, y: 80 });

  it("ports the load, field fade, ElectricBolt, and first sound", () => {
    expect([0, 1, 4, 7, 119].map((age) => player(age).assets)).toEqual([
      { spark: false, spark2: false, sparkH: false },
      { spark: true, spark2: false, sparkH: false },
      { spark: true, spark2: true, sparkH: false },
      { spark: true, spark2: true, sparkH: true },
      { spark: false, spark2: false, sparkH: false },
    ]);
    expect([9, 10, 11, 12, 13, 14, 15, 16, 112, 113, 117, 118].map(
      (age) => player(age).backgroundPaletteY,
    )).toEqual([0, 1, 2, 3, 4, 5, 6, 6, 6, 5, 1, 0]);
    expect(player(28).bolts).toMatchObject([
      { slot: 3, x: 176, y: 8, tileOffset: 0, localAge: 0 },
    ]);
    expect(player(36).bolts.map(
      ({ slot, y, tileOffset }) => ({ slot, y, tileOffset }),
    )).toEqual([
      { slot: 3, y: 8, tileOffset: 0 },
      { slot: 4, y: 24, tileOffset: 1 },
      { slot: 5, y: 40, tileOffset: 2 },
      { slot: 7, y: 56, tileOffset: 3 },
      { slot: 9, y: 72, tileOffset: 0 },
    ]);
    expect(opponent(36).bolts.map((bolt) => bolt.y))
      .toEqual([48, 64, 80, 96, 112]);
    expect(player(28)).toMatchObject({
      soundRestart: "SE_M_THUNDER_WAVE", soundPan: 63,
    });
    expect(opponent(28)).toMatchObject({
      soundRestart: "SE_M_THUNDER_WAVE", soundPan: -63,
    });
  });

  it("ports all three staggered two-sprite bands and teardown", () => {
    expect(player(50).bands).toMatchObject([
      { slot: 3, x: 160, y: 33, tileOffset: 0, hidden: false },
      { slot: 4, x: 192, y: 33, tileOffset: 8, hidden: false },
    ]);
    expect(player(62).bands.map(({ slot, y }) => ({ slot, y }))).toEqual([
      { slot: 3, y: 33 }, { slot: 4, y: 33 },
      { slot: 5, y: 49 }, { slot: 7, y: 49 },
      { slot: 9, y: 65 }, { slot: 10, y: 65 },
    ]);
    expect([50, 51, 52, 53, 54, 55].map(
      (age) => player(age).bands[0]?.hidden,
    )).toEqual([false, false, true, true, true, false]);
    expect([50, 60, 71, 82].map((age) => player(age).soundRestart))
      .toEqual(Array(4).fill("SE_M_THUNDERBOLT2"));
    expect(player(118)).toMatchObject({
      active: true, visualTaskCount: 0, backgroundPaletteY: 0,
    });
    expect(player(119)).toMatchObject({
      active: false, assets: { spark: false, spark2: false, sparkH: false },
      bolts: [], bands: [],
    });
  });

  it("source-audits Thunderbolt and Zap Cannon without promoting them", () => {
    const output = execFileSync(process.execPath, [
      "--experimental-strip-types",
      "tools/compare/thunderWaveSourceAudit.ts",
    ], { encoding: "utf8" });
    expect(output).toContain('"move":"MOVE_THUNDER_WAVE"');
    expect(output).toContain('"MOVE_THUNDERBOLT":"unsupported:');
    expect(output).toContain('"MOVE_ZAP_CANNON":"unsupported:');
  });
});
