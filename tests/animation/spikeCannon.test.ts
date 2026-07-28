import { describe, expect, it } from "vitest";
import {
  spikeCannonEffectAtAge,
  spikeCannonNeedleMatrix,
} from "../../src/animation/spikeCannon.ts";
import {
  createSceneOnMovePresentation,
  sceneOnSpikeCannonView,
} from "../../src/animation/sceneOnPresentation.ts";
import { windUpLungeAtTick } from "../../src/animation/windUpLunge.ts";

const wind = {
  horizontalSpeed: -4,
  waveAmplitude: 0,
  windUpDuration: 4,
  delayBeforeLunge: 6,
  targetXOffset: 8,
  lungeDuration: 4,
} as const;

describe("AnimTask_WindUpLunge source component", () => {
  it("ports the complete side-inverting Spike Cannon task", () => {
    expect(Array.from({ length: 14 }, (_, tick) =>
      windUpLungeAtTick(wind, "player", tick).offset.x2
    )).toEqual([-1, -2, -3, -4, -4, -4, -4, -4, -4, -4, -2, 0, 2, 4]);
    expect(Array.from({ length: 14 }, (_, tick) =>
      windUpLungeAtTick(wind, "opponent", tick).offset.x2
    )).toEqual([1, 2, 3, 4, 4, 4, 4, 4, 4, 4, 2, 0, -2, -4]);
    expect(windUpLungeAtTick(wind, "player", 12)).toMatchObject({
      phase: "step2",
      active: true,
    });
    expect(windUpLungeAtTick(wind, "player", 13)).toMatchObject({
      offset: { x2: 4, y2: 0 },
      phase: "complete",
      active: false,
    });
  });
});

describe("MOVE_SPIKE_CANNON source-relative reducer", () => {
  const player = (age: number) => spikeCannonEffectAtAge(
    age, "player", { x: 72, y: 96 }, { x: 176, y: 42 },
  );
  const opponent = (age: number) => spikeCannonEffectAtAge(
    age, "opponent", { x: 176, y: 47 }, { x: 72, y: 88 },
  );

  it("composes WindUpLunge and the five-frame original-position slide", () => {
    expect([10, 13, 19, 20, 23, 24, 25, 26, 27, 28, 29].map(
      (age) => player(age).attackerOffset.x2,
    )).toEqual([-1, -4, -4, -2, 4, 3, 2, 1, 0, 0, 0]);
    expect([10, 13, 19, 20, 23, 24, 25, 26, 27, 28, 29].map(
      (age) => opponent(age).attackerOffset.x2,
    )).toEqual([1, 4, 4, 2, -4, -4, -3, -2, -1, -1, 0]);
  });

  it("ports all three source linear stingers and OAM slots", () => {
    expect(player(24).sprites).toMatchObject([
      { kind: "needle", x: 82, y: 88, x2: 4, y2: -2, oamSlot: 4 },
      { kind: "needle", x: 90, y: 96, x2: 4, y2: -2, oamSlot: 5 },
      { kind: "needle", x: 98, y: 104, x2: 4, y2: -2, oamSlot: 7 },
    ]);
    expect(player(44).sprites).toMatchObject([
      { x2: 85, y2: -53, callback: "destroy" },
      { x2: 85, y2: -53, callback: "destroy" },
      { x2: 85, y2: -53, callback: "destroy" },
    ]);
    expect(opponent(24).sprites).toMatchObject([
      { x: 166, y: 55, x2: -4, y2: 2 },
      { x: 158, y: 47, x2: -4, y2: 2 },
      { x: 150, y: 39, x2: -4, y2: 2 },
    ]);
    expect(spikeCannonNeedleMatrix("player")).toEqual({
      a: 131, b: 219, c: -219, d: 131,
    });
    expect(spikeCannonNeedleMatrix("opponent")).toEqual({
      a: -109, b: -231, c: 231, d: -109,
    });
  });

  it("ports the simultaneous animation-2 hitsplats and ShakeMon2", () => {
    expect(player(46).sprites).toMatchObject([
      { kind: "impact", x: 168, y: 34, animation: 2, oamSlot: 3 },
      { kind: "impact", x: 176, y: 42, animation: 2, oamSlot: 4 },
      { kind: "impact", x: 184, y: 50, animation: 2, oamSlot: 5 },
    ]);
    expect(opponent(46).sprites).toMatchObject([
      { kind: "impact", x: 80, y: 96 },
      { kind: "impact", x: 72, y: 88 },
      { kind: "impact", x: 64, y: 80 },
    ]);
    expect([46, 47, 48, 49, 56, 57, 58].map(
      (age) => player(age).targetOffset.x2,
    )).toEqual([-3, -3, 3, 3, 3, 3, 0]);
  });

  it("pins alpha, monbg, audio loops, and first inactive cleanup", () => {
    expect(player(10)).toMatchObject({
      alpha: { eva: 12, evb: 8 },
      targetMonbg: true,
      active: true,
    });
    expect(player(59)).toMatchObject({
      alpha: null,
      targetMonbg: true,
      sprites: [],
    });
    expect(player(62).targetMonbg).toBe(false);
    expect(player(83)).toMatchObject({
      active: false,
      alpha: null,
      targetMonbg: false,
      attackerOffset: { x2: 0, y2: 0 },
      targetOffset: { x2: 0, y2: 0 },
      sprites: [],
    });
    expect(player(0).soundEvents).toEqual([
      { age: 24, song: "SE_M_RAZOR_WIND2", pan: -64 },
      { age: 29, song: "SE_M_RAZOR_WIND2", pan: -64 },
      { age: 35, song: "SE_M_RAZOR_WIND2", pan: -64 },
      { age: 46, song: "SE_M_HORN_ATTACK", pan: 63 },
      { age: 51, song: "SE_M_HORN_ATTACK", pan: 63 },
      { age: 57, song: "SE_M_HORN_ATTACK", pan: 63 },
    ]);
  });

  it("exposes only presentation geometry through the typed Scene-ON seam", () => {
    const stage = createSceneOnMovePresentation({
      move: "SPIKE_CANNON",
      attacker: {
        species: "OMASTAR",
        geometry: {
          side: "player",
          spriteCorner: { x: 40, y: 56 },
          animationCenter: { x: 72, y: 96 },
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
        playerHp: 177,
        playerMaxHp: 177,
        opponentHp: 110,
        opponentMaxHp: 110,
      },
    });
    expect(sceneOnSpikeCannonView({ ...stage, age: 24 })).toMatchObject({
      age: 24,
      attacker: { species: "OMASTAR" },
      target: { species: "ONIX" },
      attackerOffset: { x2: 3, y2: 0 },
      sprites: [
        { kind: "needle", oamSlot: 4 },
        { kind: "needle", oamSlot: 5 },
        { kind: "needle", oamSlot: 7 },
      ],
    });
  });
});
