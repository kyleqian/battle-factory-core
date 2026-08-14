/**
 * Pure, source-relative port of Move_MEMENTO's presentation state.
 *
 * Age zero is the first row whose script pointer is Move_MEMENTO.  The
 * configuration contains only battler/BG geometry and the scanline buffers
 * inherited at that boundary; no battle tick, captured pixels, or oracle data
 * is consulted by the reducer.
 */

export type MementoSide = "player" | "opponent";
export type MementoBg = "BG1" | "BG2";

export interface MementoBattlerConfig {
  readonly battlerId: 0 | 1;
  readonly side: MementoSide;
  readonly bg: MementoBg;
  readonly bgPriorityRank: 1 | 2;
  readonly x: number;
  /** GetBattlerSpriteCoordAttr(..., TOP) - 7. */
  readonly shadowTop: number;
  /** GetBattlerSpriteCoord(..., Y) + 31. */
  readonly shadowBottom: number;
  readonly bgX: number;
  readonly bgY: number;
  readonly bgPaletteId: number;
}

export interface MementoConfig {
  readonly attacker: MementoBattlerConfig;
  readonly target: MementoBattlerConfig;
  readonly initialScanlineSourceBuffer: 0 | 1;
  readonly initialScanlineBuffers: readonly [readonly number[], readonly number[]];
  readonly initialWindow: Readonly<{ win0h: number; win0v: number }>;
}

export interface MementoTaskState {
  readonly name:
    | "AnimTask_MoveAttackerMementoShadow_Step"
    | "AnimTask_MementoHandleBg"
    | "AnimTask_MoveTargetMementoShadow"
    | "AnimTask_MoveTargetMementoShadow_Step"
    | "Task_ClearMonBgStatic";
  readonly data: readonly number[];
}

export interface MementoState {
  readonly age: number;
  readonly active: boolean;
  readonly scriptOffset: number;
  readonly visualTaskCount: 0 | 1;
  readonly phase: "setup" | "attacker" | "between" | "target" | "cleanup" | "inactive";
  readonly task: MementoTaskState | null;
  readonly scanline: Readonly<{
    srcBuffer: 0 | 1;
    state: 0 | 1 | 3;
    dmaDest: number;
    dmaControl: number;
    setFirstScanlineReg: number;
    buffers: readonly [readonly number[], readonly number[]];
  }>;
  readonly battleBg: Readonly<{
    bg1X: number; bg1Y: number; bg2X: number; bg2Y: number;
    win0h: number; win0v: number;
  }>;
  readonly registers: Readonly<{
    win0h: number; win0v: number; winin: number; winout: number;
    bldcnt: number; bldalpha: number;
  }>;
  readonly monbg: Readonly<{ attacker: boolean; target: boolean }>;
  readonly battlerPriority: Readonly<{ attacker: 2; target: 2 | 3 }>;
  readonly blackBgPaletteIds: readonly number[];
}

const ATTACKER_START_AGE = 7;
const DMA_CONTROL_16BIT = 0xa2600001;
const BG1VOFS = 0x04000016;
const BG2VOFS = 0x0400001a;
const INITIAL_DMA_DEST = 0x0400001c;
const SET_FIRST_SCANLINE_REG = 0x080ba135;
const WIN_ALL = 0x3f3f;
const WINOUT_BG1 = 0x3f3d;
const WINOUT_BG2 = 0x3f3b;
const BLDCNT_ALPHA_ALL = 0x3f40;
const BLDCNT_ALPHA_BG1 = 0x3f42;
const BLDCNT_ALPHA_BG2 = 0x3f44;

interface TaskRow {
  readonly name: MementoTaskState["name"];
  readonly data: number[];
  readonly shadowWrite: boolean;
  readonly alphaWrite: number | null;
  readonly scanlineStop: boolean;
  readonly windowWrite: boolean;
}

const clone = (values: readonly number[]): number[] => [...values];
const alpha = (eva: number, evb: number): number => (evb << 8) | eva;
const s16 = (value: number): number => ((value & 0xffff) ^ 0x8000) - 0x8000;
const bgBldcnt = (bg: MementoBg): number => bg === "BG1" ? BLDCNT_ALPHA_BG1 : BLDCNT_ALPHA_BG2;
const bgWinout = (bg: MementoBg): number => bg === "BG1" ? WINOUT_BG1 : WINOUT_BG2;
const bgVofs = (bg: MementoBg): number => bg === "BG1" ? BG1VOFS : BG2VOFS;

