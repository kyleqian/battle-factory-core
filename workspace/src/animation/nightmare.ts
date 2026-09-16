/**
 * Source-relative Scene-ON reducer for MOVE_NIGHTMARE's legal battle body.
 *
 * This is intentionally limited to the root's FadeToBg / MonBg / clone / shake
 * sequence.  NightmareInContest's BlendMonInAndOut branch is source-pinned by
 * the evidence audit, but cannot be reached by this legal-battle reducer.
 * Live callers supply allocations, current paint state, and opaque gameplay
 * state; no recording, framebuffer, controller tick, or asset is imported.
 */

export type NightmareSide = "player" | "opponent";
export type NightmareMatrix = readonly [number, number, number, number];
export interface NightmarePoint { readonly x: number; readonly y: number; }

export interface NightmareBattlerSprite {
  readonly slot: number;
  readonly template: string;
  readonly callback: string;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly subpriority: number;
  readonly attr: readonly [number, number, number];
  readonly flags: number;
  readonly matrixNum: number;
  readonly matrix: NightmareMatrix;
  readonly data: readonly number[];
}

export interface NightmareCloneAllocation {
  readonly slot: number;
  readonly template: "gMultiuseSpriteTemplate";
  /** Copy of the target's live OAM at CloneBattlerSpriteWithBlend creation. */
  readonly attr: readonly [number, number, number];
  readonly flags: number;
  readonly matrixNum: number;
  readonly matrix: NightmareMatrix;
  readonly subpriority: number;
  /** The target's copied data[5], then the stored no-op callback pointer. */
  readonly dataTail: readonly [number, number, number];
  readonly sourceCreationOrder: number;
}

export interface NightmareMonBgAllocation {
  readonly updateTaskSlot: number;
  readonly clearTaskSlot: number;
  readonly selected: "BG1" | "BG2";
  readonly backgroundOrigin: Readonly<NightmarePoint>;
  readonly inBg2: 0 | 1;
  readonly battler: 0 | 1;
  readonly setupControl: number;
}

export interface NightmareTaskAllocation {
  readonly fadeToGhost: number;
  readonly clone: number;
  readonly shake: number;
  readonly fadeRestore: number;
}

export interface NightmareRegisters {
  readonly bldcnt: number;
  readonly bldalpha: number;
  readonly bldy: number;
  readonly bg1cnt: number;
  readonly bg2cnt: number;
  readonly bg1hofs: number;
  readonly bg1vofs: number;
  readonly bg2hofs: number;
  readonly bg2vofs: number;
  readonly [name: string]: number;
}

export interface NightmareLiveInputs {
  readonly attackerSide: NightmareSide;
  readonly targetSide: NightmareSide;
  readonly attackerSpecies: string;
  readonly targetSpecies: string;
  /** Live BATTLER_COORD_* picture origins, supplied by the Scene-ON seam. */
  readonly attackerPictureOrigin: Readonly<NightmarePoint>;
  readonly targetPictureOrigin: Readonly<NightmarePoint>;
  /** Current caller-owned battler state, retained exactly by this reducer. */
  readonly attackerSprite: Readonly<NightmareBattlerSprite>;
  readonly targetSprite: Readonly<NightmareBattlerSprite>;
  readonly clone: Readonly<NightmareCloneAllocation>;
  readonly tasks: Readonly<NightmareTaskAllocation>;
  readonly monBg: Readonly<NightmareMonBgAllocation>;
  /** Current persistent source scheduler order; this reducer never re-sorts it. */
  readonly painterOrder: readonly number[];
  /** Caller-owned allocation state: Nightmare does not allocate these resources. */
  readonly resources: unknown;
  readonly matrixBitmap: number;
  readonly matrices: readonly NightmareMatrix[];
  /** Complete live banks, not source assets.  The reducer only schedules them. */
  readonly palettes: Readonly<{
    readonly unfaded: readonly number[];
    readonly faded: readonly number[];
    readonly hardware: readonly number[];
  }>;
  /** Live BG VRAM handles at the source command boundaries. */
  readonly backgrounds: Readonly<{
    readonly battle: unknown;
    readonly ghost: unknown;
    readonly monBg: unknown;
    readonly clear: unknown;
    readonly clearedGhost: unknown;
    readonly restoredBattle: unknown;
  }>;
  /** Current non-owned registers; the reducer replaces only its owned fields. */
  readonly registers: Readonly<NightmareRegisters>;
  readonly audio: Readonly<{ readonly targetPan: number }>;
  readonly animationRngSeed: number;
  /** Opaque caller state carried without reads or writes. */
  readonly gameplayRng: unknown;
  readonly gameplayState: unknown;
}

