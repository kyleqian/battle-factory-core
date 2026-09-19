/**
 * Source-relative Scene-ON reducer for MOVE_PURSUIT.
 *
 * `Move_PURSUIT` owns the DARK-background envelope, target monbg handoff,
 * selected normal/switch-interception IMPACT branch, and power-derived shake.
 * The generic palette/BG/OAM engines stay live inputs: this reducer neither
 * draws nor resolves damage, switching, or gameplay RNG.
 */

export type PursuitSide = "player" | "opponent";
export type PursuitBranch = "normal" | "switchout";
export type PursuitMatrix = readonly [number, number, number, number];

export interface PursuitPoint {
  readonly x: number;
  readonly y: number;
}

export interface PursuitMonBgInput {
  readonly layer: "bg1" | "bg2";
  readonly spriteX: number;
  readonly spriteY: number;
  readonly bgX: number;
  readonly bgY: number;
  readonly inBg2: boolean;
  readonly battlerId: 0 | 1;
}

export interface PursuitLiveInputs {
  readonly attackerSide: PursuitSide;
  readonly targetSide: PursuitSide;
  readonly attackerSpecies: string;
  readonly targetSpecies: string;
  /** Current source origins supplied by the typed Scene-ON boundary. */
  readonly attackerCenter: Readonly<PursuitPoint>;
  readonly targetCenter: Readonly<PursuitPoint>;
  /** `InitSpritePosToAnimTarget(TRUE)`'s resolved picture anchor. */
  readonly targetImpactCenter: Readonly<PursuitPoint>;
  /** `choosetwoturnanim` outcome, decided by the caller's real switch flow. */
  readonly branch: PursuitBranch;
  readonly attackerSpriteSlot: number;
  readonly targetSpriteSlot: number;
  /** Live battler tile/palette identities used to find their hardware OAM. */
  readonly attackerAttr2: number;
  readonly targetAttr2: number;
  readonly targetInitialOffset: Readonly<PursuitPoint>;
  readonly taskSlots: Readonly<{
    readonly fadeToDark: number;
    readonly monbg: number;
    readonly shake: number;
    readonly clearMonbg: number;
    readonly restoreBattle: number;
  }>;
  /** Live source allocation: UI history can select a different IMPACT bank. */
  readonly impact: Readonly<{
    readonly slot: number;
    readonly matrixSlot: number;
    readonly attr: readonly [number, number, number];
    readonly subpriority: number;
    readonly paletteSlot: number;
    readonly tileSlot: number;
    readonly allocator: unknown;
  }>;
  readonly monbg: Readonly<PursuitMonBgInput>;
  /** Persistent SortSprites order, carried rather than recreated. */
  readonly spriteOrder: readonly number[];
  /** Whole live buffers retain the measured Scene-ON predecessor latches. */
  readonly buffers: Readonly<{
    readonly softwareOam: readonly unknown[];
    readonly hardwareOam: readonly unknown[];
    readonly softwareMatrices: readonly PursuitMatrix[];
    readonly hardwareMatrices: readonly PursuitMatrix[];
  }>;
  readonly palette: Readonly<{
    readonly unfaded: readonly number[];
    readonly faded: readonly number[];
    readonly hardware: readonly number[];
  }>;
  readonly registers: Readonly<Record<string, number>>;
  readonly background: Readonly<{
    readonly currentVram: unknown;
    readonly battleVram: unknown;
    readonly darkVram: unknown;
  }>;
  /** Generic Task_FadeToBg state is caller-owned shared presentation state. */
  readonly sharedTaskData: Readonly<{
    readonly fadeToDark: readonly number[];
    readonly restoreBattle: readonly number[];
  }>;
  readonly audio: Readonly<{
    readonly current: unknown;
    readonly targetPan: number;
  }>;
  readonly liveCounts: Readonly<{
    readonly visualTasks: number;
    readonly soundTasks: number;
    readonly matrixBitmap: number;
  }>;
  /** `FALSE` in the source task selects move power rather than damage. */
  readonly movePower: number;
  readonly moveDamage: number;
  /** Presentation RNG remains live; gameplay RNG is opaque and untouched. */
  readonly animationRng: number;
  readonly gameplayRng: unknown;
  readonly gameplayState: unknown;
}

