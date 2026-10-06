// prep14: Hail. Derive the ten-entry target table from GenerateHailParticle (battle_anim_ice.c:1414-1470) with production anchors (liveBattlerAnchors X_2 / Y_PIC_OFFSET, liveBattlerCoordAttrs width/height;
// singles: PLAYER_LEFT = player, OPPONENT_LEFT = opponent visible, the two RIGHT positions absent -> fixed (x,120), no impact), compare with the hard-coded accepted TARGETS (hailFramebuffer.ts), then run hailAtAge with
// (rng at activation, in-use sprite slots at activation, occupiedAffineMatrixSlots from the bitmap, derived targets, ZERO palette arrays) and compare every particle/crystal birth (age, slot, matrix, x, y) with the ROM probe
// for the accepted player/opponent and the alternate.   npx vite-node tools/integration/prep14HailCheck.ts
import { readFileSync, writeFileSync } from "node:fs";
import { hailAtAge, type HailProfile } from "../../src/animation/hail.ts";
import { createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";
import { liveBattlerAnchors, liveBattlerCoordAttrs } from "../../src/engine/liveMoveAnimation.ts";
const A = JSON.parse(readFileSync("tools/integration/fixtures/prep14/prep14-analysis.json", "utf8")) as Record<string, any[]>;
const hardSrc = readFileSync("tools/compare/hailFramebuffer.ts", "utf8");
const hard: Record<string, number[][]> = {};
for (const m of hardSrc.matchAll(/"(player-back|opponent-front)": \[\n\s+(.*)\n/g)) hard[m[1]!] = [...m[2]!.matchAll(/targetX: (-?\d+), targetY: (-?\d+), initialX: (-?\d+), initialY: -8, impact: (true|false)/g)].map((x) => [+x[1]!, +x[2]!, +x[3]!, x[4] === "true" ? 1 : 0]);
const COORD = [ // sHailCoordData: x, y, position (0 = player left, 1 = opponent left, 2 = player right, 3 = opponent right), type (0 fixed, 1 negative mod, 2 positive mod)
  [100, 120, 0, 0], [85, 120, 0, 1], [242, 120, 1, 2], [66, 120, 2, 2], [182, 120, 3, 1], [60, 120, 0, 0], [214, 120, 1, 1], [113, 120, 0, 2], [210, 120, 3, 2], [38, 120, 2, 1]] as const;
const out: Record<string, any> = {};
for (const sc of Object.keys(A).filter((k) => /hail/.test(k) && !/factory/.test(k))) {
  const r = A[sc]!.find((x) => x.move === "HAIL")!;
  const orient = sc.startsWith("mechanic-hail-opponent") ? "opponent-front" : "player-back";
  const art = createBattleCommandFieldArtView({ player: { species: r.monsAtAct[0].species }, opponent: { species: r.monsAtAct[1].species } } as never);
  const targets = COORD.map(([x, y, pos, type]) => {
    let bx: number = x, by: number = y, impact = false;
    const side = pos === 0 ? "player" : pos === 1 ? "opponent" : null;
    if (type !== 0 && side) {
      impact = true; const an = liveBattlerAnchors(side, art), at = liveBattlerCoordAttrs(side, art);
      bx = an.picOffsetPoint.x; // X_2 at generation (ages >= 45): the front-idle x2 is 0 there; adding frontIdleRest.x2 (activation-time x2 = 1) is off by one on the opponent side (measured) by = an.picOffsetPoint.y;
      const dx = Math.trunc(at.width / 6), dy = Math.trunc(at.height / 6);
      if (type === 1) { bx -= dx; by -= dy; } else { bx += dx; by += dy; }
    }
    return { targetX: bx, targetY: by, initialX: bx - Math.trunc((by + 8) / 2), initialY: -8 as const, impact };
  }) as unknown as HailProfile["targets"];
  const eqHard = sc.startsWith("prep14") ? null : JSON.stringify(targets.map((t) => [t.targetX, t.targetY, t.initialX, t.impact ? 1 : 0])) === JSON.stringify(hard[orient]);
  const zeros = Array.from({ length: 512 }, () => 0);
  const occ = [0, 1, 2, 3, 4, 5, 6, 7].filter((i) => (r.bitmap >> i) & 1);
  const profile: HailProfile = { animationRngAtAge0: r.rng2, occupiedSpriteSlots: r.inUseAtAct, occupiedAffineMatrixSlots: occ, targets, unfadedPaletteBeforeLoad: zeros, fadedPaletteBeforeLoad: zeros, hardwarePaletteAtAge0: zeros, unfadedPaletteAfterHailLoad: zeros, fadedPaletteAfterHailLoad: zeros, unfadedPaletteAfterCrystalLoad: zeros, fadedPaletteAfterCrystalLoad: zeros };
  const births: any[] = []; let prev = new Set<string>(); let lastActive = -1;
  for (let age = 0; age < r.rows + 2; age += 1) {
    const s = hailAtAge(age, profile); if (s.active) lastActive = age; const cur = new Set<string>();
    for (const sp of s.sprites) { const k = `${sp.kind}:${sp.slot}:${sp.birthAge}`; cur.add(k); if (!prev.has(k)) births.push({ age: sp.birthAge, slot: sp.slot, kind: sp.kind, matrix: sp.matrixNum, x: sp.x, y: sp.y }); }
    prev = cur;
  }
  const rom = r.sprites.filter((s: any) => s.tmpl === "gHailParticleSpriteTemplate" || s.tmpl === "gIceCrystalHitLargeSpriteTemplate");
  let eq = 0, exactAge = 0; const bad: any[] = [];
  for (const s of rom) {
    const kind = s.tmpl === "gHailParticleSpriteTemplate" ? "particle" : "crystal";
    const m = births.find((b) => b.kind === kind && b.slot === s.slot && Math.abs(b.age - s.age) <= 1 && b.matrix === s.matrix);
    if (m) { eq += 1; if (m.age === s.age) exactAge += 1; if (m.x !== s.x || m.y !== s.y) { if (bad.length < 4) bad.push({ rom: [s.age, s.slot, s.tmpl, s.matrix, s.x, s.y], red: m }); } } else if (bad.length < 4) bad.push({ rom: [s.age, s.slot, s.tmpl, s.matrix, s.x, s.y], red: null });
  }
  out[sc] = { targetsEqualAcceptedLiteral: eqHard, derivedTargets: targets.map((t) => [t.targetX, t.targetY, t.impact ? 1 : 0]), romSprites: rom.length, reducerBirths: births.length, matchedSlotMatrixAgeWithin1: eq, exactAge, bad, romRows: r.rows, lastActiveAge: lastActive };
  console.log(sc, JSON.stringify({ ...out[sc], derivedTargets: undefined }));
}
writeFileSync("tools/integration/fixtures/prep14/prep14-hail-check.json", JSON.stringify(out, null, 1));