export const NIGHTMARE_SOURCE_START = 0x082cd4a3;
export const NIGHTMARE_SOURCE_END_EXCLUSIVE = 0x082cd4f9;
export const NIGHTMARE_FIRST_INACTIVE_AGE = 168;
export const NIGHTMARE_CONTEST_BLEND = Object.freeze({ color: "RGB_WHITE", coefficient: 10, delay: 2, repeats: 1 });

export interface NightmareSourceCursor {
  readonly owner: "Move_NIGHTMARE";
  readonly pointer: number;
  readonly pointerOffset: 0 | 2 | 10 | 38 | 42 | 43;
  readonly active: boolean;
  readonly wait: number;
}

export interface NightmareTask {
  readonly slot: number;
  readonly callback: "Task_FadeToBg" | "Task_UpdateMonBg" | "AnimTask_NightmareClone_Step" | "AnimTask_ShakeMon_Step" | "Task_ClearMonBg";
  readonly role: "fade-to-ghost" | "target-monbg" | "nightmare-clone" | "target-shake" | "clear-monbg" | "fade-restore";
  readonly data: readonly [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number];
}

export interface NightmareCloneSprite {
  readonly kind: "nightmare-clone";
  readonly slot: number;
  readonly template: "gMultiuseSpriteTemplate";
  readonly callback: "TranslateSpriteLinearFixedPoint";
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly subpriority: number;
  readonly attr: readonly [number, number, number];
  readonly flags: number;
  readonly matrixNum: number;
  readonly matrix: NightmareMatrix;
  readonly data: readonly [number, number, number, number, number, number, number, number];
  readonly sourceCreationOrder: number;
}

export interface NightmareState {
  readonly age: number;
  readonly active: boolean;
  readonly source: NightmareSourceCursor;
  readonly animArgs: readonly [number, number, number, number, number, number, number, number];
  readonly battlers: Readonly<{
    readonly attacker: Readonly<{ readonly side: NightmareSide; readonly species: string; readonly pictureOrigin: NightmarePoint; readonly sprite: NightmareBattlerSprite; readonly shake: NightmarePoint }>;
    readonly target: Readonly<{ readonly side: NightmareSide; readonly species: string; readonly pictureOrigin: NightmarePoint; readonly sprite: NightmareBattlerSprite; readonly shake: NightmarePoint; readonly hiddenOnMonBg: boolean }>;
  }>;
  readonly sprites: readonly NightmareCloneSprite[];
  readonly tasks: readonly NightmareTask[];
  readonly resources: Readonly<{ readonly allocator: unknown; readonly matrixBitmap: number; readonly matrices: readonly NightmareMatrix[]; readonly affineAllocated: false }>;
  readonly palette: Readonly<{ readonly unfaded: readonly number[]; readonly faded: readonly number[]; readonly hardware: readonly number[]; readonly phase: "battle" | "ghost" | "target-monbg" | "clear" | "cleared-ghost" | "restored-battle"; readonly fadeLevel: number }>;
  readonly background: Readonly<{ readonly vram: unknown; readonly selected: "BG1" | "BG2"; readonly sourceX: number; readonly sourceY: number; readonly hardwareX: number; readonly hardwareY: number; readonly targetOnBg: boolean }>;
  readonly registers: NightmareRegisters;
  readonly painterOrder: readonly number[];
  readonly audio: readonly Readonly<{ readonly channel: "SE1"; readonly sound: "SE_M_NIGHTMARE"; readonly sourcePan: "SOUND_PAN_TARGET"; readonly pan: number }>[];
  readonly displayTransfer: Readonly<{ readonly oam: "initial" | "preceding-software"; readonly matrices: "initial" | "preceding-software"; readonly palette: "initial" | "same-row-monbg-setup" | "preceding-faded" }>;
  readonly rng: Readonly<{ readonly animation: number; readonly sourceDraws: number; readonly gameplay: unknown; readonly gameplayUnchanged: true }>;
  readonly gameplay: unknown;
  readonly cleanup: Readonly<{ readonly firstInactive: boolean; readonly visualTasks: number; readonly soundTasks: number; readonly ownedSprites: number; readonly resourcesReleased: false; readonly monBgCleared: boolean }>;
}

