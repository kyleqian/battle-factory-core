import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import {
  SURF_WAVE_FRAME_COUNT,
  surfWaveAtAge,
} from "../../src/animation/surfWave.ts";
import {
  createSceneOnMovePresentation,
  sceneOnSurfView,
  type SceneOnSurfConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";

const playerConfig: SceneOnSurfConfig = {
  move: "MUDDY_WATER",
  attacker: {
    species: "MARSHTOMP",
    geometry: {
      side: "player",
      spriteCorner: { x: 40, y: 52 },
      animationCenter: { x: 72, y: 84 },
      battlePositionCenter: { x: 72, y: 80 },
    },
  },
  target: {
    species: "ONIX",
    geometry: {
      side: "opponent",
      spriteCorner: { x: 144, y: 10 },
      animationCenter: { x: 176, y: 42 },
      battlePositionCenter: { x: 176, y: 40 },
    },
  },
  fieldProfile: {
    playerHp: 145,
    playerMaxHp: 145,
    opponentHp: 142,
    opponentMaxHp: 142,
  },
};

describe("visualCommand:create_surf_wave muddy sibling (MOVE_MUDDY_WATER)", () => {
  it("shares the surf wave body but swaps palette, pan sweep, and sound timing", () => {
    expect(surfWaveAtAge(30, "player", { palette: "muddy-water" })).toMatchObject({
      controllerPhase: "wave",
      visualTaskCount: 1,
      bgLoaded: true,
      blend: { eva: 13, evb: 3 },
      scanline: { lower: 22, upper: 112 },
      soundRestart: null,
      soundPan: -10,
    });
    expect(surfWaveAtAge(30, "player")).toMatchObject({
      soundRestart: "SE_M_SURF",
      soundPan: -62,
    });
  });

  it("plays the SE_M_WHIRLPOOL attacker-to-target pan sweep from age 1", () => {
    // Player starts at -64 and sweeps +2/age to +63; the displayed pan lags
    // the pan task accumulator by two displays (age 1..3 hold -64).
    expect(surfWaveAtAge(0, "player", { palette: "muddy-water" }).soundPan).toBeNull();
    expect(surfWaveAtAge(1, "player", { palette: "muddy-water" })).toMatchObject({
      soundRestart: "SE_M_WHIRLPOOL",
      soundPan: -64,
    });
    expect(surfWaveAtAge(3, "player", { palette: "muddy-water" }).soundPan).toBe(-64);
    expect(surfWaveAtAge(4, "player", { palette: "muddy-water" }).soundPan).toBe(-62);
    expect(surfWaveAtAge(67, "player", { palette: "muddy-water" }).soundPan).toBe(63);
    expect(surfWaveAtAge(70, "player", { palette: "muddy-water" }).soundPan).toBe(63);
    // Opponent starts at +63 and sweeps -2/age to -63, reaching its terminal
    // one step earlier than the player.
    expect(surfWaveAtAge(1, "opponent", { palette: "muddy-water" }).soundPan).toBe(63);
    expect(surfWaveAtAge(4, "opponent", { palette: "muddy-water" }).soundPan).toBe(61);
    expect(surfWaveAtAge(66, "opponent", { palette: "muddy-water" }).soundPan).toBe(-63);
    expect(surfWaveAtAge(67, "opponent", { palette: "muddy-water" }).soundPan).toBe(-63);
  });

  it("keeps the muddy player origin at (0,0) for age 4 and matches surf from age 5", () => {
    // The pre-wave panse shifts the initial BG scroll write one display
    // later on the player side; the opponent already shows the origin at 4.
    expect(surfWaveAtAge(4, "player", { palette: "muddy-water" }).bgScroll)
      .toEqual({ x: 0, y: 0 });
    expect(surfWaveAtAge(4, "player").bgScroll).toEqual({ x: 0, y: 464 });
    expect(surfWaveAtAge(5, "player", { palette: "muddy-water" }).bgScroll)
      .toEqual({ x: 510, y: 465 });
    expect(surfWaveAtAge(4, "opponent", { palette: "muddy-water" }).bgScroll)
      .toEqual({ x: 0, y: 0 });
  });

  it("exposes the muddy move through the Scene-ON surf seam", () => {
    const stage = createSceneOnMovePresentation(playerConfig);
    expect(sceneOnSurfView({ ...stage, age: 52 })).toMatchObject({
      age: 52,
      attacker: { species: "MARSHTOMP" },
      target: { species: "ONIX" },
      scanline: { lower: 0, upper: 112 },
      paletteRotations: 12,
      soundRestart: null,
      soundPan: 34,
    });
  });

  it("composites the muddy water through the shared framebuffer and clears exactly", () => {
    const stage = createSceneOnMovePresentation(playerConfig);
    const frame = (age: number) => render({
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age },
    });
    const digest = (bytes: Uint8Array) =>
      createHash("sha256").update(bytes).digest("hex");
    const wave = frame(52);
    expect(wave).toHaveLength(240 * 160 * 4);
    expect(digest(wave)).not.toBe(digest(frame(0)));
    expect(digest(frame(SURF_WAVE_FRAME_COUNT - 1))).toBe(digest(frame(0)));
    // The muddy water palette tints the blend differently than the surf blue.
    const surfConfig: SceneOnSurfConfig = {
      move: "SURF",
      attacker: {
        species: "WARTORTLE",
        geometry: {
          side: "player",
          spriteCorner: { x: 40, y: 58 },
          animationCenter: { x: 72, y: 90 },
          battlePositionCenter: { x: 72, y: 80 },
        },
      },
      target: {
        species: "SHUCKLE",
        geometry: {
          side: "opponent",
          spriteCorner: { x: 144, y: 17 },
          animationCenter: { x: 176, y: 49 },
          battlePositionCenter: { x: 176, y: 40 },
        },
      },
      fieldProfile: {
        playerHp: 134,
        playerMaxHp: 134,
        opponentHp: 127,
        opponentMaxHp: 127,
      },
    };
    expect(digest(wave)).not.toBe(digest(render({
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: {
        ...createSceneOnMovePresentation(surfConfig),
        age: 52,
      },
    })));
  });
});
