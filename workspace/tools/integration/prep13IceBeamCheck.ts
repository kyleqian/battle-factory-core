// prep13: Ice Beam. Build the production-derivable profile (geometry from liveBattlerAnchors; every other field the reducer default / lend) for the accepted and the
// alternate-species scenarios, run iceBeamTimeline, and compare to the ROM probe (fixtures/prep13/prep13-analysis.json): sprite births (slot, template kind, matrix, x/y/x2/y2),
// task (slot, callback) lifetimes, monbgBase vs the first Task_UpdateMonBg data.   npx vite-node tools/integration/prep13IceBeamCheck.ts
import { readFileSync, writeFileSync } from "node:fs";
import { iceBeamTimeline, type IceBeamAnimationProfile } from "../../src/animation/iceBeam.ts";
import { createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";
import { liveBattlerAnchors } from "../../src/engine/liveMoveAnimation.ts";
const A = JSON.parse(readFileSync("tools/integration/fixtures/prep13/prep13-analysis.json", "utf8")) as Record<string, any[]>;
const out: Record<string, unknown> = {};
for (const sc of Object.keys(A).filter((k) => /ice-beam/.test(k))) {
  const r = A[sc]!.find((x) => x.move === "ICE_BEAM")!;
  const attackerSide = (/alt-opponent|ice-beam-opponent/.test(sc) ? "opponent" : "player") as "player" | "opponent";
  const targetSide = attackerSide === "player" ? "opponent" : "player";
  const art = createBattleCommandFieldArtView({ player: { species: r.monsAtAct[0].species }, opponent: { species: r.monsAtAct[1].species } } as never);
  const aa = liveBattlerAnchors(attackerSide, art), ta = liveBattlerAnchors(targetSide, art);
  const monbg = r.tasks.find((t: any) => t.func === "Task_UpdateMonBg").data as number[];
  const monbgFormula = monbg[1] === ta.spriteCenter.x + ta.frontIdleRest.x2 && monbg[2] === ta.spriteCenter.y && monbg[3] === 32 - monbg[1]! && monbg[4] === 32 - monbg[2]!;
  const profile: IceBeamAnimationProfile = {
    orientation: attackerSide === "player" ? "player-back" : "opponent-front", endAge: 202,
    geometry: { attackerPictureOffset: aa.picOffsetPoint, targetPictureOffset: ta.picOffsetPoint, targetCenter: ta.picOffsetPoint,
      monbgBaseHofs: 512 + monbg[3]!, monbgBaseVofs: 512 + monbg[4]! },
    gameplayRng: r.rng, animationRngStart: r.rng2,
    spriteOrder: { initialOrder: r.orderAtAct },
  };
  const tl = iceBeamTimeline(profile);
  // reducer births (non-palette kinds included) vs ROM spawns
  const rb: any[] = []; const seen = new Set<string>();
  tl.frames.forEach((f, age) => f.sprites.forEach((s) => { const k = `${s.slot}:${s.birthAge}`; if (!seen.has(k)) { seen.add(k); rb.push({ age: s.birthAge, slot: s.slot, tmpl: s.template, x: s.x, y: s.y, matrix: s.matrixNum }); } }));
  const rom = r.sprites.filter((s: any) => s.tmpl !== "ALLOCATE_SCRIPT_CMD_TABLE");
  let slotOk = 0, posOk = 0; const bad: any[] = [];
  for (const s of rom) {
    const m = rb.find((b) => b.slot === s.slot && b.age === s.age);
    if (m) slotOk += 1;
    if (m && m.x === s.x && m.y === s.y) posOk += 1; else if (bad.length < 4) bad.push({ rom: [s.age, s.slot, s.tmpl, s.x, s.y], red: m ?? null });
  }
  // ROM sSpriteOrder per age (probe order series: last change at or before the age; the activation order before the first change)
  const romOrderAt = (age: number): number[] => { let o: number[] = r.orderAtAct; for (const [a, ord] of r.orderChanges) if (a <= age) o = ord; return o; };
  let orderEq = 0; const orderBad: number[] = [];
  tl.frames.forEach((f, age) => { if (JSON.stringify(f.order.fullSourceOrder) === JSON.stringify(romOrderAt(age))) orderEq += 1; else if (orderBad.length < 6) orderBad.push(age); });
  const taskRom = r.tasks.map((t: any) => `${t.slot}:${t.func}:${t.age}`).sort().join(",");
  const taskRed = new Map<string, number>();
  tl.frames.forEach((f, age) => f.tasks.forEach((t) => { const k = `${t.slot}:${t.callback}`; if (!taskRed.has(k)) taskRed.set(k, age); }));
  out[sc] = { attackerSide, species: r.monsAtAct.map((m: any) => m.species), geometry: profile.geometry, anchors: { attackerSpriteCenter: aa.spriteCenter, targetSpriteCenter: ta.spriteCenter, romBattlerXY: r.battlerXY },
    monbgFormulaHolds: monbgFormula, monbgData: monbg, fullOrderEqualAges: `${orderEq}/${tl.frames.length}`, orderMismatchAgesSample: orderBad, romSpawns: rom.length, reducerBirths: rb.length, slotAgeMatches: slotOk, xyMatches: posOk, mismatchSamples: bad, taskPairsRom: r.tasks.map((t: any) => [t.slot, t.func, t.age]), taskPairsReducerFirstAge: [...taskRed.entries()],
    targetSpriteSlotRom: r.battlerSpriteIds, targetSpriteSlotDefault: attackerSide === "player" ? 8 : 6, battlerSub: r.battlerSub };
  console.log(sc.padEnd(52), "geom", JSON.stringify(profile.geometry), "monbg formula", monbgFormula, "fullOrder==", `${orderEq}/${tl.frames.length}`, orderBad.join(","), "slot/age", slotOk, "/", rom.length, "xy", posOk, "/", rom.length, "tasks", JSON.stringify([...taskRed.keys()]));
  for (const b of bad) console.log("    ", JSON.stringify(b));
}
writeFileSync("tools/integration/fixtures/prep13/prep13-ice-beam-check.json", JSON.stringify(out, null, 1));
