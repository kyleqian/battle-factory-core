/**
 * Source-age reducer for MOVE_DEFENSE_CURL.
 *
 * Source:
 * - `data/battle_anim_scripts.s:Move_DEFENSE_CURL`
 * - `src/battle_anim_effects_3.c:gEclipsingOrbAnimCmds`
 * - `src/battle_anim_effects_3.c:DefenseCurlDeformMonAffineAnimCmds`
 * - `src/battle_anim_mons.c:RunAffineAnimFromTaskData` /
 *   `SetBattlerSpriteYOffsetFromYScale`
 *
 * Age zero is the first retained active script row.  The renderer deliberately
 * owns the one-row OAM/palette transfer and two-row affine-matrix transfer;
 * this reducer reports source state only.
 */

export type DefenseCurlSide = "player" | "opponent";

export interface DefenseCurlPoint {
  readonly x: number;
  readonly y: number;
}

/** Source-derived live inputs used by the task and sprite callbacks. */
export interface DefenseCurlProfile {
  /** `gMon{Back,Front}PicCoords[species].y_offset` for the live attacker. */
  readonly attackerPicYOffset: number;
  /** `GetBattlerSpriteSubpriority(ANIM_ATTACKER)` at sprite creation. */
  readonly attackerSubpriority: number;
}

export interface DefenseCurlDeformation {
  readonly active: boolean;
  /** `PrepareBattlerSpriteForRotScale(..., ST_OAM_OBJ_NORMAL)`. */
  readonly affineDouble: boolean;
  readonly xScale: number;
  readonly yScale: number;
  /** Source `gSprites[spriteId].y2`, derived from the live picture offset. */
  readonly y2: number;
}

export interface DefenseCurlOrb {
  readonly slot: 3;
  readonly x: number;
  readonly y: number;
  /** 32px cells from the source 4x16-tile ECLIPSING_ORB sheet. */
  readonly sourceCell: 0 | 16 | 32 | 48;
  readonly cellIndex: 0 | 1 | 2 | 3;
  readonly hFlip: boolean;
  readonly subpriority: number;
}

export interface DefenseCurlState {
  readonly age: number;
  readonly active: boolean;
  readonly sourceOffset: 0 | 3 | 27 | 43 | 56 | null;
  readonly visualTaskCount: 0 | 1;
  readonly soundTaskActive: boolean;
  readonly attackerPalette: "original" | "grayscale";
  readonly deformation: Readonly<DefenseCurlDeformation>;
  readonly orb: Readonly<DefenseCurlOrb> | null;
}

const AFFINE_FIRST_AGE = 4;
const AFFINE_LAST_AGE = 54;
const ORB_FIRST_AGE = 56;
const ORB_LAST_AGE = 97;

/**
 * `SetBattlerSpriteYOffsetFromYScale`: `MON_PIC_HEIGHT - 2*y_offset` is the
 * actual visible picture height, not an evidence-carrier-specific constant.
 */
export function defenseCurlYOffsetFromScale(
  yScale: number,
  attackerPicYOffset: number,
): number {
  const pictureHeight = 64 - attackerPicYOffset * 2;
  const scaledHeight = Math.min(128, Math.trunc((pictureHeight << 8) / yScale));
  return Math.trunc((pictureHeight - scaledHeight) / 2);
}

function affineAtAge(
  age: number,
  attackerPicYOffset: number,
): DefenseCurlDeformation {
  if (age < AFFINE_FIRST_AGE || age > AFFINE_LAST_AGE) {
    return { active: false, affineDouble: false, xScale: 256, yScale: 256, y2: 0 };
  }

  // Two `AFFINEANIMCMD_FRAME` entries, each duration eight, then LOOP(2).
  // The task callback also retains the terminal identity row for each pass.
  const phase = (age - AFFINE_FIRST_AGE) % 17;
  const xScale = phase < 8
    ? 256 - 12 * (phase + 1)
    : phase < 16
      ? 160 + 12 * (phase - 7)
      : 256;
  const yScale = phase < 8
    ? 256 + 20 * (phase + 1)
    : phase < 16
      ? 416 - 20 * (phase - 7)
      : 256;
  return {
    active: true,
    affineDouble: true,
    xScale,
    yScale,
    y2: defenseCurlYOffsetFromScale(yScale, attackerPicYOffset),
  };
}

function orbAtAge(
  age: number,
  attackerCenter: Readonly<DefenseCurlPoint>,
  profile: Readonly<DefenseCurlProfile>,
): DefenseCurlOrb | null {
  if (age < ORB_FIRST_AGE || age > ORB_LAST_AGE) return null;
  const localAge = age - ORB_FIRST_AGE;
  // `StartSpriteAnim` leaves the first frame's delay counter at one for the
  // creation row, then the 3-frame seven-cell loop starts on the next row.
  // The creation row begins frame 0 with delay=1. The normal 3-frame command
  // cadence follows at local age 1, and the terminal END row retains the
  // final h-flipped cell in OAM for its one source row.
  const command = localAge === 0
    ? 0
    : localAge === 41
      ? 6
      : Math.floor((localAge + 1) / 3) % 7;
  const sourceCell = [0, 16, 32, 48, 32, 16, 0] as const;
  return {
    slot: 3,
    x: attackerCenter.x,
    y: attackerCenter.y,
    sourceCell: sourceCell[command]!,
    cellIndex: (command <= 3 ? command : 6 - command) as 0 | 1 | 2 | 3,
    hFlip: command >= 4,
    subpriority: profile.attackerSubpriority - 2,
  };
}

/** Literal source-script and callback state at one source age. */
export function defenseCurlAtAge(
  age: number,
  attackerCenter: Readonly<DefenseCurlPoint>,
  profile: Readonly<DefenseCurlProfile>,
): DefenseCurlState {
  const active = age >= 0 && age <= 98;
  const sourceOffset = age === 0
    ? 0
    : age >= 1 && age <= 3
      ? 3
      : age >= 4 && age <= 55
        ? 27
        : age >= 56 && age <= 98
          ? 43
          : age === 99
            ? 56
            : null;
  const deformation = affineAtAge(age, profile.attackerPicYOffset);
  const orb = orbAtAge(age, attackerCenter, profile);
  return {
    age,
    active,
    sourceOffset,
    visualTaskCount: deformation.active || age >= ORB_FIRST_AGE && age <= ORB_LAST_AGE ? 1 : 0,
    soundTaskActive: age >= AFFINE_FIRST_AGE && age <= 40,
    // `set_original_pal` executes on source age 99; palette DMA therefore
    // still scans the grayscale bank out for the retained cleanup frame.
    attackerPalette: age >= AFFINE_FIRST_AGE && age <= 99 ? "grayscale" : "original",
    deformation,
    orb,
  };
}
