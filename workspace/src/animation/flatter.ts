/**
 * Source-relative Scene-ON reducer for MOVE_FLATTER.
 *
 * Flatter owns only the animation program.  The scene supplies current
 * battler identity, geometry, allocator choices, transfer buffers, palette
 * state, register/audio snapshots, and presentation-only random words.  No
 * battle state or gameplay RNG is resolved or mutated here.
 */

export type FlatterSide = "player" | "opponent";
export type FlatterMatrix = readonly [number, number, number, number];
export type FlatterOam = readonly [number, number, number];

export interface FlatterPoint {
  readonly x: number;
  readonly y: number;
}

export interface FlatterBattlerArt {
  readonly slot: number;
  readonly attr: FlatterOam;
  readonly subpriority: number;
  readonly matrixNum: number;
  readonly matrix: FlatterMatrix;
}

/** A live slot selected by the Scene-ON sprite allocator. */
export interface FlatterSpotlightAllocation {
  readonly slot: number;
  readonly attr: FlatterOam;
  readonly subpriority: number;
  readonly matrixNum: number;
}

/** A live slot selected for one source `createsprite` confetti call. */
export interface FlatterConfettiAllocation {
  readonly slot: number;
  readonly start: number;
  readonly end: number;
  /** Source callback state at the first retained row for this allocation. */
  readonly initial: Readonly<{
    readonly x: number;
    readonly y: number;
    readonly x2: number;
    readonly y2: number;
    readonly data: readonly number[];
    readonly flags: number;
    readonly callback: "AnimFlatterConfetti" | "AnimFlatterConfetti_Step";
  }>;
  /** State after `AnimFlatterConfetti` has consumed its three Random2 words. */
  readonly initialized: Readonly<{
    readonly x: number;
    readonly y: number;
    readonly x2: number;
    readonly y2: number;
    readonly data: readonly number[];
    readonly flags: number;
    readonly callback: "AnimFlatterConfetti_Step";
  }>;
}

export interface FlatterTaskSlots {
  readonly hardwarePaletteFade: number;
}

export interface FlatterLiveInputs {
  readonly attackerSide: FlatterSide;
  readonly targetSide: FlatterSide;
  readonly attackerSpecies: string;
  readonly targetSpecies: string;
  readonly attackerCenter: Readonly<FlatterPoint>;
  readonly targetCenter: Readonly<FlatterPoint>;
  /** `GetBattlerSpriteCoord(target, BATTLER_COORD_Y)` for VerticalDip. */
  readonly targetSpriteOrigin: Readonly<FlatterPoint>;
  readonly attackerInitialOffset: Readonly<{ x2: number; y2: number }>;
  readonly targetInitialOffset: Readonly<{ x2: number; y2: number }>;
  readonly attackerArt: Readonly<FlatterBattlerArt>;
  readonly targetArt: Readonly<FlatterBattlerArt>;
  readonly spotlight: Readonly<FlatterSpotlightAllocation>;
  /** The two source VerticalDip allocations, in creation order. */
  readonly verticalDipSlots: readonly [number, number];
  /** All 38 source confetti allocations, in source creation order. */
  readonly confetti: readonly FlatterConfettiAllocation[];
  readonly taskSlots: Readonly<FlatterTaskSlots>;
  readonly spriteOrder: readonly number[];
  readonly buffers: Readonly<{
    readonly softwareOam: readonly unknown[];
    readonly hardwareOam: readonly unknown[];
    readonly softwareMatrices: readonly FlatterMatrix[];
    readonly hardwareMatrices: readonly FlatterMatrix[];
  }>;
  readonly palette: Readonly<{
    readonly unfaded: readonly number[];
    readonly faded: readonly number[];
    readonly hardware: readonly number[];
  }>;
  readonly registers: Readonly<Record<string, number>>;
  readonly resources: Readonly<{
    readonly spotlightTag: number;
    readonly confettiTag: number;
    readonly spotlightTileSlot: number | null;
    readonly spotlightPaletteSlot: number | null;
    readonly confettiTileSlot: number | null;
    readonly confettiPaletteSlot: number | null;
    readonly allocator: unknown;
  }>;
  readonly audio: Readonly<{
    readonly current: unknown;
    readonly attackerPan: number;
    readonly targetPan: number;
  }>;
  readonly liveCounts: Readonly<{
    readonly visualTasks: number;
    readonly soundTasks: number;
    readonly matrixBitmap: number;
  }>;
  /** Presentation RNG is observed, never advanced by this reducer. */
  readonly animationRng: number;
  readonly gameplayRng: unknown;
  readonly gameplayState: unknown;
}

