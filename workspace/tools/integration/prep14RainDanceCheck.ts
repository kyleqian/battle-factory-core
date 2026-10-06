// prep14: run rainDanceAtAge (src/animation/rainDance.ts) with the production-derivable profile (animationRngAtAge0 = gRng2 at activation, occupiedSpriteSlots = in-use slots at activation,
// palette arrays = ZEROS: proves they are not an input of the births/rng) and compare every drop birth (age, slot, x, y) and the per-age animationRng with the ROM probes
// (accepted player/opponent + alternate) and with the accepted corpora's per-row animationRng.   npx vite-node tools/integration/prep14RainDanceCheck.ts
import { readFileSync, writeFileSync } from "node:fs";
import { rainDanceAtAge, type RainDanceProfile } from "../../src/animation/rainDance.ts";
const A = JSON.parse(readFileSync("tools/integration/fixtures/prep14/prep14-analysis.json", "utf8")) as Record<string, any[]>;
const C = JSON.parse(readFileSync("/tmp/p14-corpus-rng.json", "utf8")) as Record<string, number[]>;
const out: Record<string, unknown> = {};
const zeros = Array.from({ length: 512 }, () => 0);
for (const sc of Object.keys(A).filter((k) => /rain-dance/.test(k))) {
  const r = A[sc]!.find((x) => x.move === "RAIN_DANCE")!;
  const profile: RainDanceProfile = { animationRngAtAge0: r.rng2, occupiedSpriteSlots: r.inUseAtAct, unfadedPaletteBeforeLoad: zeros, fadedPaletteBeforeLoad: zeros, hardwarePaletteAtAge0: zeros, unfadedPaletteAfterLoad: zeros, fadedPaletteAfterLoad: zeros };
  const births: string[] = []; const seen = new Set<string>(); const rng: number[] = [];
  for (let age = 0; age < r.rows; age += 1) {
    const s = rainDanceAtAge(age, profile);
    rng.push(s.animationRng);
    for (const d of s.drops) { const k = `${d.birthAge}:${d.slot}:${d.x}:${d.y}`; if (!seen.has(k)) { seen.add(k); births.push(k); } }
  }
  const rom = r.sprites.filter((s: any) => s.tmpl === "gRainDropSpriteTemplate").map((s: any) => `${s.age}:${s.slot}:${s.x}:${s.y}`);
  const side = /rain-dance-opponent|alt/.test(sc) ? (sc.includes("opponent") ? "opponent" : "alt") : "player";
  const corpus = C[`rain-dance-${side}`];
  out[sc] = { rows: r.rows, romDropBirths: rom.length, reducerDropBirths: births.length, birthsEqual: JSON.stringify([...births].sort()) === JSON.stringify([...rom].sort()), firstMismatch: births.find((b) => !rom.includes(b)) ?? null,
    rngEqualsCorpusRows: corpus ? JSON.stringify(rng) === JSON.stringify(corpus) : null };
  console.log(sc, out[sc]);
}
writeFileSync("tools/integration/fixtures/prep14/prep14-rain-dance-check.json", JSON.stringify(out, null, 1));
