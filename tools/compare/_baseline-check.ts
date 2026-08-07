import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
// oracle rgb frame 211 player minimize
const o = readFileSync("/tmp/minimize-player-rgb/00211.rgb");
// print a few pixels: top-left, center field, where GRIMER is (spriteCorner 40,60 -> 40..96, 60..100)
const px = (x,y) => { const i=(y*240+x)*3; return [o[i],o[i+1],o[i+2]]; };
console.log("oracle top-left:", px(0,0), "field mid:", px(120,80), "grimer area:", px(68,80));
// facade oracle? not available. Compare app render of facade frame to confirm baseline OK on this tree