export interface FlatterSourceCursor {
  readonly owner: "Move_FLATTER";
  readonly pointer: number;
  readonly pointerOffset: number;
  readonly active: boolean;
  readonly wait: number;
}

export interface FlatterSpotlight {
  readonly slot: number;
  readonly template: "gFlatterSpotlightSpriteTemplate";
  readonly callback: "AnimFlatterSpotlight_Step";
  readonly x: number;
  readonly y: number;
  readonly x2: 0;
  readonly y2: 0;
  readonly flags: 1 | 5;
  readonly matrixNum: number;
  readonly matrix: FlatterMatrix;
  readonly data: readonly number[];
  readonly phase: 0 | 1 | 2 | 3;
  readonly localAge: number;
  readonly displayedAge: number;
}

export interface FlatterVerticalDip {
  readonly slot: number;
  readonly template: "gVerticalDipSpriteTemplate";
  readonly callback:
    | "TranslateSpriteLinearById"
    | "ReverseVerticalDipDirection"
    | "DestroyAnimSprite";
  readonly start: number;
  readonly end: number;
  readonly localAge: number;
  readonly x: number;
  readonly y: number;
  readonly x2: 0;
  readonly y2: 0;
  readonly data: readonly number[];
}

export interface FlatterConfetti {
  readonly slot: number;
  readonly template: "gFlatterConfettiSpriteTemplate";
  readonly callback: "AnimFlatterConfetti" | "AnimFlatterConfetti_Step";
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly flags: number;
  readonly data: readonly number[];
  readonly localAge: number;
}

export interface FlatterTask {
  readonly slot: number;
  readonly callback: "AnimTask_HardwarePaletteFade_Step";
  readonly role: "fade-to-dark" | "restore-battle";
  readonly start: number;
  readonly end: number;
  readonly args: readonly [number, number, number, number, number];
  readonly data: readonly number[];
}

export interface FlatterAudioEvent {
  readonly channel: "SE1" | "SE2";
  readonly sound: "SE_M_ENCORE2" | "SE_M_FLATTER";
  readonly pan: number;
}

export interface FlatterState {
  readonly age: number;
  readonly active: boolean;
  readonly source: FlatterSourceCursor;
  readonly animArgs: readonly [number, number, number, number, number, number, number, number];
  readonly battlers: Readonly<{
    readonly attacker: Readonly<{
      readonly side: FlatterSide;
      readonly species: string;
      readonly center: FlatterPoint;
      readonly offset: Readonly<{ x2: number; y2: number }>;
      readonly art: FlatterBattlerArt;
    }>;
    readonly target: Readonly<{
      readonly side: FlatterSide;
      readonly species: string;
      readonly center: FlatterPoint;
      readonly offset: Readonly<{ x2: number; y2: number }>;
      readonly art: FlatterBattlerArt;
    }>;
  }>;
  readonly spotlight: FlatterSpotlight | null;
  readonly verticalDips: readonly FlatterVerticalDip[];
  readonly confetti: readonly FlatterConfetti[];
  readonly tasks: readonly FlatterTask[];
  readonly lifecycle: Readonly<{
    readonly spotlight: Readonly<{ start: 49; end: 174 }>;
    readonly verticalDipStarts: readonly [51, 63];
    readonly confettiStarts: Readonly<Record<number, number>>;
    readonly confettiEnd: 97;
    readonly firstInactive: 218;
  }>;
  readonly registers: Readonly<Record<string, number>>;
  readonly audio: Readonly<{
    readonly live: unknown;
    readonly events: readonly FlatterAudioEvent[];
  }>;
  readonly resources: Readonly<{
    readonly spotlightLoaded: boolean;
    readonly confettiLoaded: boolean;
    readonly spotlightTag: number | null;
    readonly confettiTag: number | null;
    readonly spotlightTileSlot: number | null;
    readonly spotlightPaletteSlot: number | null;
    readonly confettiTileSlot: number | null;
    readonly confettiPaletteSlot: number | null;
    readonly matrixBitmap: number;
    readonly allocator: unknown;
  }>;
  readonly painterOrder: readonly number[];
  readonly buffers: FlatterLiveInputs["buffers"];
  readonly palette: FlatterLiveInputs["palette"];
  readonly rng: Readonly<{
    readonly animation: number;
    readonly gameplay: unknown;
    readonly gameplayUnchanged: true;
  }>;
  readonly gameplay: unknown;
  readonly displayTransfer: Readonly<{
    readonly oam: "initial" | "preceding-software";
    readonly matrices: "initial" | "preceding-software" | "two-frame-spotlight-edge";
    readonly palette: "initial" | "preceding-faded";
    readonly registers: "current-source";
  }>;
  readonly cleanup: Readonly<{
    readonly firstInactive: boolean;
    readonly visualTasks: number;
    readonly soundTasks: number;
    readonly ownedTasks: number;
    readonly ownedSprites: number;
    readonly resourcesReleased: boolean;
  }>;
}

