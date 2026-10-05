/** speciesAudit: derive the Dragon Rage fire-spit translation (StartDragonFireTranslation + InitAnimLinearTranslation) from the TARGET's anchors
 *  for ONIX and GOLEM and compare with the production per-side literal DRAGON_RAGE_FIRE_SPIT_GEOMETRY.
 *  usage: npx vite-node tools/integration/speciesAuditFireSpit.ts <fixture.json> [targetXOverride] */
import { readFileSync } from "node:fs";
import { DRAGON_RAGE_FIRE_SPIT_GEOMETRY } from "../../src/animation/dragonRage.ts";
import { liveBattlerAnchors } from "../../src/engine/liveMoveAnimation.ts";
import { liveView } from "./liveAdapterFramebuffer.ts";
const f = JSON.parse(readFileSync(process.argv[2]!, "utf8"));
// InitAnimLinearTranslation: u16 (|d|<<8)/10, low bit set when moving left/up, cleared otherwise
const q8 = (d: number) => { const m = Math.floor((Math.abs(d) << 8) / 10); return d < 0 ? -(m | 1) : (m & ~1); };
for (const species of ["ONIX", "GOLEM", "GOLBAT", "SHUCKLE"]) {
  const view = liveView({ ...f, target: { ...f.target, species } }, 0);
  const a = liveBattlerAnchors("opponent", view.fieldArt);
  const atk = liveBattlerAnchors("player", view.fieldArt);
  // player attacker: start = attacker (X_2, Y_PIC_OFFSET) + (30, 15); target = (X_2, Y_PIC_OFFSET) + (0, 10); delta Q8 = (|d| << 8) / 10 (u16 math)
  const sx = atk.picOffsetPoint.x + 30, sy = atk.picOffsetPoint.y + 15;
  for (const dx of [0, a.frontIdleRest.x2]) {
    const tx = a.picOffsetPoint.x + dx, ty = a.picOffsetPoint.y + 10;
    console.log(species, "picOffset", a.picOffsetPoint, "rest", a.frontIdleRest, "start", [sx, sy], "target", [tx, ty],
      "deltaQ8", [q8(tx - sx), q8(ty - sy)]);
  }
}
console.log("production literal (player attacker)", DRAGON_RAGE_FIRE_SPIT_GEOMETRY.player);
