// Definitive per-class attribution of the party-menu settled-window diff.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
const [outDir, ...frames] = process.argv.slice(2);
const load = (f: number, side: string) => PNG.sync.read(readFileSync(join(outDir, `${side}-${String(f).padStart(5, "0")}.png`))).data;
type Box = [number, number, number, number];
const IN = (b: Box, x: number, y: number) => x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3];
// ordered most-specific first
const REGIONS: Record<string, Box> = {
  "b-icon0": [0, 24, 32, 55],
  "b-icon1": [88, 2, 120, 33],
  "b-icon2": [88, 26, 120, 57],
  "b-emptybox4": [96, 56, 240, 79],
  "b-emptybox5": [96, 80, 240, 103],
  "b-emptybox6": [96, 104, 240, 127],
  "buttons": [184, 134, 234, 153],
  "message": [0, 128, 176, 152],
  "c-text0": [32, 39, 76, 62],
  "c-text1": [118, 11, 220, 30],
  "c-text2": [118, 35, 220, 54],
  "a-leftcard": [8, 24, 88, 79],
  "a-righttop": [96, 8, 240, 31],
  "a-rightbot": [96, 32, 240, 55],
};
for (const fs of frames) {
  const f = Number(fs);
  const a = load(f, "oracle"), b = load(f, "app");
  const counts = new Map<string, number>();
  let total = 0;
  for (let y = 0; y < 160; y++) for (let x = 0; x < 240; x++) {
    const o = (y * 240 + x) * 4;
    if (a[o] === b[o] && a[o + 1] === b[o + 1] && a[o + 2] === b[o + 2]) continue;
    total++;
    for (const [name, box] of Object.entries(REGIONS)) {
      if (IN(box, x, y)) { counts.set(name, (counts.get(name) ?? 0) + 1); break; }
    }
  }
  const sum = (ks: string[]) => ks.reduce((s, k) => s + (counts.get(k) ?? 0), 0);
  const aPx = sum(["a-leftcard", "a-righttop", "a-rightbot"]);
  const bIcon = sum(["b-icon0", "b-icon1", "b-icon2"]);
  const bBox = sum(["b-emptybox4", "b-emptybox5", "b-emptybox6"]);
  const cText = sum(["c-text0", "c-text1", "c-text2"]);
  const covered = aPx + bIcon + bBox + cText + (counts.get("buttons") ?? 0) + (counts.get("message") ?? 0);
  console.log(`\nframe ${f}: total ${total}px`);
  console.log(`  (a) cursor wash+card text: ${aPx}px  (leftcard=${counts.get("a-leftcard")} righttop=${counts.get("a-righttop")} rightbot=${counts.get("a-rightbot")})`);
  console.log(`  (b1) mon icons:            ${bIcon}px  (i0=${counts.get("b-icon0")} i1=${counts.get("b-icon1")} i2=${counts.get("b-icon2")})`);
  console.log(`  (b2) empty boxes 4/5/6:    ${bBox}px  (b4=${counts.get("b-emptybox4")} b5=${counts.get("b-emptybox5")} b6=${counts.get("b-emptybox6")})`);
  console.log(`  (c) text ink:               ${cText}px  (t0=${counts.get("c-text0")} t1=${counts.get("c-text1")} t2=${counts.get("c-text2")})`);
  console.log(`  buttons:                    ${counts.get("buttons") ?? 0}px`);
  console.log(`  message window:             ${counts.get("message") ?? 0}px`);
  console.log(`  UNATTRIBUTED:               ${total - covered}px`);
  console.log(`  covered %: ${(100 * covered / total).toFixed(1)}%`);
}