export const FLATTER_SOURCE_START = 0x082d_4eb2;
export const FLATTER_SOURCE_END_EXCLUSIVE = 0x082d_4fae;
export const FLATTER_FIRST_INACTIVE_AGE = 218;
export const FLATTER_SPOTLIGHT_TAG = 10227;
export const FLATTER_CONFETTI_TAG = 10240;

const ZERO_ARGS = [0, 0, 0, 0, 0, 0, 0, 0] as const;
const FADE_DATA = Array.from({ length: 16 }, () => 0) as readonly number[];
const SPOTLIGHT_SHRINK = [4096, 2048, 1365, 1024, 819, 682, 585, 512, 455, 409, 372, 341, 315, 292, 273, 256] as const;
const SPOTLIGHT_GROW = [215, 227, 240, 256, 273, 292, 315, 341, 372, 409, 455, 512, 585, 682, 819, 1024, 1365, 2048, 4096] as const;

function assertSlot(slot: number, label: string, maximum: number): void {
  if (!Number.isInteger(slot) || slot < 0 || slot >= maximum) {
    throw new Error(`invalid Flatter ${label}`);
  }
}

function assertInputs(input: Readonly<FlatterLiveInputs>): void {
  if (input.attackerSide === input.targetSide
    || !input.attackerSpecies || !input.targetSpecies) {
    throw new Error("Flatter requires opposing named battlers");
  }
  assertSlot(input.attackerArt.slot, "attacker sprite slot", 64);
  assertSlot(input.targetArt.slot, "target sprite slot", 64);
  assertSlot(input.spotlight.slot, "spotlight sprite slot", 64);
  assertSlot(input.taskSlots.hardwarePaletteFade, "palette task slot", 16);
  input.verticalDipSlots.forEach((slot, index) => assertSlot(slot, `VerticalDip ${index}`, 64));
  if (input.confetti.length !== 38) throw new Error("Flatter requires all 38 confetti allocations");
  input.confetti.forEach((entry, index) => {
    assertSlot(entry.slot, `confetti ${index} slot`, 64);
    if (!Number.isInteger(entry.start) || !Number.isInteger(entry.end) || entry.end < entry.start) {
      throw new Error(`invalid Flatter confetti ${index} lifetime`);
    }
    if (entry.initial.data.length < 4) throw new Error(`Flatter confetti ${index} data is incomplete`);
  });
}

function sourceOffset(age: number, side: FlatterSide): number {
  if (age >= FLATTER_FIRST_INACTIVE_AGE) return 232;
  if (age >= 176) return 224;
  if (age >= 75) return 206;
  if (age >= 67) return 195;
  if (age >= 65) return side === "player" ? 242 : 251;
  if (age >= 63) return 87;
  if (age >= 51) return 72;
  if (age >= 49) return 57;
  if (age >= 7) return 41;
  if (age >= 4) return 6;
  if (age >= 1) return 3;
  return 0;
}

