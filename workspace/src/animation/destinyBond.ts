/**
 * Source-age reducer for Move_DESTINY_BOND.
 *
 * This ports the pointer-owned script and the four direct presentation bodies
 * (`Task_FadeToBg`, `AnimTask_DestinyBondWhiteShadow`,
 * `AnimTask_ShakeMonInPlace`, and `AnimTask_BlendBattleAnimPalExclude`).
 * It owns only visual state.  Geometry, allocator slots, current sprite
 * order, and RNG ownership are supplied by the Scene-ON caller; this module
 * neither selects a canonical party nor consults a recording/framebuffer.
 */
import asset from "./assets/destiny-bond.json" with { type: "json" };

export type DestinyBondSide = "player" | "opponent";

export interface DestinyBondPoint {
  readonly x: number;
  readonly y: number;
}

/** Live presentation facts owned by the Scene-ON caller. */
export interface DestinyBondLiveInputs {
  readonly attackerSide: DestinyBondSide;
  readonly targetSide: DestinyBondSide;
  readonly attackerSpecies: string;
  readonly targetSpecies: string;
  /** `BATTLER_COORD_X_2` for the moving white shadow's source point. */
  readonly attackerCenter: Readonly<DestinyBondPoint>;
  readonly targetCenter: Readonly<DestinyBondPoint>;
  /** `BATTLER_COORD_ATTR_BOTTOM`, intentionally distinct from picture center. */
  readonly attackerBottom: number;
  readonly targetBottom: number;
  readonly attackerSpriteSlot: number;
  readonly whiteShadowSpriteSlot: number;
  readonly whiteShadowTaskSlot: number;
  readonly shakeTaskSlot: number;
  readonly paletteTaskSlot: number;
  readonly fadeTaskSlot: number;
  readonly clearMonBgTaskSlot: number;
  readonly whiteShadowTileSlot: number;
  readonly whiteShadowPaletteBank: number;
  readonly whiteShadowTileRange: readonly [number, number];
  /** Current allocator bitmap, passed through unchanged when Destiny Bond frees. */
  readonly matrixBitmap: number;
  /** Existing source order before CreateSprite; slot insertion is live, not fitted. */
  readonly spriteOrder: readonly number[];
  readonly whiteShadowOrderIndex: number;
  /** Selector 6's live visible OBJ banks; excluded banks are never blended. */
  readonly visibleObjPaletteBanks: readonly number[];
  readonly excludedObjPaletteBanks: readonly number[];
}

export const DESTINY_BOND_WINDOW_ROWS = 188;
export const DESTINY_BOND_FIRST_INACTIVE_AGE = 187;
export const DESTINY_BOND_WHITE_SHADOW_TAG = 10188;
export const DESTINY_BOND_WHITE_SHADOW_DURATION = 48;
export const DESTINY_BOND_WHITE_SHADOW_LIVE = [43, 137] as const;
export const DESTINY_BOND_WHITE_SHADOW_TASK_LIVE = [43, 139] as const;
export const DESTINY_BOND_SHAKE_LIVE = [93, 137] as const;
export const DESTINY_BOND_PALETTE_LIVE = [[93, 116], [119, 142]] as const;
export const DESTINY_BOND_GHOST_FADE_LIVE = [[4, 41], [144, 181]] as const;

export interface DestinyBondSourceCursor {
  readonly owner: "Move_DESTINY_BOND";
  readonly pointerOffset: 0 | 3 | 9 | 27 | 63 | 84 | 86 | 90;
  readonly wait: number;
  readonly active: boolean;
}

export interface DestinyBondWhiteShadowSprite {
  readonly kind: "white-shadow";
  readonly slot: number;
  readonly callback: "AnimDestinyBondWhiteShadow_Step";
  readonly x: number;
  readonly y: number;
  readonly x2: 0;
  readonly y2: 0;
  readonly data: readonly [number, number, number, number, number, number, number, 0];
  readonly oam: Readonly<{
    readonly mode: "OBJ_BLEND";
    readonly shape: "64x32";
    readonly priority: 2;
    readonly affine: false;
    readonly matrix: readonly [256, 0, 0, 256];
  }>;
  readonly subpriority: 55;
}

export interface DestinyBondTask {
  readonly slot: number;
  readonly callback:
    | "Task_FadeToBg"
    | "AnimTask_DestinyBondWhiteShadow_Step"
    | "AnimTask_ShakeMonInPlace_Step"
    | "AnimTask_BlendSpriteColor_Step2"
    | "Task_ClearMonBg";
  /** Source task RAM after its source callback body; never a retained-row lookup. */
  readonly data: readonly number[];
}

