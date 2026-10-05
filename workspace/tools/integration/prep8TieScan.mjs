// prep8: equal-sort-key audit. A persistent sSpriteOrder / the reducers' `order` fields only decide exact ties of (OAM priority, subpriority, OAM y) (SortSprites sprite.c:372; the renderer sorts
// subpriority desc, y asc, order asc, slot desc: battleScene.ts:27481 Thunderbolt, :27733 Aurora Beam). Counts, per accepted/first-body ROM sprite dump, the frames in which two coexisting non-reserved sprites share the full key.
//   node tools/integration/prep8TieScan.mjs > tools/integration/fixtures/prep8-tie-scan.json
import { readFileSync, readdirSync } from "node:fs";
const D = "tools/integration/fixtures/prep8-sprites"; const RES = new Set([0, 1, 2, 6, 8, 60, 61, 62, 63]);
const out = [];
for (const file of readdirSync(D).filter((f) => f.endsWith(".json")).sort()) {
  const d = JSON.parse(readFileSync(`${D}/${file}`)); const ks = Object.keys(d.dumps).map(Number).sort((a, b) => a - b);
  let tieFrames = 0, tieFramesPoolOnly = 0; const sample = [];
  for (const k of ks) {
    const sp = d.dumps[k].sprites; const seen = new Map(); let tie = false, tiePool = false;
    for (const s of sp) { const key = `${(s.attr[2] >> 10) & 3}/${s.subpriority}/${s.attr[0] & 0xff}`; if (seen.has(key)) { tie = true; if (!RES.has(s.slot) && !RES.has(seen.get(key))) tiePool = true; if (sample.length < 3) sample.push({ frame: k, key, slots: [seen.get(key), s.slot] }); } else seen.set(key, s.slot); }
    if (tie) tieFrames++; if (tiePool) tieFramesPoolOnly++;
  }
  out.push({ file, rows: ks.length, framesWithAnyEqualKeyPair: tieFrames, framesWithEqualKeyPairBothPoolSprites: tieFramesPoolOnly, sample });
}
console.log(JSON.stringify(out, null, 1));
