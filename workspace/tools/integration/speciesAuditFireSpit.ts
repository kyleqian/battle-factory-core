/** speciesAudit: derive the Dragon Rage fire-spit translation (StartDragonFireTranslation + InitAnimLinearTranslation) from the TARGET's anchors
 *  for ONIX and GOLEM and compare with the production per-side literal DRAGON_RAGE_FIRE_SPIT_GEOMETRY.
 *  usage: npx vite-node tools/integration/speciesAuditFireSpit.ts <fixture.json> [targetXOverride] */
import { readFileSync } from "node:fs";
import { DRAGON_RAGE_FIRE_SPIT_GEOMETRY } from "../../src/animation/dragonRage.ts";
import { liveBattlerAnchors } from "../../src/engine/liveMoveAnimation.ts";
import { liveView } from "./liveAdapterFramebuffer.ts";
const f = JSON.parse(readFileSync(process.argv[2]!, "utf8"));
for (const species of ["ONIX", "GOLEM", "GOLBAT", "SHUCKLE"]) {
  const view = liveView({ ...f, target: { ...f.target, species } }, 0);
  const a = liveBattlerAnchors("opponent", view.fieldArt);
  const atk = liveBattlerAnchors("player", view.fieldArt);
  // player attacker: start = attacker (X_2, Y_PIC_OFFSET) + (30, 15); target = (X_2, Y_PIC_OFFSET) + (0, 10); delta Q8 = (|d| << 8) / 10 (u16 math)
  const sx = atk.picOffsetPoint.x + 30, sy = atk.picOffsetPoint.y + 15;
  for (const dx of [0, a.frontIdleRest.x2]) {
    const tx = a.picOffsetPoint.x + dx, ty = a.picOffsetPoint.y + 10;
    console.log(species, "picOffset", a.picOffsetPoint, "rest", a.frontIdleRest, "start", [sx, sy], "target", [tx, ty],
      "deltaQ8", [Math.floor((Math.abs(tx - sx) << 8) / 10) * Math.sign(tx - sx), Math.floor((Math.abs(ty - sy) << 8) / 10) * Math.sign(ty - sy)]);
  }
}
console.log("production literal (player attacker)", DRAGON_RAGE_FIRE_SPIT_GEOMETRY.player);
