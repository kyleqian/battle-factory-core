export interface BatonPassPokeballState {
  readonly x: number;
  readonly y: number;
  readonly y2: number;
  readonly phase: 1 | 2 | 3;
  readonly data1: number;
  readonly data2: number;
  readonly data3: number;
}

export interface BatonPassState {
  readonly active: boolean;
  readonly scriptOffset: 0 | 3 | 33;
  readonly pokeballLoaded: boolean;
  readonly pokeball: BatonPassPokeballState | null;
  readonly blendTaskActive: boolean;
  readonly bgPaletteY: number;
  readonly battlerPaletteY: number;
  readonly attackerMatrix: Readonly<{ a: number; b: 0; c: 0; d: number }>;
  readonly attackerInvisible: boolean;
  readonly visualTaskCount: number;
  readonly sound: "SE_M_BATON_PASS" | null;
}

const AFFINE: readonly (readonly [number, number, 1 | 2, number])[] = [
  [448, 278, 1, 2], [640, 300, 1, 4], [832, 322, 2, 6],
  [928, 370, 2, 7], [1024, 418, 2, 8],
];

/** Move-own delay=1 BG half, measured against all selected banks. */
function bgPaletteY(age: number): number {
  if (age < 6 || age >= 45) return 0;
  if (age < 21) return 2 + 2 * Math.floor((age - 6) / 3);
  if (age < 30) return 11;
  return 9 - 2 * Math.floor((age - 30) / 3);
}

/** Move-own alternating OBJ half; selected attacker row trails BG by one transfer. */
function battlerPaletteY(age: number): number {
  if (age < 7 || age >= 46) return 0;
  if (age < 22) return 2 + 2 * Math.floor((age - 7) / 3);
  if (age < 31) return 11;
  return 9 - 2 * Math.floor((age - 31) / 3);
}

/** Pure port of Move_BATON_PASS from first pointer-bounded display through cleanup. */
export function batonPassAtAge(
  age: number,
  attackerPictureCenter: Readonly<{ x: number; y: number }>,
): BatonPassState {
  const local = age - 4;
  const affine = local >= 0 && local < AFFINE.length ? AFFINE[local]! : null;
  const y2 = local >= 6 ? -6 * (local - 5) : 0;
  const pokeballAlive = local >= 0
    && (local <= 5 || attackerPictureCenter.y + y2 >= -32);
  const pokeball = pokeballAlive ? {
    x: attackerPictureCenter.x,
    y: attackerPictureCenter.y,
    y2,
    phase: (affine?.[2] ?? 3) as 1 | 2 | 3,
    data1: affine?.[0] ?? 1120,
    data2: affine?.[1] ?? 466,
    data3: affine?.[3] ?? 0,
  } : null;
  const blendTaskActive = age >= 4 && age <= 50;
  return {
    active: age >= 0 && age <= 51,
    scriptOffset: age === 0 ? 0 : age <= 3 ? 3 : 33,
    pokeballLoaded: age >= 1 && age <= 51,
    pokeball,
    blendTaskActive,
    bgPaletteY: bgPaletteY(age),
    battlerPaletteY: battlerPaletteY(age),
    attackerMatrix: affine
      ? { a: affine[0], b: 0, c: 0, d: affine[1] }
      : { a: 256, b: 0, c: 0, d: 256 },
    attackerInvisible: age >= 9,
    visualTaskCount: Number(pokeball !== null) + Number(blendTaskActive),
    sound: age === 1 ? "SE_M_BATON_PASS" : null,
  };
}