export interface DestinyBondState {
  readonly age: number;
  readonly active: boolean;
  readonly source: DestinyBondSourceCursor;
  readonly sprites: readonly DestinyBondWhiteShadowSprite[];
  readonly tasks: readonly DestinyBondTask[];
  readonly sourceOrder: readonly number[];
  readonly attackerOffset: Readonly<{ readonly x2: number; readonly y2: 0 }>;
  readonly registers: Readonly<{
    readonly bldcnt: 0 | 232 | 16192;
    readonly bldalpha: number;
    readonly bldy: number;
  }>;
  readonly palette: Readonly<{
    readonly selector: 6;
    readonly colorBgr555: 30653;
    readonly coefficient: number;
    readonly visibleObjBanks: readonly number[];
    readonly excludedObjBanks: readonly number[];
    /** OBJ bank 16/17-style software palette is then transferred one VBlank later. */
    readonly hardwareCoefficient: number;
    readonly transfer: "current-faded" | "preceding-faded";
  }>;
  readonly background: Readonly<{
    readonly id: "BG_GHOST";
    readonly vram: "battle" | "ghost";
    readonly fadedPaletteBank2: "battle" | "ghost";
    readonly hardwarePaletteBank2: "battle" | "ghost";
    readonly vramEvent: "none" | "load-ghost" | "restore-battle";
    readonly fadedBank2Event: "none" | "load-ghost" | "restore-battle";
    readonly hardwareBank2Event: "none" | "load-ghost" | "restore-battle";
  }>;
  /** Whole-object transfer is shared hardware behavior, made explicit at the seam. */
  readonly displayTransfer: Readonly<{
    readonly oam: "current" | "preceding-software";
    readonly matrices: "current" | "preceding-software";
    readonly palettes: "current" | "preceding-faded";
    readonly whiteShadowHardwareRank: "not-live" | "current-software-rank-11" | "preceding-software-rank-11";
  }>;
  readonly resources: Readonly<{
    readonly whiteShadow: Readonly<{
      readonly loaded: boolean;
      readonly tag: number | null;
      readonly tileSlot: number;
      readonly paletteBank: number;
      readonly tileRange: readonly [number, number];
      readonly tileBytes: number;
    }>;
    readonly allocator: Readonly<{
      readonly matrixBitmap: number;
      readonly releasedAtFirstInactive: boolean;
    }>;
  }>;
  readonly audio: Readonly<{
    readonly events: readonly Readonly<{
      readonly channel: "SE1";
      readonly sound: "SE_M_PSYBEAM" | "SE_M_CONFUSE_RAY" | "SE_M_NIGHTMARE";
      readonly sourcePan: "SOUND_PAN_ATTACKER" | "SOUND_PAN_TARGET";
      readonly pan: -64 | 63;
    }>[];
  }>;
  readonly rng: Readonly<{
    readonly gameplay: "untouched";
    readonly animation: "caller-scheduled";
  }>;
  readonly cleanup: Readonly<{
    readonly firstInactive: boolean;
    readonly visualTasks: number;
    readonly ownedSprites: number;
    readonly whiteShadowTagLoaded: boolean;
  }>;
}

function isIn(age: number, range: readonly [number, number]): boolean {
  return age >= range[0] && age <= range[1];
}

function sourceAtAge(age: number): DestinyBondSourceCursor {
  if (age === 0) return { owner: "Move_DESTINY_BOND", pointerOffset: 0, wait: 0, active: true };
  if (age <= 3) return { owner: "Move_DESTINY_BOND", pointerOffset: 3, wait: age === 1 ? 1 : 0, active: true };
  if (age <= 42) return { owner: "Move_DESTINY_BOND", pointerOffset: 9, wait: 1, active: true };
  if (age <= 92) return { owner: "Move_DESTINY_BOND", pointerOffset: 27, wait: Math.max(0, 91 - age), active: true };
  if (age <= 118) return { owner: "Move_DESTINY_BOND", pointerOffset: 63, wait: Math.max(0, 117 - age), active: true };
  if (age <= 143) return { owner: "Move_DESTINY_BOND", pointerOffset: 84, wait: 1, active: true };
  if (age <= 182) return { owner: "Move_DESTINY_BOND", pointerOffset: 86, wait: 1, active: true };
  return { owner: "Move_DESTINY_BOND", pointerOffset: 90, wait: 1, active: age < DESTINY_BOND_FIRST_INACTIVE_AGE };
}

function truncateDivision(numerator: number, denominator: number): number {
  return Math.trunc(numerator / denominator);
}