export interface PursuitSourceCursor {
  readonly owner: "Move_PURSUIT";
  readonly pointer: number;
  readonly pointerOffset: 0 | 3 | 5 | 7 | 10 | 22 | 28 | 29 | 30;
  readonly active: boolean;
  readonly wait: number;
  readonly branch: PursuitBranch;
}

export interface PursuitTask {
  readonly slot: number;
  readonly callback:
    | "Task_FadeToBg"
    | "Task_UpdateMonBg"
    | "AnimTask_ShakeTargetBasedOnMovePowerOrDmg_Step"
    | "Task_ClearMonBg";
  readonly role: "fade-to-dark" | "target-monbg" | "power-shake" | "clear-monbg" | "restore-battle";
  readonly data: readonly number[];
}

export interface PursuitImpact {
  readonly slot: number;
  readonly template: "gBasicHitSplatSpriteTemplate";
  readonly callback: "RunStoredCallbackWhenAffineAnimEnds" | "DestroyAnimSprite";
  readonly branch: PursuitBranch;
  readonly affineAnimation: 1 | 2;
  readonly matrixSlot: number;
  readonly matrix: PursuitMatrix;
  readonly attr: readonly [number, number, number];
  readonly subpriority: number;
  readonly painterIndex: number;
  readonly x: number;
  readonly y: number;
  readonly x2: 0;
  readonly y2: 0;
  readonly data: readonly [0, 0, 0, 0, 0, 0, 15357, 2058];
}

