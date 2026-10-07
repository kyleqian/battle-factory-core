// prep22: Sheer Cold accepted reducer fed production-derivable geometry vs per-age ROM cube sprite (slot, x, y, x2, y2, invisible) of each scenario (accepted P/O + fresh alternates).
// Derived: targetAnimationCenter = target picOffsetPoint (cube.x + 32, cube.y + 36 in the accepted verifier), targetBattlePositionCenter = target sprite x+x2, y+y2 (== Task_UpdateMonBg data[1..2]),
// monbg.scroll = (32 - x, 32 - y) of that point, monbg.layer = bg2 for a player target / bg1 for an opponent target (Task_UpdateMonBg data[5]).
// usage: node --experimental-strip-types tools/integration/prep22SheerColdCheck.ts STATE_DIR OUT.json
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";
import { liveBattlerAnchors } from "../../src/engine/liveMoveAnimation.ts";
import { sheerColdAtAge, sheerColdFirstInactiveAge } from "../../src/animation/sheerCold.ts";
const [dir, outPath] = process.argv.slice(2);
const out: any = {};
for (const f of readdirSync(dir).filter((x) => x.endsWith("-r1.json")).sort()) {
  const name = f.slice(0, -8);
  if (!(name.startsWith("mechanic-sheer-cold-") || name.startsWith("prep22-sheer-cold-alt-"))) continue;
  const probe = JSON.parse(readFileSync(join(dir, f), "utf8"));
  const body = probe.bodies.find((b: any) => b.move === 329); const A = body.start, E = body.end; const act = body.atActivation;
  const attackerSide = act.attacker === 0 ? "player" : "opponent", targetSide = attackerSide === "player" ? "opponent" : "player";
  const art = createBattleCommandFieldArtView({ player: { species: act.mons[0].species }, opponent: { species: act.mons[1].species } } as never);
  const aa = liveBattlerAnchors(attackerSide, art), ta = liveBattlerAnchors(targetSide, art);
  const tIdx = targetSide === "player" ? 0 : 1;
  const tx = ta.spriteCenter.x + ta.frontIdleRest.x2, ty = ta.spriteCenter.y + ta.frontIdleRest.y2;
  const mon = body.taskEvents ? null : null;
  const id = [256, 0, 0, 256] as const;
  const cubeBirth = probe.spawns.find((x: any) => A <= x.f && x.f <= E && x.ev === "+");
  const romTask = probe.taskEvents.find(([fr, tf]: any) => fr >= A && Object.values(tf).some((fn: any) => probe.taskFuncNames[String(fn - 1)] === "Task_UpdateMonBg"));
  const mbSlot = Object.entries(romTask[1]).find(([, fn]: any) => probe.taskFuncNames[String(fn - 1)] === "Task_UpdateMonBg")![0];
  const mb = romTask[2][mbSlot];
  const slotsOfTasks: Record<string, number> = {};
  const tasksByName = (nm: string, from = A) => { for (const [fr, tf] of probe.taskEvents) { if (fr < from) continue; for (const [k, fn] of Object.entries(tf)) if (probe.taskFuncNames[String((fn as number) - 1)] === nm) return Number(k); } return -1; };
  const inputs: any = {
    attackerSide, targetSide, attackerSpecies: "X", targetSpecies: "Y",
    targetAnimationCenter: ta.picOffsetPoint, targetBattlePositionCenter: { x: tx, y: ty },
    attackerSprite: { slot: attackerSide === "player" ? 6 : 8, subpriority: attackerSide === "player" ? 30 : 40, matrixNum: 0, matrix: id },
    targetSprite: { slot: targetSide === "player" ? 6 : 8, subpriority: targetSide === "player" ? 30 : 40, matrixNum: 0, matrix: id },
    cubeSpriteSlot: cubeBirth.slot,
    taskSlots: { fadeToBg: tasksByName("Task_FadeToBg"), cube: tasksByName("AnimTask_FrozenIceCube_Step1"), updateMonBg: Number(mbSlot), sound: tasksByName("Task_WaitAndPlaySE"), clearMonBg: tasksByName("Task_ClearMonBg"), restoreBg: 0 },
    resources: { iceCube: { paletteBank: 7, tileSlot: 0, tileRange: [305, 64] } },
    matrixBitmap: 6, spriteOrder: act.spriteOrder, painterSprites: act.sprites.map((s: number) => ({ slot: s, subpriority: 0, oamPriority: 2, y: 0 })),
    monbg: { layer: targetSide === "player" ? "bg2" : "bg1", scroll: { x: 32 - tx, y: 32 - ty } },
    background: { bg1Cnt: act.regs.bg1, bg2Cnt: act.regs.bg2 }, animationRng: act.rng2, gameplayRng: null,
  };
  const checks = {
    cubeCenterEqualsPicOffset: cubeBirth.x + 32 === ta.picOffsetPoint.x && cubeBirth.y + 36 === ta.picOffsetPoint.y,
    monbgDataEquals: mb[1] === tx && mb[2] === ty && mb[3] === 32 - tx && mb[4] === 32 - ty && (mb[5] === 1) === (targetSide === "player"),
  };
  let rows = 0, ok = 0; const diffs: any[] = [];
  let last: number; try { last = sheerColdFirstInactiveAge(inputs); } catch { last = E - A; }
  for (const row of body.spriteSeries as any[]) {
    const age = row[0]; if (age >= last || age >= E - A) continue;
    const rom = new Map<number, number[]>((row.slice(1) as number[][]).map((s) => [s[0]!, s]));
    let st: any; try { st = sheerColdAtAge(age, inputs); } catch (e: any) { diffs.push({ age, error: String(e.message).slice(0, 140) }); rows += 1; continue; }
    const red = new Map<number, any>(st.sprites.map((s: any) => [s.slot, s]));
    rows += 1; let same = rom.size === red.size && [...rom.keys()].every((k) => red.has(k)); const detail: any[] = [];
    if (same) for (const [slot, r] of rom) { const g = red.get(slot); const m = ["x", "y", "x2", "y2"].filter((k, i) => g[k] !== r[1 + i]); if (m.length) { same = false; detail.push({ slot, m, rom: r.slice(1, 5), red: [g.x, g.y, g.x2, g.y2] }); } }
    else detail.push({ romSlots: [...rom.keys()].join(","), redSlots: [...red.keys()].join(",") });
    if (same) ok += 1; else if (diffs.length < 3) diffs.push({ age, detail });
  }
  out[name] = { attackerSide, ...checks, cubeSlot: cubeBirth.slot, taskSlots: inputs.taskSlots, rows, exactRows: ok, firstDiffs: diffs };
  console.log(name.slice(-40).padEnd(40), JSON.stringify(checks), JSON.stringify(inputs.taskSlots), `per-age ${ok}/${rows}`, diffs.length ? JSON.stringify(diffs[0]).slice(0, 220) : "");
}
writeFileSync(outPath, JSON.stringify(out, null, 1));
