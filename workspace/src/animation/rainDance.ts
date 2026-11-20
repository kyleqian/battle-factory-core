/**
 * Pure source-relative reducer for Move_RAIN_DANCE.
 *
 * The reducer ports the two AnimTask_CreateRaindrops instances, Random2,
 * AnimRainDrop/AnimRainDrop_Step, and the two BlendBattleAnimPal ramps.  It
 * deliberately owns presentation state only: the caller supplies the
 * animation-RNG value at source age zero and the already occupied OBJ slots.
 * Gameplay RNG, weather, damage, turn order, and battle state are not inputs.
 */

export const RAIN_DANCE_WINDOW_ROWS = 187;
export const RAIN_DROPS_TAG = 10115;
export const RAIN_DANCE_SELECTED_PALETTES = 0x0003_000e;
const NEUTRAL_MATRIX = [256, 0, 0, 256] as const;

export interface RainDanceProfile {
  /** gRng2Value in the first retained Move_RAIN_DANCE source row. */
  readonly animationRngAtAge0: number;
  /** Live non-rain OBJ slots at source entry; CreateSprite chooses the lowest free slot. */
  readonly occupiedSpriteSlots: readonly number[];
  /** Palette state before loadspritegfx executes. */
  readonly unfadedPaletteBeforeLoad: readonly number[];
  readonly fadedPaletteBeforeLoad: readonly number[];
  readonly hardwarePaletteAtAge0: readonly number[];
  /** Palette state after ANIM_TAG_RAIN_DROPS has loaded at source age 1. */
  readonly unfadedPaletteAfterLoad: readonly number[];
  readonly fadedPaletteAfterLoad: readonly number[];
}

export interface RainDanceTask {
  readonly slot: 0 | 1;
  readonly callback: "AnimTask_BlendSpriteColor_Step2" | "AnimTask_CreateRaindrops";
  readonly data: readonly number[];
}

export interface RainDanceDrop {
  readonly slot: number;
  readonly template: "gRainDropSpriteTemplate";
  readonly callback: "AnimRainDrop" | "AnimRainDrop_Step";
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly animNum: 0;
  readonly animCmdIndex: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  readonly animDelayCounter: number;
  readonly subpriority: 4;
  readonly invisible: false;
  readonly matrix: readonly [256, 0, 0, 256];
  readonly data: readonly [number, 0, 0, 0, 0, 0, 0, 0];
  /** Software OAM attributes for the retained row. */
  readonly attr: readonly [number, number, number];
  readonly birthAge: number;
  readonly sourcePass: number;
}

export interface RainDancePaletteState {
  readonly selectedPalettes: 0x0003000e;
  readonly coefficient: number;
  readonly hardwareCoefficient: number;
  readonly unfaded: readonly number[];
  readonly faded: readonly number[];
  readonly hardware: readonly number[];
}

export interface RainDanceState {
  readonly age: number;
  readonly active: boolean;
  readonly source: Readonly<{
    readonly owner: "Move_RAIN_DANCE";
    readonly offset: 0 | 3 | 24 | 53 | 55 | 73 | 74;
    readonly wait: number;
  }>;
  readonly animationRng: number;
  readonly tasks: readonly RainDanceTask[];
  readonly drops: readonly RainDanceDrop[];
  /** Current software OAM and one-VBlank-behind hardware OAM for rain sprites. */
  readonly oam: Readonly<{
    readonly transferLagRows: 1;
    readonly software: readonly Readonly<{ slot: number; attr: readonly [number, number, number] }>[];
    readonly hardware: readonly Readonly<{ slot: number; attr: readonly [number, number, number] }>[];
  }>;
  readonly matrices: Readonly<{
    readonly software: readonly (readonly [256, 0, 0, 256])[];
    readonly hardware: readonly (readonly [256, 0, 0, 256])[];
  }>;
  readonly palette: RainDancePaletteState;
  readonly resources: Readonly<{
    readonly tileTags: readonly number[];
    readonly paletteTags: readonly number[];
    readonly loaded: boolean;
  }>;
  readonly audio: Readonly<{
    readonly starts: readonly Readonly<{ sound: "SE_M_RAIN_DANCE"; id: 127; pan: "SOUND_PAN_ATTACKER" }>[];
    readonly active: boolean;
  }>;
  readonly visualTaskCount: number;
  readonly soundTaskCount: 0;
}

