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

const playerCenter = { x: 72, y: 88 };
const opponentCenter = { x: 176, y: 42 };

describe("MOVE_SOLAR_BEAM source-relative reducer", () => {
  it("keeps setup and unleash as independent source bodies", () => {
    const setup = solarBeamAtAge(7, "setup", "player", "opponent", playerCenter, opponentCenter);
    expect(setup).toMatchObject({ active: true, targetOnMonBg: true, alpha: { eva: 12, evb: 8 }, sound: "SE_M_MEGA_KICK" });
    expect(setup.absorptionOrbs).toHaveLength(1);
    expect(setup.absorptionOrbs[0]).toMatchObject({ x: 112, y: 138, frame: 8 });
    const unleash = solarBeamAtAge(4, "unleash", "player", "opponent", playerCenter, opponentCenter);
    expect(unleash).toMatchObject({ active: true, background: { variant: "opponent", active: true, impact: true }, sound: "SE_M_SOLAR_BEAM" });
    expect(unleash.bigOrbs).toHaveLength(1);
    expect(unleash.smallOrbs).toHaveLength(1);
  });

  it("ports orb census, cleanup, and target-side ShakeMon2", () => {
    const setup = solarBeamAtAge(106, "setup", "opponent", "player", opponentCenter, playerCenter);
    expect(setup.absorptionOrbs).toHaveLength(0);
    expect(setup.resources.orbs).toBe(true);
    expect(solarBeamAtAge(SOLAR_BEAM_SETUP_FIRST_INACTIVE_AGE, "setup", "opponent", "player", opponentCenter, playerCenter)).toMatchObject({ active: false, resources: { orbs: false, freed: true }, targetOnMonBg: false });
    expect(solarBeamAtAge(124, "unleash", "player", "opponent", playerCenter, opponentCenter).bigOrbs).toHaveLength(4);
    expect(solarBeamAtAge(124, "unleash", "player", "opponent", playerCenter, opponentCenter).smallOrbs).toHaveLength(9);
    expect(solarBeamAtAge(22, "unleash", "player", "opponent", playerCenter, opponentCenter).targetOffset.x2).toBe(-2);
    expect(solarBeamAtAge(24, "unleash", "player", "opponent", playerCenter, opponentCenter).targetOffset.x2).toBe(2);
    expect(solarBeamAtAge(SOLAR_BEAM_UNLEASH_FIRST_INACTIVE_AGE, "unleash", "player", "opponent", playerCenter, opponentCenter)).toMatchObject({ active: false, resources: { orbs: false, freed: true } });
  });

  it("mirrors source X offsets and remains live-geometry driven", () => {
    const player = solarBeamAtAge(7, "setup", "player", "opponent", playerCenter, opponentCenter).absorptionOrbs[0]!;
    const opponent = solarBeamAtAge(7, "setup", "opponent", "player", opponentCenter, playerCenter).absorptionOrbs[0]!;
    expect(player.x).toBe(112);
    expect(opponent.x).toBe(136);
    expect(solarBeamAtAge(7, "setup", "player", "opponent", { x: 80, y: 91 }, opponentCenter).absorptionOrbs[0]!.x).toBe(120);
  });

  it("exposes a typed live-species Scene-ON seam", () => {
    const stage = createSceneOnMovePresentation({
      move: "SOLAR_BEAM", body: "unleash",
      attacker: { species: "GLOOM", geometry: { side: "player", spriteCorner: { x: 40, y: 56 }, animationCenter: playerCenter, battlePositionCenter: { x: 72, y: 80 } } },
      target: { species: "CHANSEY", geometry: { side: "opponent", spriteCorner: { x: 144, y: 10 }, animationCenter: opponentCenter, battlePositionCenter: { x: 176, y: 40 } } },
      fieldProfile: { playerHp: 120, playerMaxHp: 128, opponentHp: 357, opponentMaxHp: 357 },
    });
    expect(sceneOnSolarBeamView({ ...stage, age: 4 })).toMatchObject({ body: "unleash", attacker: { species: "GLOOM" }, target: { species: "CHANSEY" }, bigOrbs: [{ frame: 0 }], smallOrbs: [{ frame: 7 }] });
  });

  it("keeps the generated ORBS/background extraction reproducible", () => {
    const before = readFileSync("src/animation/assets/solar-beam.json");
    execFileSync("npx", ["tsx", "tools/compare/extractSolarBeamAssets.ts"], { encoding: "utf8" });
    expect(readFileSync("src/animation/assets/solar-beam.json")).toEqual(before);
  });
});
