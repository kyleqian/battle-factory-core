/** speciesAudit: mutate one production literal at runtime (NO source edit) and rerun the dense compare, to prove a fix shape.
 *  usage: PATCH='{"deltaYQ8":-1459}' FRESH=1 npx vite-node tools/integration/speciesAuditPatchDense.ts <fixture.json> (Dragon Rage player geometry) */
import { DRAGON_RAGE_FIRE_SPIT_GEOMETRY } from "../../src/animation/dragonRage.ts";
import { verifyLiveAdapterFramebuffer } from "./liveAdapterFramebuffer.ts";
const side = (process.env.SIDE ?? "player") as "player" | "opponent";
Object.assign(DRAGON_RAGE_FIRE_SPIT_GEOMETRY[side], JSON.parse(process.env.PATCH ?? "{}"));
for (const path of process.argv.slice(2)) {
  const rs = verifyLiveAdapterFramebuffer(path, Number(process.env.FRESH ?? 2));
  console.log(path, "patched", process.env.PATCH, "exact", rs[0]!.exactRows, "/", rs[0]!.rows, "px", rs[0]!.residualPixels, "identical", rs.every(r => r.digest === rs[0]!.digest), rs.map(r => r.digest.slice(0, 12)).join(","));
}
