import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import asset from "../../src/animation/assets/water-spout-glowy-blue-orb.json" with { type: "json" };
import waterGun from "../../src/animation/assets/water-gun.json" with { type: "json" };
import {
  waterSpoutComponentPlan,
  waterSpoutLaunchOrbCount,
  waterSpoutPowerTier,
  waterSpoutRainAttemptCount,
  waterSpoutRainAttempts,
} from "../../src/animation/waterSpout.ts";
import { createScratchDir } from "../../tools/lib/scratch.ts";

type Json = Record<string, any>;
function rows(side: "player" | "opponent"): Json[] {
  return (JSON.parse(gunzipSync(readFileSync(`tools/compare/evidence/water-spout-${side}-dense-state.json.gz`)).toString("utf8")) as Json).frames;
}

describe("MOVE_WATER_SPOUT source-relative component reducer checkpoint", () => {
  it("keeps all four live HP tiers and their source loop cardinalities", () => {
    expect([1, 24, 25, 49, 50, 74, 75, 100].map((hp) => waterSpoutPowerTier(hp, 100)))
      .toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
    expect(([0, 1, 2, 3] as const).map(waterSpoutLaunchOrbCount)).toEqual([5, 7, 10, 20]);
    expect(([0, 1, 2, 3] as const).map(waterSpoutRainAttemptCount)).toEqual([5, 10, 15, 20]);
  });

  it("replays every tier-3 launch seed at its source creation row bilaterally", () => {
    for (const side of ["player", "opponent"] as const) {
      const dense = rows(side);
      const row = dense[55]!;
      const actual = row.sprites.filter((sprite: Json) => sprite.template?.symbol === "gSmallWaterOrbSpriteTemplate")
        .map((sprite: Json) => ({ slot: sprite.slot, x: sprite.x, y: sprite.y, subpriority: sprite.subpriority, data: sprite.data }));
      const plan = waterSpoutComponentPlan({
        attackerSide: side,
        attackerHp: row.parties[side === "player" ? "player" : "opponent"][0].hp,
        attackerMaxHp: row.parties[side === "player" ? "player" : "opponent"][0].maxHp,
        attackerEffectCenter: { x: side === "player" ? 72 : 176, y: side === "player" ? 100 : 52 },
        attackerSubpriority: row.battlerSprites.attacker.subpriority,
        launchTaskSlot: 0,
        launchSpriteSlots: actual.map((entry: Json) => entry.slot),
        animationRng: row.animationRng,
      });
      expect(plan.tier).toBe(3);
      expect(plan.launch.map(({ slot, x, y, subpriority, data }) => ({ slot, x, y, subpriority, data }))).toEqual(actual);
      expect(plan.rain).toEqual(waterSpoutRainAttempts(side, 3));
      expect(plan.rain.slice(0, 4).map(({ x, impactY }) => [x, impactY])).toEqual(side === "player"
        ? [[185, 40], [116, 53], [97, 55], [124, 44]]
        : [[65, 80], [-34, 93], [35, 95], [-44, 84]]);
    }
  });

  it("independently rechecks the move-owned OAM, palette, and launch-affine transfer classes", () => {
    const affineLag2 = [
      ...Array.from({ length: 32 }, (_, index) => index + 11),
      ...Array.from({ length: 8 }, (_, index) => index + 48),
      ...Array.from({ length: 8 }, (_, index) => index + 76),
    ];
    for (const side of ["player", "opponent"] as const) {
      const dense = rows(side);
      const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
      expect(dense.slice(1).filter((row, index) => same(row.hardwareOam, dense[index]!.softwareOam))).toHaveLength(277);
      expect(dense.slice(1).filter((row, index) => same(row.hardwarePalette, dense[index]!.fadedPalette))).toHaveLength(276);
      const observedLag2 = dense.slice(1).flatMap((row, index) => {
        const age = index + 1;
        if (same(row.hardwareMatrices, dense[index]!.softwareMatrices)) return [];
        expect(age).toBeGreaterThanOrEqual(2);
        expect(same(row.hardwareMatrices, dense[age - 2]!.softwareMatrices)).toBe(true);
        return [age];
      });
      expect(observedLag2).toEqual(affineLag2);
    }
  });

  it("regenerates the source art and names the audited WATER_IMPACT reuse", () => {
    const output = join(createScratchDir("water-spout-assets-"), "asset.json");
    execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/extractWaterSpoutAssets.ts", "--out", output]);
    expect(readFileSync(output)).toEqual(readFileSync("src/animation/assets/water-spout-glowy-blue-orb.json"));
    expect(asset).toMatchObject({ source: { tag: { value: 10268 }, graphics: { bytes: 32 } }, tileset: { columns: 1, rows: 1 } });
    expect(asset.palette).toHaveLength(16);
    expect(waterGun.source.waterImpact).toContain("ANIM_TAG_WATER_IMPACT");
    expect(waterGun.waterImpact.tileset).toMatchObject({ columns: 4, rows: 4 });
  });
});
