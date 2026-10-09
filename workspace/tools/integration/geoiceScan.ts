/**
 * geoice scan (docs/icy-wind-blizzard-geometry.md): Icy Wind (196) / Blizzard (59) at the production live geometry
 * (liveBattlerAnchors through createBattleCommandFieldArtView, exactly as liveMoveAnimation.ts case 196 / 59) for every
 * species pair; reports which pairs the retained-table replay declines and Blizzard's geometry-derived impact start age.
 * usage: node --experimental-strip-types --no-warnings tools/integration/geoiceScan.ts [out.json]
 */
import { writeFileSync } from "node:fs";
import speciesStats from "../../src/data/gen/species-stats.json" with { type: "json" };
import { createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";
import { liveBattlerAnchors } from "../../src/engine/liveMoveAnimation.ts";
import { icyWindEffectOamOrderAtAge } from "../../src/animation/icyWind.ts";
import { blizzardEffectOamOrderAtAge, blizzardImpactStartAge } from "../../src/animation/blizzard.ts";

const species = (speciesStats as { species: { id: number; name: string }[] }).species.filter(({ id }) => id >= 1 && id <= 411);
const nameOf = new Map(species.map(({ id, name }) => [id, name.replace("SPECIES_", "")]));
type Side = "player" | "opponent";
function geometryOf(attackerSide: Side, player: number, opponent: number) {
  const art = createBattleCommandFieldArtView({ player: { species: player }, opponent: { species: opponent } } as never);
  const targetSide: Side = attackerSide === "player" ? "opponent" : "player";
  const a = liveBattlerAnchors(attackerSide, art), t = liveBattlerAnchors(targetSide, art);
  return { attackerCenter: a.picOffsetPoint, targetCenter: t.picOffsetPoint, spikeTargetCenter: t.battlePositionCenter };
}
const rows: unknown[] = [];
const summary: Record<string, { pairs: number; declined: number; geometries: number; declinedGeometries: number; impact?: Record<number, number> }> = {};
const valid: number[] = [];
for (const { id } of species) { try { geometryOf("player", id, id); valid.push(id); } catch { /* no picture */ } }
for (const move of [196, 59] as const) for (const side of ["player", "opponent"] as Side[]) {
  const seen = new Map<string, boolean>(); const s = summary[`${move}/${side}`] = { pairs: 0, declined: 0, geometries: 0, declinedGeometries: 0, impact: {} };
  for (const player of valid) for (const opponent of valid) {
    const g = geometryOf(side, player, opponent);
    const key = move === 196 ? JSON.stringify(g) : JSON.stringify({ a: g.attackerCenter, t: g.targetCenter });
    let ok = seen.get(key);
    if (ok === undefined) {
      try {
        if (move === 196) icyWindEffectOamOrderAtAge(286, side, g);
        else blizzardEffectOamOrderAtAge(side === "player" ? 371 : 360, side, g);
        ok = true;
      } catch { ok = false; }
      seen.set(key, ok); s.geometries++; if (!ok) s.declinedGeometries++;
      if (move === 59) { const i = blizzardImpactStartAge(side, g); s.impact![i] = (s.impact![i] ?? 0) + 1; }
      rows.push({ move, side, player: nameOf.get(player), opponent: nameOf.get(opponent), geometry: g, provable: ok });
    }
    s.pairs++; if (!ok) s.declined++;
  }
}
console.log(JSON.stringify(summary));
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify({ species: valid.length, summary, geometries: rows }, null, 1) + "\n");