function attackerRows(config: MementoBattlerConfig): TaskRow[] {
  const data = [0, 0, 0, config.bgPriorityRank, config.shadowTop,
    config.shadowBottom, config.shadowTop, config.shadowBottom,
    config.side === "player" ? -12 : -64, 0, config.bgY, 0, 16,
    (config.shadowBottom - config.shadowTop) << 8, config.x - 32, config.x + 32];
  const rows: TaskRow[] = [];
  for (;;) {
    let shadowWrite = false;
    let alphaWrite: number | null = null;
    let scanlineStop = false;
    let windowWrite = false;
    switch (data[0]) {
      case 0:
        data[1] += 1;
        if (data[1] > 1) {
          data[1] = 0;
          data[2] += 1;
          if (data[2] & 1) {
            if (data[11] !== 12) data[11] += 1;
          } else if (data[12] !== 8) data[12] -= 1;
          alphaWrite = alpha(data[11], data[12]);
          if (data[11] === 12 && data[12] === 8) data[0] += 1;
        }
        break;
      case 1:
        data[4] -= 8;
        shadowWrite = true;
        if (data[4] < data[8]) data[0] += 1;
        break;
      case 2:
        data[4] -= 8;
        shadowWrite = true;
        data[14] += 4;
        data[15] -= 4;
        if (data[14] >= data[15]) data[14] = data[15];
        if (data[14] === data[15]) data[0] += 1;
        windowWrite = true;
        break;
      case 3:
        scanlineStop = true;
        data[0] += 1;
        break;
      case 4:
        return rows;
    }
    rows.push({ name: "AnimTask_MoveAttackerMementoShadow_Step", data: clone(data), shadowWrite, alphaWrite, scanlineStop, windowWrite });
  }
}

function targetRows(config: MementoBattlerConfig): TaskRow[] {
  const data = Array<number>(16).fill(0);
  data[3] = config.bgPriorityRank;
  data[10] = config.bgY;
  data[0] = 2; // States 0 and 1 execute before the first retained task row.
  const rows: TaskRow[] = [
    { name: "AnimTask_MoveTargetMementoShadow", data: clone(data), shadowWrite: false, alphaWrite: null, scanlineStop: false, windowWrite: false },
  ];

  data[7] = config.shadowBottom;
  data[6] = config.shadowTop;
  data[13] = (data[7] - data[6]) << 8;
  data[14] = config.x - 4;
  data[15] = config.x + 4;
  data[8] = config.side === "player" ? -12 : -64;
  data[4] = data[8];
  data[5] = data[8];
  data[11] = 12;
  data[12] = 8;
  data[0] = 3;
  rows.push({ name: "AnimTask_MoveTargetMementoShadow", data: clone(data), shadowWrite: false, alphaWrite: null, scanlineStop: false, windowWrite: false });

  data[0] = 4;
  rows.push({ name: "AnimTask_MoveTargetMementoShadow", data: clone(data), shadowWrite: false, alphaWrite: null, scanlineStop: false, windowWrite: false });
  data[0] = 0;
  data[1] = 0;
  data[2] = 0;
  rows.push({ name: "AnimTask_MoveTargetMementoShadow_Step", data: clone(data), shadowWrite: false, alphaWrite: alpha(12, 8), scanlineStop: false, windowWrite: false });

  for (;;) {
    let shadowWrite = false;
    let alphaWrite: number | null = null;
    let scanlineStop = false;
    let windowWrite = false;
    switch (data[0]) {
      case 0:
        data[5] += 8;
        if (data[5] >= data[7]) data[5] = data[7];
        shadowWrite = true;
        if (data[5] === data[7]) data[0] += 1;
        break;
      case 1:
        if (data[15] - data[14] < 0x40) {
          data[14] -= 4;
          data[15] += 4;
        } else {
          data[1] = 1;
        }
        data[4] += 8;
        if (data[4] >= data[6]) data[4] = data[6];
        shadowWrite = true;
        if (data[4] === data[6] && data[1]) {
          data[1] = 0;
          data[0] += 1;
        }
        windowWrite = true;
        break;
      case 2:
        data[1] += 1;
        if (data[1] > 1) {
          data[1] = 0;
          data[2] += 1;
          if (data[2] & 1) {
            if (data[11]) data[11] -= 1;
          } else if (data[12] < 16) data[12] += 1;
          alphaWrite = alpha(data[11], data[12]);
          if (data[11] === 0 && data[12] === 16) data[0] += 1;
        }
        break;
      case 3:
        scanlineStop = true;
        data[0] += 1;
        break;
      case 4:
        return rows;
    }
    rows.push({ name: "AnimTask_MoveTargetMementoShadow_Step", data: clone(data), shadowWrite, alphaWrite, scanlineStop, windowWrite });
  }
}

