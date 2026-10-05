// ISSUES #147 ordinary-input routes with an elevated opponent (generated seeds): the renderer fix is presentation-only, so the
// ON/OFF logical battle state at every action-menu boundary must stay equal (same strip rule as issue145Routes.ts).
//   npx vite-node tools/integration/elevatedRendererRoutes.ts [firstSeed] [lastSeed] [maxRoutes]
import enemyElevations from "../../src/data/gen/enemy-mon-elevations.json" with { type: "json" };
import { generatedCommandAnimationReplay } from "./generatedCommandAnimationReplay.ts";
const [first = 0, last = 40, max = 4] = process.argv.slice(2).map(Number);
const elevation = enemyElevations as Record<string, number>;
const strip = (b: unknown) => JSON.stringify(b, (k, v) => (k === "nextEventSequence" ? undefined : k === "hitMarker" ? (v as number) & ~0x80 : v));
let found = 0;
for (let seed = first; seed <= last && found < max; seed++) {
  let on;
  try { on = generatedCommandAnimationReplay(seed, "on", [0], 0); } catch { continue; }
  const elevated = [...new Set(on.animations.map(a => a.opponent.toUpperCase()))].filter(n => (elevation[n] ?? 0) > 0);
  if (elevated.length === 0) continue;
  found++;
  const off = generatedCommandAnimationReplay(seed, "off", [0], 0);
  const parity = on.boundaries.length === off.boundaries.length
    && on.boundaries.every((b, i) => strip(b) === strip(off.boundaries[i]));
  console.log(JSON.stringify({ seed, slot: 0, elevated, boundaries: on.boundaries.length, parity,
    requests: on.requests.map(q => [q.moveId, q.attacker]) }));
}
