import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  SOLAR_BEAM_SETUP_FIRST_INACTIVE_AGE,
  SOLAR_BEAM_UNLEASH_FIRST_INACTIVE_AGE,
  solarBeamAtAge,
} from "../../src/animation/solarBeam.ts";
import {
  createSceneOnMovePresentation,
  sceneOnSolarBeamView,
} from "../../src/animation/sceneOnPresentation.ts";

const center = { x: 72, y: 88 };
const target = { x: 176, y: 42 };

describe("MOVE_SOLAR_BEAM source-relative reducer", () => {
  it("keeps setup and unleash as independent source bodies", () => {
    const setup = solarBeamAtAge(7, "setup", "opponent", center, target);
    expect(setup).toMatchObject({
      active: true,
      resources: { orbs: true, freed: false },
      targetOnMonBg: true,
      alpha: { eva: 12, evb: 8 },
      sound: "SE_M_MEGA_KICK",
    });
    expect(setup.absorptionOrbs).toHaveLength(1);
    expect(setup.absorptionOrbs[0]).toMatchObject({ x: 112, y: 138, frame: 8 });
    const unleash = solarBeamAtAge(4, "unleash", "opponent", center, target);
    expect(unleash).toMatchObject({
      active: true,
      background: { variant: "opponent", active: true, impact: true },
      sound: "SE_M_SOLAR_BEAM",
    });
    expect(unleash.bigOrbs).toHaveLength(1);
    expect(unleash.smallOrbs).toHaveLength(1);
  });

  it("ports all source-owned spawn counts, cleanup, and target-side shake", () => {
    const setup = solarBeamAtAge(106, "setup", "player", center, target);
    expect(setup.absorptionOrbs).toHaveLength(0);
    expect(setup.resources.orbs).toBe(true);
    expect(solarBeamAtAge(SOLAR_BEAM_SETUP_FIRST_INACTIVE_AGE, "setup", "player", center, target)).toMatchObject({
      active: false, resources: { orbs: false, freed: true }, targetOnMonBg: false,
    });
    expect(solarBeamAtAge(124, "unleash", "opponent", center, target).bigOrbs).toHaveLength(4);
    expect(solarBeamAtAge(124, "unleash", "opponent", center, target).smallOrbs).toHaveLength(14);
    expect(solarBeamAtAge(22, "unleash", "opponent", center, target).targetOffset.x2).toBe(-2);
    expect(solarBeamAtAge(24, "unleash", "opponent", center, target).targetOffset.x2).toBe(2);
    expect(solarBeamAtAge(SOLAR_BEAM_UNLEASH_FIRST_INACTIVE_AGE, "unleash", "opponent", center, target)).toMatchObject({
      active: false, resources: { orbs: false, freed: true },
    });
  });

  it("mirrors source X offsets and remains live-geometry driven", () => {
    const player = solarBeamAtAge(7, "setup", "opponent", center, target).absorptionOrbs[0]!;
    const opponent = solarBeamAtAge(7, "setup", "player", target, center).absorptionOrbs[0]!;
    expect(player.x).toBe(112);
    expect(opponent.x).toBe(216);
    expect(solarBeamAtAge(7, "setup", "opponent", { x: 80, y: 91 }, target).absorptionOrbs[0]!.x).toBe(120);
  });

  it("exposes the typed Scene-ON seam for both orientations", () => {
    const stage = createSceneOnMovePresentation({
      move: "SOLAR_BEAM",
      body: "unleash",
      attacker: {
        species: "GLOOM",
        geometry: {
          side: "player", spriteCorner: { x: 40, y: 56 },
          animationCenter: center, battlePositionCenter: { x: 72, y: 80 },
        },
      },
      target: {
        species: "CHANSEY",
        geometry: {
          side: "opponent", spriteCorner: { x: 144, y: 10 },
          animationCenter: target, battlePositionCenter: { x: 176, y: 40 },
        },
      },
      fieldProfile: { playerHp: 120, playerMaxHp: 128, opponentHp: 357, opponentMaxHp: 357 },
    });
    expect(sceneOnSolarBeamView({ ...stage, age: 4 })).toMatchObject({
      body: "unleash", attacker: { species: "GLOOM" }, target: { species: "CHANSEY" },
      bigOrbs: [{ frame: 0 }], smallOrbs: [{ frame: 7 }],
    });
  });

  it("keeps the generated ORBS/background extraction reproducible", () => {
    const before = readFileSync("src/animation/assets/solar-beam.json");
    execFileSync("npx", ["tsx", "tools/compare/extractSolarBeamAssets.ts"], { encoding: "utf8" });
    expect(readFileSync("src/animation/assets/solar-beam.json")).toEqual(before);
  });
});