function sourceWait(age: number): number {
  if (age === 49) return -1;
  if (age === 63) return -1;
  if (age === 1 || age === 4 || age === 7) return 1;
  if (age === 2 || age === 5) return 0;
  if (age >= 7 && age <= 48) return 1;
  if (age >= 51 && age <= 61) return 61 - age;
  if (age === 67 || age === 68) return 5;
  if (age >= 69 && age <= 73) return 5 - (age - 68);
  if (age >= 75 && age < FLATTER_FIRST_INACTIVE_AGE) return 1;
  return 0;
}

function sourceArgs(age: number, side: FlatterSide): FlatterState["animArgs"] {
  if (age >= 176) return [248, 3, 10, 0, 1, 0, 0, 0];
  if (age >= 75) return [229, 63, 1, 10, 0, 0, 0, 0];
  if (age >= 67) return [1, -64, 1, 10, 0, 0, 0, 0];
  if (age >= 65) return [side === "player" ? 0 : 1, -64, 1, 10, 0, 0, 0, 0];
  if (age >= 51) return [5, 2, 1, 10, 0, 0, 0, 0];
  if (age >= 49) return [0, -8, 80, 10, 0, 0, 0, 0];
  if (age >= 7) return [248, 3, 0, 10, 0, 0, 0, 0];
  return ZERO_ARGS;
}

function spotlightMatrix(age: number): number {
  if (age < 49) return 256;
  if (age < 65) return SPOTLIGHT_SHRINK[age - 49]!;
  if (age < 67) return 256;
  if (age < 69) return 240;
  if (age < 72) return [227, 215, 204][age - 69]!;
  if (age <= 153) return 204;
  if (age <= 172) return SPOTLIGHT_GROW[age - 154]!;
  return 4096;
}

function spotlightPhase(age: number): 0 | 1 | 2 | 3 {
  if (age < 73) return 0;
  if (age < 153) return 1;
  if (age < 174) return 2;
  return 3;
}

function spotlightData(age: number): readonly number[] {
  const phase = spotlightPhase(age);
  const duration = phase === 0 ? 80 : phase === 1 ? 153 - age : 0;
  return [duration, phase, 0, 0, 0, 0, 0, 0];
}

function spotlightAtAge(age: number, input: Readonly<FlatterLiveInputs>): FlatterSpotlight | null {
  if (age < 49 || age > 174) return null;
  return {
    slot: input.spotlight.slot,
    template: "gFlatterSpotlightSpriteTemplate",
    callback: "AnimFlatterSpotlight_Step",
    x: input.targetCenter.x,
    y: input.targetCenter.y - 8,
    x2: 0,
    y2: 0,
    flags: age === 174 ? 5 : 1,
    matrixNum: input.spotlight.matrixNum,
    matrix: [spotlightMatrix(age), 0, 0, 170],
    data: spotlightData(age),
    phase: spotlightPhase(age),
    localAge: age - 49,
    displayedAge: age + 1,
  };
}

function verticalDipY2(age: number): number {
  if (age >= 51 && age <= 63) {
    const values = [2, 4, 6, 8, 10, 10, 10, 8, 6, 4, 2, 0, 2] as const;
    return values[age - 51]!;
  }
  if (age >= 63 && age <= 78) {
    const values = [2, 4, 4, 4, 6, 6, 8, 10, 10, 10, 8, 6, 4, 2, 0, 0] as const;
    return values[age - 63]!;
  }
  return 0;
}

