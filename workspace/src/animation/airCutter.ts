/**
 * Source-relative semantic reducer for Move_AIR_CUTTER.
 *
 * This ports the pointer-owned script, AirCutterProjectile task, AIR_WAVE
 * callbacks, Air Cutter slice callback, and the two scheduled ShakeMon2
 * commands.  It intentionally stops at semantic presentation state: the
 * Scene-ON renderer/compositor owns all pixels and latches.
 */
import airCutterAsset from "./assets/air-cutter.json" with { type: "json" };

export type AirCutterSide = "player" | "opponent";
export interface AirCutterPoint { readonly x: number; readonly y: number; }
export type AirCutterMatrix = readonly [number, number, number, number];

export interface AirCutterResourceAllocation {
  readonly paletteBank: number;
  readonly tileSlot: number;
  readonly tileRange: readonly [number, number];
}

export interface AirCutterBattlerInput {
  readonly slot: number;
  readonly subpriority: number;
  readonly matrixNum: number;
  readonly matrix: AirCutterMatrix;
}

/** Current allocator and geometry facts supplied by the Scene-ON caller. */
export interface AirCutterLiveInputs {
  readonly attackerSide: AirCutterSide;
  readonly targetSide: AirCutterSide;
  readonly attackerSpecies: string;
  readonly targetSpecies: string;
  /** `BATTLER_COORD_X/Y` coordinates used by the projectile task. */
  readonly attackerCenter: Readonly<AirCutterPoint>;
  readonly targetCenter: Readonly<AirCutterPoint>;
  /** Air Cutter averages this source coordinate only when the partner is visible. */
  readonly targetPartner?: Readonly<{
    readonly visible: boolean;
    readonly center: Readonly<AirCutterPoint>;
    readonly sprite: AirCutterBattlerInput;
  }>;
  readonly attackerSprite: AirCutterBattlerInput;
  readonly targetSprite: AirCutterBattlerInput;
  readonly waveSpriteSlots: readonly [number, number, number];
  readonly sliceSpriteSlot: number;
  readonly taskSlots: Readonly<{
    readonly projectile: number;
    readonly targetShake: number;
    readonly partnerShake: number;
    readonly updateMonBg: number;
    readonly clearMonBg: number;
  }>;
  readonly resources: Readonly<{
    readonly airWave: AirCutterResourceAllocation;
    readonly cut: AirCutterResourceAllocation;
    readonly impact: AirCutterResourceAllocation;
  }>;
  /** Live affine allocator bitmap; Air Cutter allocates no affine object itself. */
  readonly matrixBitmap: number;
  /** Live source order, consumed semantically but not painted by this reducer. */
  readonly spriteOrder: readonly number[];
  readonly monbg: Readonly<{
    readonly layer: "bg1" | "bg2";
    /** Battler coordinates captured by Task_UpdateMonBg (not the projectile coordinate pair). */
    readonly center: Readonly<AirCutterPoint>;
    readonly bgX: number;
    readonly bgY: number;
  }>;
}

export const AIR_CUTTER_SOURCE_START = 0x082ced58;
export const AIR_CUTTER_SOURCE_END = 0x082cedba;
export const AIR_CUTTER_FIRST_INACTIVE_AGE = 111;
export const AIR_CUTTER_WAVE_START_AGES = [17, 20, 23] as const;
export const AIR_CUTTER_SLICE_START_AGE = 76;
export const AIR_CUTTER_SHAKE_START_AGE = 83;
export const AIR_CUTTER_SHAKE_END_AGE = 96;

const IDENTITY: AirCutterMatrix = [256, 0, 0, 256];
const asS16 = (value: number): number => ((value + 0x8000) & 0xffff) - 0x8000;
const asU16 = (value: number): number => value & 0xffff;
const mul16 = (left: number, right: number): number =>
  asS16(Math.trunc((asS16(left) * asS16(right)) / 256));
const inv16 = (value: number): number => asS16(Math.trunc(0x10000 / asS16(value)));
const q8Pixel = (value: number): number => Math.floor(value / 256);
const point = (value: Readonly<AirCutterPoint>): AirCutterPoint => ({ x: value.x, y: value.y });

export interface AirCutterSourceCursor {
  readonly owner: "Move_AIR_CUTTER";
  readonly pointer: number;
  readonly pointerOffset: number;
  readonly active: boolean;
  readonly wait: number;
}

