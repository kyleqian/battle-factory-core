/**
 * Pure, source-relative presentation reducer for `Move_LUSTER_PURGE`.
 *
 * Age zero is the first retained row at the move label.  The only variable
 * animation input is the twelve `Random2()` results consumed by the six
 * random hitsplats.  The reducer never reads or advances either game RNG.
 */

export type LusterPurgeSide = "player" | "opponent";

export interface LusterPurgeVisualRandom {
  readonly hitsplats: readonly [
    Readonly<{ x: number; y: number }>, Readonly<{ x: number; y: number }>,
    Readonly<{ x: number; y: number }>, Readonly<{ x: number; y: number }>,
    Readonly<{ x: number; y: number }>, Readonly<{ x: number; y: number }>,
  ];
}

export interface LusterPurgeConfig {
  readonly attackerSide: LusterPurgeSide;
  readonly attackerBattlerId: 0 | 1;
  readonly attackerSpriteSlot: number;
  readonly targetSpriteSlot: number;
  readonly targetInitialX2: number;
  readonly circleCenter: Readonly<{ x: number; y: number }>;
  readonly monbgCenter: Readonly<{ x: number; y: number }>;
  readonly targetCenter: Readonly<{ x: number; y: number }>;
  readonly monbgPosition: Readonly<{ x: number; y: number }>;
  readonly visualRandom: LusterPurgeVisualRandom;
}

export interface LusterPurgeTask {
  readonly slot: number;
  readonly name: "Task_FadeToBg" | "FadeScreenToWhite_Step"
    | "Task_UpdateMonBg" | "AnimTask_BlendSpriteColor_Step2"
    | "AnimTask_ShakeBattlers" | "Task_ClearMonBg";
  readonly data: readonly number[];
}

export interface LusterPurgeSprite {
  readonly kind: "circle" | "hitsplat";
  readonly slot: number;
  readonly callback: "AnimSpriteOnMonPos" | "RunStoredCallbackWhenAffineAnimEnds"
    | "DestroySpriteAndMatrix";
  readonly center: Readonly<{ x: number; y: number }>;
  readonly offset: Readonly<{ x2: number; y2: number }>;
  readonly matrixNum: number;
  readonly matrix: readonly [number, 0, 0, number];
  readonly animation: 0 | 2;
}

export interface LusterPurgeState {
  readonly age: number;
  readonly active: boolean;
  readonly scriptOffset: number | null;
  readonly phase: "load" | "fade-in" | "circle" | "hits" | "restore-palette"
    | "shake" | "background-restore" | "inactive";
  readonly visualTaskCount: number;
  readonly tasks: readonly LusterPurgeTask[];
  readonly sprites: readonly LusterPurgeSprite[];
  readonly resources: Readonly<{ circle: boolean; impact: boolean }>;
  readonly monbg: Readonly<{ active: boolean; bg: "BG1" | "BG2"; x: number; y: number }>;
  readonly gpu: Readonly<{ bldcnt: number; bldalpha: number; bldy: number }>;
  readonly palette: Readonly<{
    psychicCycleCounter: number | null;
    excludedBlend: number | null;
    circleBlend: number | null;
  }>;
  readonly targetX2: number;
  readonly audio: readonly Readonly<{ song: "SE_M_SOLAR_BEAM" | "SE_M_HYPER_BEAM"; pan: "attacker" | "target" }>[];
}

export const LUSTER_PURGE_HIT_START_AGES = [170, 175, 180, 185, 190, 195] as const;
export const LUSTER_PURGE_PLAYER_FRAME_COUNT = 333;
export const LUSTER_PURGE_OPPONENT_FRAME_COUNT = 333;

const zeroData = (): number[] => Array<number>(16).fill(0);

function scriptOffset(age: number, frameCount: number): number | null {
  if (age === frameCount - 1) return 278;
  if (age >= 291) return null; // executing the called UnsetPsychicBackground body
  const schedule = [
    [0, 0], [1, 4], [4, 6], [7, 8], [26, 16], [45, 20], [48, 44],
    [70, 78], [170, 120], [175, 144], [180, 168], [185, 192],
    [190, 216], [195, 238], [206, 270],
  ] as const;
  let result = 0;
  for (const [start, offset] of schedule) if (age >= start) result = offset;
  return result;
}

function fadeY(age: number, restoreLast: number): number {
  if (age >= 9 && age <= 24) return age - 8;
  if (age >= 25 && age <= 27) return 16;
  if (age >= 28 && age <= 43) return 43 - age;
  if (age >= 293 && age <= 295) return 1;
  if (age >= 296 && age <= 310) return age - 294;
  const restorePeakLast = restoreLast - 16;
  if (age >= 311 && age <= restorePeakLast) return 16;
  if (age > restorePeakLast && age <= restoreLast) return restoreLast - age;
  return 0;
}

