// prep22: Signal Beam accepted reducer fed production-derivable geometry + lowest-free slot simulation vs the per-age ROM effect-sprite state (x, y, x2, y2) of each scenario
// (accepted P/O + fresh alternates). Non-position fields (resource allocations, painter list, matrices, task slots) are the measured known-entry constants (K), listed in the doc.
// usage: node --experimental-strip-types tools/integration/prep22SignalBeamCheck.ts STATE_DIR OUT.json
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";
import { liveBattlerAnchors } from "../../src/engine/liveMoveAnimation.ts";
import { signalBeamAtAge, signalBeamFirstInactiveAge } from "../../src/animation/signalBeam.ts";
const [dir, outPath] = process.argv.slice(2);
const nm = execSync("arm-none-eabi-nm -n reference/pokeemerald/pokeemerald.elf", { encoding: "utf8", maxBuffer: 1 << 28 });
const addr = (s: string) => parseInt(nm.split("\n").find((l) => l.endsWith(` ${s}`))!.split(" ")[0]!, 16);
const RED = addr("gSignalBeamRedOrbSpriteTemplate"), GREEN = addr("gSignalBeamGreenOrbSpriteTemplate");
const OCC = new Set([0, 1, 2, 6, 8, 60, 61, 62, 63]);
const out: any = {}; let allOk = true;
for (const f of readdirSync(dir).filter((x) => x.endsWith("-r1.json")).sort()) {
  const name = f.slice(0, -8);
  if (!(name.startsWith("mechanic-signal-beam-") || name.startsWith("prep22-signal-beam-alt-"))) continue;
  const probe = JSON.parse(readFileSync(join(dir, f), "utf8"));
  const body = probe.bodies.find((b: any) => b.move === 324); const A = body.start, E = body.end;
  const act = body.atActivation;
  const attackerSide = act.attacker === 0 ? "player" : "opponent", targetSide = attackerSide === "player" ? "opponent" : "player";
  const art = createBattleCommandFieldArtView({ player: { species: act.mons[0].species }, opponent: { species: act.mons[1].species } } as never);
  const aa = liveBattlerAnchors(attackerSide, art), ta = liveBattlerAnchors(targetSide, art);
  const id = [256, 0, 0, 256] as const;
  const sub = (s: string) => (s === "player" ? 30 : 40);
  const battler = (side: string, a: any) => ({ slot: side === "player" ? 6 : 8, x: a.spriteCenter.x, y: a.spriteCenter.y, x2: a.frontIdleRest.x2, y2: a.frontIdleRest.y2, subpriority: sub(side), oamPriority: 2, matrixNum: 0, matrix: id });
  // lowest-free simulation of the 23 (red, green) pairs: births at age 18 + 3k, orbs freed 30 rows later; blend helper at age 36 (lowest free then)
  const births = probe.spawns.filter((x: any) => A <= x.f && x.f <= E && x.ev === "+");
  const romPairs: any[] = [];
  for (let k = 0; k < 23; k += 1) {
    const age = 18 + 3 * k; const bs = births.filter((x: any) => x.f - A === age);
    const red = bs.find((x: any) => x.tmpl === RED), green = bs.find((x: any) => x.tmpl === GREEN);
    romPairs.push({ redSlot: red.slot, greenSlot: green.slot });
  }
  const helper = births.find((x: any) => (x.f - A) === 36 && x.tmpl !== RED && x.tmpl !== GREEN)!;
  // simulation (production-derivable): free-first at each age, orbs freed at birth+30
  const used = new Set(OCC); const simPairs: any[] = []; let helperSlot = -1;
  const freeAt = new Map<number, number[]>();
  for (let age = 0; age <= 100; age += 1) {
    for (const s of freeAt.get(age) ?? []) used.delete(s);
    const k = (age - 18) / 3;
    if (age >= 18 && Number.isInteger(k) && k < 23) {
      const lo = (n: number) => Array.from({ length: 64 }, (_, i) => i).filter((i) => !used.has(i)).slice(0, n);
      let helperHere = age === 36 ? 1 : 0;
      if (helperHere) { helperSlot = lo(1)[0]!; used.add(helperSlot); }  // the helper is created before that age's pair (script order)
      const [r, g] = lo(2); used.add(r!); used.add(g!); simPairs.push({ redSlot: r, greenSlot: g });
      freeAt.set(age + 30, [...(freeAt.get(age + 30) ?? []), r!, g!]);
    }
  }
  const helperFreeAge = 36 + 0; // helper lifetime unknown here: leave to measured below
  const pairsEqual = JSON.stringify(simPairs) === JSON.stringify(romPairs);
  const inputs: any = {
    attackerSide, targetSide, attackerSpecies: "X", targetSpecies: "Y",
    attackerPictureOrigin: aa.picOffsetPoint, targetPictureOrigin: ta.picOffsetPoint,
    attackerSprite: battler(attackerSide, aa), targetSprite: battler(targetSide, ta),
    orbPairs: romPairs, taskSlots: { attackerShake: 0, pan: 1, sinTimer: 2, targetShake: 3 },
    paletteBlendSpriteSlot: helper.slot,
    resources: { duck: { paletteBank: 9, tileSlot: 2, tileRange: [321, 16] }, redOrb: { paletteBank: 7, tileSlot: 0, tileRange: [305, 16] }, greenOrb: { paletteBank: 8, tileSlot: 1, tileRange: [313, 8] } },
    matrixBitmap: 6, matrixSlots: act.swMatrices.map((m: number[]) => m), spriteOrder: act.spriteOrder, painterSprites: act.sprites.map((s: number) => ({ slot: s, subpriority: 0, oamPriority: 2, oamY: 0 })),
    targetPalette: { bank: 16, unfaded: new Array(16).fill(0) }, registers: { win0h: act.regs.win0h, win0v: act.regs.win0v }, animationRngSeed: act.rng2, gameplayRng: null,
  };
  let rows = 0, ok = 0; const diffs: any[] = [];
  const last = signalBeamFirstInactiveAge(inputs);
  for (const row of body.spriteSeries as any[]) {
    const age = row[0]; if (age >= E - A || age >= last) continue;
    const rom = new Map<number, number[]>((row.slice(1) as number[][]).map((s) => [s[0]!, s]));
    let st: any; try { st = signalBeamAtAge(age, inputs); } catch (e: any) { diffs.push({ age, error: String(e.message).slice(0, 120) }); rows += 1; continue; }
    const red = new Map<number, any>(st.sprites.map((s: any) => [s.slot, s]));
    rows += 1;
    let same = rom.size === red.size && [...rom.keys()].every((k) => red.has(k)); const detail: any[] = [];
    if (same) for (const [slot, r] of rom) { const g = red.get(slot); const m = ["x", "y", "x2", "y2"].filter((k, i) => g[k] !== r[1 + i]); if (m.length) { same = false; detail.push({ slot, m, rom: r.slice(1, 5), red: [g.x, g.y, g.x2, g.y2] }); } }
    else detail.push({ romSlots: [...rom.keys()].join(","), redSlots: [...red.keys()].join(",") });
    if (same) ok += 1; else if (diffs.length < 3) diffs.push({ age, detail });
  }
  out[name] = { attackerSide, lowestFreePairsEqualRom: pairsEqual, helperSlotSim: helperSlot, helperSlotRom: helper.slot, rows, exactRows: ok, firstDiffs: diffs };
  allOk &&= ok === rows;
  console.log(name.slice(-40).padEnd(40), "pairs(lowest-free sim == ROM)", pairsEqual, "helper", helperSlot, helper.slot, `per-age ${ok}/${rows}`, diffs.length ? JSON.stringify(diffs[0]).slice(0, 260) : "");
}
writeFileSync(outPath, JSON.stringify(out, null, 1));
