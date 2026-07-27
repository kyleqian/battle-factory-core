import { describe, expect, it } from "vitest";
import {
  SING_NOTE_SPAWN_AGES,
  singNotesAtAge,
  singNoteScaleAtLocalAge,
  singPanTaskAtAge,
} from "../../src/animation/sing.ts";

describe("Sing source reducer", () => {
  it("ports all twelve script-relative note spawns and argv", () => {
    expect(SING_NOTE_SPAWN_AGES)
      .toEqual([0, 7, 14, 21, 28, 34, 40, 46, 52, 58, 64, 70]);
    const notes = singNotesAtAge(
      70,
      { x: 72, y: 98 },
      { x: 176, y: 40 },
    );
    expect(notes.map((note) => note.index))
      .toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(notes.at(-1)).toMatchObject({
      localAge: 1,
      x: 74,
      y: 96,
      animation: 5,
      tileOffset: 20,
      vFlip: false,
      paletteIndex: 3,
    });
  });

  it("ports fixed-point paths, sine offsets, and cycling palettes by side", () => {
    expect(singNotesAtAge(
      0,
      { x: 72, y: 98 },
      { x: 176, y: 40 },
    )[0]).toMatchObject({
      localAge: 1, x: 74, y: 96, y2: 1, paletteIndex: 0,
    });
    expect(singNotesAtAge(
      12,
      { x: 72, y: 98 },
      { x: 176, y: 40 },
    )[0]).toMatchObject({
      localAge: 13, x: 104, y: 80, y2: 14, paletteIndex: 1,
    });
    expect(singNotesAtAge(
      0,
      { x: 176, y: 55 },
      { x: 72, y: 88 },
    )[0]).toMatchObject({
      localAge: 1, x: 173, y: 55, y2: 1, paletteIndex: 0,
    });
  });

  it("ports the repeating 16-up/16-down affine scale program", () => {
    expect([1, 16, 17, 32, 33].map(singNoteScaleAtLocalAge))
      .toEqual([268, 448, 436, 256, 268]);
  });

  it("ports both side-relative pan sweep boundaries", () => {
    expect(singPanTaskAtAge(0, "player")).toMatchObject({ currentPan: -62 });
    expect(singPanTaskAtAge(62, "player")).toMatchObject({ currentPan: 62 });
    expect(singPanTaskAtAge(63, "player")).toBeNull();
    expect(singPanTaskAtAge(0, "opponent")).toMatchObject({ currentPan: 61 });
    expect(singPanTaskAtAge(61, "opponent")).toMatchObject({ currentPan: -61 });
    expect(singPanTaskAtAge(62, "opponent")).toBeNull();
  });
});
