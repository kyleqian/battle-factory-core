export type SunnyDaySide = "player" | "opponent";

export interface SunnyDayLiveInputs {
  readonly attackerSide: SunnyDaySide;
  readonly targetSide: SunnyDaySide;
  readonly attackerSpecies: string;
  readonly targetSpecies: string;
  readonly attackerGeometry: Readonly<{ centerX: number; centerY: number; cornerX: number; cornerY: number }>;
  readonly targetGeometry: Readonly<{ centerX: number; centerY: number; cornerX: number; cornerY: number }>;
  /** Four live OBJ slots returned by the sprite allocator, in constructor order. */
  readonly raySlots: readonly number[];
  /** Live `sSpriteOrder`; used to retain painter order without fixture identity. */
  readonly spriteOrder: readonly number[];
  /** Live palette-bank selection consumed later by the generic compositor. */
  readonly paletteBanks: Readonly<{ background: readonly number[]; attackerPartner: number }>;
}

export interface SunnyDayRay {
  readonly allocationSlot: number;
  readonly constructorIndex: number;
  readonly localAge: number;
  readonly x: 0;
  readonly y: 0;
  readonly x2: number;
  readonly y2: number;
  readonly remaining: number;
  readonly scale: number;
  readonly rotation: number;
  readonly matrix: readonly [number, number, number, number];
  readonly callback: "AnimTranslateLinear_WithFollowup" | "DestroyAnimSprite";
}

export interface SunnyDayPaletteRamp {
  readonly active: boolean;
  readonly direction: "up" | "down" | null;
  readonly coefficient: number;
  readonly delayCounter: 0 | 1;
  readonly color: 32767;
  readonly backgroundBanks: readonly number[];
  readonly attackerPartnerBank: number;
}

export interface SunnyDaySourceState {
  readonly owner: "Move_SUNNY_DAY";
  readonly offset: number;
  readonly pointer: number;
  readonly pointerParity: 0 | 1;
  readonly wait: number;
  readonly active: boolean;
}

export interface SunnyDayFrame {
  readonly age: number;
  readonly active: boolean;
  readonly source: SunnyDaySourceState;
  readonly resourceLoaded: boolean;
  readonly rays: readonly SunnyDayRay[];
  readonly painterSlots: readonly number[];
  readonly palette: SunnyDayPaletteRamp;
  readonly monbg: Readonly<{ update: boolean; clear: boolean }>;
  readonly blend: Readonly<{ enabled: boolean; eva: 13; evb: 3 }>;
  readonly audio: Readonly<{ active: boolean; song: "SE_M_PETAL_DANCE"; startPan: number; targetPan: number; currentPan: number }>;
  readonly live: Readonly<Pick<SunnyDayLiveInputs, "attackerSide" | "targetSide" | "attackerSpecies" | "targetSpecies" | "attackerGeometry" | "targetGeometry">>;
  readonly visualTaskCount: number;
  readonly soundTaskCount: number;
  readonly firstInactiveCleanup: boolean;
}

const SOURCE_BASE = 0x082d_2707;
const RAY_START_AGES = [20, 28, 36, 44] as const;

function assertInputs(inputs: Readonly<SunnyDayLiveInputs>): void {
  const geometry = [inputs.attackerGeometry, inputs.targetGeometry];
  if (inputs.attackerSide === inputs.targetSide || !inputs.attackerSpecies || !inputs.targetSpecies
    || geometry.some((entry) => Object.values(entry).some((value) => !Number.isInteger(value)))) {
    throw new Error("invalid live Sunny Day battler inputs");
  }
  if (inputs.raySlots.length !== 4 || new Set(inputs.raySlots).size !== 4
    || inputs.raySlots.some((slot) => !Number.isInteger(slot) || slot < 0 || slot >= 64)
    || inputs.spriteOrder.length !== 64 || new Set(inputs.spriteOrder).size !== 64
    || inputs.spriteOrder.some((slot) => !Number.isInteger(slot) || slot < 0 || slot >= 64)
    || inputs.raySlots.some((slot) => !inputs.spriteOrder.includes(slot))) {
    throw new Error("invalid live Sunny Day allocation/order inputs");
  }
  const banks = [...inputs.paletteBanks.background, inputs.paletteBanks.attackerPartner];
  if (inputs.paletteBanks.background.length === 0
    || banks.some((bank) => !Number.isInteger(bank) || bank < 0 || bank >= 32)) {
    throw new Error("invalid live Sunny Day palette-bank inputs");
  }
}

function sourceAtAge(age: number): SunnyDaySourceState {
  let offset = 75, wait = 1;
  if (age === 0) { offset = 0; wait = 0; }
  else if (age <= 3) { offset = 3; wait = age === 1 ? 1 : 0; }
  else if (age <= 6) { offset = 5; wait = age === 4 ? 1 : 0; }
  else if (age <= 19) { offset = 25; wait = 1; }
  else if (age <= 51) {
    offset = 85;
    const local = (age - 20) % 8;
    wait = local <= 6 ? 6 - local : 0;
  } else if (age <= 105) offset = 53;
  else if (age <= 118) offset = 71;
  return {
    owner: "Move_SUNNY_DAY",
    offset,
    pointer: SOURCE_BASE + offset,
    pointerParity: ((SOURCE_BASE + offset) & 1) as 0 | 1,
    wait,
    active: age < 157,
  };
}