function whiteShadowAtAge(age: number, input: DestinyBondLiveInputs): DestinyBondWhiteShadowSprite | null {
  if (!isIn(age, DESTINY_BOND_WHITE_SHADOW_LIVE)) return null;
  const passes = Math.min(DESTINY_BOND_WHITE_SHADOW_DURATION, age - 42);
  const xStep = truncateDivision((input.targetCenter.x - input.attackerCenter.x) << 4, DESTINY_BOND_WHITE_SHADOW_DURATION);
  const yStep = truncateDivision((input.targetBottom - input.attackerBottom) << 4, DESTINY_BOND_WHITE_SHADOW_DURATION);
  const remaining = Math.max(0, DESTINY_BOND_WHITE_SHADOW_DURATION - passes);
  const steppedX = (input.attackerCenter.x << 4) + xStep * passes;
  const steppedY = (input.attackerBottom << 4) + yStep * passes;
  return {
    kind: "white-shadow",
    slot: input.whiteShadowSpriteSlot,
    callback: "AnimDestinyBondWhiteShadow_Step",
    x: steppedX >> 4,
    y: steppedY >> 4,
    x2: 0,
    y2: 0,
    data: [remaining === 0 ? 0 : steppedX, steppedY, xStep, yStep, remaining,
      input.targetCenter.x, input.targetBottom, 0],
    oam: { mode: "OBJ_BLEND", shape: "64x32", priority: 2, affine: false, matrix: [256, 0, 0, 256] },
    subpriority: 55,
  };
}

/** Direct port of the named state machine; register scanout is modelled separately below. */
function whiteShadowTaskData(age: number, slot: number): readonly number[] | null {
  if (!isIn(age, DESTINY_BOND_WHITE_SHADOW_TASK_LIVE)) return null;
  const data = Array<number>(16).fill(0);
  data[9] = 16;
  data[12] = 1;
  data[13] = slot;
  for (let pass = 0; pass < age - 42; pass += 1) {
    switch (data[0]) {
      case 0:
        if (data[6] === 0 && ++data[5]! > 1) {
          data[5] = 0;
          data[7]!++;
          if (data[7]! & 1) { if (data[8]! < 16) data[8]!++; }
          else if (data[9]) data[9]!--;
          if (data[7]! >= 24) { data[7] = 0; data[6] = 1; }
        }
        if (data[10]) data[10]!--; else if (data[6]) data[0]!++;
        break;
      case 1:
        if (++data[5]! > 1) {
          data[5] = 0;
          data[7]!++;
          if (data[7]! & 1) { if (data[8]) data[8]!--; }
          else if (data[9]! < 16) data[9]!++;
          if (data[8] === 0 && data[9] === 16) data[0]!++;
        }
        break;
      case 2:
        if (++data[5]! > 0) data[0]!++;
        break;
      default:
        break;
    }
  }
  return data;
}

function alphaAtAge(age: number): number {
  if (age < 43 || age > 140) return 0;
  let eva = 0;
  let evb = 16;
  const inwardPulses = Math.min(24, Math.floor((age - 43) / 2));
  for (let pulse = 1; pulse <= inwardPulses; pulse += 1) {
    if (pulse & 1) eva += 1; else evb -= 1;
  }
  if (age <= 92) return (evb << 8) | eva;
  const outwardPulses = Math.min(24, Math.floor((age - 91) / 2));
  for (let pulse = 1; pulse <= outwardPulses; pulse += 1) {
    if (pulse & 1) eva -= 1; else evb += 1;
  }
  return (evb << 8) | eva;
}

function shakeOffsetAtAge(age: number): number {
  if (!isIn(age, DESTINY_BOND_SHAKE_LIVE)) return 0;
  const local = age - 93;
  const pulse = local === 0 ? 0 : Math.ceil(local / 2);
  return pulse & 1 ? 2 : -2;
}

