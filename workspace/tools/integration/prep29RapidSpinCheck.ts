// prep29: accepted Rapid Spin reducer fed ONLY production-derivable inputs vs the ROM per-age effect-sprite rows of each scenario (accepted P/O + fresh alternate pair).
// Derived: centers from liveBattlerAnchors (candidate anchors tried: picOffsetPoint / spriteCenter / battlePositionCenter, the matching one is reported); sprite slots = lowest-free over the known-entry in-use set
// (spin sprite born age 10, freed 42; hit splat born 53 into the lowest free slot). The scanline-at-entry state is constant (receipt: scanSha identical in all scenarios).
// Compared per ROM row (age, slot, x, y, x2, y2) + births (age, slot, x, y, sub). usage: node --experimental-strip-types tools/integration/prep29RapidSpinCheck.ts STATE_DIR OUT.json
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";
import { liveBattlerAnchors } from "../../src/engine/liveMoveAnimation.ts";
import { rapidSpinAtAge } from "../../src/animation/rapidSpin.ts";
const [dir, outPath] = process.argv.slice(2);
const KNOWN = [0, 1, 2, 6, 8, 60, 61, 62, 63];
const out: any = {};
for (const f of readdirSync(dir).filter((x) => x.endsWith("-r1.json")).sort()) {
  const name = f.slice(0, -8);
  if (!(name.startsWith("mechanic-rapid-spin-") || name.startsWith("prep29-rapid-spin-alt-"))) continue;
  const probe = JSON.parse(readFileSync(join(dir, f), "utf8"));
  for (const [bi, body] of probe.bodies.filter((b: any) => b.move === 229).entries()) {
    const A = body.start, E = body.end, act = body.atActivation, mons = act.mons;
    const art = createBattleCommandFieldArtView({ player: { species: mons[0].species }, opponent: { species: mons[1].species } } as never);
    const attackerSide = act.attacker === 0 ? "player" : "opponent", targetSide = attackerSide === "player" ? "opponent" : "player";
    const aa = liveBattlerAnchors(attackerSide, art), ta = liveBattlerAnchors(targetSide, art);
    const spin = KNOWN.length === 9 ? [3, 4, 5].find((s) => !KNOWN.includes(s))! : 3, impact = spin; // spin freed (age 42) before the age-53 splat birth
    const births = probe.spawns.filter((x: any) => A <= x.f && x.f <= E && x.ev === "+");
    const res: any = { attackerSide, births: births.length };
    for (const cand of ["picOffsetPoint", "spriteCenter", "battlePositionCenter", "mixed"] as const) {  // mixed = spin sprite at the attacker battlePositionCenter, hit splat at the target picOffsetPoint
      const input: any = { attackerSide, targetSide, attackerSpecies: "A", targetSpecies: "T", attackerCenter: (aa as any)[cand === "mixed" ? "battlePositionCenter" : cand], targetCenter: (ta as any)[cand === "mixed" ? "picOffsetPoint" : cand], attackerSpriteSlot: 0, targetSpriteSlot: 0, rapidSpriteSlot: spin, impactSpriteSlot: impact,
        impactMatrixSlot: 3, elevationTaskSlot: 0, shakeTaskSlot: 0, monbgTaskSlot: 1, clearTaskSlot: 1, soundTaskSlot: 2, spriteOrder: act.spriteOrder, paletteBanks: { impact: 0, rapidSpin: 0 }, tileSlots: { impact: 0, rapidSpin: 0 },
        baseMatrixBitmap: act.bitmap, movePower: act.gAnimMovePower, moveDamage: act.gAnimMoveDmg, targetInitialOffset: { x: 0, y: 0 }, animationRng: act.rng2,
        monbg: { layer: attackerSide === "player" ? "bg2" : "bg1", spriteX: 0, spriteY: 0, bgX: 0, bgY: 0, inBg2: false, battlerId: 0 }, initialScanlineSrcBuffer: act.scan.srcBuffer, initialScanlineBanks: act.scan.banks };
      const at = (age: number) => { const fr = rapidSpinAtAge(age, input); return [fr.rapidSpin, fr.impact].filter(Boolean) as any[]; };
      let bOk = 0;
      births.forEach((b: any) => { const r = at(b.f - A).find((x) => x.slot === b.slot); if (r && r.x === b.x && r.y === b.y) bOk += 1; });
      let rows = 0, rowsOk = 0; const diffs: any[] = [];
      for (const row of body.spriteSeries as any[]) {
        const age = row[0]; if (age >= E - A) continue;
        const rom = new Map<number, number[]>((row.slice(1) as number[][]).map((s) => [s[0]!, s]));
        const red = new Map<number, any>(at(age).map((s) => [s.slot, s]));
        rows += 1;
        let same = rom.size === red.size && [...rom.keys()].every((k) => red.has(k));
        if (same) for (const [slot, r] of rom) { const g = red.get(slot)!; if (["x", "y", "x2", "y2"].some((k, i) => (g[k] ?? 0) !== r[1 + i])) same = false; }
        if (same) rowsOk += 1; else if (diffs.length < 2) diffs.push({ age, rom: [...rom.values()].map((s) => s.slice(0, 5)), red: [...red.values()].map((s) => [s.slot, s.x, s.y, s.x2, s.y2]) });
      }
      res[cand] = { birthsOk: bOk, ageRows: rows, ageRowsOk: rowsOk, diffs, attackerCenter: (aa as any)[cand === "mixed" ? "battlePositionCenter" : cand], targetCenter: (ta as any)[cand === "mixed" ? "picOffsetPoint" : cand] };
    }
    res.scanSha = createHash("sha1").update(JSON.stringify(act.scan)).digest("hex").slice(0, 8);
    out[`${name}#${bi}`] = res;
  }
}
writeFileSync(outPath, JSON.stringify(out, null, 1));
for (const [k, v] of Object.entries(out) as any) console.log(k.slice(-40), v.births, ["picOffsetPoint", "spriteCenter", "battlePositionCenter", "mixed"].map((c) => `${c}:${v[c].birthsOk}/${v[c].ageRowsOk}of${v[c].ageRows}`).join(" "), v.scanSha);