interface DropBirth {
  readonly age: number;
  readonly slot: number;
  readonly x: number;
  readonly y: number;
}

function random2(value: number): number {
  return (Math.imul(value >>> 0, 1103515245) + 24691) >>> 0;
}

function isSpawnAge(age: number): boolean {
  return age === 18 || (age >= 20 && age <= 134 && (age - 20) % 3 === 0);
}

function sourceAtAge(age: number): RainDanceState["source"] {
  if (age <= 0) return { owner: "Move_RAIN_DANCE", offset: 0, wait: 0 };
  if (age <= 3) return { owner: "Move_RAIN_DANCE", offset: 3, wait: age === 1 ? 1 : 0 };
  if (age <= 17) return { owner: "Move_RAIN_DANCE", offset: 24, wait: 1 };
  if (age <= 139) return { owner: "Move_RAIN_DANCE", offset: 53, wait: Math.max(0, 138 - age) };
  if (age <= 171) return { owner: "Move_RAIN_DANCE", offset: 55, wait: Math.max(0, 170 - age) };
  if (age <= 185) return { owner: "Move_RAIN_DANCE", offset: 73, wait: 1 };
  return { owner: "Move_RAIN_DANCE", offset: 74, wait: 0 };
}

function blendTaskAtAge(age: number): RainDanceTask | null {
  const down = age >= 172 && age <= 184;
  if (!down && (age < 4 || age > 16)) return null;
  const localAge = down ? age - 172 : age - 4;
  const step = Math.floor((localAge + 2) / 3);
  const coefficient = down ? Math.max(0, 4 - step) : Math.min(4, step);
  return {
    slot: 0,
    callback: "AnimTask_BlendSpriteColor_Step2",
    data: [14, 3, 2, down ? 4 : 0, down ? 0 : 4, 0, 0, 0, 0, (localAge + 2) % 3, coefficient, 0, 0, 0, 0, 0],
  };
}

function rainTasksAtAge(age: number): readonly RainDanceTask[] {
  if (age < 18 || age > 135) return [];
  const data = [age - 16, 0, 3, 120, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] as const;
  return [
    { slot: 0, callback: "AnimTask_CreateRaindrops", data },
    { slot: 1, callback: "AnimTask_CreateRaindrops", data },
  ];
}

function animationFrame(sourcePass: number): readonly [0 | 1 | 2 | 3 | 4 | 5 | 6, number] {
  if (sourcePass <= 0) return [0, 0];
  if (sourcePass <= 2) return [0, 2 - sourcePass];
  if (sourcePass <= 4) return [1, 4 - sourcePass];
  if (sourcePass <= 6) return [2, 6 - sourcePass];
  if (sourcePass <= 12) return [3, 12 - sourcePass];
  if (sourcePass <= 14) return [4, 14 - sourcePass];
  if (sourcePass <= 16) return [5, 16 - sourcePass];
  return [6, sourcePass === 17 ? 1 : 0];
}

