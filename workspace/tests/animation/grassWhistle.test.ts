import { describe, expect, it } from "vitest";
import {
  GRASS_WHISTLE_BLEND_LAST_AGE,
  GRASS_WHISTLE_BLEND_START_AGE,
  GRASS_WHISTLE_FIRST_NOTE_AGE,
  GRASS_WHISTLE_NOTE_ORDER_SEED,
  GRASS_WHISTLE_NOTE_SPRITE_SLOTS,
  GRASS_WHISTLE_RESTORE_BLEND_LIFE,
  GRASS_WHISTLE_RESTORE_BLEND_START_AGE,
  GRASS_WHISTLE_RESTORE_BLEND_START_AGE_OPPONENT,
  GRASS_WHISTLE_WINDOW_FRAMES,
  grassWhistleAtAge,
  grassWhistleGreenBlendCoeffAtAge,
  grassWhistleNoteSlotForIndex,
  grassWhistleNotesAtAge,
  grassWhistleNotesBackToFrontAtAge,
} from "../../src/animation/grassWhistle.ts";
import {
  createSceneOnMovePresentation,
  sceneOnGrassWhistleView,
  type SceneOnGrassWhistleConfig,
} from "../../src/animation/sceneOnPresentation.ts";

const playerOrigin = { x: 72, y: 96 };
const playerTarget = { x: 176, y: 42 };
const opponentOrigin = { x: 176, y: 48 };
const opponentTarget = { x: 72, y: 88 };

