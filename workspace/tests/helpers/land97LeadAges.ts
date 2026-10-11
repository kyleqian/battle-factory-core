import enemyElevations from "../../src/data/gen/enemy-mon-elevations.json" with { type: "json" };
// land97: the banked idle94 lead rows (tools/integration/fixtures/idle94/idle94-lead-rows.diff). A live move body of these 40 ids
// presents N extra rows showing its age-0 frame, so the command lasts D + N rows (the replay's per-row phaseElapsed, 0 .. D + N - 1;
// the effect age is max(0, elapsed - N)).
export const LAND97_LEAD_ROWS: ReadonlyMap<number, number> = new Map([
  [41, 10], [44, 10], [51, 7], [52, 4], [55, 10], [71, 10], [74, 1], [75, 13], [82, 7], [92, 7], [93, 5], [94, 5], [106, 1], [120, 4],
  [124, 4], [136, 1], [146, 13], [153, 4], [158, 4], [184, 4], [188, 4], [204, 4], [207, 7], [225, 6], [232, 4], [247, 5], [248, 5],
  [269, 10], [282, 6], [294, 1], [299, 10], [305, 7], [313, 1], [325, 8], [334, 1], [337, 6], [339, 4], [342, 7], [343, 1], [347, 3],
]);

/**
 * The per-row phaseElapsed sequence of an ordinary live body of move `id` whose accepted body lasts `duration` rows. With an ELEVATED
 * opponent on the field (`opponent` = its species symbol) the body keeps no lead rows (live audit 24 / shadow105: the ROM's lead row 0
 * shows the enemy shadow, not yet modelled).
 */
export function land97Ages(id: number, duration: number, opponent?: string): number[] {
  const elevated = opponent !== undefined && ((enemyElevations as Record<string, number>)[opponent] ?? 0) > 0;
  const lead = elevated ? 0 : LAND97_LEAD_ROWS.get(id) ?? 0;
  return Array.from({ length: duration + lead }, (_, row) => row);
}
