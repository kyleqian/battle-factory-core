// r2-gates: carrier routes from prep16-routes.json (player rental[0] knows the move in slot idx): one-turn replay per route (ordinary command input),
// prints every body of the move with its priors and whether the adapter was active every age.
//   node --experimental-strip-types --no-warnings tools/integration/r2GatesCarrierRoutes.ts <OVERHEAT|PSYCH_UP> <moveId> [maxRoutes]
import { readFileSync } from "node:fs";
import { generatedCommandAnimationReplay } from "./generatedCommandAnimationReplay.ts";
const [name, id, max] = [process.argv[2]!, Number(process.argv[3]), Number(process.argv[4] ?? 40)];
const routes = JSON.parse(readFileSync("tools/integration/fixtures/prep16/prep16-routes.json", "utf8")).routes[name] as any[];
for (const r of routes.slice(0, max)) {
  try {
    const idx = r.moves.indexOf(id) as 0 | 1 | 2 | 3;
    const on = generatedCommandAnimationReplay(r.seed, "on", [idx], r.streak, true, true);
    on.animations.forEach((a, index) => {
      if (a.moveId !== id) return;
      console.log(JSON.stringify({ seed: r.seed, streak: r.streak, index, attacker: a.attacker, player: a.player, opponent: a.opponent, active: a.adapterActive.every(Boolean),
        prior: on.animations.slice(0, index).map((p) => `${p.moveId}${p.attacker === 0 ? "p" : "o"}`).join(","), prompt: on.state.battleCommandPresentation?.lifecycle.phase ?? null }));
    });
  } catch { /* stall */ }
}
