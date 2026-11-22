import {
  earthquakePaletteAtAge,
  horizontalShakeAtAge,
  type ComplexPaletteBlendState,
  type HorizontalShakeState,
} from "./earthquake.ts";

export type MagnitudeBranch = "regular" | "intense";
export type MagnitudeSide = "player" | "opponent";

export interface MagnitudeLiveInputs {
  /** Live `gAnimMovePower`; the stock source branches at power > 99. */
  readonly movePower: number;
  readonly attackerSide: MagnitudeSide;
  readonly targetSide: MagnitudeSide;
  readonly initialPlatformX: number;
  readonly initialBattlerX2: Readonly<{ player: number; opponent: number }>;
  readonly battlerSpriteSlots: Readonly<{ player: number; opponent: number }>;
  /** Live source `sSpriteOrder`; only the two battler positions are consumed. */
  readonly spriteOrder: readonly number[];
}

export interface MagnitudeAudioState {
  readonly active: boolean;
  readonly songId: 214;
  readonly panning: 63 | -63;
  readonly framesToWait: 8;
  readonly playsRemaining: number;
  readonly frameCounter: number;
  readonly playedThisAge: boolean;
}

export interface MagnitudeSourceState {
  readonly owner: "Move_MAGNITUDE";
  readonly offset: 0 | 24 | 96 | 119;
  readonly pointer: number;
  readonly pointerParity: 0;
  readonly wait: number;
  readonly active: boolean;
}

export interface MagnitudeFrame {
  readonly age: number;
  readonly branch: MagnitudeBranch;
  readonly active: boolean;
  readonly source: MagnitudeSourceState;
  readonly shake: HorizontalShakeState;
  readonly palette: ComplexPaletteBlendState;
  readonly audio: MagnitudeAudioState;
  readonly visualTaskCount: number;
  readonly soundTaskCount: number;
  readonly playerBattlerX2: number;
  readonly opponentBattlerX2: number;
  readonly allocator: Readonly<{
    readonly playerSpriteSlot: number;
    readonly opponentSpriteSlot: number;
    readonly sourceOrder: readonly number[];
    readonly painterOrder: readonly number[];
  }>;
  readonly cleanup: Readonly<{
    readonly firstInactive: boolean;
    readonly activeTasks: number;
    readonly activePaletteSprites: number;
  }>;
}

const SOURCE_BASE = 0x082c_d8b0;

function assertInputs(inputs: Readonly<MagnitudeLiveInputs>): void {
  if (!Number.isInteger(inputs.movePower) || inputs.movePower < 0
    || inputs.attackerSide === inputs.targetSide
    || !Number.isInteger(inputs.initialPlatformX)
    || !Number.isInteger(inputs.initialBattlerX2.player)
    || !Number.isInteger(inputs.initialBattlerX2.opponent)) {
    throw new Error("invalid live Magnitude inputs");
  }
  const slots = [inputs.battlerSpriteSlots.player, inputs.battlerSpriteSlots.opponent];
  if (slots.some((slot) => !Number.isInteger(slot) || slot < 0 || slot >= 64)
    || slots[0] === slots[1]
    || inputs.spriteOrder.length !== 64
    || new Set(inputs.spriteOrder).size !== 64
    || inputs.spriteOrder.some((slot) => !Number.isInteger(slot) || slot < 0 || slot >= 64)) {
    throw new Error("invalid live Magnitude allocator/order inputs");
  }
}

export function magnitudeBranchForPower(movePower: number): MagnitudeBranch {
  return movePower > 99 ? "intense" : "regular";
}

export function magnitudeInitialOffset(movePower: number): number {
  return Math.floor(movePower / 10) + 3;
}