/** Exact C-integer port of DoMementoShadowEffect over one selected bank. */
export function applyMementoShadowEffect(buffer: number[], data: readonly number[]): void {
  const span = data[5]! - data[4]!;
  if (span !== 0) {
    const increment = Math.trunc(data[13]! / span);
    let accumulator = data[6]! << 8;
    let i = 0;
    for (; i < data[4]!; i++) buffer[i] = data[10]! - (i - 159);
    for (i = data[4]!; i <= data[5]!; i++) {
      if (i >= 0) buffer[i] = (accumulator >> 8) - i + data[10]!;
      accumulator += increment;
    }
    let value = data[10]! - (i - 159);
    for (; i < data[7]!; i++) {
      if (i >= 0) {
        buffer[i] = value;
        value -= 1;
      }
    }
  } else {
    let value = data[10]! + 159;
    for (let i = 0; i < 112; i++) buffer[i] = value--;
  }
}

function setBg(bg: MementoBg, battleBg: number[], x: number, y: number): void {
  const offset = bg === "BG1" ? 0 : 2;
  battleBg[offset] = x;
  battleBg[offset + 1] = y;
}

function addOtherBgX(bg: MementoBg, battleBg: number[]): void {
  battleBg[bg === "BG1" ? 2 : 0] += 240;
}