export interface AirCutterSprite {
  readonly kind: "air-wave" | "air-cutter-slice";
  readonly slot: number;
  readonly template: "gAirWaveProjectileSpriteTemplate" | "gAirCutterSliceSpriteTemplate";
  readonly callback:
    | "AnimAirWaveProjectile"
    | "AnimAirWaveProjectile_Step1"
    | "AnimAirWaveProjectile_Step2"
    | "AnimSlice_Step"
    | "WaitAnimForDuration"
    | "DestroyAnimSprite";
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly subpriority: number;
  readonly matrixNum: 0;
  readonly matrix: AirCutterMatrix;
  /** Source `gCuttingSliceAnimCmds` cell; AIR_WAVE is permanently cell 0. */
  readonly frame: 0 | 1 | 2 | 3;
  readonly data: readonly number[];
  readonly sourceOrder: number;
}

export interface AirCutterTask {
  readonly slot: number;
  readonly callback:
    | "AirCutterProjectileStep1"
    | "AirCutterProjectileStep2"
    | "AnimTask_ShakeMon2_Step"
    | "Task_UpdateMonBg"
    | "Task_ClearMonBg";
  readonly data: readonly number[];
  readonly role: "projectile" | "target-shake" | "partner-shake" | "update-monbg" | "clear-monbg";
}

export interface AirCutterState {
  readonly age: number;
  readonly active: boolean;
  readonly source: AirCutterSourceCursor;
  readonly battlers: Readonly<{
    readonly attacker: Readonly<AirCutterBattlerInput & { readonly species: string; readonly center: AirCutterPoint }>;
    readonly target: Readonly<AirCutterBattlerInput & { readonly species: string; readonly center: AirCutterPoint; readonly offset: AirCutterPoint }>;
    readonly targetPartner: Readonly<{ readonly visible: boolean; readonly offset: AirCutterPoint }>;
  }>;
  readonly sprites: readonly AirCutterSprite[];
  readonly tasks: readonly AirCutterTask[];
  readonly resources: Readonly<{
    readonly airWave: Readonly<AirCutterResourceAllocation & { readonly tag: number | null; readonly loaded: boolean }>;
    readonly cut: Readonly<AirCutterResourceAllocation & { readonly tag: number | null; readonly loaded: boolean }>;
    readonly impact: Readonly<AirCutterResourceAllocation & { readonly tag: number | null; readonly loaded: boolean }>;
    readonly allocator: Readonly<{ readonly matrixBitmap: number; readonly matrixSlots: readonly number[] }>;
  }>;
  readonly background: Readonly<{ readonly monbg: boolean; readonly layer: "bg1" | "bg2"; readonly scroll: AirCutterPoint }>;
  readonly registers: Readonly<{ readonly bldcnt: number; readonly bldalpha: number }>;
  readonly painterOrder: readonly number[];
  readonly audio: readonly (Readonly<{ readonly age: number; readonly sound: "SE_M_BLIZZARD2" | "SE_M_CUT"; readonly pan: number; }>)[];
  readonly cleanup: Readonly<{ readonly firstInactive: boolean; readonly visualTasks: number; readonly ownedSprites: number; readonly resourcesReleased: boolean }>;
}

function sourceAtAge(age: number): AirCutterSourceCursor {
  if (!Number.isInteger(age) || age < 0) throw new Error(`invalid Air Cutter source age ${age}`);
  const active = age < AIR_CUTTER_FIRST_INACTIVE_AGE;
  let pointerOffset = 97;
  let wait = 0;
  if (age === 0) pointerOffset = 0;
  else if (age <= 3) { pointerOffset = 3; wait = age === 1 ? 1 : 0; }
  else if (age <= 6) { pointerOffset = 6; wait = age === 4 ? 1 : 0; }
  else if (age <= 9) { pointerOffset = 9; wait = age === 7 ? 1 : 0; }
  else if (age <= 11) { pointerOffset = 11; wait = age === 10 ? -1 : 0; }
  else if (age <= 14) { pointerOffset = 13; wait = age === 12 ? 1 : 0; }
  else if (age <= 16) { pointerOffset = 18; wait = age === 15 ? -1 : 0; }
  else if (age <= 75) { pointerOffset = 35; wait = 1; }
  else if (age <= 82) { pointerOffset = 57; wait = Math.max(0, 81 - age); }
  else if (age <= 100) { pointerOffset = 91; wait = 1; }
  else if (age === 101) wait = -1;
  else if (age >= 105) wait = 1;
  return {
    owner: "Move_AIR_CUTTER",
    pointer: AIR_CUTTER_SOURCE_START + pointerOffset,
    pointerOffset,
    active,
    wait,
  };
}

