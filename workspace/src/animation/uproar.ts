export type UproarSide = "player" | "opponent";

export interface UproarLiveInputs {
  readonly attackerSide: UproarSide;
  readonly targetSide: UproarSide;
  readonly attackerSpecies: string;
  readonly targetSpecies: string;
  readonly attackerCenter: Readonly<{ x: number; y: number }>;
  /** Species-picture y offset used by SetBattlerSpriteYOffsetFromYScale. */
  readonly attackerYDelta: number;
  readonly ringSlots: readonly number[];
  readonly noteSlots: readonly [number, number];
  readonly spriteOrder: readonly number[];
  readonly attackerMatrixSlot: number;
  readonly ringMatrixSlots: readonly number[];
}

export interface UproarSprite {
  readonly kind: "ring" | "note";
  readonly slot: number;
  readonly pulse: number;
  readonly localAge: number;
  readonly x: number;
  readonly y: number;
  readonly tileFrame: 0 | 1;
  readonly matrix: readonly [number, number, number, number];
  readonly subpriority: number;
}

export interface UproarFrame {
  readonly age: number;
  readonly active: boolean;
  readonly source: Readonly<{ owner: "Move_UPROAR"; offset: number; pointer: number; pointerParity: 0 | 1; wait: number }>;
  readonly sprites: readonly UproarSprite[];
  readonly painterSlots: readonly number[];
  readonly distortion: Readonly<{ active: boolean; matrix: readonly [number, number, number, number]; matrixSlot: number; yOffset: number }>;
  readonly monbg: Readonly<{ active: boolean; update: boolean; clear: boolean }>;
  readonly resources: Readonly<{ jaggedNote: boolean; thinRing: boolean }>;
  readonly audio: Readonly<{ pulse: boolean; song: "SE_M_UPROAR"; pan: number }>;
  readonly visualTaskCount: number;
  readonly soundTaskCount: 0;
  readonly firstInactiveCleanup: boolean;
}

const BASE = 0x082c_dafc;
const PULSES = [10, 28, 46] as const;
const NOTE_ARGS = [
  [[29, -12, 0], [-12, -29, 1]],
  [[12, -29, 1], [-29, -12, 0]],
  [[24, -24, 1], [-24, -24, 0]],
] as const;

function assertInputs(input: Readonly<UproarLiveInputs>): void {
  const slots = [...input.ringSlots, ...input.noteSlots];
  if (input.attackerSide === input.targetSide || !input.attackerSpecies || !input.targetSpecies
    || input.ringSlots.length !== 3 || input.ringMatrixSlots.length !== 3
    || slots.some((slot) => !Number.isInteger(slot) || slot < 0 || slot >= 64)
    || input.ringMatrixSlots.some((slot) => !Number.isInteger(slot) || slot < 0 || slot >= 32)
    || !Number.isInteger(input.attackerMatrixSlot) || input.attackerMatrixSlot < 0 || input.attackerMatrixSlot >= 32
    || input.spriteOrder.length !== 64 || new Set(input.spriteOrder).size !== 64
    || !Number.isInteger(input.attackerCenter.x) || !Number.isInteger(input.attackerCenter.y)
    || !Number.isInteger(input.attackerYDelta)) {
    throw new Error("invalid live Uproar inputs");
  }
}

function sourceAtAge(age: number): UproarFrame["source"] {
  let offset = 201, wait = 1;
  if (age === 0) { offset = 0; wait = 0; }
  else if (age <= 3) { offset = 3; wait = age === 1 ? 1 : 0; }
  else if (age <= 6) { offset = 6; wait = age === 4 ? 1 : 0; }
  else if (age <= 9) { offset = 8; wait = age === 7 ? 1 : 0; }
  else if (age <= 27) { offset = 72; wait = Math.max(0, 26 - age); }
  else if (age <= 45) { offset = 136; wait = Math.max(0, 44 - age); }
  else if (age <= 62) { offset = 198; wait = 1; }
  const pointer = BASE + offset;
  return { owner: "Move_UPROAR", offset, pointer, pointerParity: (pointer & 1) as 0 | 1, wait };
}

