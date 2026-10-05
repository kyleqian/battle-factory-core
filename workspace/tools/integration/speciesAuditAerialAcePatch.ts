/** speciesAudit: prove the Aerial Ace target-x defect shape at runtime (no source edit): replace aerialAceTargetSpriteXAtAge's hard-coded
 *  `- 1` (aerialAce.ts:49-57, the ONIX settled front-idle x2) by the target species' own frontIdleRest.x2 (0 for GOLEM) and rerun dense.
 *  usage: X2=0 FRESH=2 npx vite-node tools/integration/speciesAuditAerialAcePatch.ts <fixture.json> */
import * as aa from "../../src/animation/aerialAce.ts";
import { verifyLiveAdapterFramebuffer } from "./liveAdapterFramebuffer.ts";
const x2 = Number(process.env.X2 ?? 0);
Object.defineProperty(aa, "aerialAceTargetSpriteXAtAge", { configurable: true, enumerable: true,
  value: (age: number, side: string, corner: number) => corner - (side === "opponent" && age >= 57 ? x2 : 0) });
for (const path of process.argv.slice(2)) {
  const rs = verifyLiveAdapterFramebuffer(path, Number(process.env.FRESH ?? 2));
  console.log(path, "patched x2", x2, "exact", rs[0]!.exactRows, "/", rs[0]!.rows, "px", rs[0]!.residualPixels, "identical", rs.every(r => r.digest === rs[0]!.digest), rs.map(r => r.digest.slice(0, 12)).join(","));
}
