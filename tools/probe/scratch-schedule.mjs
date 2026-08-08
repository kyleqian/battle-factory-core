import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { blendComponentToBlack as b } from "../src/engine/paletteFade.ts";
const dir = process.argv[2];
function px(png, x, y) {
  const i = (y * png.width + x) * 4;
  return [png.data[i], png.data[i+1], png.data[i+2]];
}
function decodeY(png, x, y) {
  const c = px(png, x, y);
  const c5 = c.map(v => v >> 3);
  // find y in 0..16 step2 where blend matches all three
  for (let yv = 0; yv <= 16; yv += 2) {
    if (c5.every((v, i) => Math.floor(v * (16 - yv) / 16) === (c[i] >> 3))) return yv;
  }
  return "?";
}
for (const f of [765,766,767,768,769,770,771,772,773,774,775,776,777,778,779,780,781]) {
  const a = PNG.sync.read(readFileSync(`${dir}/app-${String(f).padStart(5,"0")}.png`));
  const o = PNG.sync.read(readFileSync(`${dir}/oracle-${String(f).padStart(5,"0")}.png`));
  const aBg = px(a,4,4), oBg = px(o,4,4);
  const aObj = px(a,176,52), oObj = px(o,176,52);
  // arena floor above healthbox
  const aFl = px(a,139,70), oFl = px(o,139,70);
  // healthbox interior
  const aHx = px(a,141,77), oHx = px(o,141,77);
  console.log(`f=${f} appBG=${aBg}(y${decodeY(a,4,4)}) oracleBG=${oBg}(y${decodeY(o,4,4)}) | appOBJ=${aObj}(y${decodeY(a,176,52)}) oracleOBJ=${oObj}(y${decodeY(o,176,52)}) | floor app=${aFl} orc=${oFl} | hbx app=${aHx} orc=${oHx}`);
}
