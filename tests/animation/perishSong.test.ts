import { describe, expect, it } from "vitest";
import {
  PERISH_SONG_FRAME_COUNT,
  perishSongAtAge,
  perishSongBackgroundBlackCoefficient,
  perishSongNotesAtAge,
} from "../../src/animation/perishSong.ts";

describe("Perish Song source reducer", () => {
  it("ports all sixteen MUSIC_NOTES_2 creates and their fixed-point callbacks", () => {
    expect(perishSongNotesAtAge(3)).toEqual([]);
    expect(perishSongNotesAtAge(4)).toHaveLength(14);
    expect(perishSongNotesAtAge(5)).toHaveLength(16);
    expect(perishSongNotesAtAge(5).map((note) => note.oamSlot)).toEqual(
      [3, 4, 5, 7, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
    );
    expect(perishSongNotesAtAge(5)[0]).toMatchObject({
      index: 0,
      animation: 0,
      tileOffset: 0,
      phase: 0,
      callbackCount: 2,
      matrix: { a: 256, b: 0, c: 0, d: 256 },
    });
    expect(perishSongNotesAtAge(124)[0]!.matrix).toEqual({
      a: 251,
      b: 49,
      c: -49,
      d: 251,
    });
    expect(perishSongNotesAtAge(139)[0]!.matrix).toEqual({
      a: -256,
      b: 0,
      c: 0,
      d: -256,
    });
    expect(perishSongNotesAtAge(167)).toHaveLength(16);
    expect(perishSongNotesAtAge(168)).toEqual([]);
  });

  it("ports palette fades, grayscale restoration, audio pan, and cleanup", () => {
    expect([
      112, 113, 118, 143, 148, 149, 214, 215, 220, 245, 250,
    ].map(perishSongBackgroundBlackCoefficient)).toEqual(
      [0, 2, 4, 14, 16, 16, 16, 14, 12, 2, 0],
    );
    expect(perishSongAtAge(27, "player").pan).toMatchObject({
      initialPan: -64,
      targetPan: 63,
      incrementPan: 2,
      currentPan: -62,
    });
    expect(perishSongAtAge(108, "player")).toMatchObject({
      paletteSentinelActive: true,
      musicNotes2PaletteRestored: true,
      battlersGrayscale: false,
    });
    expect(perishSongAtAge(109, "player").battlersGrayscale).toBe(true);
    expect(perishSongAtAge(211, "player").battlersGrayscale).toBe(false);
    expect(perishSongAtAge(187, "player").paletteSentinelActive).toBe(true);
    expect(perishSongAtAge(188, "player").paletteSentinelActive).toBe(false);
    expect(perishSongAtAge(PERISH_SONG_FRAME_COUNT - 1, "player")).toMatchObject({
      active: true,
      musicNotes2Loaded: false,
      notes: [],
      backgroundBlackCoefficient: 0,
      battlersGrayscale: false,
    });
    expect(perishSongAtAge(PERISH_SONG_FRAME_COUNT, "opponent").active).toBe(false);
  });
});