describe("MOVE_GRASS_WHISTLE source-relative reducer", () => {
  it("ports all twelve note spawn ages with the pinned palette rule", () => {
    expect(GRASS_WHISTLE_FIRST_NOTE_AGE).toBe(19);
    // GRASS_WHISTLE reuses SING's shared note-body cadence: spawn at noteAge
    // 0, 7, 14, 21, 28, 34, 40, 46, 52, 58, 64, 70 (absolute ages 19, 26, ...).
    const spawnAges = [0, 7, 14, 21, 28, 34, 40, 46, 52, 58, 64, 70];
    for (let index = 0; index < spawnAges.length; index += 1) {
      const notes = grassWhistleNotesAtAge(spawnAges[index]!, playerOrigin, playerTarget);
      expect(notes.at(-1)).toMatchObject({
        index,
        localAge: 1,
        // unk1=1 pinned: gParticlesColorBlendTable[1], never cycling (unk2=0).
        paletteIndex: 1,
      });
      for (const note of notes) expect(note.paletteIndex).toBe(1);
    }
    expect(grassWhistleNotesAtAge(-1, playerOrigin, playerTarget)).toEqual([]);
    expect(grassWhistleNotesAtAge(0, playerOrigin, playerTarget)).toHaveLength(1);
    expect(grassWhistleNotesAtAge(7, playerOrigin, playerTarget))
      .toHaveLength(2);
    expect(grassWhistleNotesAtAge(70, playerOrigin, playerTarget))
      .toHaveLength(12);
  });

  it("exposes GRASS_WHISTLE's own probe-derived note->sprite-slot table", () => {
    // Derived from grassWhistleProbe.py's sprite records at the first-note
    // frame in both legal orientations; identical to SING's set here because
    // GRASS_WHISTLE's no-monbg delta shifts other scene sprites, not the notes.
    expect(GRASS_WHISTLE_NOTE_SPRITE_SLOTS)
      .toEqual([3, 4, 5, 7, 9, 10, 11, 12, 13, 14, 15, 16]);
    expect(GRASS_WHISTLE_NOTE_ORDER_SEED)
      .toEqual([3, 4, 5, 16, 15, 14, 13, 12, 11, 10, 9, 7]);
    expect(GRASS_WHISTLE_NOTE_SPRITE_SLOTS.map((_, index) =>
      grassWhistleNoteSlotForIndex(index))).toEqual(GRASS_WHISTLE_NOTE_SPRITE_SLOTS);
    // The seed must be a permutation of the allocation pool (spriteOrder.ts).
    expect([...GRASS_WHISTLE_NOTE_ORDER_SEED].sort())
      .toEqual([...GRASS_WHISTLE_NOTE_SPRITE_SLOTS].sort());
  });

  it("ports fixed-point velocity and sine wave geometry on both sides", () => {
    expect(grassWhistleNotesAtAge(0, playerOrigin, playerTarget)[0])
      .toMatchObject({
        index: 0, localAge: 1, x: 74, y: 94, y2: 1, animation: 7,
        tileOffset: 4, vFlip: true, scale: 268, affinePaPd: 244,
      });
    expect(grassWhistleNotesAtAge(0, opponentOrigin, opponentTarget)[0])
      .toMatchObject({
        index: 0, localAge: 1, x: 173, y: 48, y2: 1, animation: 7,
        tileOffset: 4, vFlip: true,
      });
    // The all-twelve coexistence frame (noteAge 70) pins every path on both
    // sides against the dense probe (frame 305).
    expect(grassWhistleNotesAtAge(70, playerOrigin, playerTarget).map(
      ({ index, localAge, x, y, y2, animation, paletteIndex }) =>
        ({ index, localAge, x, y, y2, animation, paletteIndex }),
    )).toEqual([
      { index: 0, localAge: 71, x: 249, y: 7, y2: 9, animation: 7, paletteIndex: 1 },
      { index: 1, localAge: 64, x: 232, y: 16, y2: 15, animation: 6, paletteIndex: 1 },
      { index: 2, localAge: 57, x: 214, y: 24, y2: 9, animation: 1, paletteIndex: 1 },
      { index: 3, localAge: 50, x: 197, y: 33, y2: -3, animation: 2, paletteIndex: 1 },
      { index: 4, localAge: 43, x: 179, y: 42, y2: -13, animation: 3, paletteIndex: 1 },
      { index: 5, localAge: 37, x: 164, y: 49, y2: -15, animation: 2, paletteIndex: 1 },
      { index: 6, localAge: 31, x: 149, y: 57, y2: -10, animation: 5, paletteIndex: 1 },
      { index: 7, localAge: 25, x: 134, y: 64, y2: 1, animation: 6, paletteIndex: 1 },
      { index: 8, localAge: 19, x: 119, y: 72, y2: 10, animation: 2, paletteIndex: 1 },
      { index: 9, localAge: 13, x: 104, y: 79, y2: 14, animation: 2, paletteIndex: 1 },
      { index: 10, localAge: 7, x: 89, y: 87, y2: 11, animation: 1, paletteIndex: 1 },
      { index: 11, localAge: 1, x: 74, y: 94, y2: 1, animation: 5, paletteIndex: 1 },
    ]);
    expect(grassWhistleNotesAtAge(70, opponentOrigin, opponentTarget).map(
      ({ index, localAge, x, y, y2, animation, paletteIndex }) =>
        ({ index, localAge, x, y, y2, animation, paletteIndex }),
    )).toEqual([
      { index: 0, localAge: 71, x: -2, y: 114, y2: 9, animation: 7, paletteIndex: 1 },
      { index: 1, localAge: 64, x: 16, y: 108, y2: 15, animation: 6, paletteIndex: 1 },
      { index: 2, localAge: 57, x: 33, y: 101, y2: 9, animation: 1, paletteIndex: 1 },
      { index: 3, localAge: 50, x: 51, y: 94, y2: -3, animation: 2, paletteIndex: 1 },
      { index: 4, localAge: 43, x: 68, y: 88, y2: -13, animation: 3, paletteIndex: 1 },
      { index: 5, localAge: 37, x: 83, y: 82, y2: -15, animation: 2, paletteIndex: 1 },
      { index: 6, localAge: 31, x: 98, y: 77, y2: -10, animation: 5, paletteIndex: 1 },
      { index: 7, localAge: 25, x: 113, y: 71, y2: 1, animation: 6, paletteIndex: 1 },
      { index: 8, localAge: 19, x: 128, y: 65, y2: 10, animation: 2, paletteIndex: 1 },
      { index: 9, localAge: 13, x: 143, y: 60, y2: 14, animation: 2, paletteIndex: 1 },
      { index: 10, localAge: 7, x: 158, y: 54, y2: 11, animation: 1, paletteIndex: 1 },
      { index: 11, localAge: 1, x: 173, y: 48, y2: 1, animation: 5, paletteIndex: 1 },
    ]);
    // The shared affine scale program (sing.test.ts pins its 16-up/16-down
    // ramp); these are the noteAge-70 phases.
    expect(grassWhistleNotesAtAge(70, playerOrigin, playerTarget)
      .map((note) => [note.localAge, note.scale, note.affinePaPd]))
      .toEqual([
        [71, 340, 192], [64, 256, 256], [57, 340, 192], [50, 424, 154],
        [43, 388, 168], [37, 316, 207], [31, 268, 244], [25, 340, 192],
        [19, 412, 159], [13, 412, 159], [7, 340, 192], [1, 268, 244],
      ]);
  });

  it("runs the F_PAL_BG green RGB(18,31,12) 0->4->0 blend ramp on each side", () => {
    // Fade-in: coeff 2 at ages 8-11, coeff 4 from age 12.
    expect(grassWhistleGreenBlendCoeffAtAge(7, 163)).toBe(0);
    expect(grassWhistleGreenBlendCoeffAtAge(8, 163)).toBe(2);
    expect(grassWhistleGreenBlendCoeffAtAge(11, 163)).toBe(2);
    expect(grassWhistleGreenBlendCoeffAtAge(12, 163)).toBe(4);
    // Restore (4->0, delay 4): coeff 4 held through +5, coeff 2 for +6..+11.
    expect(grassWhistleGreenBlendCoeffAtAge(163, 163)).toBe(4);
    expect(grassWhistleGreenBlendCoeffAtAge(168, 163)).toBe(4);
    expect(grassWhistleGreenBlendCoeffAtAge(169, 163)).toBe(2);
    expect(grassWhistleGreenBlendCoeffAtAge(174, 163)).toBe(2);
    expect(grassWhistleGreenBlendCoeffAtAge(175, 163)).toBe(0);
    // Opponent restore starts three frames later (probe frame 382).
    expect(grassWhistleGreenBlendCoeffAtAge(166, 166)).toBe(4);
    expect(grassWhistleGreenBlendCoeffAtAge(171, 166)).toBe(4);
    expect(grassWhistleGreenBlendCoeffAtAge(172, 166)).toBe(2);
    expect(grassWhistleGreenBlendCoeffAtAge(177, 166)).toBe(2);
    expect(grassWhistleGreenBlendCoeffAtAge(178, 166)).toBe(0);
    expect(GRASS_WHISTLE_BLEND_START_AGE).toBe(4);
    expect(GRASS_WHISTLE_BLEND_LAST_AGE).toBe(17);
    expect(GRASS_WHISTLE_RESTORE_BLEND_START_AGE).toBe(163);
    expect(GRASS_WHISTLE_RESTORE_BLEND_START_AGE_OPPONENT).toBe(166);
    expect(GRASS_WHISTLE_RESTORE_BLEND_LIFE).toBe(18);
  });

  it("tracks visual tasks through the isolated window and cleanup", () => {
    expect(GRASS_WHISTLE_WINDOW_FRAMES).toBe(225);
    expect(grassWhistleAtAge(0, playerOrigin, playerTarget, "player"))
      .toMatchObject({ active: true, visualTaskCount: 0, notes: [], pan: null });
    expect(grassWhistleAtAge(4, playerOrigin, playerTarget, "player"))
      .toMatchObject({ visualTaskCount: 1, notes: [] });
    expect(grassWhistleAtAge(18, playerOrigin, playerTarget, "player"))
      .toMatchObject({ visualTaskCount: 0 });
    expect(grassWhistleAtAge(19, playerOrigin, playerTarget, "player"))
      .toMatchObject({ visualTaskCount: 1, notesOnScreen: true });
    expect(grassWhistleAtAge(26, playerOrigin, playerTarget, "player"))
      .toMatchObject({ visualTaskCount: 2 });
    expect(grassWhistleAtAge(163, playerOrigin, playerTarget, "player"))
      .toMatchObject({ visualTaskCount: 1 });
    expect(grassWhistleAtAge(224, playerOrigin, playerTarget, "player"))
      .toMatchObject({ visualTaskCount: 0, active: false });
  });

  it("ports both side-relative pan sweep boundaries", () => {
    expect(grassWhistleAtAge(19, playerOrigin, playerTarget, "player").pan)
      .toMatchObject({ currentPan: -62 });
    expect(grassWhistleAtAge(81, playerOrigin, playerTarget, "player").pan)
      .toMatchObject({ currentPan: 62 });
    expect(grassWhistleAtAge(82, playerOrigin, playerTarget, "player").pan)
      .toBeNull();
    expect(grassWhistleAtAge(19, opponentOrigin, opponentTarget, "opponent").pan)
      .toMatchObject({ currentPan: 61 });
    expect(grassWhistleAtAge(80, opponentOrigin, opponentTarget, "opponent").pan)
      .toMatchObject({ currentPan: -61 });
    expect(grassWhistleAtAge(81, opponentOrigin, opponentTarget, "opponent").pan)
      .toBeNull();
  });

  it("keeps the persistent sSpriteOrder painter pass on the shared slot table", () => {
    expect(grassWhistleNotesBackToFrontAtAge(54, playerOrigin, playerTarget)
      .map((note) => note.index)).toEqual([2, 1, 0, 3, 4, 5, 6, 8, 7]);
    expect(grassWhistleNotesBackToFrontAtAge(90, opponentOrigin, opponentTarget)
      .map((note) => note.index)).toEqual([9, 8, 10, 11, 7, 6, 5, 4, 3]);
  });

  it("exposes only immutable presentation geometry through the typed seam", () => {
    const config: SceneOnGrassWhistleConfig = {
      move: "GRASS_WHISTLE",
      attacker: {
        species: "ROSELIA",
        geometry: {
          side: "player",
          spriteCorner: { x: 40, y: 56 },
          animationCenter: playerOrigin,
          battlePositionCenter: { x: 72, y: 80 },
        },
      },
      target: {
        species: "ONIX",
        geometry: {
          side: "opponent",
          spriteCorner: { x: 144, y: 10 },
          animationCenter: playerTarget,
          battlePositionCenter: { x: 176, y: 40 },
        },
      },
      fieldProfile: {
        playerHp: 147,
        playerMaxHp: 157,
        opponentHp: 110,
        opponentMaxHp: 110,
        playerGender: "female",
        opponentGender: "male",
      },
    };
    const stage = createSceneOnMovePresentation(config);
    const view = sceneOnGrassWhistleView({ ...stage, age: 26 });
    expect(view).toMatchObject({
      age: 26,
      attacker: { species: "ROSELIA" },
      target: { species: "ONIX" },
      visualTaskCount: 2,
      greenBlendCoeff: 4,
    });
    expect(view.notes).toHaveLength(2);
    // The seam emits the sSpriteOrder painter pass (back-to-front): the
    // second-spawned note paints over the first at this age. The portable
    // re-sorts by the note->slot table before comparing with the ROM records.
    expect(view.notes[0]).toMatchObject({ index: 1, animation: 6, paletteIndex: 1 });
    expect(view.notes[1]).toMatchObject({ index: 0, animation: 7, paletteIndex: 1 });
    expect("damage" in view).toBe(false);
    expect("notesOnScreen" in view).toBe(false);
  });
});
