// prep13: Water Spout. Run waterSpoutTimeline with production-derivable inputs (anchors, party HP, lowest-free slots over the activation in-use set, first-free matrix ids, pictureHeight,
// order seed = sSpriteOrder at activation) for the accepted and alternate scenarios and compare sprite births (kind, slot, matrix, x, y) and the end age with the ROM probe.
// Also checks the task-local ISO_RANDOMIZE2 seed (rain x stream) against the ROM rain-droplet spawn x.   npx vite-node tools/integration/prep13WaterSpoutCheck.ts
import { readFileSync, writeFileSync } from "node:fs";
import { waterSpoutTimeline, waterSpoutRainAttempts, waterSpoutPowerTier, type WaterSpoutLiveInputs } from "../../src/animation/waterSpout.ts";
import { createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";
import { liveBattlerAnchors } from "../../src/engine/liveMoveAnimation.ts";
const A = JSON.parse(readFileSync("tools/integration/fixtures/prep13/prep13-analysis.json", "utf8")) as Record<string, any[]>;
const out: Record<string, unknown> = {};
const centerMode = process.env.CENTER ?? "pic"; // pic | sprite
for (const [sc, r, bodyIdx] of Object.keys(A).filter((k) => /water-spout/.test(k)).flatMap((k) => A[k]!.filter((x) => x.move === "WATER_SPOUT").map((x, i) => [k, x, i] as const))) {
  const side = (/alt-opponent|spout-opponent|tiers-opponent/.test(sc) ? "opponent" : "player") as "player" | "opponent";
  const art = createBattleCommandFieldArtView({ player: { species: r.monsAtAct[0].species }, opponent: { species: r.monsAtAct[1].species } } as never);
  const aa = liveBattlerAnchors(side, art);
  const mon = r.monsAtAct[side === "player" ? 0 : 1];
  const free: number[] = []; for (let s = 0; s < 64; s += 1) if (!r.inUseAtAct.includes(s)) free.push(s);
  const inputs: WaterSpoutLiveInputs = {
    attackerSide: side, attackerHp: mon.hp, attackerMaxHp: mon.maxHP,
    attackerEffectCenter: centerMode === "pic" ? aa.picOffsetPoint : aa.spriteCenter,
    attackerSubpriority: r.battlerSub[side === "player" ? 0 : 1], launchTaskSlot: 0, launchSpriteSlots: free,
    attackerSourceHeight: aa.pictureHeight, animationRng: r.rng2, spriteOrderSeed: r.orderAtAct,
  };
  const tl = waterSpoutTimeline(inputs);
  const births: any[] = []; const seen = new Set<string>();
  tl.forEach((f, age) => f.sprites.forEach((s) => { const k = `${s.kind}:${s.slot}:${s.birthAge}`; if (!seen.has(k)) { seen.add(k); births.push({ age: s.birthAge, kind: s.kind, slot: s.slot, x: s.x, y: s.y, matrix: s.matrixNum }); } }));
  const rom = r.sprites.filter((s: any) => /WaterOrb|WaterHitSplat/.test(s.tmpl));
  let sl = 0, xy = 0, mx = 0, exact = 0, yy = 0; const bad: any[] = [];
  for (const s of rom) {
    const m = births.find((b) => b.slot === s.slot && Math.abs(b.age - s.age) <= 1 && (s.tmpl.includes("HitSplat") ? b.kind === "impact" : b.kind !== "impact"));
    if (m) sl += 1; if (m && m.age === s.age) exact += 1; if (m && m.y === s.y) yy += 1; if (m && m.x === s.x) xy += 1; if (m && (s.tmpl.includes("HitSplat") ? m.matrix === s.matrix : true)) mx += 1;
    if (!m || m.x !== s.x) { if (bad.length < 5) bad.push({ rom: [s.age, s.slot, s.tmpl, s.x, s.y, s.matrix], red: m ?? null }); }
  }
  // rain x stream
  const att = waterSpoutRainAttempts(side, waterSpoutPowerTier(mon.hp, mon.maxHP));
  const romRainX = rom.filter((s: any) => /SmallWaterOrb/.test(s.tmpl) && s.age > 100).map((s: any) => s.x);
  const endRows = tl.findIndex((f) => !f.active);
  out[`${sc}#${bodyIdx}`] = { side, species: r.monsAtAct.map((m: any) => m.species), hp: [mon.hp, mon.maxHP], tier: waterSpoutPowerTier(mon.hp, mon.maxHP), pictureHeight: aa.pictureHeight, effectCenter: inputs.attackerEffectCenter, spriteCenter: aa.spriteCenter,
    romRows: r.rows, reducerFirstInactiveAge: endRows, romSpawns: rom.length, reducerBirths: births.length, slotMatches: sl, exactAgeMatches: exact, yMatches: yy, xMatches: xy, matrixMatches: mx, mismatchSamples: bad,
    rainSeed: att[0]?.x, rainXpredicted: att.map((a) => a.x), rainXrom: romRainX, freeSlotsAtAct: free.slice(0, 24), tasksRom: r.tasks.map((t: any) => [t.slot, t.func, t.age]), battlerSub: r.battlerSub };
  console.log(`${sc}#${bodyIdx}`.padEnd(54), "hp", mon.hp + "/" + mon.maxHP, "tier", waterSpoutPowerTier(mon.hp, mon.maxHP), "ROM rows", r.rows, "reducer inactive@", endRows, "spawns", rom.length, "slot", sl, "exactAge", exact, "x", xy, "y", yy, "matrix", mx, "seed", att[0]?.x, "rainSeedFirst3", JSON.stringify(att.slice(0, 3).map((a) => a.x)), "rom", JSON.stringify(romRainX.slice(0, 3)));
  for (const b of bad.slice(0, 3)) console.log("   ", JSON.stringify(b));
}
writeFileSync(`tools/integration/fixtures/prep13/prep13-water-spout-check${centerMode === "pic" ? "" : "-" + centerMode}.json`, JSON.stringify(out, null, 1));
