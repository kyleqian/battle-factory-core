/**
 * lsbz (B): Blizzard (59) opponent-attacker species-pair grid over the geometry-derived impact start (blizzardImpactStartAge, the same
 * traveling-particle callback replay geoice uses; production geometry = liveBattlerAnchors(...).picOffsetPoint through
 * createBattleCommandFieldArtView, exactly as liveMoveAnimation.ts case 59). For every impact age seen (194..206) it selects up to
 * PER_AGE Factory species pairs (attacker base speed > target base speed so the lab's Blizzard moves first) and records the PREDICTION,
 * written and committed before any probe runs:
 * - the ROM body (activation .. first inactive) = impact + 164 rows with the optional restore lag (impact + 163 without), i.e. the
 *   d4tails counter bodyRows (activation .. last active) = impact + 163 / impact + 162;
 * - main-loop lag ages = [impact + 139, impact + 160, impact + 161] with the optional lag, [impact + 159, impact + 160] without
 *   (the impact-197 d4tails shape [336, 357, 358] / [356, 357] shifted by impact - 197);
 * - the live window (policy phase, the lag) = impact + 164 rows.
 * Also reports the player side's impact distribution (the player live duration is unchanged iff every player geometry is 208).
 * usage: node --experimental-strip-types --no-warnings tools/integration/lsbzBlizzardGrid.ts <out.json> [perAge=2]
 */
import { writeFileSync } from "node:fs";
import speciesStats from "../../src/data/gen/species-stats.json" with { type: "json" };
import frontier from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import { createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";
import { liveBattlerAnchors } from "../../src/engine/liveMoveAnimation.ts";
import { blizzardImpactStartAge } from "../../src/animation/blizzard.ts";

type Side = "player" | "opponent";
const [out, perAgeArg] = process.argv.slice(2);
const PER_AGE = Number(perAgeArg ?? 2);
const stats = (speciesStats as { species: { id: number; name: string; baseSpeed: number }[] }).species;
const byName = new Map(stats.map((s) => [s.name, s]));
const factory = [...new Set((frontier as { entries: { species: string }[] }).entries.map((e) => e.species))].sort()
  .map((n) => byName.get(n)!).filter(Boolean);
// A battler's picOffsetPoint depends on its own side and species only: one art view per species.
const pic = new Map<string, { x: number; y: number } | null>();
function picOf(side: Side, species: number) {
  const key = `${side}/${species}`;
  if (!pic.has(key)) {
    try {
      const art = createBattleCommandFieldArtView({ player: { species }, opponent: { species } } as never);
      pic.set(key, liveBattlerAnchors(side, art).picOffsetPoint);
    } catch { pic.set(key, null); }
  }
  return pic.get(key)!;
}
function geometryOf(attackerSide: Side, player: number, opponent: number) {
  const a = picOf(attackerSide, attackerSide === "player" ? player : opponent);
  const t = picOf(attackerSide === "player" ? "opponent" : "player", attackerSide === "player" ? opponent : player);
  if (a === null || t === null) throw new Error("no battle picture");
  return { attackerCenter: a, targetCenter: t };
}
const impact: Record<Side, Record<number, number>> = { player: {}, opponent: {} };
const impactCache = new Map<string, number>();
const candidates: Record<number, { attacker: string; target: string; geometry: unknown; speed: [number, number] }[]> = {};
for (const att of factory) for (const tgt of factory) {
  for (const side of ["player", "opponent"] as Side[]) {
    let g;
    try { g = side === "opponent" ? geometryOf("opponent", tgt.id, att.id) : geometryOf("player", att.id, tgt.id); } catch { continue; }
    const key = `${side}/${JSON.stringify(g)}`;
    let i = impactCache.get(key);
    if (i === undefined) impactCache.set(key, i = blizzardImpactStartAge(side, g));
    impact[side][i] = (impact[side][i] ?? 0) + 1;
    if (side === "opponent" && att.baseSpeed > tgt.baseSpeed)
      (candidates[i] ??= []).push({ attacker: att.name.replace("SPECIES_", ""), target: tgt.name.replace("SPECIES_", ""), geometry: g,
        speed: [att.baseSpeed, tgt.baseSpeed] });
  }
}
// Deterministic spread: per impact age, distinct attackers first, then the attacker / target name order.
const grid = Object.keys(candidates).map(Number).sort((a, b) => a - b).flatMap((i) => {
  const used = new Set<string>(); const picked: typeof candidates[number] = [];
  for (const c of candidates[i]!) if (picked.length < PER_AGE && !used.has(c.attacker) && !used.has(c.target)) { picked.push(c); used.add(c.attacker); used.add(c.target); }
  return picked.map((c) => ({ ...c, impactStartAge: i,
    prediction: { counterBodyRowsWithLag: i + 163, counterBodyRowsWithoutLag: i + 162, lagAgesWithLag: [i + 139, i + 160, i + 161],
      lagAgesWithoutLag: [i + 159, i + 160], liveWindowRows: i + 164, policyPhase: "event" } }));
});
const result = { schema: "lsbz-blizzard-grid/v1", rule: "liveMoveAnimationDuration(59, opponent) = blizzardImpactStartAge(opponent, geometry) + 164",
  factorySpecies: factory.length, impactDistribution: impact, grid };
console.log(JSON.stringify({ impactDistribution: impact, grid: grid.map((g) => `${g.impactStartAge} ${g.attacker}->${g.target}`) }));
if (out) writeFileSync(out, JSON.stringify(result, null, 1) + "\n");