function shakeTaskData(age: number, input: DestinyBondLiveInputs): readonly number[] | null {
  if (!isIn(age, DESTINY_BOND_SHAKE_LIVE)) return null;
  const local = age - 93;
  const completedPulses = 1 + Math.ceil(local / 2);
  return [input.attackerSpriteSlot, completedPulses, 24, local & 1, 1, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
}

/** Source `StartBlendAnimSpriteColor`: its palette writes land every two scheduler rows. */
export function destinyBondPaletteCoefficientAtAge(age: number): number {
  if (age < 95) return 0;
  if (age <= 117) return Math.min(12, Math.floor((age - 93) / 2));
  if (age < 119) return 12;
  if (age <= 143) return Math.max(0, 12 - Math.floor((age - 119) / 2));
  return 0;
}

function paletteTaskData(age: number): readonly number[] | null {
  const forward = isIn(age, DESTINY_BOND_PALETTE_LIVE[0]);
  const reverse = isIn(age, DESTINY_BOND_PALETTE_LIVE[1]);
  if (!forward && !reverse) return null;
  const start = forward ? 93 : 119;
  const initial = forward ? 0 : 12;
  const target = forward ? 12 : 0;
  const local = age - start;
  const coefficient = forward
    ? Math.min(12, 1 + Math.floor(local / 2))
    : Math.max(0, 11 - Math.floor(local / 2));
  return [0, 3, 1, initial, target, 30653, 0, 0, 0, local & 1, coefficient, 0, 0, 0, 0, 0];
}

function fadeBldyAtAge(age: number): number {
  if (age >= 6 && age <= 21) return age - 5;
  if (age >= 22 && age <= 25) return 16;
  if (age >= 26 && age <= 41) return 41 - age;
  if (age >= 146 && age <= 161) return age - 145;
  if (age >= 162 && age <= 165) return 16;
  if (age >= 166 && age <= 181) return 181 - age;
  return 0;
}

function fadeTaskData(age: number): readonly number[] | null {
  const toGhost = isIn(age, DESTINY_BOND_GHOST_FADE_LIVE[0]);
  const restore = isIn(age, DESTINY_BOND_GHOST_FADE_LIVE[1]);
  if (!toGhost && !restore) return null;
  // `data[0]` is the requested bg (2) or LoadDefaultBg (-1); data[10] is
  // Task_FadeToBg's source state.  The state transitions at the palette gates.
  const local = age - (toGhost ? 4 : 144);
  const state = local < 19 ? 1 : local < 21 ? 2 : 3;
  return [toGhost ? 2 : -1, 0, 0, 0, 0, 0, 0, 0, 0, 0, state, 0, 0, 0, 0, 0];
}

function orderedSprites(
  input: DestinyBondLiveInputs,
  white: DestinyBondWhiteShadowSprite | null,
  retainDestroyedOamOrder: boolean,
): readonly number[] {
  if (white === null && !retainDestroyedOamOrder) return [...input.spriteOrder];
  const order = input.spriteOrder.filter((slot) => slot !== input.whiteShadowSpriteSlot);
  const slot = white?.slot ?? input.whiteShadowSpriteSlot;
  order.splice(Math.max(0, Math.min(input.whiteShadowOrderIndex, order.length)), 0, slot);
  return order;
}

function audioAtAge(age: number, side: DestinyBondSide): DestinyBondState["audio"] {
  const pan: -64 | 63 = side === "player" ? -64 : 63;
  if (age === 4) return { events: [{ channel: "SE1", sound: "SE_M_PSYBEAM", sourcePan: "SOUND_PAN_ATTACKER", pan }] };
  if (age === 43) return { events: [{ channel: "SE1", sound: "SE_M_CONFUSE_RAY", sourcePan: "SOUND_PAN_ATTACKER", pan }] };
  if (age === 119) return { events: [{ channel: "SE1", sound: "SE_M_NIGHTMARE", sourcePan: "SOUND_PAN_TARGET", pan }] };
  return { events: [] };
}

function assertLiveInputs(input: DestinyBondLiveInputs): void {
  for (const value of [input.attackerCenter.x, input.attackerCenter.y, input.targetCenter.x,
    input.targetCenter.y, input.attackerBottom, input.targetBottom]) {
    if (!Number.isInteger(value)) throw new Error("Destiny Bond geometry must be integral source coordinates");
  }
  for (const slot of [input.attackerSpriteSlot, input.whiteShadowSpriteSlot,
    input.whiteShadowTaskSlot, input.shakeTaskSlot, input.paletteTaskSlot,
    input.fadeTaskSlot, input.clearMonBgTaskSlot]) {
    if (!Number.isInteger(slot) || slot < 0) throw new Error("Destiny Bond requires live nonnegative allocator slots");
  }
  if (asset.whiteShadow.tag !== DESTINY_BOND_WHITE_SHADOW_TAG) {
    throw new Error("Destiny Bond asset tag drift");
  }
}

/** `age=0` is the first retained pointer-owned Move_DESTINY_BOND source row. */
export function destinyBondAtAge(age: number, input: DestinyBondLiveInputs): DestinyBondState {
  if (!Number.isInteger(age) || age < 0) throw new Error("Destiny Bond age must be a nonnegative integer");
  assertLiveInputs(input);
  const source = sourceAtAge(age);
  const white = whiteShadowAtAge(age, input);
  const whiteTask = whiteShadowTaskData(age, input.whiteShadowSpriteSlot);
  const shakeTask = shakeTaskData(age, input);
  const paletteTask = paletteTaskData(age);
  const fadeTask = fadeTaskData(age);
  const clearMonBg = age === 183
    ? [0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    : null;
  const tasks: DestinyBondTask[] = [];
  if (fadeTask !== null) tasks.push({ slot: input.fadeTaskSlot, callback: "Task_FadeToBg", data: fadeTask });
  if (whiteTask !== null) tasks.push({ slot: input.whiteShadowTaskSlot, callback: "AnimTask_DestinyBondWhiteShadow_Step", data: whiteTask });
  if (shakeTask !== null) tasks.push({ slot: input.shakeTaskSlot, callback: "AnimTask_ShakeMonInPlace_Step", data: shakeTask });
  if (paletteTask !== null) tasks.push({ slot: input.paletteTaskSlot, callback: "AnimTask_BlendSpriteColor_Step2", data: paletteTask });
  if (clearMonBg !== null) tasks.push({ slot: input.clearMonBgTaskSlot, callback: "Task_ClearMonBg", data: clearMonBg });
  tasks.sort((a, b) => a.slot - b.slot);

  const loaded = age >= 1 && age < DESTINY_BOND_FIRST_INACTIVE_AGE;
  const vram = age >= 23 && age < 163 ? "ghost" : "battle";
  const fadedPaletteBank2 = age >= 24 && age < 164 ? "ghost" : "battle";
  const hardwarePaletteBank2 = age >= 25 && age < 165 ? "ghost" : "battle";
  const bldcnt: 0 | 232 | 16192 = age >= 43 && age <= 140
    ? 16192
    : (age >= 5 && age <= 41) || (age >= 145 && age <= 181) ? 232 : 0;
  const paletteCoefficient = destinyBondPaletteCoefficientAtAge(age);

  return {
    age,
    active: source.active,
    source,
    sprites: white === null ? [] : [white],
    tasks,
    // DestroySprite occurs in the post-BuildOamBuffer callback at age 138;
    // the current scanout still retains its source order for that one row.
    sourceOrder: orderedSprites(input, white, age === 138),
    attackerOffset: { x2: shakeOffsetAtAge(age), y2: 0 },
    registers: { bldcnt, bldalpha: alphaAtAge(age), bldy: fadeBldyAtAge(age) },
    palette: {
      selector: 6,
      colorBgr555: 30653,
      coefficient: paletteCoefficient,
      visibleObjBanks: [...input.visibleObjPaletteBanks],
      excludedObjBanks: [...input.excludedObjPaletteBanks],
      hardwareCoefficient: age === 0 ? 0 : destinyBondPaletteCoefficientAtAge(age - 1),
      transfer: age === 0 ? "current-faded" : "preceding-faded",
    },
    background: {
      id: "BG_GHOST",
      vram,
      fadedPaletteBank2,
      hardwarePaletteBank2,
      vramEvent: age === 23 ? "load-ghost" : age === 163 ? "restore-battle" : "none",
      fadedBank2Event: age === 24 ? "load-ghost" : age === 164 ? "restore-battle" : "none",
      hardwareBank2Event: age === 25 ? "load-ghost" : age === 165 ? "restore-battle" : "none",
    },
    displayTransfer: {
      oam: age === 0 ? "current" : "preceding-software",
      matrices: age === 0 ? "current" : "preceding-software",
      palettes: age === 0 ? "current" : "preceding-faded",
      whiteShadowHardwareRank: age < 44 || age > 138
        ? "not-live"
        : "preceding-software-rank-11",
    },
    resources: {
      whiteShadow: {
        loaded,
        tag: loaded ? DESTINY_BOND_WHITE_SHADOW_TAG : null,
        tileSlot: input.whiteShadowTileSlot,
        paletteBank: input.whiteShadowPaletteBank,
        tileRange: input.whiteShadowTileRange,
        tileBytes: asset.whiteShadow.tileBytes,
      },
      allocator: { matrixBitmap: input.matrixBitmap, releasedAtFirstInactive: age === DESTINY_BOND_FIRST_INACTIVE_AGE },
    },
    audio: audioAtAge(age, input.attackerSide),
    rng: { gameplay: "untouched", animation: "caller-scheduled" },
    cleanup: {
      firstInactive: age === DESTINY_BOND_FIRST_INACTIVE_AGE,
      visualTasks: tasks.filter((task) => task.callback.startsWith("AnimTask_")).length,
      ownedSprites: white === null ? 0 : 1,
      whiteShadowTagLoaded: loaded,
    },
  };
}
