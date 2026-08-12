import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { confuseRayAtAge } from "../../src/animation/confuseRay.ts";

const cases = [
  {
    side: "player" as const,
    geometry: {
      attackerSide: "player" as const,
      attackerCenter: { x: 72, y: 96 },
      targetCenter: { x: 176, y: 42 },
    },
  },
  {
    side: "opponent" as const,
    geometry: {
      attackerSide: "opponent" as const,
      attackerCenter: { x: 176, y: 56 },
      targetCenter: { x: 72, y: 88 },
    },
  },
] as const;

describe("MOVE_CONFUSE_RAY source-relative reducer", () => {
  it.each(cases)("matches all retained $side callback rows", ({ side, geometry }) => {
    const probe = JSON.parse(gunzipSync(readFileSync(
      `tools/compare/evidence/confuse-ray-${side}-full-state.json.gz`,
    )).toString("utf8"));
    probe.frames.forEach((frame: any, age: number) => {
      const reduced = confuseRayAtAge(age, geometry);
      expect(frame.registers.bldy, `BLDY age ${age}`).toBe(reduced.bldy);
      const source = frame.sprites.find((sprite: any) =>
        sprite.template.symbol?.includes("ConfuseRayBall"));
      const effect = reduced.bounce ?? reduced.spiral;
      expect(Boolean(source), `presence age ${age}`).toBe(Boolean(effect));
      if (source && effect) {
        expect(
          [source.x, source.y, source.x2, source.y2],
          `position age ${age}`,
        ).toEqual([effect.x, effect.y, effect.x2, effect.y2]);
      }
      const panning = frame.tasks.find((task: any) =>
        task.func.symbol === "SoundTask_AdjustPanningVar_Step");
      expect(panning?.data[11] ?? null, `panning age ${age}`)
        .toBe(reduced.panning?.pan ?? null);
    });
  });

  it("re-extracts YELLOW_BALL and the carrier art byte-for-byte", () => {
    const out = execFileSync("mktemp", ["-d"], { encoding: "utf8" }).trim();
    const generated = `${out}/confuse-ray.json`;
    execFileSync(process.execPath, [
      "--experimental-strip-types",
      "tools/compare/extractConfuseRayAssets.ts",
      "--out",
      generated,
    ]);
    expect(readFileSync(generated)).toEqual(
      readFileSync("src/animation/assets/confuse-ray.json"),
    );
  });
});
