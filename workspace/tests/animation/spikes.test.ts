import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import {
  SPIKES_FIRST_INACTIVE_AGE,
  SPIKES_WINDOW_ROWS,
  spikesAtAge,
  type SpikesProfile,
} from "../../src/animation/spikes.ts";
import {
  createSceneOnMovePresentation,
  sceneOnSpikesView,
  type SceneOnSpikesConfig,
} from "../../src/animation/sceneOnPresentation.ts";

const palette = Array.from({ length: 512 }, (_, index) => index);
const profile: SpikesProfile = {
  animationRngAtAge0: 1194721953,
  spriteSlots: [3, 4, 5],
  targetSubpriority: 38,
  oam: { spikeAttr2: 31025 },
  palette: {
    unfadedAtAge0: palette,
    fadedAtAge0: palette,
    hardwareAtAge0: palette,
    unfadedAfterLoad: palette,
    fadedAfterLoad: palette,
    unfadedAfterMonbg: palette,
    fadedAfterMonbg: palette,
  },
};

function config(): SceneOnSpikesConfig {
  return {
    move: "SPIKES",
    attacker: {
      species: "QWILFISH",
      geometry: {
        side: "player",
        spriteCorner: { x: 40, y: 63 },
        animationCenter: { x: 72, y: 95 },
        battlePositionCenter: { x: 72, y: 80 },
      },
    },
    target: {
      species: "ONIX",
      geometry: {
        side: "opponent",
        spriteCorner: { x: 145, y: 10 },
        animationCenter: { x: 177, y: 42 },
        battlePositionCenter: { x: 176, y: 40 },
      },
    },
    fieldProfile: {
      playerHp: 100,
      playerMaxHp: 100,
      opponentHp: 100,
      opponentMaxHp: 100,
    },
    animationProfile: profile,
  };
}

describe("MOVE_SPIKES pure reducer and typed Scene-ON seam", () => {
  it("ports source cursor, three 30-step target arcs, monbg cleanup, and blink destruction", () => {
    const player = (age: number) => spikesAtAge(
      age,
      "player",
      { x: 72, y: 95 },
      "opponent",
      { x: 176, y: 40 },
      profile,
      { x: 177, y: 42 },
    );
    expect(SPIKES_WINDOW_ROWS).toBe(114);
    expect(player(1)).toMatchObject({
      source: { offset: 3, wait: 1 },
      resources: { loaded: true, tileTags: [10152] },
    });
    expect(player(4)).toMatchObject({
      source: { offset: 5, wait: 1 },
      monbg: { active: true, background: "BG1", targetHiddenFromObj: true },
      palette: { sameRowTransfer: true },
    });
    expect(player(7).sprites).toEqual([expect.objectContaining({
      template: "gSpikesSpriteTemplate",
      callback: "AnimSpikes_Step1",
      x: 92,
      y: 95,
      x2: 2,
      y2: -6,
      data: [29, 716, 265, 716, 265, -50, 1092, 1092],
      attr: [81, 16470, 31025],
    })]);
    expect(player(37).sprites[0]).toMatchObject({
      callback: "WaitAnimForDuration",
      x2: 83,
      y2: -33,
      data: [30, 0, 265, 21480, 7950, -50, -22675, 2069],
    });
    expect(player(68).sprites[0]).toMatchObject({ callback: "AnimSpikes_Step2", data: [0, 0, 265, 21480, 7950, -50, -22675, 2069] });
    expect(player(70).sprites[0]).toMatchObject({ invisible: true, data: [0, 2, 265, 21480, 7950, -50, -22675, 2069] });
    expect(player(84).sprites.map((sprite) => sprite.slot)).toEqual([4, 5]);
    expect(player(109)).toMatchObject({ monbg: { cleanupActive: true }, tasks: expect.arrayContaining([expect.objectContaining({ callback: "Task_ClearMonBg" })]) });
    expect(player(SPIKES_FIRST_INACTIVE_AGE)).toMatchObject({
      active: false,
      sprites: [],
      tasks: [],
      resources: { loaded: false, tileTags: [], paletteTags: [] },
      audio: { active: false, status: 0x80000000 },
    });
  });

  it("reproduces every retained bilateral component row through the typed seam", () => {
    const audit = JSON.parse(execFileSync(process.execPath, [
      "--experimental-strip-types",
      "tools/compare/spikesReducerAudit.ts",
    ], { encoding: "utf8" })) as Record<string, any>;
    expect(audit).toMatchObject({
      schema: "spikes-reducer-audit/v1",
      framebufferCompared: false,
      "player-back": {
        reducerRows: 114,
        typedSeamRows: 114,
        lifecycle: { creates: 3, destroys: 3, spikes: 3 },
        cleanup: { age: 113, active: false, sprites: 0, resources: 0 },
      },
      "opponent-front": {
        reducerRows: 114,
        typedSeamRows: 114,
        lifecycle: { creates: 3, destroys: 3, spikes: 3 },
        cleanup: { age: 113, active: false, sprites: 0, resources: 0 },
      },
    });
  });

  it("does not activate for Spike Cannon or Megahorn", () => {
    const state = createSceneOnMovePresentation(config());
    for (const move of ["SPIKE_CANNON", "MEGAHORN"] as const) {
      const wrong = { ...state, config: { ...state.config, move } } as unknown as Parameters<typeof sceneOnSpikesView>[0];
      expect(() => sceneOnSpikesView(wrong)).toThrow(`expected SPIKES presentation, got ${move}`);
    }
  });

  it("uses typed sides and geometry rather than the Qwilfish/Onix evidence pair", () => {
    const generic: SceneOnSpikesConfig = {
      ...config(),
      attacker: {
        species: "ARON",
        geometry: {
          side: "opponent",
          spriteCorner: { x: 145, y: 14 },
          animationCenter: { x: 177, y: 46 },
          battlePositionCenter: { x: 176, y: 40 },
        },
      },
      target: {
        species: "GROVYLE",
        geometry: {
          side: "player",
          spriteCorner: { x: 38, y: 58 },
          animationCenter: { x: 70, y: 90 },
          battlePositionCenter: { x: 72, y: 80 },
        },
      },
    };
    const view = sceneOnSpikesView({ ...createSceneOnMovePresentation(generic), age: 7 });
    expect(view).toMatchObject({
      attacker: { species: "ARON", geometry: { side: "opponent" } },
      target: { species: "GROVYLE", geometry: { side: "player" } },
      sprites: [expect.objectContaining({ x: 157, y: 46, x2: -2, y2: -4 })],
    });
  });
});