function fadeTask(age: number, restoreLast: number): LusterPurgeTask | null {
  if (age >= 7 && age <= 43) {
    const data = zeroData();
    data[0] = 3;
    data[10] = age <= 24 ? 1 : age === 25 ? 2 : 3;
    return { slot: 0, name: "Task_FadeToBg", data };
  }
  if (age >= 291 && age <= restoreLast) {
    const data = zeroData();
    data[0] = -1;
    data[10] = age <= 310 ? 1 : age < restoreLast - 17 ? 2 : 3;
    return { slot: 3, name: "Task_FadeToBg", data };
  }
  return null;
}

function psychicTask(age: number): LusterPurgeTask | null {
  if (age < 26 || age > 311) return null;
  const data = zeroData();
  // ClearMonBg's two transfer rows suspend the persistent palette task.
  data[5] = age <= 292 ? (age - 25) & 3
    : age <= 294 ? 3 : (age - 27) & 3;
  return { slot: 1, name: "FadeScreenToWhite_Step", data };
}

function monbgTask(age: number, config: LusterPurgeConfig): LusterPurgeTask | null {
  if (age < 45 || age > 293) return null;
  const player = config.attackerSide === "player";
  const data = zeroData();
  data.splice(0, 7, config.attackerSpriteSlot, config.monbgCenter.x,
    config.monbgCenter.y, config.monbgPosition.x, config.monbgPosition.y,
    player ? 1 : 0, player ? 0 : 1);
  return { slot: 2, name: "Task_UpdateMonBg", data };
}

function blendData(age: number, start: number, descending: boolean, mask: readonly [number, number]): number[] {
  const elapsed = age - start;
  const data = zeroData();
  data.splice(0, 6, mask[0], mask[1], 2, descending ? 16 : 0,
    descending ? 0 : 16, -1);
  if (elapsed === 0) {
    data[9] = 2;
    data[10] = descending ? 16 : 0;
  } else {
    const step = Math.floor((elapsed + 2) / 3);
    data[9] = (elapsed - 1) % 3;
    data[10] = descending ? 16 - step : step;
  }
  return data;
}

function shakeAtAge(age: number, targetSlot: number, initialX2: number): Readonly<{ task: LusterPurgeTask | null; x2: number }> {
  if (age < 206) return { task: null, x2: initialX2 };
  if (age > 289) return { task: null, x2: 0 };
  let state = 0;
  let delay = 0;
  let timer = 0;
  let amplitude = 8;
  let x2 = initialX2;
  for (let row = 206; row <= age; row += 1) {
    if (state === 0 || state === 1) {
      delay += 1;
      if (delay > 1) {
        delay = 0;
        x2 = (timer & 1) === 0 ? Math.ceil(amplitude / 2) : -Math.floor(amplitude / 2);
        timer += 1;
        if (state === 0 && timer === 14) {
          timer = 0; amplitude -= 1; state = 1;
        } else if (state === 1 && timer === 4) {
          timer = 0; amplitude -= 1;
          if (amplitude === 0) state = 2;
        }
      }
    } else {
      x2 = 0;
    }
  }
  const data = zeroData();
  data[0] = state; data[1] = delay; data[2] = timer; data[3] = 14;
  data[9] = targetSlot; data[13] = 1; data[14] = amplitude; data[15] = 8;
  return { task: { slot: 3, name: "AnimTask_ShakeBattlers", data }, x2 };
}

function circleAtAge(age: number, config: LusterPurgeConfig): LusterPurgeSprite | null {
  if (age < 48 || age > 168) return null;
  const scale = 36 + Math.min(age - 48, 119) * 4;
  const reciprocal = Math.trunc(0x10000 / scale);
  return {
    kind: "circle", slot: 3, callback: "AnimSpriteOnMonPos",
    center: config.circleCenter, offset: { x2: 0, y2: 0 }, matrixNum: 0,
    matrix: [reciprocal, 0, 0, reciprocal], animation: 0,
  };
}

function hitsplatsAtAge(age: number, config: LusterPurgeConfig): LusterPurgeSprite[] {
  const result: LusterPurgeSprite[] = [];
  for (const [index, start] of LUSTER_PURGE_HIT_START_AGES.entries()) {
    if (age < start || age > start + 9) continue;
    const random = config.visualRandom.hitsplats[index]!;
    result.push({
      kind: "hitsplat", slot: 3 + (index % 3),
      callback: age === start + 9 ? "DestroySpriteAndMatrix" : "RunStoredCallbackWhenAffineAnimEnds",
      center: config.targetCenter,
      offset: { x2: (random.x % 48) - 24, y2: (random.y % 24) - 12 },
      matrixNum: index % 3 === 0 ? 0 : index % 3 === 1 ? 3 : 4,
      matrix: [372, 0, 0, 372], animation: 2,
    });
  }
  return result.sort((a, b) => a.slot - b.slot);
}