function distortionMatrix(localAge: number): readonly [number, number, number, number] {
  if (localAge < 0 || localAge > 11) return [256, 0, 0, 256];
  if (localAge < 4) return [256 - 12 * (localAge + 1), 0, 0, 256 + 8 * (localAge + 1)];
  if (localAge < 8) return [208 + 20 * (localAge - 3), 0, 0, 288 - 20 * (localAge - 3)];
  return [288 - 8 * (localAge - 7), 0, 0, 208 + 12 * (localAge - 7)];
}

function ringMatrix(localAge: number): readonly [number, number, number, number] {
  const scale = 48 + 32 * Math.min(14, Math.max(0, localAge));
  const inverse = Math.trunc(0x10000 / scale);
  return [inverse, 0, 0, inverse];
}

/** Pure source-relative reducer through Uproar's first inactive cleanup row. */
export function uproarAtAge(age: number, input: Readonly<UproarLiveInputs>): UproarFrame {
  assertInputs(input);
  if (!Number.isInteger(age)) throw new Error("Uproar source age must be an integer");
  const sprites: UproarSprite[] = [];
  for (let pulse = 0; pulse < PULSES.length; pulse += 1) {
    const localAge = age - PULSES[pulse]!;
    if (localAge < 0 || localAge > 15) continue;
    sprites.push({ kind: "ring", slot: input.ringSlots[pulse]!, pulse, localAge,
      x: input.attackerCenter.x, y: input.attackerCenter.y, tileFrame: 0,
      matrix: ringMatrix(localAge), subpriority: input.attackerSide === "player" ? 27 : 37 });
    for (let note = 0; note < 2; note += 1) {
      const [rawDx, dy, tileFrame] = NOTE_ARGS[pulse]![note]!;
      const dx = input.attackerSide === "opponent" ? -rawDx : rawDx;
      const steps = localAge + 1;
      sprites.push({ kind: "note", slot: input.noteSlots[note]!, pulse, localAge,
        x: input.attackerCenter.x + dx + ((dx * steps) >> 3),
        y: input.attackerCenter.y + dy + ((dy * steps) >> 3), tileFrame,
        matrix: [256, 0, 0, 256], subpriority: input.attackerSide === "player" ? 28 : 38 });
    }
  }
  const pulse = PULSES.findIndex((start) => age >= start && age <= start + 11);
  const matrix = pulse >= 0 ? distortionMatrix(age - PULSES[pulse]!) : [256, 0, 0, 256] as const;
  const pictureHeight = 64 - input.attackerYDelta * 2;
  const scaledHeight = Math.trunc((pictureHeight << 8) / matrix[3]);
  const yOffset = pulse >= 0 ? Math.trunc((pictureHeight - Math.min(scaledHeight, 128)) / 2) : 0;
  const painterSlots = [...sprites].sort((a, b) =>
    input.spriteOrder.indexOf(b.slot) - input.spriteOrder.indexOf(a.slot)).map((sprite) => sprite.slot);
  return {
    age, active: age >= 0 && age < 72, source: sourceAtAge(age), sprites, painterSlots,
    distortion: { active: pulse >= 0, matrix, matrixSlot: input.attackerMatrixSlot, yOffset },
    monbg: { active: age >= 7 && age <= 62, update: age >= 7 && age <= 65, clear: age >= 63 && age <= 65 },
    resources: { jaggedNote: age >= 1 && age <= 71, thinRing: age >= 4 && age <= 71 },
    audio: { pulse: PULSES.includes(age as 10 | 28 | 46), song: "SE_M_UPROAR", pan: input.attackerSide === "player" ? -64 : 63 },
    visualTaskCount: sprites.length + (pulse >= 0 ? 1 : 0), soundTaskCount: 0,
    firstInactiveCleanup: age === 72,
  };
}
