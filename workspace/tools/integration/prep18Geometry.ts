// prep18: battler geometry provenance for Dig / Megahorn / Will-O-Wisp / Fury Cutter / Return / Pursuit. ROM battler sprite (x, y) and (x2, y2) at each body's activation
// (prep13Probe `battlerXY`/`battlerX2Y2`, indexed by battler id 0 = player slot) vs the production providers liveBattlerAnchors().spriteCenter / .frontIdleRest, every scenario
// (accepted player, accepted opponent, fresh alternate).   npx vite-node tools/integration/prep18Geometry.ts
import { readFileSync, writeFileSync } from "node:fs";
import { createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";
import { liveBattlerAnchors } from "../../src/engine/liveMoveAnimation.ts";
const A = JSON.parse(readFileSync("tools/integration/fixtures/prep18/prep18-analysis.json", "utf8")) as Record<string, any[]>;
const out: Record<string, any> = {};
let bad = 0, n = 0;
for (const [sc, rows] of Object.entries(A)) {
  for (const r of rows) {
    const art = createBattleCommandFieldArtView({ player: { species: r.monsAtAct[0].species }, opponent: { species: r.monsAtAct[1].species } } as never);
    const pa = liveBattlerAnchors("player", art), oa = liveBattlerAnchors("opponent", art);
    const rom = { player: r.battlerXY[0], opponent: r.battlerXY[1] }, x2y2 = { player: r.battlerX2Y2[0], opponent: r.battlerX2Y2[1] };
    const prod = { player: [pa.spriteCenter.x, pa.spriteCenter.y], opponent: [oa.spriteCenter.x, oa.spriteCenter.y] };
    const idle = { player: [pa.frontIdleRest.x2, pa.frontIdleRest.y2], opponent: [oa.frontIdleRest.x2, oa.frontIdleRest.y2] };
    const okXY = JSON.stringify(rom.player) === JSON.stringify(prod.player) && JSON.stringify(rom.opponent) === JSON.stringify(prod.opponent);
    const okIdle = JSON.stringify(x2y2.player) === JSON.stringify(idle.player) && JSON.stringify(x2y2.opponent) === JSON.stringify(idle.opponent);
    n++; if (!okXY || !okIdle) bad++;
    (out[sc] ??= []).push({ move: r.move, bodyIndex: r.bodyIndex, act: r.act, species: [r.monsAtAct[0].species, r.monsAtAct[1].species], romSpriteXY: rom, productionSpriteCenter: prod, spriteXYEqual: okXY, romX2Y2: x2y2, productionFrontIdleRest: idle, idleEqual: okIdle });
    console.log(sc.slice(0, 56).padEnd(56), r.move, r.bodyIndex, "xy", okXY, "idle", okIdle, okXY ? "" : JSON.stringify({ rom, prod }));
  }
}
console.log(`mismatches ${bad} / ${n}`);
writeFileSync("tools/integration/fixtures/prep18/prep18-geometry.json", JSON.stringify(out, null, 1));
