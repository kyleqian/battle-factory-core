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
    expect(solarBeamAtAge(3, "unleash", "player", "opponent", playerCenter, opponentCenter).background).toMatchObject({ impact: false, bldy: 0 });
    expect(solarBeamAtAge(151, "unleash", "player", "opponent", playerCenter, opponentCenter).background).toMatchObject({ impact: false, bldy: 0 });
  });

  it("ports orb census, cleanup, and target-side ShakeMon2", () => {
    const setup = solarBeamAtAge(106, "setup", "opponent", "player", opponentCenter, playerCenter);
    expect(setup.absorptionOrbs).toHaveLength(0);
    expect(setup.resources.orbs).toBe(true);
    expect(solarBeamAtAge(SOLAR_BEAM_SETUP_FIRST_INACTIVE_AGE, "setup", "opponent", "player", opponentCenter, playerCenter)).toMatchObject({ active: false, resources: { orbs: false, freed: true }, targetOnMonBg: false });
    expect(solarBeamAtAge(124, "unleash", "player", "opponent", playerCenter, opponentCenter).bigOrbs).toHaveLength(4);
    expect(solarBeamAtAge(124, "unleash", "player", "opponent", playerCenter, opponentCenter).smallOrbs).toHaveLength(9);
    expect(solarBeamAtAge(151, "unleash", "player", "opponent", playerCenter, opponentCenter).smallOrbs).toHaveLength(0);
    expect(solarBeamAtAge(22, "unleash", "player", "opponent", playerCenter, opponentCenter).targetOffset.x2).toBe(2);
    expect(solarBeamAtAge(22, "unleash", "opponent", "player", opponentCenter, playerCenter).targetOffset.x2).toBe(2);
    expect(solarBeamAtAge(24, "unleash", "player", "opponent", playerCenter, opponentCenter).targetOffset.x2).toBe(-2);
    expect(solarBeamAtAge(151, "unleash", "player", "opponent", playerCenter, opponentCenter).targetOffset.x2).toBe(0);
    expect(solarBeamAtAge(SOLAR_BEAM_UNLEASH_FIRST_INACTIVE_AGE, "unleash", "player", "opponent", playerCenter, opponentCenter)).toMatchObject({ active: false, resources: { orbs: false, freed: true } });
  });

  it("uses Solar's measured palette scanout cadence", () => {
    const setup = (age: number) => solarBeamAtAge(age, "setup", "player", "opponent", playerCenter, opponentCenter).paletteBlend?.coefficient ?? 0;
    expect([9, 10, 12, 13, 24, 25, 33, 34, 48, 49, 57, 58, 96, 97].map(setup))
      .toEqual([0, 2, 2, 4, 10, 11, 11, 9, 1, 0, 0, 2, 1, 0]);
    const target = (age: number) => solarBeamAtAge(age, "unleash", "player", "opponent", playerCenter, opponentCenter).targetPaletteBlend?.coefficient ?? 0;
    expect([17, 18, 19, 20, 35, 36, 149, 150].map(target))
      .toEqual([0, 1, 1, 2, 9, 10, 10, 0]);
  });

  it("mirrors source X offsets and remains live-geometry driven", () => {
    const player = solarBeamAtAge(7, "setup", "player", "opponent", playerCenter, opponentCenter).absorptionOrbs[0]!;
    const opponent = solarBeamAtAge(7, "setup", "opponent", "player", opponentCenter, playerCenter).absorptionOrbs[0]!;
    expect(player.x).toBe(112);
    expect(opponent.x).toBe(136);
    expect(solarBeamAtAge(7, "setup", "player", "opponent", { x: 80, y: 91 }, opponentCenter).absorptionOrbs[0]!.x).toBe(120);
  });

  it("derives unleash Y_PIC_OFFSET and small-orb callback phase from live geometry", () => {
    const state = solarBeamAtAge(
      4, "unleash", "player", "opponent", playerCenter, opponentCenter,
      { x: 144, y: 17 },
    );
    expect(state.bigOrbs[0]).toMatchObject({ x: 87, y: 98, x2: 4, y2: -2, frame: 0, subpriority: 37 });
    expect(state.smallOrbs[0]).toMatchObject({ x: 87, y: 98, x2: 3, y2: 12, frame: 7, subpriority: 46 });
    const age10 = solarBeamAtAge(
      10, "unleash", "player", "opponent", playerCenter, opponentCenter,
      { x: 144, y: 17 },
    );
    expect(age10.smallOrbs).toHaveLength(2);
    expect(age10.smallOrbs[1]).toMatchObject({ index: 1, x2: 1, y2: 14, subpriority: 46 });
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
