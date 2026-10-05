// Prints the allocator-derived fields the accepted reducers/framebuffer adapters consume, from the accepted dense-state evidence.
// usage: node --experimental-strip-types tools/integration/affineTaskAccepted.mjs > tools/integration/fixtures/affine-task/accepted-config-values.json
import { swiftProfileFor } from "../compare/swiftReducer.ts";
import { trickProfileFor } from "../compare/trickReducer.ts";
import { rockBlastProfileFor } from "../compare/rockBlastReducer.ts";
const out = {};
for (const [name, f, sides] of [["swift", swiftProfileFor, ["player-back", "opponent-front"]], ["trick", trickProfileFor, ["player-back", "opponent-front"]],
  ["rock-blast", rockBlastProfileFor, ["player-back", "opponent-front"]]]) {
  for (const side of sides) {
    try {
      const p = f(side);
      const pick = (o) => JSON.parse(JSON.stringify(o, (k, v) => (["immutableGameplayState", "gameplayRng", "attackerEffectCenter", "targetAverageCenter", "targetInitialOffset"].includes(k) ? undefined : v)));
      out[`${name}/${side}`] = pick(p);
    } catch (e) { out[`${name}/${side}`] = { error: String(e).slice(0, 200) }; }
  }
}
console.log(JSON.stringify(out, null, 1));