function dropAtAge(birth: DropBirth, age: number): RainDanceDrop | null {
  // The first two creates execute while the source interpreter is still in
  // the sprite pass, so they enter AnimRainDrop one pass ahead of later task creates.
  const sourcePass = age - birth.age + (birth.age === 18 ? 1 : 0);
  if (sourcePass < 0 || sourcePass >= 20) return null;
  const callbackAge = Math.max(0, Math.min(18, sourcePass - 1));
  const x2 = Math.min(13, callbackAge);
  const y2 = x2 * 4;
  const [animCmdIndex, animDelayCounter] = animationFrame(sourcePass);
  const oamReady = sourcePass > 0;
  return {
    slot: birth.slot,
    template: "gRainDropSpriteTemplate",
    callback: oamReady ? "AnimRainDrop_Step" : "AnimRainDrop",
    x: birth.x,
    y: birth.y,
    x2,
    y2,
    animNum: 0,
    animCmdIndex,
    animDelayCounter,
    subpriority: 4,
    invisible: false,
    matrix: NEUTRAL_MATRIX,
    data: [callbackAge, 0, 0, 0, 0, 0, 0, 0],
    attr: oamReady
      ? [0x8000 | ((birth.y + y2 - 16) & 0xff), 0x8000 | ((birth.x + x2 - 8) & 0x1ff), 0x7931 + animCmdIndex * 8]
      : [0x8000, 0x8000, 0x7931],
    birthAge: birth.age,
    sourcePass,
  };
}

function simulate(age: number, profile: RainDanceProfile): Readonly<{
  rng: number;
  births: readonly DropBirth[];
}> {
  let rng = profile.animationRngAtAge0 >>> 0;
  const births: DropBirth[] = [];
  for (let currentAge = 1; currentAge <= age; currentAge += 1) {
    rng = random2(rng); // presentation scheduler's per-frame Random2 advance
    if (!isSpawnAge(currentAge)) continue;
    const occupied = new Set(profile.occupiedSpriteSlots);
    for (const birth of births) {
      if (dropAtAge(birth, currentAge) !== null) occupied.add(birth.slot);
    }
    for (let task = 0; task < 2; task += 1) {
      rng = random2(rng);
      const x = (rng >>> 16) % 240;
      rng = random2(rng);
      const y = (rng >>> 16) % 80;
      let slot = 0;
      while (occupied.has(slot)) slot += 1;
      occupied.add(slot);
      births.push({ age: currentAge, slot, x, y });
    }
  }
  return { rng, births };
}

export function rainDanceBlendCoefficientAtAge(age: number): number {
  if (age < 8) return 0;
  if (age < 11) return 1;
  if (age < 14) return 2;
  if (age < 17) return 3;
  if (age < 176) return 4;
  if (age < 179) return 3;
  if (age < 182) return 2;
  if (age < 185) return 1;
  return 0;
}

export function blendRainDancePalette(
  unfaded: readonly number[],
  coefficient: number,
  baseFaded: readonly number[] = unfaded,
): number[] {
  return unfaded.map((color, index) => {
    if ((RAIN_DANCE_SELECTED_PALETTES & (1 << Math.floor(index / 16))) === 0) return baseFaded[index]!;
    const blend = (component: number): number => component + ((-component * coefficient) >> 4);
    return blend(color & 31)
      | (blend((color >> 5) & 31) << 5)
      | (blend((color >> 10) & 31) << 10);
  });
}

function palettesAtAge(age: number, profile: RainDanceProfile): RainDancePaletteState {
  const loaded = age >= 1;
  const unfaded = loaded ? profile.unfadedPaletteAfterLoad : profile.unfadedPaletteBeforeLoad;
  const coefficient = rainDanceBlendCoefficientAtAge(age);
  const hardwareCoefficient = age > 0 ? rainDanceBlendCoefficientAtAge(age - 1) : 0;
  const previousUnfaded = age > 1 ? profile.unfadedPaletteAfterLoad : profile.unfadedPaletteBeforeLoad;
  return {
    selectedPalettes: RAIN_DANCE_SELECTED_PALETTES,
    coefficient,
    hardwareCoefficient,
    unfaded: [...unfaded],
    faded: age === 0 ? [...profile.fadedPaletteBeforeLoad] : blendRainDancePalette(unfaded, coefficient, profile.fadedPaletteAfterLoad),
    hardware: age === 0
      ? [...profile.hardwarePaletteAtAge0]
      : age === 1
        ? [...profile.fadedPaletteBeforeLoad]
        : blendRainDancePalette(previousUnfaded, hardwareCoefficient, profile.fadedPaletteAfterLoad),
  };
}

