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
// hit1: Thunder Punch (9) left the masks with its static 10-row lead (LAND97_LEAD_ROWS).
export const IU120_NO_PRE_ROW_SIDES: ReadonlyMap<number, number> = new Map([
  [20, 3], [48, 3], [53, 3], [104, 3], [105, 3], [157, 1], [185, 3], [208, 3], [209, 3], [223, 3], [227, 3], [235, 3],
]);
/**
 * hit1 (docs/hit1-move-hit-timing.md): the test-side copy of Cmd_end's IsSEPlaying rows (production: liveMoveEndSeWaitRows) of the ordinary
 * bodies, both sides; "id@D" keys one body of a move by its live rows D (Sky Attack: the 148-row charge body holds 1 row, the 180-row strike
 * none). Every value is the ROM's: idle94's per-move trail (ROM first inactive row minus
 * production's end) + 1, plus the lead rows production does not present (Supersonic 7, Recover 10, Milk Drink 13, Dynamic Punch 19,
 * Synthesis 4), or the frame catcher's CATCHER_WATCH windows (Thunder Punch 135 rows, Twineedle 63, Metal Claw 157, Sludge 111, Ember 69,
 * Fire Punch 101 from the activation to gAnimScriptActive's fall). The rows after the body show the field (every script command has run).
 */
export const HIT1_CMD_END_SE_WAIT_ROWS: ReadonlyMap<number | string, number> = new Map<number | string, number>([
  [7, 1], [9, 22], [16, 44], [41, 17], [48, 21], [52, 3], [64, 14], [74, 20], [75, 20], [105, 15], [124, 6], [158, 2], [176, 3], [179, 1],
  [190, 1], [200, 1], [206, 13], [208, 17], [209, 9], [223, 46], [225, 1], [232, 14], [235, 10], [299, 9], [316, 63], [342, 4], [343, 21],
  [350, 1], [143, 1], ["143@180", 0],
]);
export function hit1SeWaitRows(id: number, _side: Iu120Side = "player", duration?: number): number {
  return (duration === undefined ? undefined : HIT1_CMD_END_SE_WAIT_ROWS.get(`${id}@${duration}`)) ?? HIT1_CMD_END_SE_WAIT_ROWS.get(id) ?? 0;
}
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
export function iu120Post(id: number, side: Iu120Side = "player", duration?: number): number {
  // hit1: a body Cmd_end holds for its SEs ends on the ROM's first inactive row, so it has the post rows.
  return !IU120_UNMEASURED_IDS.has(id) && (((IU120_POST_ROW_SIDES.get(id) ?? 0) & bit(side)) !== 0 || hit1SeWaitRows(id, side, duration) > 0) ? IU120_POST_ROWS : 0;
}

/** P + T: the rows iu120 adds to an ordinary live body (row counts, durations and frame totals move by it per body). */
export function iu120Extra(id: number, side: Iu120Side = "player", duration?: number): number {
  return iu120Pre(id, side) + iu120Post(id, side, duration);
}

/**
 * ont193 (docs/ont193-scene-on-tails.md): the Scene ON source-derived script tail frames a no-hit body of move `id` presents after its live rows
 * (census 0..999 per-move frame delta; the same tail every Scene ON body of that move carries). 0 for every other move.
 */
const ONT193_SCRIPT_TAIL_FRAMES: ReadonlyMap<number, number> = new Map(Object.entries({ 14: 3, 28: 6, 39: 3, 43: 3, 50: 4, 97: 3, 103: 3, 106: 3, 107: 3, 108: 3, 112: 3, 115: 3, 116: 4, 133: 3, 148: 3, 151: 3, 178: 3, 180: 4, 182: 3, 195: 3, 197: 3, 201: 4, 203: 3, 213: 4, 215: 4, 219: 4, 230: 3, 254: 3, 259: 4, 266: 3, 269: 4, 271: 5, 272: 4, 275: 3, 277: 2, 281: 9, 288: 3, 294: 3, 312: 4, 319: 3, 321: 5, 334: 3, 336: 3, 339: 4, 349: 4,
  // tl205 (docs/tl204-zero-tail-rows.md): the tl204-measured zero-tail moves, tail frames = scriptTailRows - 1 (trail -1, post 0): Leech Seed, Double Team, Light Screen, Scary Face, Charm, Rain Dance, Sunny Day, Hail, Calm Mind (lse2: Leech Seed 3 and Calm Mind 4, their leads are presented in front of the body).
  73: 3, 104: 5, 113: 6, 184: 5, 204: 5, 240: 5, 241: 6, 258: 6, 347: 4 }).map(([id, frames]) => [Number(id), frames]));
export function ont193ScriptTail(id: number): number {
  return ONT193_SCRIPT_TAIL_FRAMES.get(id) ?? 0;
}