function projectileProfile(input: AirCutterLiveInputs) {
  const reverse = input.targetSide === "player";
  const duration = reverse ? 1537 : 1536;
  const target = {
    x: input.targetCenter.x + (reverse ? -32 : 32),
    y: input.targetCenter.y + (reverse ? 24 : -24),
  };
  const horizontal = mul16(Math.abs(target.x - input.attackerCenter.x), inv16(duration & ~1));
  const vertical = target.y >= input.attackerCenter.y
    ? mul16(target.y - input.attackerCenter.y, inv16(horizontal)) & ~1
    : mul16(input.attackerCenter.y - target.y, inv16(horizontal)) | 1;
  return { duration, target, horizontal, halfHorizontal: mul16(horizontal, 128), vertical };
}

function signedQ8(value: number, negative: boolean): number {
  const pixels = asU16(value) >> 8;
  return negative && pixels !== 0 ? -pixels : pixels;
}

function waveAtAge(
  age: number,
  spawnAge: number,
  sourceOrder: number,
  input: AirCutterLiveInputs,
): AirCutterSprite | null {
  const local = age - spawnAge;
  // `AnimAirWaveProjectile_Step2` presents its counter-zero row, then its
  // following callback destroys the sprite. The retained source window thus
  // includes local age 51 and removes it at 52.
  if (local < 0 || local > 51) return null;
  const profile = projectileProfile(input);
  const flipX = (profile.duration & 1) !== 0;
  const flipY = (profile.vertical & 1) !== 0;
  const initialXStep = -2 & profile.duration;
  const initialYStep = -2 & profile.vertical;
  const slot = input.waveSpriteSlots[sourceOrder]!;
  const subpriority = input.targetSprite.subpriority - sourceOrder;
  let x = input.attackerCenter.x;
  let y = input.attackerCenter.y;
  let x2 = 0;
  let y2 = 0;
  let callback: AirCutterSprite["callback"] = "AnimAirWaveProjectile";
  let data: readonly number[] = [];
  if (local <= 11) {
    const xAccum = initialXStep * local;
    const yAccum = initialYStep * local;
    x2 = signedQ8(xAccum, flipX);
    y2 = signedQ8(yAccum, flipY);
    data = [profile.horizontal - profile.halfHorizontal - local, xAccum, yAccum, 0, 0, 0, 0, input.taskSlots.projectile];
  } else {
    const launchX = initialXStep * 12;
    const launchY = initialYStep * 12;
    x = input.attackerCenter.x + signedQ8(launchX, flipX);
    y = input.attackerCenter.y + signedQ8(launchY, flipY);
    const curveX = mul16(mul16(Math.abs(profile.target.x - x) << 8, inv16(4096)), inv16(448));
    const curveY = mul16(mul16(Math.abs(profile.target.y - y) << 8, inv16(4096)), inv16(448));
    const step = Math.min(9, local - 12);
    let velocityX = 0;
    let velocityY = 0;
    let accumX = 0;
    let accumY = 0;
    for (let tick = 1; tick <= step; tick += 1) {
      const delta = tick <= 4 ? 1 : -1;
      velocityX += curveX * delta;
      velocityY += curveY * delta;
      accumX += velocityX;
      accumY += velocityY;
    }
    x2 = signedQ8(accumX, flipX);
    y2 = signedQ8(accumY, flipY);
    if (local <= 21) {
      callback = local === 21 ? "AnimAirWaveProjectile_Step2" : "AnimAirWaveProjectile_Step1";
      data = [local === 21 ? 30 : 8 - step, accumX, accumY, curveX, curveY, velocityX, velocityY, input.taskSlots.projectile];
    } else {
      callback = "AnimAirWaveProjectile_Step2";
      data = [51 - local, accumX, accumY, curveX, curveY, velocityX, velocityY, input.taskSlots.projectile];
    }
  }
  return {
    kind: "air-wave", slot, template: "gAirWaveProjectileSpriteTemplate", callback,
    x, y, x2, y2, subpriority, matrixNum: 0, matrix: IDENTITY, frame: 0,
    data, sourceOrder,
  };
}

