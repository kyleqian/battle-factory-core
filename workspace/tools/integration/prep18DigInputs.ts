import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { digInputsFor } from "../compare/verifyDigReducer.ts";
for (const [side, f] of [["player-back","player"],["opponent-front","opponent"]] as const) {
  const rows = JSON.parse(gunzipSync(readFileSync(`tools/compare/evidence/dig-${f}-dense-state.json.gz`)).toString()).frames;
  for (const body of ["setup","unleash"] as const) { const i = digInputsFor(rows, side as any, body); console.log(side, body, JSON.stringify({ monBg: i.monBg, setupBgOffset: i.setupBgOffset, mud: i.mudSand, mound: i.dirtMound, impact: i.impact, slots: [i.moundSlots, i.impactSpriteSlot, i.digTaskSlot, i.updateMonBgTaskSlot, i.clearMonBgTaskSlot, i.shakeTaskSlot], mats: [i.impactMatrixNum, i.moundMatrixNum, i.plumeMatrixNum, i.attackerInitialMatrixNum, i.targetInitialMatrixNum, i.attackerCleanupMatrixNum, i.targetCleanupMatrixNum], sub: [i.attackerSubpriority, i.targetSubpriority], slotsAT: [i.attackerSpriteSlot, i.targetSpriteSlot], bitmap: i.initialMatrixBitmap, plume: i.plumeSlots.length })); }
}
