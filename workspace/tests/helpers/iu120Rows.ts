// iu120: idle98's universal rows, landed (docs/iu120-universal-rows.md, docs/next-adapters-idle98.md). A live move-animation command
// presents P pre rows (the activation row's image) before land97's N idle lead rows and T post rows (its last row) after the accepted
// body: one hold of P + N + D + T rows, effect age clamp(elapsed - P - N, 0, D - 1). P = 3 except the 13 masked moves, T = 2 only on
// trail -1 sides; Struggle (live after idle98's evidence, rows unmeasured), a Substitute swap and a declined body keep 0 / 0.
// The test-side copy of the production masks (battleResolutionPresentationRender.ts), so a pin never reads the code it checks.
import { LAND97_LEAD_ROWS } from "./land97LeadAges.ts";

export type Iu120Side = "player" | "opponent";
const bit = (side: Iu120Side) => (side === "player" ? 1 : 2);

export const IU120_PRE_ROWS = 3;
export const IU120_POST_ROWS = 2;
export const IU120_NO_PRE_ROW_SIDES: ReadonlyMap<number, number> = new Map([
  [9, 3], [20, 3], [48, 3], [53, 3], [104, 3], [105, 3], [157, 1], [185, 3], [208, 3], [209, 3], [223, 3], [227, 3], [235, 3],
]);
// sub183: 164 (Substitute) both sides -- the ROM's healthbarupdate row plus waitanimation's release row, 4 / 4 dense windows 0 px.
export const IU120_POST_ROW_SIDES: ReadonlyMap<number, number> = new Map([
  [2, 3], [5, 3], [11, 3], [12, 3], [14, 3], [21, 3], [23, 3], [25, 3], [27, 3], [29, 3], [32, 3], [34, 3], [35, 3], [36, 3],
  [38, 3], [39, 3], [42, 3], [43, 3], [49, 3], [50, 3], [56, 3], [60, 3], [61, 3], [62, 3], [65, 3], [66, 3], [67, 3], [68, 3],
  [69, 3], [78, 3], [79, 3], [83, 3], [85, 3], [86, 3], [87, 3], [88, 3], [90, 3], [93, 3], [94, 3], [95, 3], [97, 3], [98, 3],
  [101, 3], [103, 3], [106, 3], [107, 3], [108, 3], [109, 3], [111, 3], [112, 3], [114, 3], [115, 3], [116, 3], [118, 3], [122, 3], [126, 1],
  [129, 3], [131, 3], [133, 3], [136, 3], [147, 3], [148, 3], [151, 3], [152, 3], [154, 3], [156, 3], [162, 3], [163, 3], [172, 3], [178, 3],
  [164, 3], [180, 3], [182, 3], [186, 3], [187, 3], [192, 1], [195, 3], [197, 3], [201, 3], [203, 3], [211, 3], [212, 3], [213, 3], [214, 2], [215, 3],
  [218, 3], [219, 3], [226, 3], [230, 3], [231, 3], [236, 3], [238, 3], [242, 3], [243, 3], [246, 3], [250, 3], [253, 3], [254, 3], [257, 3],
  [259, 3], [263, 3], [264, 3], [265, 3], [266, 3], [269, 3], [271, 3], [272, 3], [275, 3], [277, 3], [280, 3], [281, 3], [283, 3], [287, 3],
  [288, 3], [290, 3], [294, 3], [302, 3], [306, 3], [312, 3], [317, 3], [319, 3], [321, 3], [332, 3], [334, 3], [335, 3], [336, 3], [339, 3],
  [341, 3], [345, 3], [348, 3], [349, 3],
]);
export const IU120_UNMEASURED_IDS: ReadonlySet<number> = new Set([165]);

/** P: the pre rows of an ordinary live body of move `id` by `side`. */
export function iu120Pre(id: number, side: Iu120Side = "player"): number {
  return IU120_UNMEASURED_IDS.has(id) || ((IU120_NO_PRE_ROW_SIDES.get(id) ?? 0) & bit(side)) !== 0 ? 0 : IU120_PRE_ROWS;
}

/** T: the post rows of an ordinary live body of move `id` by `side`. */
export function iu120Post(id: number, side: Iu120Side = "player"): number {
  return !IU120_UNMEASURED_IDS.has(id) && ((IU120_POST_ROW_SIDES.get(id) ?? 0) & bit(side)) !== 0 ? IU120_POST_ROWS : 0;
}

/** P + T: the rows iu120 adds to an ordinary live body (row counts, durations and frame totals move by it per body). */
export function iu120Extra(id: number, side: Iu120Side = "player"): number {
  return iu120Pre(id, side) + iu120Post(id, side);
}