const zero16 = (): [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number] => [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
const u32 = (value: number): number => value >>> 0;
const nextAnimationRng = (value: number): number => u32(Math.imul(value, 0x41c64e6d) + 0x6073);
const s16 = (value: number): number => (value & 0x8000) ? value - 0x10000 : value;

function assertAge(age: number): void {
  if (!Number.isInteger(age) || age < 0) throw new Error(`invalid Nightmare source age ${age}`);
}
function assertSlot(slot: number, label: string, maximum: number): void {
  if (!Number.isInteger(slot) || slot < 0 || slot >= maximum) throw new Error(`invalid Nightmare ${label} slot ${slot}`);
}
function assertInputs(input: Readonly<NightmareLiveInputs>): void {
  if (input.attackerSide === input.targetSide) throw new Error("Nightmare requires opposing live battler sides");
  for (const [label, slot] of Object.entries(input.tasks)) assertSlot(slot, label, 16);
  assertSlot(input.clone.slot, "clone sprite", 64);
  assertSlot(input.targetSprite.slot, "target sprite", 64);
  assertSlot(input.monBg.updateTaskSlot, "monbg update", 16);
  assertSlot(input.monBg.clearTaskSlot, "monbg clear", 16);
  if (input.painterOrder.length !== 64 || new Set(input.painterOrder).size !== 64) throw new Error("Nightmare requires a complete live painter order");
}

/** Complete legal-body cursor including the root's first inactive cleanup row. */
export function nightmareSourceAtAge(age: number): NightmareSourceCursor {
  assertAge(age);
  let pointerOffset: NightmareSourceCursor["pointerOffset"];
  let wait: number;
  if (age === 0) { pointerOffset = 0; wait = 0; }
  else if (age < 40) { pointerOffset = 2; wait = 1; }
  else if (age === 40) { pointerOffset = 10; wait = 1; }
  else if (age < 43) { pointerOffset = 10; wait = 0; }
  else if (age < 127) { pointerOffset = 38; wait = 1; }
  else if (age < NIGHTMARE_FIRST_INACTIVE_AGE) { pointerOffset = 42; wait = 1; }
  else { pointerOffset = 43; wait = 0; }
  return { owner: "Move_NIGHTMARE", pointer: NIGHTMARE_SOURCE_START + pointerOffset, pointerOffset, active: age < NIGHTMARE_FIRST_INACTIVE_AGE, wait };
}

function fadeLevelAtAge(age: number): number {
  if (age >= 3 && age <= 18) return age - 2;
  if (age >= 19 && age <= 22) return 16;
  if (age >= 23 && age <= 38) return 38 - age;
  if (age >= 129 && age <= 131) return 1;
  if (age >= 132 && age <= 146) return age - 130;
  if (age >= 145 && age <= 150) return 16;
  if (age >= 151 && age <= 166) return 166 - age;
  return 0;
}
function fadeState(first: boolean, age: number): 1 | 2 | 3 {
  if (first) return age <= 18 ? 1 : age <= 20 ? 2 : 3;
  return age <= 146 ? 1 : age <= 148 ? 2 : 3;
}
function sourceShakeX(age: number): number {
  if (age < 45 || age > 120) return 0;
  return Math.floor((age - 45) / 2) % 2 === 0 ? 3 : 0;
}
function animationRngDrawsAtAge(age: number): number {
  let draws = age;
  for (const stalled of [21, 129, 130, 149]) if (age >= stalled) draws -= 1;
  return Math.max(0, draws);
}
function animationRngAtAge(seed: number, age: number): number {
  let value = u32(seed);
  for (let draw = 0; draw < animationRngDrawsAtAge(age); draw += 1) value = nextAnimationRng(value);
  return value;
}
function cloneBlendAtAge(age: number): number {
  let eva = 15, evb = 2;
  for (let step = 1; step <= age - 43; step += 1) {
    const phase = step & 3;
    if (phase === 1 && eva > 0) eva -= 1;
    if (phase === 3 && evb <= 15) evb += 1;
  }
  return (evb << 8) | eva;
}
function cloneTask(age: number, input: Readonly<NightmareLiveInputs>): NightmareTask | null {
  if (age < 43 || age > 125) return null;
  let timer = 0, eva = 15, evb = 2, state = 0, phase = 0, linger = 0;
  for (let step = 1; step <= age - 42; step += 1) {
    if (state === 0) {
      timer += 1; phase = timer & 3;
      if (phase === 1 && eva > 0) eva -= 1;
      if (phase === 3 && evb <= 15) evb += 1;
      if (evb === 16 && eva === 0 && timer > 80) state = 1;
    } else if (state === 1) {
      linger += 1; if (linger > 1) state = 2;
    }
  }
  const data = zero16();
  data[0] = input.clone.slot; data[1] = timer; data[2] = eva; data[3] = evb; data[4] = state; data[5] = phase; data[6] = linger;
  return { slot: input.tasks.clone, callback: "AnimTask_NightmareClone_Step", role: "nightmare-clone", data };
}
function cloneSprite(age: number, input: Readonly<NightmareLiveInputs>): NightmareCloneSprite | null {
  if (age < 43 || age > 122) return null;
  const steps = age - 42;
  const dx = input.targetSide === "player" ? -144 : 144;
  const dy = input.targetSide === "player" ? 112 : -112;
  const x2 = Math.floor((dx * steps) / 256), y2 = Math.floor((dy * steps) / 256);
  return {
    kind: "nightmare-clone", slot: input.clone.slot, template: input.clone.template, callback: "TranslateSpriteLinearFixedPoint",
    x: input.targetPictureOrigin.x, y: input.targetPictureOrigin.y, x2, y2, subpriority: input.clone.subpriority,
    attr: [(input.clone.attr[0] & 0xff00) | ((input.clone.attr[0] + y2) & 0xff) | 0x0400, (input.clone.attr[1] & ~0x01ff) | ((input.clone.attr[1] + x2) & 0x01ff), input.clone.attr[2]], flags: input.clone.flags,
    matrixNum: input.clone.matrixNum, matrix: input.clone.matrix,
    data: [80 - steps, dx, dy, dx * steps, dy * steps, input.clone.dataTail[0], input.clone.dataTail[1], input.clone.dataTail[2]],
    sourceCreationOrder: input.clone.sourceCreationOrder,
  };
}
function phaseAtAge(age: number): NightmareState["palette"]["phase"] {
  if (age < 20) return "battle";
  if (age < 41) return "ghost";
  if (age < 129) return "target-monbg";
  if (age < 131) return "clear";
  if (age < 148) return "cleared-ghost";
  return "restored-battle";
}
function backgroundAtAge(age: number, input: Readonly<NightmareLiveInputs>): unknown {
  switch (phaseAtAge(age)) {
    case "battle": return input.backgrounds.battle;
    case "ghost": return input.backgrounds.ghost;
    case "target-monbg": return input.backgrounds.monBg;
    case "clear": return input.backgrounds.clear;
    case "cleared-ghost": return input.backgrounds.clearedGhost;
    case "restored-battle": return input.backgrounds.restoredBattle;
  }
}
function monBgSource(age: number, input: Readonly<NightmareLiveInputs>): NightmarePoint {
  if (age < 40 || age >= 130) return { x: 0, y: 0 };
  return { x: input.monBg.backgroundOrigin.x - sourceShakeX(age), y: input.monBg.backgroundOrigin.y };
}
function hardwareScroll(age: number, input: Readonly<NightmareLiveInputs>): NightmarePoint {
  if (age < 41) return input.monBg.selected === "BG1"
    ? { x: s16(input.registers.bg1hofs), y: s16(input.registers.bg1vofs) }
    : { x: s16(input.registers.bg2hofs), y: s16(input.registers.bg2vofs) };
  const source = monBgSource(age - 1, input);
  return { x: source.x & 0x1ff, y: source.y & 0x1ff };
}

/** Pure legal-battle source-age reducer; caller-owned fields are preserved. */
export function nightmareAtAge(age: number, input: Readonly<NightmareLiveInputs>): NightmareState {
  assertAge(age); assertInputs(input);
  const source = nightmareSourceAtAge(age), tasks: NightmareTask[] = [];
  if (age >= 1 && age <= 38) {
    const data = zero16(); data[0] = 2; data[10] = fadeState(true, age);
    tasks.push({ slot: input.tasks.fadeToGhost, callback: "Task_FadeToBg", role: "fade-to-ghost", data });
  }
  if (age >= 40 && age <= 129) {
    const data = zero16();
    data[0] = input.targetSprite.slot; data[1] = input.targetPictureOrigin.x; data[2] = input.targetPictureOrigin.y;
    data[3] = input.monBg.backgroundOrigin.x; data[4] = input.monBg.backgroundOrigin.y; data[5] = input.monBg.inBg2; data[6] = input.monBg.battler;
    tasks.push({ slot: input.monBg.updateTaskSlot, callback: "Task_UpdateMonBg", role: "target-monbg", data });
  }
  const cloneTaskState = cloneTask(age, input); if (cloneTaskState) tasks.push(cloneTaskState);
  if (age >= 43 && age <= 120) {
    const local = age - 43, data = zero16();
    data[0] = input.targetSprite.slot; data[1] = 39 - Math.floor(local / 2); data[2] = 1; data[3] = local % 2 === 0 ? 1 : 0; data[4] = 3;
    tasks.push({ slot: input.tasks.shake, callback: "AnimTask_ShakeMon_Step", role: "target-shake", data });
  }
  if (age >= 127 && age <= 129) {
    const data = zero16(); data[1] = age === 127 ? 1 : 2; data[2] = input.monBg.battler;
    tasks.push({ slot: input.monBg.clearTaskSlot, callback: "Task_ClearMonBg", role: "clear-monbg", data });
  }
  if (age >= 127 && age <= 166) {
    const data = zero16(); data[0] = -1; data[10] = fadeState(false, age);
    tasks.push({ slot: input.tasks.fadeRestore, callback: "Task_FadeToBg", role: "fade-restore", data });
  }
  tasks.sort((left, right) => left.slot - right.slot);
  const clone = cloneSprite(age, input), sourceBg = monBgSource(age, input), hardwareBg = hardwareScroll(age, input);
  const registers = { ...input.registers };
  registers.bldcnt = (age >= 2 && age <= 38) || (age >= 128 && age <= 166) ? 232 : age >= 43 && age <= 125 ? 16192 : 0;
  registers.bldalpha = age >= 43 && age <= 125 ? cloneBlendAtAge(age) : 0;
  registers.bldy = fadeLevelAtAge(age);
  if (input.monBg.selected === "BG1") {
    if (age >= 41) registers.bg1cnt = input.monBg.setupControl;
    registers.bg1hofs = hardwareBg.x; registers.bg1vofs = hardwareBg.y;
  } else {
    if (age >= 41) registers.bg2cnt = input.monBg.setupControl;
    registers.bg2hofs = hardwareBg.x; registers.bg2vofs = hardwareBg.y;
  }
  const sourceDraws = animationRngDrawsAtAge(age), targetShake = { x: sourceShakeX(age), y: 0 };
  return {
    age, active: source.active, source,
    animArgs: age >= 43 ? [1, 3, 0, 40, 1, 0, 0, 0] : [0, 0, 0, 0, 0, 0, 0, 0],
    battlers: {
      attacker: { side: input.attackerSide, species: input.attackerSpecies, pictureOrigin: input.attackerPictureOrigin, sprite: input.attackerSprite, shake: { x: 0, y: 0 } },
      target: { side: input.targetSide, species: input.targetSpecies, pictureOrigin: input.targetPictureOrigin, sprite: input.targetSprite, shake: targetShake, hiddenOnMonBg: age >= 40 && age <= 126 },
    },
    sprites: clone ? [clone] : [], tasks,
    resources: { allocator: input.resources, matrixBitmap: input.matrixBitmap, matrices: input.matrices, affineAllocated: false },
    palette: { ...input.palettes, phase: phaseAtAge(age), fadeLevel: fadeLevelAtAge(age) },
    background: { vram: backgroundAtAge(age, input), selected: input.monBg.selected, sourceX: sourceBg.x, sourceY: sourceBg.y, hardwareX: hardwareBg.x, hardwareY: hardwareBg.y, targetOnBg: age >= 40 && age <= 126 },
    registers, painterOrder: input.painterOrder,
    audio: age === 43 ? [{ channel: "SE1", sound: "SE_M_NIGHTMARE", sourcePan: "SOUND_PAN_TARGET", pan: input.audio.targetPan }] : [],
    displayTransfer: { oam: age === 0 ? "initial" : "preceding-software", matrices: age === 0 ? "initial" : "preceding-software", palette: age === 0 ? "initial" : age === 40 ? "same-row-monbg-setup" : "preceding-faded" },
    rng: { animation: animationRngAtAge(input.animationRngSeed, age), sourceDraws, gameplay: input.gameplayRng, gameplayUnchanged: true },
    gameplay: input.gameplayState,
    cleanup: { firstInactive: age === NIGHTMARE_FIRST_INACTIVE_AGE, visualTasks: age >= 43 && age <= 120 ? 2 : age >= 121 && age <= 125 ? 1 : 0, soundTasks: 0, ownedSprites: clone ? 1 : 0, resourcesReleased: false, monBgCleared: age >= 130 },
  };
}