/**
 * lead2: ONE lead + tail rule per audited body (the test-side copy of production's rule classes, battleResolutionPresentation.ts `BODY_LEAD_RULE`, with the
 * ROM-measured values; route-measured, player attacker, first body). `lead`: the body's rows ahead of the live window (HPD4_BODY_LEAD_ROWS, what a caller that
 * presents the body passes); `defaultLead`: the lead a caller that passes none gets (Dig 91 / Solar Beam 76 have none: their charge turn carries no lead; Ice Ball 10 on
 * turn 1, 9 after: the caller passes it); `tail`: the rows after the body: a number (the explicit hpd4 / sta5 / lse2 tables) or "shape-a" = `6 - pre - post`.
 * Earthquake's lead is 11, every other EffectHit-family shape-A body's 5 (hpd8).
 */
interface Iu120BodyRule { readonly lead?: number; readonly defaultLead?: number; readonly tail: number | "shape-a" }
// lead2 B1: Double Kick 24 (hit 1) 16, Icy Wind 196, Water Pulse 352, Facade 263, Mega Kick 25, Counter 68 (4), Comet Punch 4 / Doubleslap 3 (hit 1: 15), Mega Drain 72.
const SHAPE_A_RULE_IDS: readonly number[] = [9, 24, 196, 352, 263, 25, 68, 4, 72, 3, 332, 94, 85, 38, 98, 34, 246, 202, 58, 57, 91, 165, 157, 61, 126, 345, 53, 76, 44, 188, 89, 185, 56, 59, 247, 317, 60, 242, 282, 8, 29, 21, 175, 232, 163, 189, 7, 154, 67, 210, 149, 32, 337, 315, 124, 51, 93, 52, 224, 290, 129, 231, 309, 306, 238, 211, 138, 161, 55, 348, 228, 314, 183, 87, 65, 62, 23, 323, 179, 172, 136, 75, 36, 326, 229, 152, 351, 327, 310, 299, 284, 190, 162, 158, 146, 122, 66, 330, 325, 257, 123, 27, 305, 304, 245];
// lead3 B2 (the trailing ids): the measured bodies Shadow Ball .. Fire Punch (lead 5), Fury Swipes 154 / Low Kick 67 / Fury Cutter 210 / Psywave 149 / Horn Drill 32 (leads below), then the predicted counter-5 A? bodies.
const SHAPE_A_LEADS: ReadonlyMap<number, number> = new Map([[89, 11], [24, 16], [4, 15], [3, 15], [68, 4], [154, 15], [67, 8], [210, 9], [149, 6], [32, 7]]);
const shapeA = (id: number): Iu120BodyRule => ({ lead: SHAPE_A_LEADS.get(id) ?? 5, defaultLead: id === 91 || id === 76 ? undefined : SHAPE_A_LEADS.get(id) ?? 5, tail: "shape-a" });
// lead4 B3: the S status bodies (test-side copy of production's LEAD4_S_LEAD_MOVE_IDS): the script lead (passed by the caller) is presented before the body, and the script tail ONT193_SCRIPT_TAIL_FRAMES
// holds (lead included) shrinks by it: the row total is unchanged, so `hpd4BodyRows` adds nothing for them.
const S_LEAD_RULE_IDS: ReadonlySet<number> = new Set([
  104, 182, 113, 240, 184, 108, 201, 204, 219, 266, 28, 241, 213, 97, 334, 230, 151, 133, 258, 14, 203, 197, 349, 254, 215, 107, 281, 180, 288, 195, 115, 103,
  277, 178, 43, 39, 148, 106, 275, 112, 321, 259, 319, 271, 339, 294, 272, 50, 269, 116,
]);
const IU120_BODY_RULES: ReadonlyMap<number, Iu120BodyRule> = new Map<number, Iu120BodyRule>([
  // hpd4 lead-table bodies (explicit tails)
  [49, { lead: 9, tail: 3 }], [82, { lead: 9, tail: 26 }], [111, { lead: 3, tail: 3 }], [205, { lead: 10, tail: 3 }], [301, { lead: 10, tail: 3 }], [69, { lead: 6, tail: 1 }],
  ...SHAPE_A_RULE_IDS.map((id): [number, Iu120BodyRule] => [id, shapeA(id)]),
  // sta5 status bodies: the script tail only (their lead is passed by the caller: Flatter / Swagger 2, Spore 7, Toxic 10); Hypnosis (95) is lead 7 by default
  [260, { tail: 4 }], [207, { tail: 5 }], [147, { tail: 0 }], [92, { tail: 7 }], [95, { defaultLead: 7, tail: 0 }],
  // lse2 lead-first status bodies
  [73, { defaultLead: 36, tail: 0 }], [322, { defaultLead: 2, tail: 3 }], [347, { defaultLead: 2, tail: 3 }], [227, { defaultLead: 2, tail: 10 }],
  // lse4 (production's gap-print / lead-only classes and LSE4_SHAPE_A_MOVE_IDS): Revenge 279 is shape A (lead 5, tail 3); Absorb 71 lead 5, tail 3 + 2 window-short rows; Recycle 278 lead 2, tail 2 (gap 3);
  // Razor Wind 13 unleash lead 5, tail 4 (its charge turn: lead 1, tail 4, the caller passes the lead); Wish 273 lead 2, no tail (its pause is a separate command).
  [279, shapeA(279)], [71, { defaultLead: 5, tail: 5 }], [278, { defaultLead: 2, tail: 2 }], [13, { defaultLead: 5, tail: 4 }], [273, { defaultLead: 2, tail: 0 }],
  // lse2 hit tail table wins over the shape-A formula (Blizzard: 2)
  [59, { ...shapeA(59), tail: 2 }],
]);
export const HPD4_BODY_LEAD_ROWS: ReadonlyMap<number, number> = new Map([...IU120_BODY_RULES].filter(([, r]) => r.lead !== undefined).map(([id, r]): [number, number] => [id, r.lead!]));
// liv2: Self-Destruct has no body lead (its hp command carries it) but a 9-row hit tail after the live window; the age holds the last body row there.
const LIVE_MOVE_LEADLESS_TAIL_ROWS: ReadonlyMap<number, number> = new Map([[120, 9]]);
// sta5: ids whose age holds the last body row through the tail (test-side copy of production's STA5 status-tail class).
const STA5_STATUS_TAIL_IDS: ReadonlySet<number> = new Set([260, 207, 147, 92, 95]);
function hpd4BodyTail(id: number, side: Iu120Side, duration?: number): number {
  const tail = IU120_BODY_RULES.get(id)?.tail;
  if (tail === undefined) return 0;
  return tail === "shape-a" ? Math.max(0, 6 - iu120Pre(id, side) - iu120Post(id, side, duration)) : tail;
}
const defaultBodyLead = (id: number): number => IU120_BODY_RULES.get(id)?.defaultLead ?? 0;
/** The rows an audited body's lead and hit tail add; 0 unless the caller passes the body's lead (Ice Ball: 10 on turn 1, 9 after; the others HPD4_BODY_LEAD_ROWS). */
export function hpd4BodyRows(id: number, lead = defaultBodyLead(id), side: Iu120Side = "player", duration?: number): number {
  if (S_LEAD_RULE_IDS.has(id)) return 0;
  return lead === 0 ? LIVE_MOVE_LEADLESS_TAIL_ROWS.get(id) ?? 0 : lead + hpd4BodyTail(id, side, duration);
}