/** age=0 is the first retained Move_RAIN_DANCE source row. */
export function rainDanceAtAge(age: number, profile: RainDanceProfile): RainDanceState {
  if (!Number.isInteger(age) || age < 0) throw new Error("Rain Dance age must be a nonnegative integer");
  if (profile.unfadedPaletteBeforeLoad.length !== 512
    || profile.fadedPaletteBeforeLoad.length !== 512
    || profile.hardwarePaletteAtAge0.length !== 512
    || profile.unfadedPaletteAfterLoad.length !== 512
    || profile.fadedPaletteAfterLoad.length !== 512) {
    throw new Error("Rain Dance palette profiles must contain 512 colors");
  }
  const current = simulate(age, profile);
  const prior = age > 0 ? simulate(age - 1, profile) : null;
  const drops = current.births.flatMap((birth) => {
    const drop = dropAtAge(birth, age);
    return drop === null ? [] : [drop];
  }).sort((a, b) => a.slot - b.slot);
  const priorDrops = prior === null ? [] : prior.births.flatMap((birth) => {
    const drop = dropAtAge(birth, age - 1);
    return drop === null ? [] : [drop];
  }).sort((a, b) => a.slot - b.slot);
  const blendTask = blendTaskAtAge(age);
  const tasks = blendTask === null ? rainTasksAtAge(age) : [blendTask];
  const resourceLoaded = age >= 1 && age <= 185;
  return {
    age,
    active: age < RAIN_DANCE_WINDOW_ROWS - 1,
    source: sourceAtAge(age),
    animationRng: current.rng,
    tasks,
    drops,
    oam: {
      transferLagRows: 1,
      software: drops.map(({ slot, attr }) => ({ slot, attr })),
      hardware: priorDrops.map(({ slot, attr }) => ({ slot, attr })),
    },
    matrices: {
      software: Array.from({ length: 32 }, () => NEUTRAL_MATRIX),
      hardware: Array.from({ length: 32 }, () => NEUTRAL_MATRIX),
    },
    palette: palettesAtAge(age, profile),
    resources: {
      tileTags: resourceLoaded ? [RAIN_DROPS_TAG] : [],
      paletteTags: resourceLoaded ? [RAIN_DROPS_TAG] : [],
      loaded: resourceLoaded,
    },
    audio: {
      starts: age === 4 ? [{ sound: "SE_M_RAIN_DANCE", id: 127, pan: "SOUND_PAN_ATTACKER" }] : [],
      active: age >= 4 && age <= 120,
    },
    visualTaskCount: tasks.length,
    soundTaskCount: 0,
  };
}

/**
 * The drops of one age as `SortSprites` keys (software OAM: attr, subpriority 4, oam.y = attr0 & 0xff). A drop that
 * AnimTask_CreateRaindrops created THIS frame is not in that frame's sort (BattleMainCB2 runs BuildOamBuffer before
 * RunTasks, battle_main.c:1863-1869), so only drops with sourcePass >= 1 are keyed; Rain Dance's age-18 pair is already
 * one pass ahead (dropAtAge). ROM-checked per frame with RAM-read words (docs/next-adapters-prep46.md s1).
 */
export function rainDropSortKeys(
  drops: readonly Pick<RainDanceDrop, "slot" | "attr" | "subpriority" | "sourcePass">[],
): readonly Readonly<{ slot: number; attr: readonly [number, number, number]; subpriority: number; oamY: number }>[] {
  return drops.filter((drop) => drop.sourcePass >= 1)
    .map((drop) => ({ slot: drop.slot, attr: drop.attr, subpriority: drop.subpriority, oamY: drop.attr[0] & 0xff }));
}

