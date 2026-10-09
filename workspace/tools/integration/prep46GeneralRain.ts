/**
 * prep46: General_Rain (B_ANIM_RAIN_CONTINUES; battle_anim_scripts.s:10511) drop program from the source rules, for the order carry
 * (docs/next-adapters-prep46.md s2). No live adapter exists; this is the minimal model a production carry would need.
 *
 * - Two AnimTask_CreateRaindrops tasks, args (0, 3, 60) (Move_RAIN_DANCE: 120): a spawn whenever the task timer % 3 == 1, x = Random2() % 240,
 *   y = Random2() % 80 per task in creation order (battle_anim_water.c:482-501); timer 1..58 -> 20 spawns x 2 drops x 2 words = 80 words.
 * - Spawn ages (from the general animation's activation edge, RAM-measured in prep46Words: 17, 20, ..., 74): GENERAL_RAIN_SPAWN_AGES.
 * - AnimRainDrop / AnimRainDrop_Step: the drop program of src/animation/rainDance.ts dropAtAge (y2 = 4 * min(13, pass - 1), 20 passes),
 *   WITHOUT Rain Dance's age-18 extra pass: General_Rain's script runs in the task phase, so its first createvisualtask (which runs the task
 *   at once, battle_anim.c Cmd_createvisualtask) creates the first pair after AnimateSprites like every later pair (the measured spawn gaps
 *   17 -> 20 are 3, Move_RAIN_DANCE's 18 -> 20 are 2).
 * - Slots: CreateSprite's lowest free slot over the entry in-use slots and the live drops (as rainDance.ts simulate).
 */
export const GENERAL_RAIN_SPAWN_AGES: readonly number[] = Object.freeze(Array.from({ length: 20 }, (_, k) => 17 + 3 * k));
/** The presentation-RNG plan General_Rain would register (4 words per spawn age: x0, y0, x1, y1). */
export const GENERAL_RAIN_RANDOM2_PLAN = Object.freeze(GENERAL_RAIN_SPAWN_AGES.map((ageOffset) => Object.freeze({ ageOffset, count: 4 })));

export interface GeneralRainDrop { readonly slot: number; readonly x: number; readonly y: number; readonly y2: number; readonly sourcePass: number;
  readonly subpriority: 4; readonly attr: readonly [number, number, number] }

/** Drops alive at `age` from the body's four-word draw rows (in plan order). */
export function generalRainDropsAtAge(age: number, draws: readonly (readonly number[])[], inUse: readonly number[]): GeneralRainDrop[] {
  const births: { age: number; slot: number; x: number; y: number }[] = [];
  const alive = (b: { age: number }, at: number) => at - b.age >= 0 && at - b.age < 20;
  GENERAL_RAIN_SPAWN_AGES.forEach((spawn, k) => {
    if (spawn > age) return;
    const w = draws[k]!;
    const occupied = new Set([...inUse, ...births.filter((b) => alive(b, spawn)).map((b) => b.slot)]);
    for (let task = 0; task < 2; task += 1) {
      let slot = 0;
      while (occupied.has(slot)) slot += 1;
      occupied.add(slot);
      births.push({ age: spawn, slot, x: w[2 * task]! % 240, y: w[2 * task + 1]! % 80 });
    }
  });
  return births.filter((b) => alive(b, age)).map((b) => {
    const sourcePass = age - b.age;
    const y2 = Math.min(13, Math.max(0, Math.min(18, sourcePass - 1))) * 4;
    const x2 = Math.min(13, Math.max(0, Math.min(18, sourcePass - 1)));
    const ready = sourcePass > 0;
    return { slot: b.slot, x: b.x, y: b.y, y2, sourcePass, subpriority: 4 as const,
      attr: ready ? [0x8000 | ((b.y + y2 - 16) & 0xff), 0x8000 | ((b.x + x2 - 8) & 0x1ff), 0x7931] as const : [0x8000, 0x8000, 0x7931] as const };
  }).sort((a, b) => a.slot - b.slot);
}
