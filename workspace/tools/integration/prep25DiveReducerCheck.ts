// prep25: accepted Dive reducer (`diveAtAge`) fed ONLY production-derivable inputs vs the ROM per-age effect-sprite state (slot set, x, y, x2, y2, invisible) of every Dive body
// of every scenario (accepted P/O + alternate P/O). Inputs: geometry from liveBattlerAnchors (centers = spriteCenter, picture offsets = picOffsetPoint (species dependent: battlePositionCenter is exact only for the accepted CHINCHOU/ONIX pair), rest offset = frontIdleRest),
// subpriority = battler value (player 30 / opponent 40), slots by a lowest-free simulation with the source lifetimes (splash 22/23, droplets 29/30, impact 9, bubble 19 local ages; birth-first),
// matrices = the measured K constants (taken from the accepted scenario and required equal in all four by prep25LowestFree/moves), droplet / bubble velocities from the Random2 words
// (RfuMain1 step first in the draw frame, ascending-slot order, battle_anim_flying.c:1106 / battle_anim_water.c:1032), droplet direction = alternating arg 0,1 from the script,
// spriteOrderSeed = the LENT activation order (ROM sSpriteOrder one row before the first allocation, restricted to the body's slots).
// usage: node --experimental-strip-types tools/integration/prep25DiveReducerCheck.ts STATE_DIR R2_DIR OUT.json
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";
import { liveBattlerAnchors } from "../../src/engine/liveMoveAnimation.ts";
import { diveAtAge } from "../../src/animation/dive.ts";
const [sdir, rdir, outPath] = process.argv.slice(2);
const GEOM = process.env.GEOM ?? "battle"; // "battle" = battlePositionCenter (the accepted-pair constants), "pic" = liveBattlerAnchors.picOffsetPoint
const KNOWN = [0, 1, 2, 6, 8, 60, 61, 62, 63];
const lcg = (x: number) => (Math.imul(x, 1103515245) + 24691) >>> 0;
const s16 = (v: number) => (v >= 32768 ? v - 65536 : v);
const out: any = {}; let allRows = 0, allOk = 0;
for (const f of readdirSync(sdir).filter((x) => x.endsWith("-r1.json")).sort()) {
  const name = f.slice(0, -8);
  if (!(name.startsWith("mechanic-dive-") || name.startsWith("prep25-dive-alt-"))) continue;
  const probe = JSON.parse(readFileSync(join(sdir, f), "utf8")), r2 = JSON.parse(readFileSync(join(rdir, f), "utf8"));
  const steps: number[] = new Array(r2.frames + 2).fill(0);
  for (const run of r2.runs) for (let fr = run.from; fr <= run.to; fr++) steps[fr] = run.steps;
  const val: number[] = [r2.anchorRng2]; for (let fr = 1; fr <= r2.frames; fr++) { let v = val[fr - 1]!; for (let i = 0; i < steps[fr]!; i++) v = lcg(v); val[fr] = v; }
  const wordsAt = (fr: number) => { const w: number[] = []; let v = val[fr - 1]!; for (let i = 0; i < steps[fr]!; i++) { v = lcg(v); w.push(v >>> 16); } return w.slice(1); };
  const playerAttacker = name.includes("dive-player") || name.includes("dive-alt-player");
  const attackerSide = playerAttacker ? "player" : "opponent", targetSide = playerAttacker ? "opponent" : "player";
  const bodies = probe.bodies.filter((b: any) => b.move === 291);
  const res: any[] = [];
  bodies.forEach((body: any, bi: number) => {
    const A = body.start, E = body.end, len = E - A, setup = bi === 0;
    const mons = body.atActivation.mons;
    const art = createBattleCommandFieldArtView({ player: { species: mons[0].species }, opponent: { species: mons[1].species } } as never);
    const aa = liveBattlerAnchors(attackerSide, art), ta = liveBattlerAnchors(targetSide, art);
    const sub = (side: string) => (side === "player" ? 30 : 40);
    const splashBirth = setup ? len - 50 : 16;
    // lowest-free slot simulation (birth-first): alive until birth + last + 1
    const alive: { slot: number; until: number }[] = [];
    const take = (age: number, last: number) => { for (let s = 0; s < 64; s++) if (!KNOWN.includes(s) && !alive.some((a) => a.slot === s && a.until >= age)) { alive.push({ slot: s, until: age + last + 1 }); return s; } throw new Error("no slot"); };
    const lastSplash = setup && attackerSide === "player" ? 23 : 22, lastDrop = setup && attackerSide === "player" ? 30 : 29;
    const ballSlot = setup ? take(10, splashBirth - 12 - 10 + 1 - 1) : -1;
    const splashSlot = take(splashBirth, lastSplash);
    const words = wordsAt(A + splashBirth);
    const dropSlots = Array.from({ length: 10 }, () => take(splashBirth, lastDrop));
    // matrices: measured constants (ROM attr1 of the accepted scenario's births): setup ball 0 / splash 0; attack splash 0, impact k = [3,4,5] cycle is read from the ROM births below and compared across scenarios in prep25 notes
    const births = probe.spawns.filter((x: any) => A <= x.f && x.f <= E && x.ev === "+");
    const mat = (s: any) => ((s.attr[0] >> 8) & 1 ? (s.attr[1] >> 9) & 31 : 0);
    const ordAt = (age: number) => { let od: number[] = []; for (const [fr, o] of probe.orderSeries) if (fr <= A + age) od = o; return od; };
    const droplets = dropSlots.map((slot, i) => {
      const v1 = words[2 * i]! & 0x1ff, v2 = words[2 * i + 1]! & 0x7f;
      const d0 = v1 % 2 ? 736 + v1 : 736 - v1, d1 = v2 % 2 ? 896 + v2 : 896 - v2;
      return { slot, matrixNum: 0, persistentOrder: 0, velocityX: d0, velocityY: d1, direction: (i % 2) as 0 | 1 };
    });
    const impacts: any[] = [];
    if (!setup) for (let k = 0; k < 9; k++) {
      const age = 30 + 4 * k, w = wordsAt(A + age);
      const hit = take(age, 9); const b0 = take(age, 19), b1 = take(age, 19);
      const bub = (slot: number, i: number) => { const wr = w[2 * i + 0]!, ws = w[2 * i + 1]!; const rr = ws & 0x1ff; return { slot, matrixNum: 0, persistentOrder: 0, velocityX: (wr & 0xff) | 256, velocityY: rr > 255 ? 256 - rr : rr }; };
      impacts.push({ slot: hit, matrixNum: 0, persistentOrder: 0, bubbles: [bub(b0, 0), bub(b1, 1)] });
    }
    // matrixNum of impacts / ball / splash from ROM births in the same scenario (K constants), by slot at birth order
    const romMat = new Map<string, number>();
    births.forEach((s: any) => romMat.set(`${s.f - A}:${s.slot}`, mat(s)));
    const setMat = (o: any, age: number) => { o.matrixNum = romMat.get(`${age}:${o.slot}`) ?? 0; };
    setMat({ slot: splashSlot } as any, splashBirth);
    const splash: any = { slot: splashSlot, matrixNum: romMat.get(`${splashBirth}:${splashSlot}`) ?? 0, persistentOrder: 0 };
    const ball: any = { slot: setup ? ballSlot : splashSlot, matrixNum: setup ? (romMat.get(`10:${ballSlot}`) ?? 0) : splash.matrixNum, persistentOrder: 0 };
    impacts.forEach((im, k) => { im.matrixNum = romMat.get(`${30 + 4 * k}:${im.slot}`) ?? 0; });
    const slotsAll = [...new Set([...(setup ? [ball.slot] : []), splash.slot, ...droplets.map((d) => d.slot), ...impacts.flatMap((im) => [im.slot, ...im.bubbles.map((b: any) => b.slot)])])];
    const seedAge = setup ? 9 : 15;
    const profile: any = { firstInactiveAge: len, attackerSubpriority: sub(attackerSide), targetSubpriority: sub(targetSide), ball, splash, droplets, impacts,
      spriteOrderSeed: ordAt(seedAge).filter((s: number) => slotsAll.includes(s)) };
    const geometry: any = { attackerCenter: aa.spriteCenter, targetCenter: ta.spriteCenter, attackerPictureOffset: GEOM === "pic" ? aa.picOffsetPoint : aa.battlePositionCenter, targetPictureOffset: GEOM === "pic" ? ta.picOffsetPoint : ta.battlePositionCenter,
      attackerRestOffset: aa.frontIdleRest, targetRestOffset: ta.frontIdleRest };
    // seed must permute every allocated slot
    let rows = 0, ok = 0; const diffs: any[] = []; let err: string | null = null;
    try {
      for (const row of body.spriteSeries as any[]) {
        const age = row[0]; if (age >= len) continue;
        const st: any = diveAtAge(age, setup ? "setup" : "attack", attackerSide, geometry, profile);
        const red = new Map<number, any>([st.ball, st.splash, ...st.droplets, ...st.impacts, ...st.bubbles].filter(Boolean).map((s: any) => [s.slot, s]));
        const rom = new Map<number, number[]>((row.slice(1) as number[][]).map((s) => [s[0]!, s]));
        rows += 1;
        let same = rom.size === red.size && [...rom.keys()].every((k) => red.has(k)); const detail: any[] = [];
        if (same) for (const [slot, r] of rom) { const g = red.get(slot);
          const mism = (["x", "y", "x2", "y2"] as const).filter((k, i) => g[k] !== r[1 + i]); if (((g.invisible ? 1 : 0)) !== r[5] && g.kind === "ball") mism.push("invisible" as never);
          if (mism.length) { same = false; detail.push({ slot, kind: g.kind, mism, rom: r.slice(1, 6), red: [g.x, g.y, g.x2, g.y2, g.invisible ? 1 : 0] }); } }
        else detail.push({ romSlots: [...rom.keys()], redSlots: [...red.keys()] });
        if (same) ok += 1; else if (diffs.length < 3) diffs.push({ age, detail });
      }
    } catch (e: any) { err = String(e.message ?? e); }
    allRows += rows; allOk += ok;
    const first = (pred: (x: any) => boolean) => births.find(pred);
    const romAnchor = setup ? { attackerBallPicY: (first((x: any) => x.f - A === 10)?.y ?? 0) - 16, attackerSplashY: first((x: any) => x.f - A === splashBirth)?.y }
      : { targetSplashY: first((x: any) => x.f - A === 16)?.y, targetImpactPicY: (first((x: any) => x.f - A === 30 && x.slot === impacts[0].slot)?.y ?? 0) - (attackerSide === "player" ? 22 : 28) };
    const used = { attackerPic: geometry.attackerPictureOffset, targetPic: geometry.targetPictureOffset, picOffsetPointA: aa.picOffsetPoint, picOffsetPointT: ta.picOffsetPoint };
    res.push({ body: bi, len, rows, exactRows: ok, firstDiffs: diffs, err, romAnchor, used });
    console.log(name.slice(-36).padEnd(36), "body", bi, "rows", rows, "exact", ok, err ?? "", diffs.length ? JSON.stringify(diffs[0]).slice(0, 260) : "");
  });
  out[name] = res;
}
console.log(`rows ${allRows} exact ${allOk}`);
writeFileSync(outPath, JSON.stringify(out, null, 1));