function signed16(value: number): number {
  const wrapped = value & 0xffff;
  return wrapped >= 0x8000 ? wrapped - 0x10000 : wrapped;
}

function rayAtAge(age: number, startAge: number, allocationSlot: number, constructorIndex: number): SunnyDayRay | null {
  const localAge = age - startAge;
  if (localAge < 0 || localAge > 60) return null;
  // The constructor immediately invokes the translation callback. Thereafter
  // the captured terminal callback exposes the last (60th) accumulator write.
  const translationStep = Math.min(60, localAge + 1);
  const xAccumulator = signed16(596 * translationStep);
  const yAccumulator = signed16(340 * translationStep);
  const scale = 0x50 + 2 * (localAge + 1);
  const rotation = (10 * (localAge + 1)) & 0xff;
  // sprite.c first applies ConvertScaleParam, then BIOS ObjAffineSet uses
  // its higher-precision unit-circle table (not the public 8-bit sine table).
  const inverseScale = Math.trunc(0x10000 / scale);
  const radians = rotation * Math.PI * 2 / 256;
  const a = Math.trunc(Math.cos(radians) * inverseScale);
  const b = Math.trunc(Math.sin(radians) * inverseScale);
  return {
    allocationSlot, constructorIndex, localAge, x: 0, y: 0,
    x2: (xAccumulator >> 8) & 0xff, y2: (yAccumulator >> 8) & 0xff,
    remaining: Math.max(0, 59 - localAge), scale, rotation,
    matrix: [a, -b, b, a],
    callback: localAge === 60 ? "DestroyAnimSprite" : "AnimTranslateLinear_WithFollowup",
  };
}

function paletteAtAge(age: number, inputs: Readonly<SunnyDayLiveInputs>): SunnyDayPaletteRamp {
  const up = age >= 7 && age <= 18;
  const down = age >= 106 && age <= 117;
  return {
    active: up || down,
    direction: up ? "up" : down ? "down" : null,
    coefficient: up ? Math.floor((age - 7) / 2) + 1 : down ? 5 - Math.floor((age - 106) / 2) : age < 7 ? 0 : age < 106 ? 6 : 0,
    delayCounter: (up || down ? (age - (up ? 7 : 106)) & 1 : 0) as 0 | 1,
    color: 32767,
    backgroundBanks: inputs.paletteBanks.background,
    attackerPartnerBank: inputs.paletteBanks.attackerPartner,
  };
}

/** Pure source-age component port through the first inactive cleanup row. */
export function sunnyDayAtAge(age: number, inputs: Readonly<SunnyDayLiveInputs>): SunnyDayFrame {
  assertInputs(inputs);
  if (!Number.isInteger(age)) throw new Error("Sunny Day source age must be an integer");
  const rays = RAY_START_AGES.flatMap((startAge, index) => {
    const ray = rayAtAge(age, startAge, inputs.raySlots[index]!, index);
    return ray ? [ray] : [];
  });
  const painterSlots = [...rays]
    .sort((left, right) => inputs.spriteOrder.indexOf(right.allocationSlot) - inputs.spriteOrder.indexOf(left.allocationSlot))
    .map((ray) => ray.allocationSlot);
  const palette = paletteAtAge(age, inputs);
  const startPan = inputs.attackerSide === "player" ? -64 : 63;
  const targetPan = inputs.targetSide === "opponent" ? 63 : -64;
  const audioActive = age >= 20 && age <= 147;
  const currentPan = audioActive
    ? startPan + Math.sign(targetPan - startPan) * Math.min(Math.abs(targetPan - startPan), age - 19)
    : targetPan;
  return {
    age,
    active: age >= 0 && age < 157,
    source: sourceAtAge(age),
    resourceLoaded: age >= 1 && age <= 156,
    rays,
    painterSlots,
    palette,
    monbg: { update: age >= 4 && age <= 121, clear: age >= 119 && age <= 121 },
    blend: { enabled: age >= 7 && age <= 118, eva: 13, evb: 3 },
    audio: { active: audioActive, song: "SE_M_PETAL_DANCE", startPan, targetPan, currentPan },
    live: {
      attackerSide: inputs.attackerSide, targetSide: inputs.targetSide,
      attackerSpecies: inputs.attackerSpecies, targetSpecies: inputs.targetSpecies,
      attackerGeometry: inputs.attackerGeometry, targetGeometry: inputs.targetGeometry,
    },
    visualTaskCount: rays.length + (palette.active ? 1 : 0),
    soundTaskCount: audioActive ? 1 : 0,
    firstInactiveCleanup: age === 157,
  };
}
