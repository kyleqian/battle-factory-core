import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { renderAppTrace } from "../appTrace.ts";

const trace = JSON.parse(readFileSync("tools/compare/traces/sendout.json", "utf8"));
const captures = await renderAppTrace(trace);
const byTick = new Map(captures.map(c => [c.frame, c]));
function oracle(tick) {
  const pad = String(tick).padStart(5, "0");
  return PNG.sync.read(readFileSync(`tools/compare/out/sendout-baseline/oracle-${pad}.png`));
}
const CORNER = { x: 144, y: 12 };
const R = Number(process.argv[2] ?? 1516);
const cap = byTick.get(R);
const png = oracle(R);
let bothOpaqueDiffColor = 0, weBlankTheyNot = 0, weOpaqueTheyBlankish = 0, totalDiff=0;
const bgLike = (c) => (c[0]===255&&c[1]===255&&c[2]===255) || (c[0]===247&&c[1]===247&&c[2]===247) || (c[0]===239&&c[1]===239&&c[2]===239);
for (let y = 0; y < 64; y++) {
  for (let x = 0; x < 64; x++) {
    const i = ((CORNER.y+y)*240 + (CORNER.x+x))*4;
    const o = [cap.rgba[i], cap.rgba[i+1], cap.rgba[i+2]];
    const r = [png.data[i], png.data[i+1], png.data[i+2]];
    if (o[0]===r[0]&&o[1]===r[1]&&o[2]===r[2]) continue;
    totalDiff++;
    const oursBg = bgLike(o), oracleBg = bgLike(r);
    if (!oursBg && !oracleBg) bothOpaqueDiffColor++;
    else if (oursBg && !oracleBg) weBlankTheyNot++;
    else if (!oursBg && oracleBg) weOpaqueTheyBlankish++;
  }
}
console.log({ R, totalDiff, bothOpaqueDiffColor, weBlankTheyNot, weOpaqueTheyBlankish });