function sliceAtAge(age: number, input: AirCutterLiveInputs): AirCutterSprite | null {
  const local = age - AIR_CUTTER_SLICE_START_AGE;
  if (local < 0 || local > 23) return null;
  const partner = input.targetPartner;
  const center = partner?.visible
    ? { x: Math.trunc((input.targetCenter.x + partner.center.x) / 2), y: Math.trunc((input.targetCenter.y + partner.center.y) / 2) }
    : point(input.targetCenter);
  const x = center.x + 40;
  const y = center.y + (input.targetSide === "player" ? 8 : 0) - 32;
  const steps = Math.min(20, local + 1);
  const xVelocity = -1024 + 24 * steps;
  const yVelocity = 1024 - 24 * steps;
  const xAccum = -1024 * steps + 12 * steps * (steps - 1);
  const yAccum = -xAccum;
  const wait = local >= 19;
  const callback: AirCutterSprite["callback"] = local < 19
    ? "AnimSlice_Step"
    : local < 23 ? "WaitAnimForDuration" : "DestroyAnimSprite";
  const data = wait
    ? [Math.max(0, 3 - (local - 19)), -544, 544, -15920, 15920, 0, 15357, 2058]
    : [steps, xVelocity, yVelocity, xAccum, yAccum, 0, 0, 0];
  return {
    kind: "air-cutter-slice", slot: input.sliceSpriteSlot,
    template: "gAirCutterSliceSpriteTemplate", callback,
    x, y, x2: q8Pixel(xAccum), y2: q8Pixel(yAccum),
    subpriority: input.attackerSprite.subpriority - 2, matrixNum: 0, matrix: IDENTITY,
    frame: Math.min(3, Math.floor((local + 1) / 5)) as 0 | 1 | 2 | 3,
    data, sourceOrder: 3,
  };
}

function shakeOffset(age: number): AirCutterPoint {
  if (age < AIR_CUTTER_SHAKE_START_AGE || age > AIR_CUTTER_SHAKE_END_AGE) return { x: 0, y: 0 };
  const phase = Math.floor((age - AIR_CUTTER_SHAKE_START_AGE) / 2);
  return { x: phase % 2 === 0 ? -2 : 2, y: 0 };
}

function resourceAtAge(
  allocation: AirCutterResourceAllocation,
  tag: number,
  age: number,
  loadedAt: number,
): Readonly<AirCutterResourceAllocation & { readonly tag: number | null; readonly loaded: boolean }> {
  const loaded = age >= loadedAt && age < AIR_CUTTER_FIRST_INACTIVE_AGE;
  return { ...allocation, tag: loaded ? tag : null, loaded };
}

function taskState(age: number, input: AirCutterLiveInputs, waves: readonly AirCutterSprite[]): AirCutterTask[] {
  const tasks: AirCutterTask[] = [];
  if (age >= AIR_CUTTER_WAVE_START_AGES[0] && age <= 74) {
    const beforeThird = age < AIR_CUTTER_WAVE_START_AGES[2];
    const cycle = (age - AIR_CUTTER_WAVE_START_AGES[0]) % 3;
    tasks.push({
      slot: input.taskSlots.projectile,
      callback: beforeThird ? "AirCutterProjectileStep1" : "AirCutterProjectileStep2",
      role: "projectile",
      data: [beforeThird ? 2 - cycle : 2, waves.length, input.targetSprite.subpriority, 2,
        input.targetSide === "player" ? 1 : 0, age < 29 ? projectileProfile(input).horizontal : 4, 11],
    });
  }
  if (age >= 12 && age <= 103) {
    tasks.push({
      slot: input.taskSlots.updateMonBg, callback: "Task_UpdateMonBg", role: "update-monbg",
      data: [input.targetSprite.slot, input.monbg.center.x, input.monbg.center.y, input.monbg.bgX, input.monbg.bgY,
        input.monbg.layer === "bg2" ? 1 : 0, input.targetSide === "opponent" ? 1 : 0],
    });
  }
  if (age >= AIR_CUTTER_SHAKE_START_AGE && age <= AIR_CUTTER_SHAKE_END_AGE) {
    const phase = Math.floor((age - AIR_CUTTER_SHAKE_START_AGE) / 2);
    tasks.push({
      slot: input.taskSlots.targetShake, callback: "AnimTask_ShakeMon2_Step", role: "target-shake",
      data: [input.targetSprite.slot, Math.max(1, 7 - phase), 1, age % 2 === 0 ? 0 : 1, 2, 0],
    });
    if (input.targetPartner?.visible) {
      tasks.push({
        slot: input.taskSlots.partnerShake, callback: "AnimTask_ShakeMon2_Step", role: "partner-shake",
        data: [input.targetPartner.sprite.slot, Math.max(1, 7 - phase), 1, age % 2 === 0 ? 0 : 1, 2, 0],
      });
    }
  }
  if (age >= 101 && age <= 103) {
    tasks.push({
      slot: input.taskSlots.clearMonBg, callback: "Task_ClearMonBg", role: "clear-monbg",
      data: [0, age === 101 ? 1 : 2, input.targetSide === "opponent" ? 1 : 0, 0, 0, 0],
    });
  }
  return tasks;
}