export function magnitudeAudioAtAge(age: number, targetSide: MagnitudeSide): MagnitudeAudioState {
  // Cmd_loopsewithpan invokes the callback once while creating the task.
  let remaining = age < 1 ? 10 : 9;
  let counter = 0;
  let active = false;
  for (let callbackAge = 1; callbackAge <= age && remaining > 0; callbackAge += 1) {
    active = true;
    if (counter++ >= 8) {
      counter = 0;
      remaining -= 1;
      if (remaining === 0) active = false;
    }
  }
  if (age < 1 || age > 80) active = false;
  return {
    active,
    songId: 214,
    panning: targetSide === "opponent" ? 63 : -63,
    framesToWait: 8,
    playsRemaining: remaining,
    frameCounter: age < 1 ? 8 : counter,
    playedThisAge: age === 1 || (age >= 9 && age <= 81 && age % 9 === 0),
  };
}

function sourceAtAge(age: number, branch: MagnitudeBranch, firstInactiveAge: number): MagnitudeSourceState {
  let offset: MagnitudeSourceState["offset"] = 0;
  let wait = 0;
  if (age > 0 && branch === "regular") { offset = 24; wait = 1; }
  if (age > 0 && branch === "intense") {
    if (age <= 12) { offset = 96; wait = Math.max(0, 11 - age); }
    else if (age <= 30) { offset = 119; wait = Math.max(0, 29 - age); }
    else { offset = 24; wait = 1; }
  }
  return {
    owner: "Move_MAGNITUDE",
    offset,
    pointer: SOURCE_BASE + offset,
    pointerParity: 0,
    wait,
    active: age < firstInactiveAge,
  };
}

/** The body's first inactive age: the HorizontalShake's decay (offset floor(power / 10) + 3, 8 rows per step) plus the 100-row shake lead. */
export function magnitudeFirstInactiveAge(movePower: number): number {
  return 100 + 8 * (magnitudeInitialOffset(movePower) - 1) + 2;
}

/** Complete source-relative Magnitude body through its first inactive row. */
export function magnitudeAtAge(age: number, inputs: Readonly<MagnitudeLiveInputs>): MagnitudeFrame {
  assertInputs(inputs);
  const branch = magnitudeBranchForPower(inputs.movePower);
  const shake = horizontalShakeAtAge(
    age,
    Math.floor(inputs.movePower / 10),
    50,
    inputs.initialPlatformX,
  );
  const firstInactiveAge = magnitudeFirstInactiveAge(inputs.movePower);
  const source = sourceAtAge(age, branch, firstInactiveAge);
  const palette = branch === "intense"
    ? earthquakePaletteAtAge(age)
    : earthquakePaletteAtAge(-1);
  const audio = magnitudeAudioAtAge(age, inputs.targetSide);
  const beforeFirstWrite = age < 2;
  const positions = [
    [inputs.battlerSpriteSlots.player, inputs.spriteOrder.indexOf(inputs.battlerSpriteSlots.player)],
    [inputs.battlerSpriteSlots.opponent, inputs.spriteOrder.indexOf(inputs.battlerSpriteSlots.opponent)],
  ] as const;
  const painterOrder = [...positions]
    .sort((left, right) => right[1] - left[1])
    .map(([slot]) => slot);
  const activePaletteSprites = palette.active ? 1 : 0;
  const shakeTaskActive = age >= 1 && shake.active;
  return {
    age,
    branch,
    active: source.active,
    source,
    shake,
    palette,
    audio,
    visualTaskCount: (shakeTaskActive ? 2 : 0) + activePaletteSprites,
    soundTaskCount: audio.active ? 1 : 0,
    playerBattlerX2: beforeFirstWrite ? inputs.initialBattlerX2.player : shake.battlerX2,
    opponentBattlerX2: beforeFirstWrite ? inputs.initialBattlerX2.opponent : shake.battlerX2,
    allocator: {
      playerSpriteSlot: inputs.battlerSpriteSlots.player,
      opponentSpriteSlot: inputs.battlerSpriteSlots.opponent,
      sourceOrder: inputs.spriteOrder,
      painterOrder,
    },
    cleanup: {
      firstInactive: age === firstInactiveAge,
      activeTasks: (shakeTaskActive ? 2 : 0) + (audio.active ? 1 : 0),
      activePaletteSprites,
    },
  };
}