/** Produce the complete move-owned source window through its first inactive row. */
export function reduceMemento(config: MementoConfig): readonly MementoState[] {
  if (config.initialScanlineBuffers.some((bank) => bank.length !== 320)) {
    throw new Error("Memento requires both complete 320-entry scanline banks");
  }
  const attacker = attackerRows(config.attacker);
  const attackerLast = ATTACKER_START_AGE + attacker.length - 1;
  const handleStart = attackerLast + 2;
  const handleReset = handleStart + 2;
  const targetStart = attackerLast + 21;
  const target = targetRows(config.target);
  const targetLast = targetStart + target.length - 1;
  const targetCleanup = targetLast + 1;
  const clearStart = targetLast + 2;
  const clearReset = clearStart + 3;
  const blendoffAge = clearStart + 5;
  const firstInactive = blendoffAge + 3;

  const banks: [number[], number[]] = [clone(config.initialScanlineBuffers[0]), clone(config.initialScanlineBuffers[1])];
  let srcBuffer = config.initialScanlineSourceBuffer;
  let scanlineState: 0 | 1 | 3 = 0;
  let dmaDest = INITIAL_DMA_DEST;
  const battleBg = [0, 0, 0, 0, 0, 0];
  let hardwareAlpha = 0;
  let pendingAlpha: number | null = null;
  let hardwareBldcnt = 0;
  let pendingBldcnt: number | null = null;
  let hardwareWinout = WIN_ALL;
  let pendingWinout: number | null = null;
  const black = new Set<number>();
  const result: MementoState[] = [];

  for (let age = 0; age <= firstInactive; age++) {
    if (pendingAlpha !== null) { hardwareAlpha = pendingAlpha; pendingAlpha = null; }
    if (pendingBldcnt !== null) { hardwareBldcnt = pendingBldcnt; pendingBldcnt = null; }
    if (pendingWinout !== null) { hardwareWinout = pendingWinout; pendingWinout = null; }

    if (age === 1) {
      hardwareBldcnt = BLDCNT_ALPHA_ALL;
      hardwareAlpha = alpha(0, 16);
    }
    if (age === 4) setBg(config.attacker.bg, battleBg, config.attacker.bgX, config.attacker.bgY);

    let task: MementoTaskState | null = null;
    let current: TaskRow | null = null;
    if (age >= ATTACKER_START_AGE && age <= attackerLast) {
      current = attacker[age - ATTACKER_START_AGE]!;
      task = { name: current.name, data: current.data };
      if (age === ATTACKER_START_AGE) {
        addOtherBgX(config.attacker.bg, battleBg);
        if (config.attacker.bg === "BG1") hardwareBldcnt = bgBldcnt(config.attacker.bg);
        else pendingBldcnt = bgBldcnt(config.attacker.bg);
        pendingWinout = bgWinout(config.attacker.bg);
        dmaDest = bgVofs(config.attacker.bg);
        scanlineState = 1;
        black.add(config.attacker.bgPaletteId);
        for (const bank of banks) for (let i = 0; i < 112; i++) bank[i] = config.attacker.bgY;
      } else if (scanlineState !== 0) {
        srcBuffer = (srcBuffer ^ 1) as 0 | 1;
      }
    } else if (age >= handleStart && age < handleReset) {
      task = { name: "AnimTask_MementoHandleBg", data: Array<number>(16).fill(0) };
    } else if (age >= targetStart && age <= targetLast) {
      current = target[age - targetStart]!;
      task = { name: current.name, data: current.data };
      if (age === targetStart) {
        setBg(config.target.bg, battleBg, config.target.bgX, config.target.bgY);
        addOtherBgX(config.target.bg, battleBg);
        pendingBldcnt = bgBldcnt(config.target.bg);
        black.add(config.target.bgPaletteId);
      }
      if (age === targetStart + 2) {
        dmaDest = bgVofs(config.target.bg);
        scanlineState = 1;
        for (const bank of banks) {
          let value = config.target.bgY + 159;
          for (let i = 0; i < 112; i++) bank[i] = value--;
        }
      } else if (age > targetStart + 2 && scanlineState !== 0) {
        srcBuffer = (srcBuffer ^ 1) as 0 | 1;
      }
      if (age === targetStart + 3) {
        battleBg[4] = s16(((config.target.x - 4) << 8) | (config.target.x + 4));
        battleBg[5] = 160;
        pendingWinout = bgWinout(config.target.bg);
      }
    } else if (age >= clearStart && age <= clearStart + 2) {
      const data = Array<number>(16).fill(0);
      data[1] = age === clearStart ? 1 : 2;
      data[2] = config.target.battlerId;
      task = { name: "Task_ClearMonBgStatic", data };
    }

    if (age === ATTACKER_START_AGE) {
      battleBg[4] = s16(((config.attacker.x - 32) << 8) | (config.attacker.x + 32));
      battleBg[5] = 160;
    }
    if (current?.windowWrite) battleBg[4] = s16((current.data[14]! << 8) | current.data[15]!);
    if (age === handleReset) setBg(config.attacker.bg, battleBg, 0, 0);
    if (age === targetCleanup) {
      battleBg[4] = 0;
      battleBg[5] = 0;
      pendingWinout = WIN_ALL;
    }
    if (age === clearReset) setBg(config.target.bg, battleBg, 0, 0);

    if (current?.shadowWrite) applyMementoShadowEffect(banks[srcBuffer], current.data);
    if (current?.alphaWrite !== null && current?.alphaWrite !== undefined) pendingAlpha = current.alphaWrite;
    if (current?.scanlineStop) scanlineState = 3;
    else if (scanlineState === 3) scanlineState = 0;

    if (age === targetStart - 3) {
      hardwareBldcnt = BLDCNT_ALPHA_ALL;
      hardwareAlpha = alpha(0, 16);
    }
    if (age === blendoffAge) {
      hardwareBldcnt = 0;
      hardwareAlpha = 0;
    }

    let scriptOffset: number;
    if (age === 0) scriptOffset = 0;
    else if (age <= 3) scriptOffset = 5;
    else if (age <= 6) scriptOffset = 14;
    else if (age <= 56) scriptOffset = 27;
    else if (age <= attackerLast) scriptOffset = 31;
    else if (age < handleStart) scriptOffset = 31;
    else if (age < handleReset) scriptOffset = 39;
    else if (age < targetStart - 3) scriptOffset = 41;
    else if (age < targetStart) scriptOffset = 46;
    else if (age < clearStart) scriptOffset = 59;
    else if (age < blendoffAge) scriptOffset = 64;
    else scriptOffset = 67;

    const previousBg = result.at(-1)?.battleBg;
    const active = age < firstInactive;
    result.push({
      age,
      active,
      scriptOffset,
      visualTaskCount: (age >= ATTACKER_START_AGE && age <= attackerLast)
        || (age >= targetStart && age <= targetLast) ? 1 : 0,
      phase: !active ? "inactive" : age < ATTACKER_START_AGE ? "setup"
        : age <= attackerLast ? "attacker" : age < targetStart ? "between"
          : age <= targetLast ? "target" : "cleanup",
      task,
      scanline: {
        srcBuffer, state: scanlineState, dmaDest, dmaControl: DMA_CONTROL_16BIT,
        setFirstScanlineReg: SET_FIRST_SCANLINE_REG,
        buffers: [clone(banks[0]), clone(banks[1])],
      },
      battleBg: {
        bg1X: battleBg[0]!, bg1Y: battleBg[1]!, bg2X: battleBg[2]!, bg2Y: battleBg[3]!,
        win0h: battleBg[4]!, win0v: battleBg[5]!,
      },
      registers: {
        win0h: age === 0 ? config.initialWindow.win0h : previousBg!.win0h & 0xffff,
        win0v: age === 0 ? config.initialWindow.win0v : previousBg!.win0v & 0xffff,
        winin: WIN_ALL, winout: hardwareWinout, bldcnt: hardwareBldcnt, bldalpha: hardwareAlpha,
      },
      monbg: { attacker: age >= 4 && age < handleReset, target: age >= targetStart && age < clearReset },
      battlerPriority: { attacker: 2, target: age >= ATTACKER_START_AGE && age < firstInactive ? 3 : 2 },
      blackBgPaletteIds: [...black].sort((a, b) => a - b),
    });
  }
  return result;
}

export function mementoAtAge(age: number, config: MementoConfig): MementoState {
  const states = reduceMemento(config);
  if (!Number.isInteger(age) || age < 0 || age >= states.length) throw new RangeError(`Memento age ${age} is outside the complete source window`);
  return states[age]!;
}