/** The per-row phaseElapsed sequence of an ordinary live body whose accepted body lasts `duration` rows: 0 .. P + N + D + T - 1 (+ the audited lead and hit tail). */
export function iu120Ages(id: number, duration: number, side: Iu120Side = "player", lead?: number): number[] {
  return Array.from({ length: duration + (LAND97_LEAD_ROWS.get(id) ?? 0) + hit1SeWaitRows(id, side, duration) + iu120Extra(id, side, duration) + ont193ScriptTail(id) + hpd4BodyRows(id, lead, side, duration) }, (_, row) => row);
}

/**
 * The per-row effect ages of an ordinary live body of `duration` rows: [0 x (P + N + 1), 1 .. D - 1, (D - 1) x T]. An audited body (hpd4 / hpd5) adds its lead rows
 * at age 0, and its hit tail rows past the body: held at D - 1 behind post / script-tail rows, otherwise the age keeps counting (D .. D + tail - 1; the adapter holds its
 * last picture there, and a Dragon Rage tail needs the counting age: clamping it loses 25 matched frames of hpd1-dragonrage-on).
 */
export function iu120EffectAges(id: number, duration: number, side: Iu120Side = "player", lead?: number): number[] {
  const hold = iu120Pre(id, side) + (LAND97_LEAD_ROWS.get(id) ?? 0);
  const bodyLead = lead ?? defaultBodyLead(id);
  const tail = bodyLead === 0 ? LIVE_MOVE_LEADLESS_TAIL_ROWS.get(id) ?? 0 : hpd4BodyTail(id, side, duration);
  const held = iu120Post(id, side, duration) + ont193ScriptTail(id) > 0 || LIVE_MOVE_LEADLESS_TAIL_ROWS.has(id) || STA5_STATUS_TAIL_IDS.has(id)
    || (IU120_BODY_RULES.get(id)?.tail === "shape-a" && bodyLead > 0); // production's holdHitTail: a shape-A hit tail holds the last body row
  const scriptTail = ont193ScriptTail(id) - (S_LEAD_RULE_IDS.has(id) ? bodyLead : 0);
  // hit1: Cmd_end's SE-wait rows hold the last body age (the scene draws the field there: `afterScript`).
  return [...Array(hold + bodyLead).fill(0), ...Array.from({ length: duration }, (_, age) => age), ...Array(hit1SeWaitRows(id, side, duration)).fill(duration - 1),
    ...Array(iu120Post(id, side, duration)).fill(duration - 1), ...Array(scriptTail).fill(duration - 1),
    ...Array.from({ length: tail }, (_, i) => (held ? duration - 1 : duration + i))];
}