function painterOrder(input: AirCutterLiveInputs, sprites: readonly AirCutterSprite[]): number[] {
  // A newly-created wave is appended for its creation row. On the following
  // row the engine's subpriority pass places lower subpriorities first. Keep
  // the live order as the tie breaker so allocator reuse remains caller-owned.
  return [...sprites].sort((left, right) => {
    const rightNewborn = right.kind === "air-wave" && right.callback === "AnimAirWaveProjectile" && right.data[0] === 11;
    const leftNewborn = left.kind === "air-wave" && left.callback === "AnimAirWaveProjectile" && left.data[0] === 11;
    if (leftNewborn !== rightNewborn) return leftNewborn ? 1 : -1;
    if (left.subpriority !== right.subpriority) return left.subpriority - right.subpriority;
    return input.spriteOrder.indexOf(left.slot) - input.spriteOrder.indexOf(right.slot);
  }).map((sprite) => sprite.slot);
}

/** Pure source-relative reducer through Air Cutter's first inactive cleanup row. */
export function airCutterAtAge(age: number, input: Readonly<AirCutterLiveInputs>): AirCutterState {
  const source = sourceAtAge(age);
  const waves = AIR_CUTTER_WAVE_START_AGES.flatMap((spawnAge, index) => {
    const wave = waveAtAge(age, spawnAge, index, input);
    return wave ? [wave] : [];
  });
  const slice = sliceAtAge(age, input);
  const sprites = slice ? [...waves, slice] : waves;
  const tasks = taskState(age, input, waves);
  const targetOffset = shakeOffset(age);
  const partnerOffset = input.targetPartner?.visible ? shakeOffset(age) : { x: 0, y: 0 };
  // The engine's visual-task counter owns each projectile/slice group as one
  // lifetime, even while that group has multiple sprites, plus each live
  // ShakeMon2 task.
  const visualTasks = (sprites.length > 0 ? 1 : 0)
    + tasks.filter((task) => task.role.endsWith("shake")).length;
  const events = [
    ...AIR_CUTTER_WAVE_START_AGES.filter((eventAge) => eventAge === age).map((eventAge) => ({
      age: eventAge, sound: "SE_M_BLIZZARD2" as const, pan: input.attackerSide === "player" ? -63 : 63,
    })),
    ...(age === 75 ? [{ age, sound: "SE_M_CUT" as const, pan: input.targetSide === "player" ? -64 : 63 }] : []),
  ];
  return {
    age,
    active: source.active,
    source,
    battlers: {
      attacker: { ...input.attackerSprite, species: input.attackerSpecies, center: point(input.attackerCenter) },
      target: { ...input.targetSprite, species: input.targetSpecies, center: point(input.targetCenter), offset: targetOffset },
      targetPartner: { visible: input.targetPartner?.visible ?? false, offset: partnerOffset },
    },
    sprites,
    tasks,
    resources: {
      airWave: resourceAtAge(input.resources.airWave, airCutterAsset.resources.airWave.tag, age, 1),
      cut: resourceAtAge(input.resources.cut, airCutterAsset.resources.cut.tag, age, 4),
      impact: resourceAtAge(input.resources.impact, airCutterAsset.resources.impact.tag, age, 7),
      allocator: { matrixBitmap: input.matrixBitmap, matrixSlots: [input.attackerSprite.matrixNum, input.targetSprite.matrixNum, input.targetPartner?.sprite.matrixNum ?? 0] },
    },
    background: { monbg: age >= 12 && age <= 103, layer: input.monbg.layer, scroll: { x: input.monbg.bgX, y: input.monbg.bgY } },
    registers: age >= 15 && age <= 100 ? { bldcnt: 16192, bldalpha: 2060 } : { bldcnt: 0, bldalpha: 0 },
    painterOrder: painterOrder(input, sprites),
    audio: events,
    cleanup: {
      firstInactive: age === AIR_CUTTER_FIRST_INACTIVE_AGE,
      visualTasks: source.active ? visualTasks : 0,
      ownedSprites: source.active ? sprites.length : 0,
      resourcesReleased: age >= AIR_CUTTER_FIRST_INACTIVE_AGE,
    },
  };
}