/**
 * General_Rain (B_ANIM_RAIN_CONTINUES; battle_anim_scripts.s General_Rain): two AnimTask_CreateRaindrops tasks with
 * args (0, 3, 60) spawn a pair whenever the task timer % 3 == 1, x = Random2() % 240, y = Random2() % 80 per task in
 * creation order (battle_anim_water.c:482-501): 20 spawns x 4 words, at ages 17 + 3k from the general animation's
 * activation edge (RAM-measured, docs/next-adapters-prep46.md s1). Its script runs in the task phase, so the first pair
 * gets no extra sprite pass (the measured gap 17 -> 20 is 3, Move_RAIN_DANCE's 18 -> 20 is 2).
 */
export const GENERAL_RAIN_SPAWN_AGES: readonly number[] = Object.freeze(Array.from({ length: 20 }, (_, k) => 17 + 3 * k));
/** The last age with a live General_Rain drop (the last spawn + 19 passes). */
export const GENERAL_RAIN_LAST_DROP_AGE = 17 + 3 * 19 + 19;

/**
 * General_Rain's drops alive at `age` from the body's four-word draw rows (plan order: x0, y0, x1, y1 per spawn), with
 * the AnimRainDrop program of Move_RAIN_DANCE (dropAtAge) and CreateSprite's lowest free slot over `occupiedSpriteSlots`
 * and the live drops (as simulate). Presentation only: the words are the general animation's own presentation words.
 * `age` is the software (RAM) state after the script row `age` (age 0 = the row gAnimScriptActive rises, generalRainAtAge).
 */
export function generalRainDropsAtAge(
  age: number, draws: readonly (readonly number[])[], occupiedSpriteSlots: readonly number[],
): readonly RainDanceDrop[] {
  const births: DropBirth[] = [];
  GENERAL_RAIN_SPAWN_AGES.forEach((spawn, k) => {
    if (spawn > age) return;
    const words = draws[k];
    if (words === undefined || words.length !== 4) throw new Error(`General_Rain spawn ${k} needs 4 words`);
    const occupied = new Set(occupiedSpriteSlots);
    for (const birth of births) if (dropAtAge(birth, spawn) !== null) occupied.add(birth.slot);
    for (let task = 0; task < 2; task += 1) {
      let slot = 0;
      while (occupied.has(slot)) slot += 1;
      occupied.add(slot);
      births.push({ age: spawn, slot, x: words[2 * task]! % 240, y: words[2 * task + 1]! % 80 });
    }
  });
  return births.flatMap((birth) => {
    const drop = dropAtAge(birth, age);
    return drop === null ? [] : [drop];
  }).sort((a, b) => a.slot - b.slot);
}

/**
 * rnc1 (docs/rnc1-rain-continues.md): General_Rain as drawn at the end of a rainy turn ("Rain continues to fall.").
 * battle_anim_scripts.s:10511-10522: loadspritegfx ANIM_TAG_RAIN_DROPS; playsewithpan SE_M_RAIN_DANCE; blend F_PAL_BG |
 * F_PAL_BATTLERS_2 to black 0 -> 4 (delay 2); waitforvisualfinish; two AnimTask_CreateRaindrops (0, 3, 60); delay 50;
 * waitforvisualfinish; blend 4 -> 0; waitforvisualfinish; end. `age` 0 is the row gAnimScriptActive rises (the playanimation
 * row: the controller launches it and Task_ClearBitWhenBattleTableAnimDone runs loadspritegfx in the same row). ROM rows,
 * RAM read on every frame of the four rain turns of seed 19 Scene ON battle 2 (.integration/evidence/fix-rain/):
 *   - SE_M_RAIN_DANCE at age 3 (loadspritegfx waits one row, WaitAnimFrameCount hands back one row later);
 *   - the blend task's coefficient (gPlttBufferFaded) 1 / 2 / 3 / 4 at ages 7 / 10 / 13 / 16 (Move_RAIN_DANCE's up-ramp, one row
 *     earlier on this clock), shown one row later (palette DMA at VBlank);
 *   - the raindrop tasks from age 17 (the 17 + 3k draws, GENERAL_RAIN_SPAWN_AGES); both end at age 76 (timer 60) and the script
 *     creates the 4 -> 0 blend the same row (the tasks run before the priority-10 host task): 3 / 2 / 1 / 0 at ages 80 / 83 / 86 / 89;
 *   - `end` waits while IsSEPlaying (Cmd_end, battle_anim.c:476-503): SE_M_RAIN_DANCE is 168 ticks at tempo 220, IsSEPlaying TRUE
 *     for 117 rows from the SE row, so gAnimScriptActive falls at age 120 = GENERAL_RAIN_SCRIPT_ROWS.
 */
