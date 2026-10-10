// plans54: the Blizzard model's PREDICTED sprite-order plans (blizzardSpriteOrderPlan.ts over blizzard.ts's own allocator replay at the
// case-59 geometry: attacker / target picOffsetPoint) for the plans54Probe.py Blizzard grid, written BEFORE the probes ran
// (fixtures/plans54/blizzard-predictions.json). Keyed `<side>-<attacker>-<target>` (internal species ids).
// usage: node --experimental-strip-types tools/integration/plans54BlizzardPredict.ts <out.json>
import { writeFileSync } from "node:fs";
import { blizzardSpriteOrderPlanText } from "../../src/animation/blizzardSpriteOrderPlan.ts";
import { liveBattlerAnchors } from "../../src/engine/liveMoveAnimation.ts";
import { createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";

/** (attacker, target): PELIPPER / STEELIX, JYNX / LAPRAS, DEWGONG / CLOYSTER, ARTICUNO / SNORLAX (Ice-resisting or bulky targets: no KO). */
export const PLANS54_BLIZZARD_PAIRS: readonly (readonly [number, number])[] = [[310, 208], [124, 131], [87, 91], [144, 143]];

export function predictedBlizzardPlan(side: "player" | "opponent", attacker: number, target: number): string {
  const species = side === "player" ? { player: { species: attacker }, opponent: { species: target } } : { player: { species: target }, opponent: { species: attacker } };
  const art = createBattleCommandFieldArtView(species as never);
  return blizzardSpriteOrderPlanText(side, { attackerCenter: liveBattlerAnchors(side, art).picOffsetPoint,
    targetCenter: liveBattlerAnchors(side === "player" ? "opponent" : "player", art).picOffsetPoint });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const predictions = Object.fromEntries((["player", "opponent"] as const).flatMap(side =>
    PLANS54_BLIZZARD_PAIRS.map(([a, t]) => [`${side}-${a}-${t}`, predictedBlizzardPlan(side, a, t)])));
  writeFileSync(process.argv[2]!, JSON.stringify({ schema: "plans54-blizzard-predictions/v1",
    note: "Recorded before the plans54 Blizzard probes ran: blizzard.ts allocator replay at the case-59 geometry.", predictions }, null, 1) + "\n");
  for (const [key, plan] of Object.entries(predictions)) console.log(key, plan.split(";").length, "windows");
  console.log(new Set(Object.values(predictions)).size, "distinct plans");
}
