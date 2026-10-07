// prep29: accepted Luster Purge reducer fed ONLY production-derivable inputs vs the ROM per-age effect-sprite rows of each scenario (accepted P/O + fresh alternate pair).
// Derived: circleCenter = attacker liveBattlerAnchors().picOffsetPoint; targetCenter = target picOffsetPoint (candidates reported); the twelve hitsplat words come from the activation Random2 value alone:
// word j (j = 1, 2) of the draw frame at age t = lcg^(t + 2 i + j)(rng2AtActivation) >> 16 for the hitsplat i drawn at age t = 170 + 5 i (one RfuMain1 step per frame, no lag frame before age 170, plus the 2 draws of each earlier hitsplat).
// Compared per ROM row (age, slot, x, y, x2, y2). usage: node --experimental-strip-types tools/integration/prep29LusterPurgeCheck.ts STATE_DIR OUT.json
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";
import { liveBattlerAnchors } from "../../src/engine/liveMoveAnimation.ts";
import { lusterPurgeAtAge } from "../../src/animation/lusterPurge.ts";
const [dir, outPath] = process.argv.slice(2);
const lcg = (v: number) => (Math.imul(v, 0x41c64e6d) + 0x6073) >>> 0;
const lcgN = (v: number, n: number) => { for (let i = 0; i < n; i += 1) v = lcg(v); return v; };
const out: any = {};
for (const f of readdirSync(dir).filter((x) => x.endsWith("-r1.json")).sort()) {
  const name = f.slice(0, -8);
  if (!(name.startsWith("mechanic-luster-purge-") || name.startsWith("prep29-luster-purge-alt-"))) continue;
  const probe = JSON.parse(readFileSync(join(dir, f), "utf8"));
  const body = probe.bodies.find((b: any) => b.move === 295), A = body.start, E = body.end, act = body.atActivation, mons = act.mons;
  const art = createBattleCommandFieldArtView({ player: { species: mons[0].species }, opponent: { species: mons[1].species } } as never);
  const attackerSide = act.attacker === 0 ? "player" : "opponent", targetSide = attackerSide === "player" ? "opponent" : "player";
  const aa = liveBattlerAnchors(attackerSide, art), ta = liveBattlerAnchors(targetSide, art);
  const words: { x: number; y: number }[] = [];
  for (let i = 0; i < 6; i += 1) { const t = 170 + 5 * i; words.push({ x: lcgN(act.rng2 >>> 0, t + 2 * i + 1) >>> 16, y: lcgN(act.rng2 >>> 0, t + 2 * i + 2) >>> 16 }); }
  const res: any = {};
  for (const cand of ["picOffsetPoint", "battlePositionCenter", "mixed"] as const) {  // mixed = circle at the attacker picOffsetPoint, hit splats at the target battlePositionCenter + (player -1,+2 / opponent +1,+2)
    const cfg: any = { attackerSide, attackerBattlerId: act.attacker, attackerSpriteSlot: 0, targetSpriteSlot: 0, targetInitialX2: 0, circleCenter: (aa as any)[cand === "mixed" ? "picOffsetPoint" : cand], monbgCenter: aa.battlePositionCenter, targetCenter: cand === "mixed" ? { x: ta.battlePositionCenter.x + (targetSide === "player" ? -1 : 1), y: ta.battlePositionCenter.y + 2 } : (ta as any)[cand],
      monbgPosition: ta.battlePositionCenter, visualRandom: { hitsplats: words } };
    let rows = 0, rowsOk = 0, xy = 0; const diffs: any[] = [];
    for (const row of body.spriteSeries as any[]) {
      const age = row[0]; if (age >= E - A) continue;
      const rom = new Map<number, number[]>((row.slice(1) as number[][]).map((s) => [s[0]!, s]));
      const red = new Map<number, any>((lusterPurgeAtAge(age, cfg).sprites as any[]).map((s) => [s.slot, s]));
      rows += 1;
      let same = rom.size === red.size && [...rom.keys()].every((k) => red.has(k));
      if (same) for (const [slot, r] of rom) { const g = red.get(slot)!; if (g.center.x !== r[1] || g.center.y !== r[2] || g.offset.x2 !== r[3] || g.offset.y2 !== r[4]) same = false; }
      if (same) rowsOk += 1; else if (diffs.length < 2) diffs.push({ age, rom: [...rom.values()].map((s) => s.slice(0, 5)), red: [...red.values()].map((s) => [s.slot, s.center.x, s.center.y, s.offset.x2, s.offset.y2]) });
    }
    res[cand] = { ageRows: rows, ageRowsOk: rowsOk, diffs, circleCenter: cfg.circleCenter, targetCenter: cfg.targetCenter };
  }
  out[name] = res;
}
writeFileSync(outPath, JSON.stringify(out, null, 1));
for (const [k, v] of Object.entries(out) as any) console.log(k.slice(-40), Object.keys(v).map((c) => `${c}:${v[c].ageRowsOk}of${v[c].ageRows}`).join(" "));
