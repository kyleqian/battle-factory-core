// prep14: Water Pulse. (1) geometry provenance: liveBattlerAnchors candidates vs the ROM-measured source points of every geometry field (accepted player/opponent + alternate);
// (2) run waterPulseAtAge with inputs = accepted-corpus constants (slots/matrices/resources/task slots; equal across the 3 scenarios, prep14Constants.py) with the geometry/monbg/rng/order fields REPLACED by the
// production-derivable values, and compare the ROM sprite births (kind, age, slot, x, y, matrix), ring-bubble data[1]/[2], the end age and the per-age animationRng.   npx vite-node tools/integration/prep14WaterPulseCheck.ts
import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { waterPulseAtAge, type WaterPulseLiveInputs } from "../../src/animation/waterPulse.ts";
import { createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";
import { liveBattlerAnchors } from "../../src/engine/liveMoveAnimation.ts";
import { waterPulseConfigFor } from "../compare/verifyWaterPulseReducer.ts";
const A = JSON.parse(readFileSync("tools/integration/fixtures/prep14/prep14-analysis.json", "utf8")) as Record<string, any[]>;
const P = (f: string) => JSON.parse(readFileSync(f, "utf8"));
const rowsOf = (side: string) => JSON.parse(gunzipSync(readFileSync(`tools/compare/evidence/water-pulse-${side}-dense-state.json.gz`)).toString()).frames as any[];
const corpusRng = JSON.parse(readFileSync("/tmp/p14-corpus-rng.json", "utf8")) as Record<string, number[]>;
const out: Record<string, any> = {};
const kinds: Record<string, string> = { gSimplePaletteBlendSpriteTemplate: "simple-palette-blend", gWaterPulseBubbleSpriteTemplate: "small-bubble", gWaterPulseRingSpriteTemplate: "blue-ring", gWaterPulseRingBubbleSpriteTemplate: "ring-bubble" };
const consts = { player: waterPulseConfigFor("player-back", rowsOf("player")).animationInputs, opponent: waterPulseConfigFor("opponent-front", rowsOf("opponent")).animationInputs } as Record<string, any>;
for (const sc of Object.keys(A).filter((k) => /water-pulse/.test(k))) {
  const r = A[sc]!.find((x) => x.move === "WATER_PULSE")!;
  const alt = sc.startsWith("prep14"); const side = (alt ? "player" : sc.startsWith("mechanic-water-pulse-opponent") ? "opponent" : "player") as "player" | "opponent";
  const tgt = side === "player" ? "opponent" : "player";
  const art = createBattleCommandFieldArtView({ player: { species: r.monsAtAct[0].species }, opponent: { species: r.monsAtAct[1].species } } as never);
  const aa = liveBattlerAnchors(side, art), ta = liveBattlerAnchors(tgt, art);
  const bi = side === "player" ? 0 : 1, ti = 1 - bi;
  const rom = r.sprites.filter((s: any) => kinds[s.tmpl]);
  const ring = rom.find((s: any) => s.tmpl === "gWaterPulseRingSpriteTemplate"), simple = rom.find((s: any) => s.tmpl === "gSimplePaletteBlendSpriteTemplate");
  const measured = { attackerSpriteXY: [r.battlerXY[bi][0] + r.battlerX2Y2[bi][0], r.battlerXY[bi][1] + r.battlerX2Y2[bi][1]], targetSpriteXY: [r.battlerXY[ti][0], r.battlerXY[ti][1]], targetOffset: r.battlerX2Y2[ti], simpleXY: [simple.x, simple.y], ringOrigin: [ring.x, ring.y], ringTarget: [ring.data[1], ring.data[2]] };
  const pt = (p: { x: number; y: number }) => [p.x, p.y];
  const cand = { attackerSpriteCenter: pt(aa.spriteCenter), attackerPicOffset: pt(aa.picOffsetPoint), targetSpriteCenter: pt(ta.spriteCenter), targetPicOffset: pt(ta.picOffsetPoint), targetFrontIdleRest: ta.frontIdleRest };
  // production-derivable geometry: attackerCenter = battler sprite x,y (spriteCenter), targetCenter likewise, targetPictureCenter = target picOffsetPoint, attackerRingOrigin = attacker picOffsetPoint, targetRingCenter = target picOffsetPoint
  const base = consts[side] as WaterPulseLiveInputs; const rows = rowsOf(side);
  const mb = { x: ta.spriteCenter.x + ta.frontIdleRest.x2, y: ta.spriteCenter.y };
  const input: WaterPulseLiveInputs = { ...base, attackerSide: side, targetSide: tgt, attackerCenter: aa.spriteCenter, targetCenter: ta.spriteCenter, targetPictureCenter: ta.picOffsetPoint, attackerRingOrigin: aa.picOffsetPoint, targetRingCenter: ta.picOffsetPoint,
    targetInitialOffset: { x: ta.frontIdleRest.x2, y: ta.frontIdleRest.y2 }, monBg: { ...base.monBg, snapshot: mb, baseScroll: { x: 32 - mb.x, y: 32 - mb.y } }, spriteOrder: r.orderAtAct, initialMatrixBitmap: r.bitmap, animationRngSeed: r.rng2,
    attackerSubpriority: r.battlerSub[bi], targetSubpriority: r.battlerSub[ti] } as WaterPulseLiveInputs;
  const births: any[] = []; const seen = new Set<string>(); const rng: number[] = []; let endAge = -1;
  for (let age = 0; age < r.rows + 2; age += 1) {
    const s = waterPulseAtAge(age, input);
    if (age < r.rows) rng.push(s.rng.animationAfter);
    if (s.cleanup.firstInactive && endAge < 0) endAge = age;
    for (const sp of s.sprites) { const k = `${sp.kind}:${sp.slot}`; const key = `${k}:${age}`; if (!seen.has(`${k}`) || !s.sprites.length) { }
      const id = `${sp.kind}:${sp.slot}:${sp.data.join(",")}`; void id; }
  }
  // births: first age each (kind, slot, birth) appears; a sprite is new at age a if absent at a-1 (same kind/slot)
  let prev = new Set<string>();
  for (let age = 0; age < r.rows; age += 1) {
    const s = waterPulseAtAge(age, input); const cur = new Set<string>();
    for (const sp of s.sprites) { const k = `${sp.kind}:${sp.slot}`; cur.add(k); if (!prev.has(k)) births.push({ age, kind: sp.kind, slot: sp.slot, x: sp.x, y: sp.y, matrix: sp.oam.affine ? sp.matrixNum : null, d1: sp.kind === "ring-bubble" ? sp.data[1] : null, d2: sp.kind === "ring-bubble" ? sp.data[2] : null }); }
    prev = cur;
  }
  const cmp: any[] = []; let eq = 0, exactAge = 0;
  for (const s of rom) {
    const m = births.find((b) => b.slot === s.slot && b.kind === kinds[s.tmpl] && Math.abs(b.age - s.age) <= 1);
    const ok = !!m && m.x === s.x && m.y === s.y && (m.matrix === null || m.matrix === s.matrix) && (m.d1 === null || (m.d1 === s.data[1] && Math.abs(m.d2) === Math.abs(s.data[2])));
    if (ok) { eq += 1; if (m!.age === s.age) exactAge += 1; } else if (cmp.length < 6) cmp.push({ rom: [s.age, s.slot, s.tmpl, s.x, s.y, s.matrix, s.data], red: m ?? null });
  }
  const sideKey = alt ? "alt" : side;
  out[sc] = { measured, candidates: cand, geometryMatches: { attackerCenter: JSON.stringify(measured.attackerSpriteXY) === JSON.stringify(cand.attackerSpriteCenter), targetCenter: JSON.stringify([...measured.targetSpriteXY]) === JSON.stringify(cand.targetSpriteCenter), simple: JSON.stringify(measured.simpleXY) === JSON.stringify(pt(ta.picOffsetPoint)), ringOrigin: JSON.stringify(measured.ringOrigin) === JSON.stringify(pt(aa.picOffsetPoint)), ringTarget: JSON.stringify(measured.ringTarget) === JSON.stringify(pt(ta.picOffsetPoint)), targetOffset: JSON.stringify(measured.targetOffset) === JSON.stringify([ta.frontIdleRest.x2, ta.frontIdleRest.y2]) },
    romSprites: rom.length, spritesEqual: eq, spritesWithExactBirthAge: exactAge, firstInactiveAge: endAge, romRows: r.rows, endAgeEqualsRows: endAge === r.rows - 1 || endAge === r.rows,
    rngEqualsCorpus: corpusRng[`water-pulse-${sideKey}`] ? JSON.stringify(rng) === JSON.stringify(corpusRng[`water-pulse-${sideKey}`]) : null, mismatches: cmp };
  console.log(sc, JSON.stringify({ ...out[sc], candidates: undefined, measured: undefined }));
  console.log("   measured", JSON.stringify(measured), "cand", JSON.stringify(cand));
}
writeFileSync("tools/integration/fixtures/prep14/prep14-water-pulse-check.json", JSON.stringify(out, null, 1));
