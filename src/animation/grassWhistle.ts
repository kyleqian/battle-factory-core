import {
  singPanTaskAtAge,
  wavyMusicNotesBackToFrontAtAge,
  wavyMusicNotesGeometryAtAge,
  type SingPanTask,
  type SingPoint,
  type WavyMusicNoteGeometry,
} from "./sing.ts";

/**
 * Complete source-relative `Move_GRASS_WHISTLE` visual body
 * (`reference/pokeemerald/data/battle_anim_scripts.s:4236-4272`), a sibling
 * of the exact MOVE_SING unit sharing the entire wavy-note machinery
 * (`AnimWavyMusicNotes`/`_Step`/`_CalcVelocity`, the same twelve note
 * animation numbers and delay ladder, the panse +2,0 sweep, and the shared
 * `AnimTask_MusicNotesRainbowBlend`/`ClearRainbowBlend`). The THREE deltas
 * vs SING, all probe-verified:
 *
 *   1. No `monbg ANIM_DEF_PARTNER`/`clearmonbg` — the target stays visible
 *      for the whole move (no `targetInMonBg`).
 *   2. Every note passes unk1=1, unk2=0 (SING cycles unk1 0..3 with unk2=12).
 *      `AnimWavyMusicNotes` sets `sBlendTableIdx = unk1` and
 *      `sBlendCycleTime = unk2`; with cycle time 0 the palette-advance
 *      branch never runs, so every note is PINNED to
 *      `gParticlesColorBlendTable[1]` (OBJ palette 8 / the sing asset's
 *      rainbow palette index 1) for its whole life.
 *   3. An F_PAL_BG green `simple_palette_blend` RGB(18,31,12) 0->4 (delay 2)
 *      before the rainbow task and 4->0 (delay 4) at the end.
 *
 * Age 0 is the move script's own first frame (frame 216 in both legal
 * orientations, isolated by script pointer: `sBattleAnimScriptPtr` within
 * `[Move_GRASS_WHISTLE, Move_TICKLE)`). The first note spawns at age 19, so
 * the note body is `age - 19` (same +2-per-`delay` cadence as SING's
 * measured ladder). The window runs through the first inactive cleanup frame
 * at age 224 (frame 440), still inside the move's script bytes and before the
 * following sleep-status animation takes over at frame 441.
 */

export const GRASS_WHISTLE_WINDOW_FRAMES = 225;
export const GRASS_WHISTLE_FIRST_NOTE_AGE = 19;
/** Initial green `simple_palette_blend` sprite: ages 4-18 (probe frame 220-234). */
export const GRASS_WHISTLE_BLEND_START_AGE = 4;
export const GRASS_WHISTLE_BLEND_LAST_AGE = 18;
/** Restore `simple_palette_blend` sprite creation age (probe: player frame 379, opponent 382). */
export const GRASS_WHISTLE_RESTORE_BLEND_START_AGE = 163;
export const GRASS_WHISTLE_RESTORE_BLEND_START_AGE_OPPONENT = 166;
/** `AnimSimplePaletteBlend_Step` holds until `gPaletteFade.active` clears: 18 live frames. */
export const GRASS_WHISTLE_RESTORE_BLEND_LIFE = 18;

export interface GrassWhistleNote extends WavyMusicNoteGeometry {
  readonly paletteIndex: 1;
}

export interface GrassWhistleState {
  readonly active: boolean;
  readonly visualTaskCount: number;
  readonly notes: readonly GrassWhistleNote[];
  readonly pan: SingPanTask | null;
  /** Displayed `BeginNormalPaletteFade` BG coefficient (0/2/4) for F_PAL_BG. */
  readonly greenBlendCoeff: number;
  readonly notesOnScreen: boolean;
}

/**
 * Displayed green BG blend coefficient. The fade-in starts at age 8 (coeff 2)
 * then age 12 (coeff 4); the restore (4->0, delay 4) starts `restoreStartAge`
 * later with coeff 4 held through +5, coeff 2 for +6..+11, then 0. All
 * boundaries probe-measured from the dense Scene-ON RGB/palette capture.
 */
export function grassWhistleGreenBlendCoeffAtAge(
  age: number,
  restoreStartAge: number,
): number {
  if (age < 8) return 0;
  if (age < 12) return 2;
  if (age < restoreStartAge) return 4;
  const restoreAge = age - restoreStartAge;
  if (restoreAge < 6) return 4;
  if (restoreAge < 12) return 2;
  return 0;
}

export function grassWhistleNotesAtAge(
  noteAge: number,
  origin: SingPoint,
  target: SingPoint,
): readonly GrassWhistleNote[] {
  return wavyMusicNotesGeometryAtAge(noteAge, origin, target).map((note) => ({
    ...note,
    // unk1=1 pinned: gParticlesColorBlendTable[1] for the whole life.
    paletteIndex: 1 as const,
  }));
}

export function grassWhistleNotesBackToFrontAtAge(
  noteAge: number,
  origin: SingPoint,
  target: SingPoint,
): readonly GrassWhistleNote[] {
  const notes = new Map(
    grassWhistleNotesAtAge(noteAge, origin, target).map((note) => [
      note.index,
      note,
    ]),
  );
  return wavyMusicNotesBackToFrontAtAge(
    noteAge,
    origin,
    target,
    grassWhistleNotesAtAge,
  )
    .map((note) => notes.get(note.index))
    .filter((note): note is GrassWhistleNote => note !== undefined);
}

export function grassWhistleAtAge(
  age: number,
  origin: SingPoint,
  target: SingPoint,
  side: "player" | "opponent",
): GrassWhistleState {
  const noteAge = age - GRASS_WHISTLE_FIRST_NOTE_AGE;
  const notes = noteAge < 0
    ? []
    : grassWhistleNotesAtAge(noteAge, origin, target);
  const restoreStartAge = side === "player"
    ? GRASS_WHISTLE_RESTORE_BLEND_START_AGE
    : GRASS_WHISTLE_RESTORE_BLEND_START_AGE_OPPONENT;
  const initialBlendActive = age >= GRASS_WHISTLE_BLEND_START_AGE
    && age <= GRASS_WHISTLE_BLEND_LAST_AGE;
  const restoreBlendActive = age >= restoreStartAge
    && age < restoreStartAge + GRASS_WHISTLE_RESTORE_BLEND_LIFE;
  return {
    active: age >= 0 && age < GRASS_WHISTLE_WINDOW_FRAMES - 1,
    visualTaskCount: notes.length
      + Number(initialBlendActive)
      + Number(restoreBlendActive),
    notes,
    pan: noteAge >= 0 ? singPanTaskAtAge(noteAge, side) : null,
    greenBlendCoeff: grassWhistleGreenBlendCoeffAtAge(age, restoreStartAge),
    notesOnScreen: notes.length > 0,
  };
}