export interface PursuitState {
  readonly age: number;
  readonly active: boolean;
  readonly source: PursuitSourceCursor;
  readonly animArgs: readonly [number, number, number, number, number, number, number, number];
  readonly battlers: Readonly<{
    readonly attacker: Readonly<{ readonly side: PursuitSide; readonly species: string; readonly center: PursuitPoint; readonly spriteSlot: number }>;
    readonly target: Readonly<{ readonly side: PursuitSide; readonly species: string; readonly center: PursuitPoint; readonly spriteSlot: number }>;
  }>;
  readonly tasks: readonly PursuitTask[];
  readonly impact: PursuitImpact | null;
  readonly shake: Readonly<{
    readonly targetOffset: PursuitPoint;
    readonly sourceScroll: PursuitPoint;
  }>;
  readonly monbg: Readonly<{
    readonly active: boolean;
    readonly update: boolean;
    readonly clear: boolean;
    readonly layer: "bg1" | "bg2";
  }>;
  readonly resources: Readonly<{
    readonly impactLoaded: boolean;
    readonly paletteSlot: number | null;
    readonly paletteBank: number | null;
    readonly tileSlot: number | null;
    readonly matrixBitmap: number;
    readonly allocator: unknown;
  }>;
  readonly painterOrder: readonly number[];
  readonly buffers: PursuitLiveInputs["buffers"];
  readonly palette: PursuitLiveInputs["palette"];
  readonly registers: PursuitLiveInputs["registers"];
  readonly background: Readonly<{
    readonly phase: "battle" | "fading-to-dark" | "dark" | "restoring-battle";
    readonly vram: unknown;
    readonly battleVram: unknown;
    readonly darkVram: unknown;
  }>;
  readonly audio: Readonly<{
    readonly live: unknown;
    readonly events: readonly Readonly<{
      readonly channel: "SE1";
      readonly sound: "SE_M_COMET_PUNCH";
      readonly pan: number;
    }>[];
  }>;
  readonly rng: Readonly<{
    readonly animation: number;
    readonly gameplay: unknown;
    readonly gameplayUnchanged: true;
  }>;
  readonly gameplay: unknown;
  readonly displayTransfer: Readonly<{
    readonly oam: "initial" | "preceding-software";
    readonly matrices: "initial" | "preceding-software";
    readonly palette: "initial" | "same-row-monbg" | "preceding-faded";
    readonly monbgHofs: "initial" | "preceding-source";
    readonly directBlendRegisters: "current-source";
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

export interface PursuitDisplayedObject {
  readonly oamIndex: number;
  readonly attr: readonly [number, number, number];
  readonly matrixNum: number;
  readonly matrix: PursuitMatrix;
}

export interface PursuitDisplayPlan {
  readonly attacker: PursuitDisplayedObject;
  readonly target: PursuitDisplayedObject | null;
  readonly impact: PursuitDisplayedObject | null;
  readonly hardwarePalette: readonly number[];
  readonly targetOnBg: boolean;
  readonly targetBgScroll: PursuitPoint;
  readonly darkBackgroundVisible: boolean;
}

export const PURSUIT_SOURCE_START = 0x082c_a980;
export const PURSUIT_SOURCE_END_EXCLUSIVE = 0x082c_a9f1;
export const PURSUIT_IMPACT_TAG = 10135;
export const PURSUIT_FIRST_INACTIVE_AGE = 102;

const IMPACT_MATRICES: Readonly<Record<1 | 2, PursuitMatrix>> = {
  1: [303, 0, 0, 303],
  2: [372, 0, 0, 372],
};
const ZERO_ARGS = [0, 0, 0, 0, 0, 0, 0, 0] as const;
const IMPACT_DATA = [0, 0, 0, 0, 0, 0, 15357, 2058] as const;

function assertSlot(slot: number, label: string, maximum: number): void {
  if (!Number.isInteger(slot) || slot < 0 || slot >= maximum) {
    throw new Error(`invalid Pursuit ${label}`);
  }
}

function assertInputs(input: Readonly<PursuitLiveInputs>): void {
  if (input.attackerSide === input.targetSide || !input.attackerSpecies || !input.targetSpecies) {
    throw new Error("Pursuit requires opposing named battlers");
  }
  assertSlot(input.attackerSpriteSlot, "attacker sprite slot", 64);
  assertSlot(input.targetSpriteSlot, "target sprite slot", 64);
  if (!Number.isInteger(input.attackerAttr2) || !Number.isInteger(input.targetAttr2)) {
    throw new Error("Pursuit requires live battler OAM identities");
  }
  for (const [label, slot] of Object.entries(input.taskSlots)) assertSlot(slot, label, 16);
  assertSlot(input.impact.slot, "IMPACT sprite slot", 64);
  assertSlot(input.impact.matrixSlot, "IMPACT matrix slot", 32);
  assertSlot(input.impact.paletteSlot, "IMPACT palette slot", 16);
  assertSlot(input.impact.tileSlot, "IMPACT tile slot", 128);
  if (input.monbg.layer !== (input.targetSide === "player" ? "bg2" : "bg1")
    || input.monbg.battlerId !== (input.targetSide === "player" ? 0 : 1)) {
    throw new Error("Pursuit target monbg side drift");
  }
  if (input.spriteOrder.length !== 64 || new Set(input.spriteOrder).size !== 64
    || input.spriteOrder.some((slot) => !Number.isInteger(slot) || slot < 0 || slot >= 64)) {
    throw new Error("Pursuit requires a live 64-slot painter order");
  }
  if (input.buffers.softwareOam.length !== 128 || input.buffers.hardwareOam.length !== 128
    || input.buffers.softwareMatrices.length !== 32 || input.buffers.hardwareMatrices.length !== 32
    || input.palette.unfaded.length !== 512 || input.palette.faded.length !== 512
    || input.palette.hardware.length !== 512) {
    throw new Error("Pursuit requires complete live OAM, matrix, and palette buffers");
  }
  if (input.sharedTaskData.fadeToDark.length !== 16 || input.sharedTaskData.restoreBattle.length !== 16) {
    throw new Error("Pursuit requires complete shared fade task data");
  }
  if (!Number.isFinite(input.movePower) || !Number.isFinite(input.moveDamage)) {
    throw new Error("Pursuit requires live move power and damage");
  }
}

function decodeHardwareOam(entry: unknown, oamIndex: number): PursuitDisplayedObject | null {
  if (typeof entry !== "string" || !/^[0-9a-f]{16}$/iu.test(entry)) return null;
  const word = (offset: number): number => Number.parseInt(
    `${entry.slice(offset + 2, offset + 4)}${entry.slice(offset, offset + 2)}`, 16,
  );
  const attr = [word(0), word(4), word(8)] as const;
  return { oamIndex, attr, matrixNum: attr[1] >>> 9 & 0x1f,
    matrix: [256, 0, 0, 256] };
}

function signed9(value: number): number {
  const wrapped = value & 0x1ff;
  return wrapped >= 0x100 ? wrapped - 0x200 : wrapped;
}

/**
 * Resolves Pursuit scanout from live hardware buffers and allocation state.
 * It contains no retained-frame or controller chronology knowledge.
 */
export function pursuitDisplayPlan(state: Readonly<PursuitState>,
  input: Readonly<PursuitLiveInputs>): PursuitDisplayPlan {
  const objects = state.buffers.hardwareOam
    .map(decodeHardwareOam)
    .filter((entry): entry is PursuitDisplayedObject => entry !== null)
    .map((entry) => ({ ...entry,
      matrix: state.buffers.hardwareMatrices[entry.matrixNum] ?? [256, 0, 0, 256] as const }));
  const findBattler = (attr2: number): PursuitDisplayedObject | null =>
    objects.find((entry) => entry.attr[2] === attr2) ?? null;
  const allocator = state.resources.allocator as Readonly<{
    readonly tileRanges?: readonly (readonly [number, number])[];
  }>;
  const tileRange = state.resources.tileSlot === null
    ? null : allocator.tileRanges?.[state.resources.tileSlot] ?? null;
  const impact = tileRange === null || state.resources.paletteBank === null ? null
    : objects.find((entry) => {
      const tile = entry.attr[2] & 0x3ff;
      return tile >= tileRange[0] && tile < tileRange[0] + tileRange[1]
        && 16 + (entry.attr[2] >>> 12 & 0xf) === state.resources.paletteBank
        && (entry.attr[0] & 0x0100) !== 0 && (entry.attr[0] & 0x0200) === 0;
    }) ?? null;
  const hofsKey = state.monbg.layer === "bg1" ? "bg1hofs" : "bg2hofs";
  const vofsKey = state.monbg.layer === "bg1" ? "bg1vofs" : "bg2vofs";
  const attacker = findBattler(input.attackerAttr2);
  const target = findBattler(input.targetAttr2);
  if (!attacker) throw new Error("missing displayed Pursuit attacker OAM");
  const targetOnBg = state.monbg.active && state.age >= 5;
  if (!targetOnBg && !target) throw new Error("missing displayed Pursuit target OAM");
  return {
    attacker,
    target,
    impact,
    hardwarePalette: state.palette.hardware,
    targetOnBg,
    targetBgScroll: {
      x: signed9(state.registers[hofsKey] ?? 0),
      y: signed9(state.registers[vofsKey] ?? 0),
    },
    darkBackgroundVisible: state.age >= 26 && state.age < 82,
  };
}

function data16(...values: number[]): readonly number[] {
  return [...values, ...Array.from({ length: Math.max(0, 16 - values.length) }, () => 0)].slice(0, 16);
}

function sourceAtAge(age: number, branch: PursuitBranch): PursuitSourceCursor {
  let pointerOffset: PursuitSourceCursor["pointerOffset"] = 30;
  let wait = 0;
  if (age === 0) pointerOffset = 0;
  else if (age === 1) { pointerOffset = 3; wait = 1; }
  else if (age <= 3) pointerOffset = 3;
  else if (age === 4) { pointerOffset = 5; wait = 1; }
  else if (age <= 6) pointerOffset = 5;
  else if (age <= 44) { pointerOffset = 7; wait = 1; }
  else if (age === 45) { pointerOffset = 10; wait = -1; }
  else if (age === 46) pointerOffset = 10;
  else if (age <= 58) { pointerOffset = 22; wait = 1; }
  else if (age === 59) { pointerOffset = 28; wait = -1; }
  else if (age <= 62) pointerOffset = 28;
  else if (age <= 101) { pointerOffset = 29; wait = 1; }
  return {
    owner: "Move_PURSUIT",
    pointer: PURSUIT_SOURCE_START + pointerOffset,
    pointerOffset,
    active: age < PURSUIT_FIRST_INACTIVE_AGE,
    wait,
    branch,
  };
}

function shakeAmplitude(power: number): number {
  return Math.max(1, Math.min(16, Math.trunc(power / 12)));
}

function shakeAtAge(age: number, input: Readonly<PursuitLiveInputs>): Readonly<{
  readonly task: PursuitTask | null;
  readonly targetOffset: PursuitPoint;
}> {
  const amplitude = shakeAmplitude(input.movePower);
  const data = data16(
    0, 1, 6, 0, 0, 0, 0, input.targetSpriteSlot,
    input.targetInitialOffset.x, input.targetInitialOffset.y, 1, 0, 0,
    Math.trunc(amplitude / 2) + (amplitude & 1), Math.trunc(amplitude / 2), amplitude,
  ).slice();
  let targetOffset: PursuitPoint = { ...input.targetInitialOffset };
  if (age < 47) return { task: null, targetOffset };
  for (let sourceAge = 47; sourceAge <= Math.min(age, 58); sourceAge += 1) {
    data[0] = data[0]! + 1;
    if (data[0]! > data[1]!) {
      data[0] = 0;
      data[12] = (data[12]! + 1) & 1;
      targetOffset = {
        x: data[8]! + (data[12] ? data[13]! : -data[14]!),
        y: input.targetInitialOffset.y,
      };
      data[2] = data[2]! - 1;
      if (data[2] === 0) {
        targetOffset = { x: 0, y: 0 };
        return { task: null, targetOffset };
      }
    }
  }
  if (age > 58) return { task: null, targetOffset: { x: 0, y: 0 } };
  return {
    task: {
      slot: input.taskSlots.shake,
      callback: "AnimTask_ShakeTargetBasedOnMovePowerOrDmg_Step",
      role: "power-shake",
      data,
    },
    targetOffset,
  };
}

function phaseAtAge(age: number): PursuitState["background"]["phase"] {
  if (age < 7 || age >= 82) return "battle";
  if (age < 26) return "fading-to-dark";
  if (age < 63) return "dark";
  return "restoring-battle";
}

/** Pure source-relative reduction through Pursuit's first inactive cleanup. */
export function pursuitAtAge(age: number, input: Readonly<PursuitLiveInputs>): PursuitState {
  if (!Number.isInteger(age) || age < 0) throw new Error(`invalid Pursuit source age ${age}`);
  assertInputs(input);
  const source = sourceAtAge(age, input.branch);
  const shake = shakeAtAge(age, input);
  const updateMonbg = age >= 4 && age <= 61;
  const clearMonbg = age >= 59 && age <= 61;
  const fadeToDark = age >= 7 && age <= 43;
  const restoreBattle = age >= 63 && age <= 100;
  const affineAnimation: PursuitImpact["affineAnimation"] = input.branch === "switchout" ? 1 : 2;
  const impact = age >= 47 && age <= 56
    ? {
      slot: input.impact.slot,
      template: "gBasicHitSplatSpriteTemplate" as const,
      callback: (age === 56 ? "DestroyAnimSprite" : "RunStoredCallbackWhenAffineAnimEnds") as PursuitImpact["callback"],
      branch: input.branch,
      affineAnimation,
      matrixSlot: input.impact.matrixSlot,
      matrix: IMPACT_MATRICES[affineAnimation],
      attr: input.impact.attr,
      subpriority: input.impact.subpriority,
      painterIndex: input.spriteOrder.indexOf(input.impact.slot),
      x: input.targetImpactCenter.x,
      y: input.targetImpactCenter.y,
      x2: 0 as const,
      y2: 0 as const,
      data: IMPACT_DATA,
    }
    : null;
  const tasks: PursuitTask[] = [
    fadeToDark ? {
      slot: input.taskSlots.fadeToDark,
      callback: "Task_FadeToBg",
      role: "fade-to-dark",
      data: input.sharedTaskData.fadeToDark,
    } : null,
    updateMonbg ? {
      slot: input.taskSlots.monbg,
      callback: "Task_UpdateMonBg",
      role: "target-monbg",
      data: data16(
        input.targetSpriteSlot, input.monbg.spriteX, input.monbg.spriteY,
        input.monbg.bgX, input.monbg.bgY, Number(input.monbg.inBg2), input.monbg.battlerId,
      ),
    } : null,
    shake.task,
    clearMonbg ? {
      slot: input.taskSlots.clearMonbg,
      callback: "Task_ClearMonBg",
      role: "clear-monbg",
      data: data16(0, age === 59 ? 1 : 2, input.monbg.battlerId),
    } : null,
    restoreBattle ? {
      slot: input.taskSlots.restoreBattle,
      callback: "Task_FadeToBg",
      role: "restore-battle",
      data: input.sharedTaskData.restoreBattle,
    } : null,
  ].filter((task): task is PursuitTask => task !== null)
    .sort((left, right) => left.slot - right.slot || left.callback.localeCompare(right.callback));
  const loaded = age >= 1 && age < PURSUIT_FIRST_INACTIVE_AGE;
  return {
    age,
    active: source.active,
    source,
    animArgs: age < 47 ? ZERO_ARGS : [0, 1, 6, 1, 0, 0, 0, 0],
    battlers: {
      attacker: { side: input.attackerSide, species: input.attackerSpecies, center: input.attackerCenter, spriteSlot: input.attackerSpriteSlot },
      target: { side: input.targetSide, species: input.targetSpecies, center: input.targetCenter, spriteSlot: input.targetSpriteSlot },
    },
    tasks,
    impact,
    shake: {
      targetOffset: shake.targetOffset,
      sourceScroll: {
        x: updateMonbg ? input.monbg.bgX - shake.targetOffset.x : 0,
        y: updateMonbg ? input.monbg.bgY - shake.targetOffset.y : 0,
      },
    },
    monbg: { active: updateMonbg, update: updateMonbg, clear: clearMonbg, layer: input.monbg.layer },
    resources: {
      impactLoaded: loaded,
      paletteSlot: loaded ? input.impact.paletteSlot : null,
      paletteBank: loaded ? 16 + input.impact.paletteSlot : null,
      tileSlot: loaded ? input.impact.tileSlot : null,
      matrixBitmap: input.liveCounts.matrixBitmap,
      allocator: input.impact.allocator,
    },
    painterOrder: input.spriteOrder,
    buffers: input.buffers,
    palette: input.palette,
    registers: input.registers,
    background: {
      phase: phaseAtAge(age),
      vram: input.background.currentVram,
      battleVram: input.background.battleVram,
      darkVram: input.background.darkVram,
    },
    audio: {
      live: input.audio.current,
      events: age === 47
        ? [{ channel: "SE1", sound: "SE_M_COMET_PUNCH", pan: input.audio.targetPan }]
        : [],
    },
    rng: { animation: input.animationRng, gameplay: input.gameplayRng, gameplayUnchanged: true },
    gameplay: input.gameplayState,
    displayTransfer: {
      oam: age === 0 ? "initial" : "preceding-software",
      matrices: age === 0 ? "initial" : "preceding-software",
      palette: age === 0 ? "initial" : age === 4 ? "same-row-monbg" : "preceding-faded",
      monbgHofs: age < 5 ? "initial" : "preceding-source",
      directBlendRegisters: "current-source",
    },
    cleanup: {
      firstInactive: age === PURSUIT_FIRST_INACTIVE_AGE,
      visualTasks: input.liveCounts.visualTasks,
      soundTasks: input.liveCounts.soundTasks,
      ownedTasks: tasks.length,
      ownedSprites: Number(impact !== null),
      resourcesReleased: age >= PURSUIT_FIRST_INACTIVE_AGE,
    },
  };
}
