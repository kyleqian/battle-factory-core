/**
 * Source-relative presentation reducer for MOVE_ROCK_TOMB.
 *
 * Age zero is the first row whose script pointer is Move_ROCK_TOMB.  The
 * reducer is deliberately expressed in terms of the four source-created
 * sprite callbacks and the two source visual tasks.  It does not know about
 * battle resolution, RNG, damage, or a framebuffer.
 */

export interface RockTombConfig {
  readonly targetSpriteSlot: number;
  readonly targetInitialX2: number;
  readonly targetCenter: Readonly<{ x: number; y: number }>;
}

export interface RockTombRockState {
  readonly slot: 3 | 4 | 5 | 7;
  readonly x2: number;
  readonly y2: number;
  /** The four callback-owned fields in `struct Sprite.data`. */
  readonly data: readonly [number, number, number, number];
  readonly invisible: false;
}

export interface RockTombRedXState {
  readonly slot: 9;
  readonly data: readonly [50, number, 0, 0];
  readonly invisible: boolean;
}

export interface RockTombTaskState {
  readonly name:
    | "AnimTask_ShakeMon_Step"
    | "AnimTask_ShakeBattlePlatforms_Step";
  readonly data: readonly number[];
}

export interface RockTombState {
  readonly age: number;
  readonly active: boolean;
  readonly scriptOffset: number;
  readonly visualTaskCount: number;
  readonly rocks: readonly RockTombRockState[];
  readonly redX: RockTombRedXState | null;
  readonly tasks: readonly RockTombTaskState[];
  readonly targetX2: number;
  readonly targetY2: 0;
  readonly targetInvisible: false;
  readonly battleBg3: Readonly<{ x: number; y: number }>;
  readonly audio: readonly {
    readonly song: "SE_M_STRENGTH" | "SE_M_HYPER_BEAM";
    readonly pan: "target";
  }[];
}

const ROCKS: readonly {
  readonly startAge: number;
  readonly endAge: number;
  readonly slot: RockTombRockState["slot"];
  readonly x2: number;
  readonly baseY: number;
  readonly lifetime: number;
}[] = [
  { startAge: 26, endAge: 149, slot: 3, x2: 20, baseY: 12, lifetime: 114 },
  { startAge: 46, endAge: 153, slot: 4, x2: -20, baseY: 12, lifetime: 98 },
  { startAge: 66, endAge: 157, slot: 5, x2: 3, baseY: 6, lifetime: 82 },
  { startAge: 86, endAge: 161, slot: 7, x2: -3, baseY: 13, lifetime: 66 },
];

const clampAge = (age: number): number => Math.max(0, Math.trunc(age));

/** The script pointer after each source command boundary. */
export function rockTombScriptOffset(age: number): number {
  const t = clampAge(age);
  if (t === 0) return 0;
  if (t <= 3) return 3;
  if (t <= 6) return 6;
  if (t <= 25) return 21;
  if (t <= 35) return 41;
  if (t <= 45) return 62;
  if (t <= 55) return 81;
  if (t <= 65) return 102;
  if (t <= 75) return 121;
  if (t <= 85) return 142;
  if (t <= 95) return 161;
  if (t <= 121) return 182;
  if (t <= 172) return 229;
  return 230;
}

function rockAtAge(
  age: number,
  source: typeof ROCKS[number],
): RockTombRockState | null {
  if (age < source.startAge || age >= source.endAge) return null;
  const callbackAge = age - source.startAge;
  // AnimRockTomb's initializer runs the callback immediately.  Its stored
  // data[3] is therefore already -61 while y2 still reflects the pre-step
  // -64; subsequent rows use the same pre-increment value.
  if (callbackAge === 0) {
    return {
      slot: source.slot,
      x2: source.x2,
      y2: source.baseY - 64,
      data: [4, source.lifetime, source.baseY, -61],
      invisible: false,
    };
  }
  let data0 = 3;
  let data1 = source.lifetime;
  let data3 = -64;
  let y2 = source.baseY - 64;
  for (let row = 0; row <= callbackAge; row += 1) {
    if (data3 !== 0) {
      y2 = source.baseY + data3;
      data3 += data0;
      data0 += 1;
      if (data3 > 0) data3 = 0;
    } else {
      data1 -= 1;
    }
  }
  return {
    slot: source.slot,
    x2: source.x2,
    y2,
    data: [data0, data1, source.baseY, data3],
    invisible: false,
  };
}

function platformTask(age: number, startAge: number, vertical: boolean): RockTombTaskState | null {
  const elapsed = age - startAge;
  if (elapsed < 0) return null;
  if (vertical) {
    if (elapsed >= 4) return null;
    return {
      name: "AnimTask_ShakeBattlePlatforms_Step",
      data: [0, 2, 2 - Math.floor(elapsed / 2), 1 - (elapsed % 2), 0, 0, 0, 0],
    };
  }
  if (elapsed >= 18) return null;
  return {
    name: "AnimTask_ShakeBattlePlatforms_Step",
    data: [2, 0, 9 - Math.floor(elapsed / 2), 1 - (elapsed % 2), 0, 0, 0, 0],
  };
}