function verticalDipAtAge(
  age: number,
  input: Readonly<FlatterLiveInputs>,
): FlatterVerticalDip[] {
  const lives = [{ start: 51, end: 63 }, { start: 63, end: 78 }] as const;
  return lives.flatMap(({ start, end }, index) => {
    if (age < start || age > end) return [];
    const localAge = age - start;
    // The second proxy pauses while the script creates the confetti batch.
    const effectiveAge = index === 0
      ? localAge
      : [0, 1, 1, 1, 2, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12][localAge]!;
    const callback = effectiveAge === 12
      ? "DestroyAnimSprite" as const
      : effectiveAge === 5
        ? "ReverseVerticalDipDirection" as const
        : "TranslateSpriteLinearById" as const;
    const returning = effectiveAge >= 6;
    const remaining = effectiveAge <= 5
      ? Math.max(0, 4 - effectiveAge)
      : Math.max(0, 11 - effectiveAge);
    const delta = returning ? -2 : 2;
    return [{
      slot: input.verticalDipSlots[index]!,
      template: "gVerticalDipSpriteTemplate",
      callback,
      start,
      end,
      localAge,
      x: input.targetSpriteOrigin.x,
      y: input.targetSpriteOrigin.y,
      x2: 0,
      y2: 0,
      data: [remaining, 0, delta, input.targetArt.slot, 5, 0,
        returning ? 15357 : 22853,
        returning ? 2058 : 2061],
    }];
  });
}

function confettiAtAge(
  age: number,
  input: Readonly<FlatterLiveInputs>,
): FlatterConfetti[] {
  return input.confetti.flatMap((allocation) => {
    if (age < allocation.start || age > allocation.end) return [];
    const localAge = age - allocation.start;
    if (localAge === 0 && allocation.initial.callback === "AnimFlatterConfetti") {
      return [{
        slot: allocation.slot,
        template: "gFlatterConfettiSpriteTemplate" as const,
        ...allocation.initial,
        localAge,
      }];
    }
    const initialized = allocation.initialized;
    // All 38 callbacks begin stepping together after the script finishes the
    // three-row create batch; their creation row alone is not their tick age.
    const steps = age < 67 ? 0 : Math.min(30, Math.max(1, age - 67));
    const vx = initialized.data[0] ?? 0;
    const vy = initialized.data[1] ?? 0;
    let x2 = initialized.x2;
    let y2 = initialized.y2;
    for (let tick = 0; tick < steps; tick += 1) {
      const dx = Math.max(0, vx - 22 * tick) >> 8;
      const dy = (vy - 48 * tick) >> 8;
      if ((initialized.data[2] ?? 0) === 0) x2 += dx;
      else x2 -= dx;
      y2 -= dy;
    }
    const data0 = Math.max(0, vx - 22 * steps);
    const data1 = vy - 48 * steps;
    return [{
      slot: allocation.slot,
      template: "gFlatterConfettiSpriteTemplate",
      callback: "AnimFlatterConfetti_Step",
      x: initialized.x,
      y: initialized.y,
      x2,
      y2,
      flags: initialized.flags,
      data: [data0, data1, initialized.data[2] ?? 0, Math.min(30, (initialized.data[3] ?? 0) + steps), ...(initialized.data.slice(4))],
      localAge,
    }];
  });
}

function fadeTaskAtAge(age: number, input: Readonly<FlatterLiveInputs>): FlatterTask[] {
  if (age >= 7 && age <= 47) return [{
    slot: input.taskSlots.hardwarePaletteFade,
    callback: "AnimTask_HardwarePaletteFade_Step",
    role: "fade-to-dark",
    start: 7,
    end: 47,
    args: [248, 3, 0, 10, 0],
    data: FADE_DATA,
  }];
  if (age >= 176 && age <= 216) return [{
    slot: input.taskSlots.hardwarePaletteFade,
    callback: "AnimTask_HardwarePaletteFade_Step",
    role: "restore-battle",
    start: 176,
    end: 216,
    args: [248, 3, 10, 0, 1],
    data: FADE_DATA,
  }];
  return [];
}

function audioAtAge(age: number, input: Readonly<FlatterLiveInputs>): FlatterAudioEvent[] {
  if (age >= FLATTER_FIRST_INACTIVE_AGE) return [];
  const events: FlatterAudioEvent[] = [];
  if (age === 7) events.push({ channel: "SE2", sound: "SE_M_ENCORE2", pan: input.audio.targetPan });
  if (age === 65) events.push({ channel: "SE1", sound: "SE_M_FLATTER", pan: input.audio.attackerPan });
  if (age === 75) events.push({ channel: "SE1", sound: "SE_M_FLATTER", pan: input.audio.targetPan });
  return events;
}

