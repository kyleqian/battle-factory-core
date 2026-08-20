import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { describe, expect, test } from "vitest";
import {
  rainDanceConfigFor,
  verifyRainDanceFramebuffer,
} from "../../tools/compare/rainDanceFramebuffer.ts";
import {
  createSceneOnMovePresentation,
  type SceneOnRainDanceConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";

describe("MOVE_RAIN_DANCE production framebuffer", () => {
  test("regenerates the source Rain Drops art and palette byte-for-byte", () => {
    const scratch = mkdtempSync(join(tmpdir(), "rain-dance-assets-"));
    const output = join(scratch, "rain-drops.json");
    try {
      execFileSync(process.execPath, [
        "--experimental-strip-types",
        "tools/compare/extractRainDanceAssets.ts",
        "--out",
        output,
      ]);
      expect(readFileSync(output)).toEqual(
        readFileSync("src/animation/assets/rain-drops.json"),
      );
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  test("matches every retained bilateral source row through inactive cleanup", () => {
    expect(verifyRainDanceFramebuffer()).toEqual([
      { orientation: "player-back", rows: 187, framebufferCompared: true },
      { orientation: "opponent-front", rows: 187, framebufferCompared: true },
    ]);
  }, 30_000);

  test("uses typed sides, species, and source OAM geometry without an evidence-pair gate", () => {
    const receipt = JSON.parse(readFileSync(
      "tools/compare/fixtures/rain-dance-evidence.json", "utf8",
    ));
    const rows = JSON.parse(gunzipSync(readFileSync(
      receipt.orientations["player-back"].denseState,
    )).toString()).frames;
    const evidenceConfig = rainDanceConfigFor("player-back", rows);

    // OAM x2 is part of the visible front-sprite position. This keeps the
    // observed Onix correction in evidence geometry, not in production art.
    expect(evidenceConfig.target.geometry.spriteCorner).toEqual({ x: 145, y: 10 });

    // This is intentionally only a no-gate regression, not an oracle pixel
    // acceptance claim for ARON/GROVYLE.
    const genericConfig: SceneOnRainDanceConfig = {
      ...evidenceConfig,
      attacker: { ...evidenceConfig.attacker, species: "ARON" },
      target: { ...evidenceConfig.target, species: "GROVYLE" },
    };
    const stage = createSceneOnMovePresentation(genericConfig);
    expect(render({
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age: 4 },
    })).toHaveLength(240 * 160 * 4);
  });
});