export const GENERAL_RAIN_SE_AGE = 3;
/** Rows IsSEPlaying stays TRUE from the SE_M_RAIN_DANCE row: 1 + the VBlank of m4a tick 169 (ceil(169 * 150 / 220) = 116). */
export const GENERAL_RAIN_SE_ROWS = 117;
/** The first row with gAnimScriptActive FALSE (Cmd_end once the SE has stopped). */
export const GENERAL_RAIN_SCRIPT_ROWS = GENERAL_RAIN_SE_AGE + GENERAL_RAIN_SE_ROWS;

/** The blend task's coefficient after script row `age` (the software palette; displayed one row later). */
export function generalRainBlendCoefficientAtAge(age: number): number {
  if (age < 80) return rainDanceBlendCoefficientAtAge(age + 1);
  if (age < 83) return 3;
  if (age < 86) return 2;
  if (age < 89) return 1;
  return 0;
}

export interface GeneralRainProfile {
  /** The 20 spawn rows' words (x0, y0, x1, y1 each; GENERAL_RAIN_RANDOM2_PLAN order). */
  readonly draws: readonly (readonly number[])[];
  /** Live non-rain OBJ slots at the script's start; CreateSprite chooses the lowest free slot. */
  readonly occupiedSpriteSlots: readonly number[];
}

export interface GeneralRainState {
  readonly age: number;
  /** gAnimScriptActive after this row. */
  readonly active: boolean;
  /** The blend coefficient of the software palette after this row, and the one the screen shows this row (one row behind). */
  readonly coefficient: number;
  readonly hardwareCoefficient: number;
  /** The drops in RAM after this row, and the drops the screen shows this row (the previous row's OAM build, created ones only). */
  readonly drops: readonly RainDanceDrop[];
  readonly displayedDrops: readonly RainDanceDrop[];
}

/** General_Rain at script row `age` (see GENERAL_RAIN_SE_AGE): presentation only, from the general animation's own words. */
export function generalRainAtAge(age: number, profile: GeneralRainProfile): GeneralRainState {
  if (!Number.isInteger(age) || age < 0) throw new Error("General_Rain age must be a nonnegative integer");
  if (profile.draws.length !== GENERAL_RAIN_SPAWN_AGES.length) throw new Error("General_Rain needs 20 spawn rows of words");
  return {
    age,
    active: age < GENERAL_RAIN_SCRIPT_ROWS,
    coefficient: generalRainBlendCoefficientAtAge(age),
    hardwareCoefficient: age === 0 ? 0 : generalRainBlendCoefficientAtAge(age - 1),
    drops: generalRainDropsAtAge(age, profile.draws, profile.occupiedSpriteSlots),
    displayedDrops: age === 0 ? []
      : generalRainDropsAtAge(age - 1, profile.draws, profile.occupiedSpriteSlots).filter((drop) => drop.sourcePass > 0),
  };
}