function confettiStarts(input: Readonly<FlatterLiveInputs>): Readonly<Record<number, number>> {
  return input.confetti.reduce<Record<number, number>>((counts, entry) => {
    counts[entry.start] = (counts[entry.start] ?? 0) + 1;
    return counts;
  }, {});
}

export function flatterAtAge(age: number, input: Readonly<FlatterLiveInputs>): FlatterState {
  if (!Number.isInteger(age) || age < 0) throw new Error("Flatter age must be a non-negative integer");
  assertInputs(input);
  const active = age < FLATTER_FIRST_INACTIVE_AGE;
  const spotlight = active ? spotlightAtAge(age, input) : null;
  const verticalDips = active ? verticalDipAtAge(age, input) : [];
  const confetti = active ? confettiAtAge(age, input) : [];
  const tasks = active ? fadeTaskAtAge(age, input) : [];
  const firstInactive = age === FLATTER_FIRST_INACTIVE_AGE;
  const resourcesLoaded = active && age >= 1;
  const targetY2 = active ? verticalDipY2(age) : 0;
  const source: FlatterSourceCursor = {
    owner: "Move_FLATTER",
    pointerOffset: sourceOffset(age, input.attackerSide),
    pointer: FLATTER_SOURCE_START + sourceOffset(age, input.attackerSide),
    active,
    wait: sourceWait(age),
  };
  return {
    age,
    active,
    source,
    animArgs: sourceArgs(age, input.attackerSide),
    battlers: {
      attacker: {
        side: input.attackerSide,
        species: input.attackerSpecies,
        center: { ...input.attackerCenter },
        offset: { ...input.attackerInitialOffset },
        art: input.attackerArt,
      },
      target: {
        side: input.targetSide,
        species: input.targetSpecies,
        center: { ...input.targetCenter },
        offset: { x2: input.targetInitialOffset.x2, y2: targetY2 },
        art: input.targetArt,
      },
    },
    spotlight,
    verticalDips,
    confetti,
    tasks,
    lifecycle: {
      spotlight: { start: 49, end: 174 },
      verticalDipStarts: [51, 63],
      confettiStarts: confettiStarts(input),
      confettiEnd: 97,
      firstInactive: FLATTER_FIRST_INACTIVE_AGE,
    },
    registers: input.registers,
    audio: { live: input.audio.current, events: audioAtAge(age, input) },
    resources: {
      spotlightLoaded: resourcesLoaded,
      confettiLoaded: resourcesLoaded && age >= 4,
      spotlightTag: resourcesLoaded ? input.resources.spotlightTag : null,
      confettiTag: resourcesLoaded && age >= 4 ? input.resources.confettiTag : null,
      spotlightTileSlot: resourcesLoaded ? input.resources.spotlightTileSlot : null,
      spotlightPaletteSlot: resourcesLoaded ? input.resources.spotlightPaletteSlot : null,
      confettiTileSlot: resourcesLoaded && age >= 4 ? input.resources.confettiTileSlot : null,
      confettiPaletteSlot: resourcesLoaded && age >= 4 ? input.resources.confettiPaletteSlot : null,
      matrixBitmap: input.liveCounts.matrixBitmap,
      allocator: input.resources.allocator,
    },
    painterOrder: input.spriteOrder,
    buffers: input.buffers,
    palette: input.palette,
    rng: { animation: input.animationRng, gameplay: input.gameplayRng, gameplayUnchanged: true },
    gameplay: input.gameplayState,
    displayTransfer: {
      oam: age === 0 ? "initial" : "preceding-software",
      matrices: age === 0 ? "initial" : age === 68 ? "two-frame-spotlight-edge" : "preceding-software",
      palette: age === 0 ? "initial" : "preceding-faded",
      registers: "current-source",
    },
    cleanup: {
      firstInactive,
      visualTasks: firstInactive ? 0 : input.liveCounts.visualTasks,
      soundTasks: firstInactive ? 0 : input.liveCounts.soundTasks,
      ownedTasks: tasks.length,
      ownedSprites: (spotlight ? 1 : 0) + verticalDips.length + confetti.length,
      resourcesReleased: firstInactive,
    },
  };
}
