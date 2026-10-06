// prep13: Hyper Beam. (1) geometry fields from liveBattlerAnchors vs the ROM-derived accepted values; (2) slots by first-free simulation over the reducer's own orb lifetimes vs ROM slots;
// (3) persistentOrder: the accepted definition (sSpriteOrder.indexOf(slot) at row 110+3g) vs production-derivable candidates (index in the order lent at activation; index in the order at row 109),
// judged by the reducer's painterOrder against the ROM order series.   npx vite-node tools/integration/prep13HyperBeamCheck.ts
import { readFileSync, writeFileSync } from "node:fs";
import { hyperBeamAtAge, type HyperBeamGeometry, type HyperBeamProfile } from "../../src/animation/hyperBeam.ts";
import { createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";
import { liveBattlerAnchors } from "../../src/engine/liveMoveAnimation.ts";
const A = JSON.parse(readFileSync("tools/integration/fixtures/prep13/prep13-analysis.json", "utf8")) as Record<string, any[]>;
const out: Record<string, unknown> = {};
const inferSpeed = (s: any, tgt: { x: number; y: number }) => {
  for (let speed = 64; speed <= 95; speed += 1) {
    const dx = tgt.x - s.x, dy = tgt.y - s.y; const duration = Math.trunc((Math.abs(dx) << 4) / speed);
    let sx = Math.trunc((Math.abs(dx) << 4) / duration), sy = Math.trunc((Math.abs(dy) << 4) / duration);
    sx = dx < 0 ? sx | 1 : sx & ~1; sy = dy < 0 ? sy | 1 : sy & ~1;
    if (s.data[0] === duration - 2 && s.data[1] === sx && s.data[2] === sy && s.data[3] === sx * 2 && s.data[4] === sy * 2) return speed;
  }
  return -1;
};
for (const sc of Object.keys(A).filter((k) => /hyper-beam/.test(k))) {
  const r = A[sc]!.find((x) => x.move === "HYPER_BEAM")!;
  const side = (/alt-opponent|beam-opponent/.test(sc) ? "opponent" : "player") as "player" | "opponent"; const tside = side === "player" ? "opponent" : "player";
  const art = createBattleCommandFieldArtView({ player: { species: r.monsAtAct[0].species }, opponent: { species: r.monsAtAct[1].species } } as never);
  const aa = liveBattlerAnchors(side, art), ta = liveBattlerAnchors(tside, art);
  const orbsRom = r.sprites.filter((s: any) => s.tmpl === "gHyperBeamOrbSpriteTemplate");
  const romOrderAt = (age: number): number[] => { let o: number[] = r.orderAtAct; for (const [a, ord] of r.orderChanges) if (a <= age) o = ord; return o; };
  const targetCenter = { x: ta.picOffsetPoint.x, y: ta.picOffsetPoint.y };
  const geomRom = { attackerPictureCenter: { x: orbsRom[0].x + (side === "player" ? -20 : 20), y: orbsRom[0].y }, targetPictureCenter: tside === "player" ? { x: r.battlerXY[0][0], y: r.battlerXY[0][1] + 8 } : { x: r.battlerXY[1][0], y: r.battlerXY[1][1] } };
  const restOf = (b: 0 | 1) => ({ x2: r.battlerX2Y2[b][0], y2: r.battlerX2Y2[b][1] });
  const geometry: HyperBeamGeometry = { attackerPictureCenter: aa.picOffsetPoint, targetPictureCenter: targetCenter,
    attackerRestOffset: { x2: aa.frontIdleRest.x2, y2: aa.frontIdleRest.y2 }, targetRestOffset: { x2: ta.frontIdleRest.x2, y2: ta.frontIdleRest.y2 } };
  const geomEq = JSON.stringify(geometry.attackerPictureCenter) === JSON.stringify(geomRom.attackerPictureCenter) && JSON.stringify(geometry.targetPictureCenter) === JSON.stringify(geomRom.targetPictureCenter);
  const restEq = JSON.stringify(geometry.attackerRestOffset) === JSON.stringify(restOf(side === "player" ? 0 : 1)) && JSON.stringify(geometry.targetRestOffset) === JSON.stringify(restOf(tside === "player" ? 0 : 1));
  const base = orbsRom.map((s: any) => ({ animation: 0, speed: inferSpeed(s, geomRom.targetPictureCenter), phase: (s.data[5]! - 48) & 0xff }));
  const sub = { attackerSubpriority: side === "player" ? 30 : 40, targetSubpriority: side === "player" ? 40 : 30 };
  // pass 1: lifetimes from the reducer (slot-independent)
  const p1: HyperBeamProfile = { orbs: base.map((b, i) => ({ ...b, slot: i, persistentOrder: i })), ...sub, spriteOrderSeed: r.orderAtAct };
  const lifetime: number[] = []; for (let i = 0; i < 52; i += 1) { let first = -1, last = -1; for (let age = 110; age < 300; age += 1) { const st = hyperBeamAtAge(age, side, geometry, p1); if (st.orbs.some((o) => o.index === i)) { if (first < 0) first = age; last = age; } } lifetime.push(last - first + 1); }
  const alive: { slot: number; until: number }[] = []; const simSlots: number[] = [];
  for (let i = 0; i < 52; i += 1) { const born = 110 + Math.floor(i / 2) * 3; for (let k = alive.length - 1; k >= 0; k -= 1) if (alive[k]!.until <= born) alive.splice(k, 1);
    let slot = 0; while (r.inUseAtAct.includes(slot) || alive.some((a) => a.slot === slot)) slot += 1; simSlots.push(slot); alive.push({ slot, until: born + lifetime[i]! + Number(process.env.DELAY ?? 0) }); }
  const romSlots = orbsRom.map((s: any) => s.slot);
  const slotsEq = JSON.stringify(simSlots) === JSON.stringify(romSlots);
  const poAcc = orbsRom.map((s: any, i: number) => romOrderAt(110 + Math.floor(i / 2) * 3).indexOf(s.slot));
  const poAct = orbsRom.map((s: any) => r.orderAtAct.indexOf(s.slot));
  const po109 = orbsRom.map((s: any) => romOrderAt(109).indexOf(s.slot));
  const relOk = (cand: number[]) => { let ok = 0; for (let g = 0; g < 26; g += 1) { const a = poAcc[2 * g]! < poAcc[2 * g + 1]!, b = cand[2 * g]! < cand[2 * g + 1]!; if (a === b) ok += 1; } return ok; };
  const profile = (po: number[], seed: number[]): HyperBeamProfile => ({ orbs: base.map((b, i) => ({ ...b, slot: romSlots[i]!, persistentOrder: po[i]! })), ...sub, spriteOrderSeed: seed });
  const score = (p: HyperBeamProfile) => { let eq = 0, n = 0; const bad: number[] = [];
    for (let age = 110; age <= 300; age += 1) { const st = hyperBeamAtAge(age, side, geometry, p); if (!st.orbs.length) continue; n += 1; const own = new Set(st.orbs.map((o) => o.slot));
      const want = romOrderAt(age).filter((q: number) => own.has(q)); const a = JSON.stringify(st.painterOrder); if (a === JSON.stringify(want) || a === JSON.stringify([...want].reverse())) eq += 1; else if (bad.length < 5) bad.push(age); }
    return { eq, n, bad }; };
  const sAcc = score(profile(poAcc, romOrderAt(109))), sAct = score(profile(poAct, r.orderAtAct)), s109 = score(profile(po109, romOrderAt(109)));
  out[sc] = { side, species: r.monsAtAct.map((m: any) => m.species), geometryProductionEqualsRom: geomEq, restEqual: restEq, geometryProduction: geometry, geometryRom: geomRom, slotsFirstFreeSimEqual: slotsEq, romSlots, simSlots, lifetimes: lifetime,
    persistentOrderRelativeAgreementPerGroup: { activationOrder: relOk(poAct), row109: relOk(po109), of: 26 }, painterOrderEqualAges: { accepted: sAcc, activationCandidate: sAct, row109Candidate: s109 }, persistentOrderAccepted: poAcc, orderShape: r.orderShape };
  console.log(sc.padEnd(50), "geom==", geomEq, "rest==", restEq, "slots==", slotsEq, "relOrder act/109", relOk(poAct), relOk(po109), "/26", "painter acc/act/109", `${sAcc.eq}/${sAcc.n}`, `${sAct.eq}/${sAct.n}`, `${s109.eq}/${s109.n}`, sAcc.bad.join(","));
}
writeFileSync("tools/integration/fixtures/prep13/prep13-hyper-beam-check.json", JSON.stringify(out, null, 1));
