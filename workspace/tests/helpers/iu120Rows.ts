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

/** The per-row phaseElapsed sequence of an ordinary live body whose accepted body lasts `duration` rows: 0 .. P + N + D + T - 1. */
export function iu120Ages(id: number, duration: number, side: Iu120Side = "player"): number[] {
  return Array.from({ length: duration + (LAND97_LEAD_ROWS.get(id) ?? 0) + iu120Extra(id, side) }, (_, row) => row);
}

/** The per-row effect ages of an ordinary live body of `duration` rows: [0 x (P + N + 1), 1 .. D - 1, (D - 1) x T]. */
export function iu120EffectAges(id: number, duration: number, side: Iu120Side = "player"): number[] {
  const hold = iu120Pre(id, side) + (LAND97_LEAD_ROWS.get(id) ?? 0);
  return [...Array(hold).fill(0), ...Array.from({ length: duration }, (_, age) => age), ...Array(iu120Post(id, side)).fill(duration - 1)];
}
