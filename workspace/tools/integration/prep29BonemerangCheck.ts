// prep29: accepted Bonemerang reducer fed ONLY production-derivable inputs vs the ROM per-age effect-sprite rows of every Bonemerang body of each scenario (accepted P/O + fresh alternate pair).
// Derived: attacker/target picture centers = liveBattlerAnchors(...).picOffsetPoint; sprite slots = lowest-free over the known-entry in-use set (birth-first: a sprite freed in a frame is still occupied at that frame's births);
// subpriority = attacker battler subpriority (player 30 / opponent 40). Compared per ROM row (age, slot, x, y, x2, y2) and per birth (age, slot, x, y, sub).
// Not compared here (measured separately, receipts): matrices (lowest-free matrix numbers), task slots, registers (first-body gate), palette. usage: node --experimental-strip-types tools/integration/prep29BonemerangCheck.ts STATE_DIR OUT.json
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";
import { liveBattlerAnchors } from "../../src/engine/liveMoveAnimation.ts";
import { bonemerangAtAge } from "../../src/animation/bonemerang.ts";
const [dir, outPath] = process.argv.slice(2);
const KNOWN = [0, 1, 2, 6, 8, 60, 61, 62, 63];
const out: any = {};
for (const f of readdirSync(dir).filter((x) => x.endsWith("-r1.json")).sort()) {
  const name = f.slice(0, -8);
  if (!(name.startsWith("mechanic-bonemerang-") || name.startsWith("prep29-bonemerang-alt-"))) continue;
  const probe = JSON.parse(readFileSync(join(dir, f), "utf8"));
  for (const [bi, body] of probe.bodies.filter((b: any) => b.move === 155).entries()) {
    const A = body.start, E = body.end, mons = body.atActivation.mons;
    const art = createBattleCommandFieldArtView({ player: { species: mons[0].species }, opponent: { species: mons[1].species } } as never);
    const attackerSide = body.atActivation.attacker === 0 ? "player" : "opponent", targetSide = attackerSide === "player" ? "opponent" : "player";
    const aa = liveBattlerAnchors(attackerSide, art), ta = liveBattlerAnchors(targetSide, art);
    // sprite slots: bone born 10 (until 50), impact 32 (until 41), lunge 51 (until 65); frees apply AFTER the frame's births
    const free = (used: number[]) => { let s = 0; while (used.includes(s)) s += 1; return s; };
    const bone = free(KNOWN), impact = free([...KNOWN, bone]), lunge = free([...KNOWN, bone]); // the impact (freed 42) is gone at 51; the bone (freed at 51) is still held at the lunge birth
    const asub = attackerSide === "player" ? 30 : 40;
    const sp = { slot: 0, x: 0, y: 0, x2: 0, y2: 0, subpriority: asub, oamPriority: 0, matrixNum: 0, matrix: [256, 0, 0, 256] };
    const input: any = { attackerSide, targetSide, attackerSpecies: "", targetSpecies: "", attackerPictureCenter: aa.picOffsetPoint, targetPictureCenter: ta.picOffsetPoint,
      attackerSprite: { ...sp, slot: body.atActivation.battlerSpriteIds?.[body.atActivation.attacker] ?? 0 }, targetSprite: sp,
      allocations: { boneSpriteSlot: bone, impactSpriteSlot: impact, lungeSpriteSlot: lunge, shakeTaskSlot: 0, updateMonBgTaskSlot: 1, clearMonBgTaskSlot: 1, boneMatrixSlot: 0, impactMatrixSlot: 3 },
      resources: { bone: { paletteBank: 0, tileSlot: 0, tileRange: [0, 0] }, impact: { paletteBank: 0, tileSlot: 0, tileRange: [0, 0] } },
      spriteOrder: body.atActivation.spriteOrder, painterSprites: [], initialMatrixBitmap: body.atActivation.bitmap,
      monbg: { layer: "bg1", scroll: { x: 0, y: 0 }, targetBgPriority: 0 }, background: { baseBg1Cnt: 0, baseBg2Cnt: 0, monbgBg1Cnt: 0, monbgBg2Cnt: 0, splitBg1Cnt: 0, splitBg2Cnt: 0 },
      animationRngSeed: body.atActivation.rng2, gameplayRng: null };
    const births = probe.spawns.filter((x: any) => A <= x.f && x.f <= E && x.ev === "+");
    let bOk = 0; const bDiff: any[] = [];
    births.forEach((b: any) => {
      const age = b.f - A; const r = (bonemerangAtAge(age, input).sprites as any[]).find((x) => x.slot === b.slot);
      if (r && r.x === b.x && r.y === b.y && r.subpriority === b.sub) bOk += 1; else bDiff.push({ age, slot: b.slot, rom: [b.x, b.y, b.sub], got: r ? [r.x, r.y, r.subpriority] : null });
    });
    let rows = 0, rowsOk = 0; const diffs: any[] = [];
    for (const row of body.spriteSeries as any[]) {
      const age = row[0]; if (age >= E - A) continue;
      const rom = new Map<number, number[]>((row.slice(1) as number[][]).map((s) => [s[0]!, s]));
      const red = new Map<number, any>((bonemerangAtAge(age, input).sprites as any[]).map((s) => [s.slot, s]));
      rows += 1;
      let same = rom.size === red.size && [...rom.keys()].every((k) => red.has(k));
      if (same) for (const [slot, r] of rom) { const g = red.get(slot)!; if (["x", "y", "x2", "y2"].some((k, i) => g[k] !== r[1 + i])) same = false; }
      if (same) rowsOk += 1; else if (diffs.length < 3) diffs.push({ age, rom: [...rom.values()].slice(0, 3).map((s) => s.slice(0, 5)), red: [...red.values()].slice(0, 3).map((s) => [s.slot, s.x, s.y, s.x2, s.y2]) });
    }
    out[`${name}#${bi}`] = { attackerSide, births: births.length, birthsOk: bOk, birthDiffs: bDiff.slice(0, 3), ageRows: rows, ageRowsOk: rowsOk, ageDiffs: diffs, slots: [bone, impact, lunge], anchors: [aa.picOffsetPoint, ta.picOffsetPoint] };
  }
}
writeFileSync(outPath, JSON.stringify(out, null, 1));
for (const [k, v] of Object.entries(out)) console.log(k.slice(-44), (v as any).births, (v as any).birthsOk, (v as any).ageRows, (v as any).ageRowsOk);
