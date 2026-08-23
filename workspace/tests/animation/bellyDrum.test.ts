import { describe, expect, it } from "vitest";
import {
  BELLY_DRUM_FIRST_INACTIVE_AGE,
  BELLY_DRUM_NOTE_ANIMATIONS,
  BELLY_DRUM_NOTE_DIRECTIONS,
  BELLY_DRUM_NOTE_PALETTE_ROWS,
  BELLY_DRUM_NOTE_PHASES,
  BELLY_DRUM_NOTE_SPRITE_SLOTS,
  BELLY_DRUM_HAND_SPRITE_SLOTS,
  BELLY_DRUM_SOUND_AGES,
  BELLY_DRUM_SOURCE_OFFSETS,
  BELLY_DRUM_SPAWN_AGES,
  BELLY_DRUM_WINDOW_FRAMES,
  bellyDrumAtAge,
  bellyDrumNotesBackToFrontAtAge,
} from "../../src/animation/bellyDrum.ts";
import {
  createSceneOnMovePresentation,
  sceneOnBellyDrumView,
  type SceneOnBellyDrumConfig,
} from "../../src/animation/sceneOnPresentation.ts";

const playerOrigin = { x: 72, y: 107 } as const;

function config(): SceneOnBellyDrumConfig {
  return {
    move: "BELLY_DRUM",
    attacker: {
      species: "POLIWRATH",
      geometry: {
        side: "player",
        spriteCorner: { x: 40, y: 53 },
        animationCenter: playerOrigin,
        battlePositionCenter: { x: 72, y: 80 },
      },
    },
    target: {
      species: "ONIX",
      geometry: {
        side: "opponent",
        spriteCorner: { x: 144, y: 10 },
        animationCenter: { x: 176, y: 56 },
        battlePositionCenter: { x: 176, y: 40 },
      },
    },
    attackerNoteOrigin: playerOrigin,
    fieldProfile: {
      playerHp: 100,
      playerMaxHp: 100,
      opponentHp: 100,
      opponentMaxHp: 100,
      playerGender: "male",
      opponentGender: "male",
    },
  };
}

describe("MOVE_BELLY_DRUM source-relative reducer", () => {
  it("pins the six source argument tuples and the pointer window", () => {
    expect(BELLY_DRUM_SPAWN_AGES).toEqual([7, 24, 41, 50, 59, 68]);
    expect(BELLY_DRUM_SOUND_AGES).toEqual(BELLY_DRUM_SPAWN_AGES);
    expect(BELLY_DRUM_NOTE_DIRECTIONS).toEqual([0, 1, 0, 1, 0, 1]);
    expect(BELLY_DRUM_NOTE_ANIMATIONS).toEqual([0, 1, 3, 2, 1, 0]);
    expect(BELLY_DRUM_NOTE_PALETTE_ROWS).toEqual([0, 1, 3, 0, 1, 3]);
    expect(BELLY_DRUM_NOTE_PHASES).toEqual([0, 0, 128, 128, 0, 0]);
    expect(BELLY_DRUM_NOTE_SPRITE_SLOTS).toEqual([4, 5, 7, 9, 10, 5]);
    expect(BELLY_DRUM_HAND_SPRITE_SLOTS).toEqual([3, 3, 3, 4, 3, 4]);
    expect(BELLY_DRUM_SOURCE_OFFSETS).toEqual([0, 3, 6, 40, 66, 92, 118, 144, 168, 177]);
    expect(BELLY_DRUM_WINDOW_FRAMES).toBe(110);
    expect(BELLY_DRUM_FIRST_INACTIVE_AGE).toBe(109);
  });

  it("ports hand, note, ShakeMon, sound, and cleanup lifetimes", () => {
    const first = bellyDrumAtAge(7, playerOrigin, "player");
    expect(first).toMatchObject({
      active: true,
      sourceOffset: 40,
      visualTaskCount: 3,
      rainbowBlend: false,
      hands: [{ index: 0, localAge: 0, x: 88, y: 107, right: true, hFlip: true }],
      notes: [{ index: 0, localAge: 1, x: 72, y: 107, phase: 8, x2: 0, y2: -1, paletteRow: 0 }],
      shakeTasks: [{ index: 0, localAge: 0, data: [0, 1, 1, 1, 0, 8, 0, 0] }],
      audio: { index: 0, soundEffect: "SE_M_BELLY_DRUM", id: 185, panX: -64 },
    });
    expect(bellyDrumAtAge(24, playerOrigin, "player")).toMatchObject({
      sourceOffset: 66,
      hands: [{ index: 1, localAge: 0, x: 56 }],
      notes: [
        { index: 0, localAge: 18, direction: 0 },
        { index: 1, localAge: 1, direction: 1, animation: 1, paletteRow: 1 },
      ],
    });
    expect(bellyDrumAtAge(109, playerOrigin, "opponent")).toMatchObject({
      active: false,
      sourceOffset: 177,
      visualTaskCount: 0,
      hands: [],
      notes: [],
      shakeTasks: [],
      audio: null,
      clearRainbowBlend: true,
    });
  });

  it("keeps allocation order source-relative and exposes a typed Scene-ON seam", () => {
    expect(bellyDrumNotesBackToFrontAtAge(24, playerOrigin).map((note) => note.index))
      .toEqual([0, 1]);
    const stage = createSceneOnMovePresentation(config());
    const view = sceneOnBellyDrumView({ ...stage, age: 7 });
    expect(view).toMatchObject({ age: 7, sourceOffset: 40, visualTaskCount: 3 });
    expect(view.notes[0]).toMatchObject({ index: 0, x: 72, y: 107 });
    expect(view.hands[0]).toMatchObject({ x: 88, y: 107 });
  });
});
