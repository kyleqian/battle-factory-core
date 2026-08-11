import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  createSceneOnMovePresentation,
  type SceneOnSecretPowerConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import {
  createInitialState,
  render,
  type EngineState,
} from "../../src/engine/core.ts";

const contracts = [
  {
    path:
      "tools/compare/fixtures/"
      + "secret-power-strength-player-teddiursa-opponent-onix.json",
    rgba: "ba86f679c2b97eaede679a6e15188e61bd7d7e391b3bf2e8ab0852113ea42c0d",
  },
  {
    path:
      "tools/compare/fixtures/"
      + "secret-power-strength-opponent-teddiursa-player-onix.json",
    rgba: "cf9dc23c49352b2c51d283641af638ecff554af8b3c22476e32cc30168336415",
  },
] as const;

describe("MOVE_SECRET_POWER production Strength compositor", () => {
  it.each(contracts)(
    "pins all 102 production framebuffers for $path",
    ({ path, rgba }) => {
      const fixture = JSON.parse(readFileSync(path, "utf8"));
      const config: SceneOnSecretPowerConfig = {
        move: "SECRET_POWER",
        attacker: fixture.attacker,
        target: fixture.target,
        fieldProfile: fixture.fieldProfile,
      };
      const stage = createSceneOnMovePresentation(config);
      const digest = createHash("sha256");
      for (let age = 0; age < fixture.sourceWindow.frameCount; age += 1) {
        const engine: EngineState = {
          ...createInitialState(),
          rngMode: "frontierBattle",
          sceneOnPresentation: { ...stage, age },
        };
        digest.update(render(engine));
      }
      expect(digest.digest("hex")).toBe(rgba);
    },
  );
});
