// prep29: accepted Outrage reducer fed ONLY production-derivable inputs vs the ROM per-age effect-sprite state of each scenario (accepted P/O + fresh alternate pair).
// Derived inputs: attackerPictureOrigin = liveBattlerAnchors(attacker).picOffsetPoint; flame slots = lowest-free simulation over the known-entry in-use set (birth-first, a flame is destroyed by the sprite callbacks of age birth+31, after that frame's script births);
// target subpriority = battler subpriority (player 30 / opponent 40); allocator/painter inputs = known-entry constants. Measured constant-across-scenarios (not derived): the flame attr words (OAM attr2 bank/tile).
// Compared per ROM age row: slot set, x, y, x2, y2 of every effect sprite; plus births (age, slot, x, y, sub). usage: node --experimental-strip-types tools/integration/prep29OutrageCheck.ts STATE_DIR OUT.json
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";
import { liveBattlerAnchors } from "../../src/engine/liveMoveAnimation.ts";
import { outrageAtAge } from "../../src/animation/outrage.ts";
const [dir, outPath] = process.argv.slice(2);
const KNOWN = [0, 1, 2, 6, 8, 60, 61, 62, 63];
const BIRTHS = [6, 8, 10, 12, 14, 16, 18, 20, 22, 27, 29, 31, 33, 35, 37, 39, 44, 46, 48, 50, 52, 54, 56];
const out: any = {}; const attrs = new Set<string>();
for (const f of readdirSync(dir).filter((x) => x.endsWith("-r1.json")).sort()) {
  const name = f.slice(0, -8);
  if (!(name.startsWith("mechanic-outrage-") || name.startsWith("prep29-outrage-alt-"))) continue;
  const probe = JSON.parse(readFileSync(join(dir, f), "utf8"));
  for (const [bi, body] of probe.bodies.filter((b: any) => b.move === 200).entries()) {
    const A = body.start, E = body.end, mons = body.atActivation.mons;
    const art = createBattleCommandFieldArtView({ player: { species: mons[0].species }, opponent: { species: mons[1].species } } as never);
    const attackerSide = body.atActivation.attacker === 0 ? "player" : "opponent", targetSide = attackerSide === "player" ? "opponent" : "player";
    const aa = liveBattlerAnchors(attackerSide, art);
    const tsub = targetSide === "player" ? 30 : 40;
    // lowest-free flame slots, birth-first
    const flames: number[] = [];
    BIRTHS.forEach((b, i) => { const used = new Set(KNOWN); flames.forEach((s, j) => { if (BIRTHS[j]! + 31 >= b) used.add(s); }); let s = 0; while (used.has(s)) s += 1; flames.push(s); });
    const births = probe.spawns.filter((x: any) => A <= x.f && x.f <= E && x.ev === "+");
    const flameAttr = births[0].attr;
    births.forEach((b: any) => attrs.add(JSON.stringify(b.attr)));
    const zero = new Array(512).fill(0), sp = { attr: [0, 0, 0], slot: 0, x: 0, y: 0, x2: 0, y2: 0, subpriority: tsub, oamPriority: 0, matrixNum: 0, matrix: [256, 0, 0, 256] };
    const input: any = { attackerSide, targetSide, attackerSpecies: "", targetSpecies: "", attackerPictureOrigin: aa.picOffsetPoint, targetPictureOrigin: aa.picOffsetPoint, attackerSprite: sp, targetSprite: sp,
      taskSlots: { loopSe: 0, blendColorCycle: 0, translateMonElliptical: 0, shakeMon2: 0 }, spriteSlots: { flames }, resources: { smallEmber: { tag: 10029, tileSlot: 0, paletteAllocatorSlot: 0, hardwarePaletteBank: 0, tileRange: [0, 0] } },
      allocator: { initialOccupiedSprites: KNOWN, initialMatrixBitmap: body.atActivation.bitmap, spriteOrder: body.atActivation.spriteOrder, initialLiveSprites: [] }, oam: { flame: flameAttr },
      palettes: { unfaded: zero, faded: zero, hardware: zero }, registers: {}, animationRngSeed: body.atActivation.rng2, gameplayRng: null };
    let bOk = 0; const bDiff: any[] = [];
    births.forEach((b: any) => {
      const age = b.f - A; const r = (outrageAtAge(age, input).sprites as any[]).find((x) => x.slot === b.slot);
      const same = r && r.x === b.x && r.y === b.y && r.subpriority === b.sub; if (same) bOk += 1; else bDiff.push({ age, slot: b.slot, rom: [b.x, b.y, b.sub], got: r ? [r.x, r.y, r.subpriority] : null });
    });
    let rows = 0, rowsOk = 0; const diffs: any[] = [];
    for (const row of body.spriteSeries as any[]) {
      const age = row[0]; if (age >= E - A) continue;
      const rom = new Map<number, number[]>((row.slice(1) as number[][]).map((s) => [s[0]!, s]));
      const red = new Map<number, any>((outrageAtAge(age, input).sprites as any[]).map((s) => [s.slot, s]));
      rows += 1;
      let same = rom.size === red.size && [...rom.keys()].every((k) => red.has(k));
      if (same) for (const [slot, r] of rom) { const g = red.get(slot)!; if (["x", "y", "x2", "y2"].some((k, i) => g[k] !== r[1 + i])) same = false; }
      if (same) rowsOk += 1; else if (diffs.length < 3) diffs.push({ age, rom: [...rom.values()].slice(0, 3), red: [...red.values()].slice(0, 3).map((s) => [s.slot, s.x, s.y, s.x2, s.y2]) });
    }
    out[`${name}#${bi}`] = { attackerSide, births: births.length, birthsOk: bOk, birthDiffs: bDiff.slice(0, 3), ageRows: rows, ageRowsOk: rowsOk, ageDiffs: diffs, flameSlots: flames, anchor: aa.picOffsetPoint };
  }
}
out.flameAttrWordsDistinct = [...attrs];
writeFileSync(outPath, JSON.stringify(out, null, 1));
for (const [k, v] of Object.entries(out)) if (!k.startsWith("flame")) console.log(k.slice(-44), (v as any).births, (v as any).birthsOk, (v as any).ageRows, (v as any).ageRowsOk);
console.log("distinct flame attr words:", out.flameAttrWordsDistinct.length, out.flameAttrWordsDistinct.join(" "));