function visualCount(age: number): number {
  if (age >= 48 && age <= 69) return 1;
  if (age >= 70 && age <= 118) return 3;
  if (age >= 119 && age <= 168) return 1;
  if (age >= 170 && age <= 174) return 1;
  if (age >= 175 && age <= 199) return 2;
  if (age >= 200 && age <= 204) return 1;
  if (age >= 206 && age <= 254) return 2;
  if (age >= 255 && age <= 289) return 1;
  return 0;
}

export function lusterPurgeAtAge(age: number, config: LusterPurgeConfig): LusterPurgeState {
  const frameCount = config.attackerSide === "player"
    ? LUSTER_PURGE_PLAYER_FRAME_COUNT : LUSTER_PURGE_OPPONENT_FRAME_COUNT;
  const restoreLast = frameCount - 3;
  const tasks: LusterPurgeTask[] = [];
  const fade = fadeTask(age, restoreLast); if (fade) tasks.push(fade);
  if (age >= 291 && age <= 293) {
    const data = zeroData(); data[1] = age === 291 ? 1 : 2; data[2] = config.attackerBattlerId;
    tasks.push({ slot: 0, name: "Task_ClearMonBg", data });
  }
  const psychic = psychicTask(age); if (psychic) tasks.push(psychic);
  const monbg = monbgTask(age, config); if (monbg) tasks.push(monbg);
  if (age >= 70 && age <= 118) {
    tasks.push({ slot: 0, name: "AnimTask_BlendSpriteColor_Step2", data: blendData(age, 70, false, [14, 3]) });
    tasks.push({ slot: 3, name: "AnimTask_BlendSpriteColor_Step2", data: blendData(age, 70, false, [0, 128]) });
  }
  if (age >= 206 && age <= 254) {
    tasks.push({ slot: 0, name: "AnimTask_BlendSpriteColor_Step2", data: blendData(age, 206, true, [14, 3]) });
  }
  const shake = shakeAtAge(age, config.targetSpriteSlot, config.targetInitialX2); if (shake.task) tasks.push(shake.task);
  tasks.sort((a, b) => a.slot - b.slot);

  const sprites = [...(circleAtAge(age, config) ? [circleAtAge(age, config)!] : []), ...hitsplatsAtAge(age, config)];
  const offset = scriptOffset(age, frameCount);
  const active = age >= 0 && age < frameCount - 1;
  const bgActive = age >= 45 && age <= 293;
  const bldcnt = age >= 8 && age <= 43 ? 232
    : age >= 48 && age <= 290 ? 16192
      : age >= 292 && age <= restoreLast ? 232 : 0;
  const excludedBlend = age >= 70 && age <= 118
    ? blendData(age, 70, false, [14, 3])[10]!
    : age >= 206 && age <= 254 ? blendData(age, 206, true, [14, 3])[10]! : null;
  const audio: Array<{ song: "SE_M_SOLAR_BEAM" | "SE_M_HYPER_BEAM"; pan: "attacker" | "target" }> = [];
  if (age === 48) audio.push({ song: "SE_M_SOLAR_BEAM", pan: "attacker" });
  if ((LUSTER_PURGE_HIT_START_AGES as readonly number[]).includes(age)) audio.push({ song: "SE_M_HYPER_BEAM", pan: "target" });
  return {
    age, active, scriptOffset: offset,
    phase: !active ? "inactive" : age < 7 ? "load" : age < 48 ? "fade-in"
      : age < 170 ? "circle" : age < 206 ? "hits" : age < 255 ? "restore-palette"
        : age < 291 ? "shake" : "background-restore",
    visualTaskCount: visualCount(age), tasks, sprites,
    resources: { circle: age >= 1 && age < frameCount - 1, impact: age >= 4 && age < frameCount - 1 },
    monbg: { active: bgActive, bg: config.attackerSide === "player" ? "BG2" : "BG1", x: bgActive ? config.monbgPosition.x : 0, y: bgActive ? config.monbgPosition.y : 0 },
    gpu: { bldcnt, bldalpha: age >= 48 && age <= 290 ? 2060 : 0, bldy: fadeY(age, restoreLast) },
    palette: {
      psychicCycleCounter: age >= 26 && age <= 311
        ? age <= 292 ? (age - 25) & 3 : age <= 294 ? 3 : (age - 27) & 3
        : null,
      excludedBlend,
      circleBlend: age >= 70 && age <= 118 ? excludedBlend : null,
    },
    targetX2: shake.x2, audio,
  };
}
