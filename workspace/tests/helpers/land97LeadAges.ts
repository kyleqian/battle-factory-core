// land97: the banked idle94 lead rows (tools/integration/fixtures/idle94/idle94-lead-rows.diff). A live move body of these 42 ids (209 = bwf2's Spark) (53 = liv2's Flamethrower)
// presents N extra rows showing its age-0 frame, so the command lasts D + N rows (the replay's per-row phaseElapsed, 0 .. D + N - 1;
// the effect age is max(0, elapsed - N)).
// hit1: + Thunder Punch 9 (idle94 measured 10; the frame catcher's ROM rows show them static, docs/hit1-move-hit-timing.md).
export const LAND97_LEAD_ROWS: ReadonlyMap<number, number> = new Map([
  [9, 10], [41, 10], [44, 10], [51, 7], [209, 9], [52, 4], [55, 10], [71, 10], [74, 1], [75, 13], [82, 7], [92, 7], [93, 5], [94, 5], [106, 1], [120, 4],
  [53, 18], [124, 4], [136, 1], [146, 13], [153, 4], [158, 4], [184, 4], [188, 4], [204, 4], [207, 7], [225, 6], [232, 4], [247, 5], [248, 5],
  [269, 10], [282, 6], [294, 1], [299, 10], [305, 7], [325, 8], [334, 1], [337, 6], [339, 4], [342, 7], [343, 1], [347, 3],
]);

/** The per-row phaseElapsed sequence of an ordinary live body of move `id` whose accepted body lasts `duration` rows. */
export function land97Ages(id: number, duration: number): number[] {
  const lead = LAND97_LEAD_ROWS.get(id) ?? 0;
  return Array.from({ length: duration + lead }, (_, row) => row);
}
