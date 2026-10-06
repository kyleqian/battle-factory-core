// prep14: geometry provenance for Overheat / Silver Wind / Psych Up / Curse. The accepted verifiers (tools/compare/verify*Reducer.ts) derive the picture origins from retained rows
// (Overheat: attackerPictureOrigin = first flame (x - 30, y + 20) at age 64, targetPictureOrigin = first hit splat x -/+ 5, y - 3 at age 107). Here the same ROM-observable points are read from the probe spawn log of the 3
// scenarios per move (accepted player / opponent / alternate) and compared with liveBattlerAnchors candidates (picOffsetPoint, spriteCenter, + front idle).   npx vite-node tools/integration/prep14GeometryProvenance.ts
import { readFileSync, writeFileSync } from "node:fs";
import { createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";
import { liveBattlerAnchors } from "../../src/engine/liveMoveAnimation.ts";
const A = JSON.parse(readFileSync("tools/integration/fixtures/prep14/prep14-analysis.json", "utf8")) as Record<string, any[]>;
const out: Record<string, any> = {};
for (const [key, label] of [["overheat", "OVERHEAT"], ["silver-wind", "SILVER_WIND"], ["psych-up", "PSYCH_UP"], ["curse-ghost", "CURSE"]] as const) {
  for (const sc of Object.keys(A).filter((k) => k.startsWith(`mechanic-${key}-`) || k.startsWith(`prep14-${key}-`))) {
    const r = A[sc]!.find((x) => x.move === label)!;
    const side = sc.startsWith(`mechanic-${key}-opponent`) ? "opponent" : "player"; const tgt = side === "player" ? "opponent" : "player";
    const art = createBattleCommandFieldArtView({ player: { species: r.monsAtAct[0].species }, opponent: { species: r.monsAtAct[1].species } } as never);
    const aa = liveBattlerAnchors(side, art), ta = liveBattlerAnchors(tgt, art);
    const first = (t: string) => r.sprites.find((s: any) => s.tmpl === t);
    const obs: Record<string, unknown> = {};
    if (key === "overheat") { const f = first("gOverheatFlameSpriteTemplate"), h = first("gBasicHitSplatSpriteTemplate"); obs.firstFlameXY = [f.x, f.y]; obs.firstHitSplatXY = [h.x, h.y]; obs.impliedAttackerOrigin = [f.x - 30, f.y + 20]; obs.impliedTargetOrigin = [h.x - (side === "player" ? -5 : 5), h.y - 3]; }
    if (key === "silver-wind") { const f = first("gSilverWindBigSparkSpriteTemplate"); obs.firstBigSparkXY = [f.x, f.y]; }
    if (key === "psych-up") { const f = first("gPsychUpSpiralSpriteTemplate"); obs.spiralXY = [f.x, f.y]; }
    if (key === "curse-ghost") { const f = first("gCurseNailSpriteTemplate"), g = first("gCurseGhostSpriteTemplate"); obs.nailXY = f && [f.x, f.y]; obs.ghostXY = g && [g.x, g.y]; }
    const pt = (p: any) => [p.x, p.y];
    out[sc] = { side, observed: obs, attackerPicOffset: pt(aa.picOffsetPoint), attackerSpriteCenter: pt(aa.spriteCenter), targetPicOffset: pt(ta.picOffsetPoint), targetSpriteCenter: pt(ta.spriteCenter), targetFrontIdleRest: ta.frontIdleRest, attackerFrontIdleRest: aa.frontIdleRest, battlerXYatAct: r.battlerXY, battlerX2Y2atAct: r.battlerX2Y2 };
    console.log(sc.slice(0, 52), JSON.stringify({ observed: obs, aPic: pt(aa.picOffsetPoint), aCtr: pt(aa.spriteCenter), tPic: pt(ta.picOffsetPoint), tCtr: pt(ta.spriteCenter) }));
  }
}
writeFileSync("tools/integration/fixtures/prep14/prep14-geometry-provenance.json", JSON.stringify(out, null, 1));