function battleBg3AtAge(age: number): Readonly<{ x: number; y: number }> {
  const horizontal = (startAge: number): number | null => {
    const elapsed = age - startAge;
    if (elapsed < 0 || elapsed >= 18) return null;
    return Math.floor(elapsed / 2) % 2 === 0 ? -2 : 2;
  };
  for (const start of [7, 122]) {
    const x = horizontal(start);
    if (x !== null) return { x, y: 0 };
  }
  for (const start of [36, 56, 76, 96]) {
    if (age >= start && age < start + 4) return { x: 0, y: -2 };
  }
  return { x: 0, y: 0 };
}

function audioAtAge(age: number): RockTombState["audio"] {
  if (age === 36 || age === 56 || age === 76 || age === 96) {
    return [{ song: "SE_M_STRENGTH", pan: "target" }];
  }
  if (age === 122) return [{ song: "SE_M_HYPER_BEAM", pan: "target" }];
  return [];
}

function redXAtAge(age: number): RockTombRedXState | null {
  if (age < 122 || age >= 172) return null;
  const data1 = age - 121;
  return { slot: 9, data: [50, data1, 0, 0], invisible: data1 > 41 && data1 % 2 === 0 };
}

function shakeMonTask(age: number, targetSpriteSlot: number): RockTombTaskState | null {
  if (age < 122 || age >= 160) return null;
  const elapsed = age - 122;
  return {
    name: "AnimTask_ShakeMon_Step",
    data: [targetSpriteSlot, 19 - Math.floor(elapsed / 2), 1, 1 - (elapsed % 2), 3, 0, 0, 0],
  };
}

/** Reduce the complete retained source window (age 0 through the cleanup row). */
export function reduceRockTomb(config: RockTombConfig): readonly RockTombState[] {
  return Array.from({ length: 174 }, (_, age) => rockTombAtAge(age, config));
}

/** Pure source-relative view for any source age, including the display-lag age -1. */
export function rockTombAtAge(age: number, config: RockTombConfig): RockTombState {
  const t = Math.trunc(age);
  const active = t >= 0 && t < 173;
  const rocks = active
    ? ROCKS.map((source) => rockAtAge(t, source)).filter(
        (rock): rock is RockTombRockState => rock !== null,
      )
    : [];
  const redX = active ? redXAtAge(t) : null;
  const shake = active ? shakeMonTask(t, config.targetSpriteSlot) : null;
  const platformTasks = active
    ? [
        platformTask(t, 7, false),
        ...[36, 56, 76, 96].map((start) => platformTask(t, start, true)),
        platformTask(t, 122, false),
      ].filter((task): task is RockTombTaskState => task !== null)
    : [];
  const tasks = shake === null ? platformTasks : [shake, ...platformTasks];
  return {
    age: t,
    active,
    scriptOffset: rockTombScriptOffset(t),
    visualTaskCount: rocks.length + (redX === null ? 0 : 1) + (tasks.length),
    rocks,
    redX,
    tasks,
    targetX2: t >= 122 && t < 160
      ? (Math.floor((t - 122) / 2) % 2 === 1 ? 3 : 0)
      : (t >= 122 ? 0 : config.targetInitialX2),
    targetY2: 0,
    targetInvisible: false,
    battleBg3: active ? battleBg3AtAge(t) : { x: 0, y: 0 },
    audio: active ? audioAtAge(t) : [],
  };
}

/**
 * Source-relative target translation at the shared software-to-framebuffer
 * seam. Rock Tomb's late Red-X/ShakeMon phase has a move-local transfer
 * split: the live body is two source ages ahead of the ordinary preceding
 * software row, while the final `data[1] === 1` callback holds the positive
 * x2 through its last two scanouts. Before Red-X, the ordinary RAM+1 row is
 * the display contract.
 */
export function rockTombTargetDisplayX2(
  age: number,
  config: RockTombConfig,
): number {
  const displayed = rockTombAtAge(age - 1, config);
  if (displayed.redX === null) return displayed.targetX2;
  const current = rockTombAtAge(age, config);
  const shakeTail = current.tasks.some(
    (task) => task.name === "AnimTask_ShakeMon_Step" && task.data[1] === 1,
  );
  if (shakeTail) return 3;
  return rockTombAtAge(age + 2, config).targetX2;
}

/**
 * Settled-rock painter order at the shared Scene-ON seam. The source's
 * stable OAM order changes once the fourth fall reaches its first settled
 * callback row (`y2 === 1`); preserving that source-relative tie order is
 * observable only where the fourth rock overlaps the earlier rocks.
 */
export function rockTombSettledRocksForPainter(
  state: RockTombState,
): readonly RockTombRockState[] {
  const settled = state.rocks.filter((rock) => rock.slot !== 5);
  const fourthRock = settled.find((rock) => rock.slot === 7);
  if (fourthRock?.y2 !== 1) return settled;
  return [fourthRock, ...settled.filter((rock) => rock.slot !== 7)];
}