/**
 * ont193 (docs/ont193-scene-on-tails.md): the Scene ON source-derived script tail frames a no-hit body of move `id` presents after its live rows
 * (census 0..999 per-move frame delta; the same tail every Scene ON body of that move carries). 0 for every other move.
 */
const ONT193_SCRIPT_TAIL_FRAMES: ReadonlyMap<number, number> = new Map(Object.entries({ 14: 3, 28: 6, 39: 3, 43: 3, 50: 4, 97: 3, 103: 3, 106: 3, 107: 3, 108: 3, 112: 3, 115: 3, 116: 4, 133: 3, 148: 3, 151: 3, 178: 3, 180: 4, 182: 3, 195: 3, 197: 3, 201: 4, 203: 3, 213: 4, 215: 4, 219: 4, 230: 3, 254: 3, 259: 4, 266: 3, 269: 4, 271: 5, 272: 4, 275: 3, 277: 2, 281: 9, 288: 3, 294: 3, 312: 4, 319: 3, 321: 5, 334: 3, 336: 3, 339: 4, 349: 4,
  // tl205 (docs/tl204-zero-tail-rows.md): the tl204-measured zero-tail moves, tail frames = scriptTailRows - 1 (trail -1, post 0): Leech Seed, Double Team, Light Screen, Scary Face, Charm, Rain Dance, Sunny Day, Hail, Calm Mind.
  73: 39, 104: 5, 113: 6, 184: 5, 204: 5, 240: 5, 241: 6, 258: 6, 347: 6 }).map(([id, frames]) => [Number(id), frames]));
export function ont193ScriptTail(id: number): number {
  return ONT193_SCRIPT_TAIL_FRAMES.get(id) ?? 0;
}

/**
 * hpd4 / hpd5 (docs/hpd1-hp-hold.md): the audited bodies present the ROM script lead (the rows `attackanimation` runs after the used print) as the command's first
 * rows and a hit tail after the live body. The test-side copy of production's lead (route-measured, player attacker, first body) and HPD4_BODY_TAIL_ROWS.
 */
export const HPD4_BODY_LEAD_ROWS: ReadonlyMap<number, number> = new Map([[49, 9], [82, 9], [111, 3], [205, 10], [301, 10], [69, 6]]);
export const HPD4_BODY_TAIL_ROWS: ReadonlyMap<number, number> = new Map([[49, 3], [82, 26], [111, 3], [205, 3], [301, 3], [69, 1]]);
/** The rows an audited body's lead and hit tail add; 0 unless the caller passes the body's lead (Ice Ball: 10 on turn 1, 9 after; the others HPD4_BODY_LEAD_ROWS). */
export function hpd4BodyRows(id: number, lead = 0): number {
  return lead === 0 ? 0 : lead + (HPD4_BODY_TAIL_ROWS.get(id) ?? 0);
}

/** The per-row phaseElapsed sequence of an ordinary live body whose accepted body lasts `duration` rows: 0 .. P + N + D + T - 1 (+ the audited lead and hit tail). */
export function iu120Ages(id: number, duration: number, side: Iu120Side = "player", lead?: number): number[] {
  return Array.from({ length: duration + (LAND97_LEAD_ROWS.get(id) ?? 0) + iu120Extra(id, side) + ont193ScriptTail(id) + hpd4BodyRows(id, lead) }, (_, row) => row);
}

/**
 * The per-row effect ages of an ordinary live body of `duration` rows: [0 x (P + N + 1), 1 .. D - 1, (D - 1) x T]. An audited body (hpd4 / hpd5) adds its lead rows
 * at age 0, and its hit tail rows past the body: held at D - 1 behind post / script-tail rows, otherwise the age keeps counting (D .. D + tail - 1; the adapter holds its
 * last picture there, and a Dragon Rage tail needs the counting age: clamping it loses 25 matched frames of hpd1-dragonrage-on).
 */
export function iu120EffectAges(id: number, duration: number, side: Iu120Side = "player", lead?: number): number[] {
  const hold = iu120Pre(id, side) + (LAND97_LEAD_ROWS.get(id) ?? 0);
  const bodyLead = lead ?? 0;
  const tail = bodyLead === 0 ? 0 : HPD4_BODY_TAIL_ROWS.get(id) ?? 0;
  const held = iu120Post(id, side) + ont193ScriptTail(id) > 0;
  return [...Array(hold + bodyLead).fill(0), ...Array.from({ length: duration }, (_, age) => age), ...Array(iu120Post(id, side)).fill(duration - 1), ...Array(ont193ScriptTail(id)).fill(duration - 1),
    ...Array.from({ length: tail }, (_, i) => (held ? duration - 1 : duration + i))];
}
