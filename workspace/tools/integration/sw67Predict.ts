// sw67 (docs/next-adapters-sw67.md): Shock Wave 351 plan PREDICTIONS for the probe grid, recorded and committed before the probes ran.
// Each pair = (attacker, target) internal species ids; the attacker is a Factory Shock Wave user (sw67Classes.ts SHOCK_WAVE_USERS), the
// target a Factory species that is neither Ground-type nor Volt Absorb (the move must animate). The grid spans every geometry class of
// sw67Classes.ts (player: 106 / 102 / 104 windows; opponent: 79 / 86) and none of plans48's sw-* pairs. Every body is the battle's first
// action (the base scenarios' defender knows only Mirror Coat, priority -5), so the prediction is the seam plan at the known-entry
// first-action order.
// usage: node --experimental-strip-types tools/integration/sw67Predict.ts <out.json>
import { writeFileSync } from "node:fs";
import { KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER } from "../../src/engine/spriteOrderProvider.ts";
import { FACTORY_SPECIES, SHOCK_WAVE_USERS } from "./sw67Classes.ts";
import { sw67SeamPlan } from "./sw67ShockWaveFit.ts";

// MAGNEMITE 81, MAGNETON 82, PICHU 172, MAREEP 179, FLAAFFY 180, NOSEPASS 320, CASTFORM 385; targets SNORLAX 143, BLISSEY 242, GOLBAT 42,
// SLOWBRO 80, LAPRAS 131, DRAGONITE 149, CROBAT 169, SHUCKLE 213, WOBBUFFET 202, KANGASKHAN 115.
export const SW67_GRID: Readonly<Record<"player" | "opponent", readonly (readonly [number, number])[]>> = {
  player: [[81, 143], [385, 242], [82, 42], [172, 80], [179, 131], [320, 149], [81, 169], [385, 213], [180, 202]],
  opponent: [[81, 143], [82, 242], [385, 80], [179, 131], [172, 213], [320, 149], [82, 202], [180, 115], [385, 169]],
};

export function sw67Predictions() {
  return (["player", "opponent"] as const).flatMap(side => SW67_GRID[side].map(([attacker, target]) => {
    if (!SHOCK_WAVE_USERS.includes(attacker) || !FACTORY_SPECIES.includes(target)) throw new Error(`not a Factory pair ${attacker} -> ${target}`);
    const [player, opponent] = side === "player" ? [attacker, target] : [target, attacker];
    const plan = sw67SeamPlan(side, player, opponent, KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER);
    if (plan === null) throw new Error(`no plan ${side} ${attacker} -> ${target}`);
    return { id: `sw67-${side === "player" ? "ply" : "opp"}-${attacker}-${target}`, side, attacker, target, player, opponent,
      F0: [...KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER], windows: plan.split(";").length, plan };
  }));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const rows = sw67Predictions();
  for (const row of rows) console.log(`${row.id}: ${row.windows} windows`);
  writeFileSync(process.argv[2]!, `${JSON.stringify({ schema: "sw67-predictions-v1", rows }, null, 1)}\n`);
}
