// dl1: per-species sprite sheet cost (brotli q11 of each species entry alone) and the species the Factory can ever show.
// Usage: node tools/bundle/spriteBudget.mjs
import { readFileSync } from "node:fs";
import { brotliCompressSync, constants } from "node:zlib";

const json = (p) => JSON.parse(readFileSync(p, "utf8"));
const br = (s) => brotliCompressSync(Buffer.from(s), { params: { [constants.BROTLI_PARAM_QUALITY]: 11, [constants.BROTLI_PARAM_LGWIN]: 24 } }).length;
const front = json("src/assets/gen/battle-opponent-front-sprites.json");
const back = json("src/assets/gen/battle-back-sprites.json");
const mons = json("src/data/gen/battle-frontier-mons.json").entries;
const factory = new Set(mons.map((m) => m.species.replace(/^SPECIES_/, "")));
const sum = (t, keys) => keys.reduce((a, k) => a + br(JSON.stringify(t[k])), 0);
const raw = (t, keys) => keys.reduce((a, k) => a + JSON.stringify(t[k]).length, 0);
const fKeys = Object.keys(front), bKeys = Object.keys(back);
const inF = fKeys.filter((k) => factory.has(k)), inB = bKeys.filter((k) => factory.has(k));
const missing = [...factory].filter((s) => !(s in front));
console.log(`rental sets ${mons.length}, distinct species ${factory.size}; sheet keys front ${fKeys.length} back ${bKeys.length}; factory species missing from front sheet: ${missing.join(",") || "none"}`);
console.log(`front sheet: all ${fKeys.length} = ${(raw(front, fKeys) / 1024).toFixed(0)} KiB raw / ${(sum(front, fKeys) / 1024).toFixed(0)} KiB br per-entry; factory ${inF.length} = ${(raw(front, inF) / 1024).toFixed(0)} KiB / ${(sum(front, inF) / 1024).toFixed(0)} KiB`);
console.log(`back sheet:  all ${bKeys.length} = ${(raw(back, bKeys) / 1024).toFixed(0)} KiB raw / ${(sum(back, bKeys) / 1024).toFixed(0)} KiB br per-entry; factory ${inB.length} = ${(raw(back, inB) / 1024).toFixed(0)} KiB / ${(sum(back, inB) / 1024).toFixed(0)} KiB`);
const avgF = sum(front, inF) / inF.length, avgB = sum(back, inB) / inB.length;
console.log(`avg brotli per factory species: front ${(avgF / 1024).toFixed(2)} KiB, back ${(avgB / 1024).toFixed(2)} KiB (a battle = 2 fronts of the enemy side + own back pic(s); draft = 6 fronts)`);
console.log(`species in sheets but not in any rental set: ${fKeys.filter((k) => !factory.has(k)).length}`);
