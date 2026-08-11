import { drawText } from "../../../src/engine/font.ts";
import { readFileSync } from "node:fs";
import fontNormalData from "../../../src/data/gen/font-normal.json" with { type: "json" };
import charmapData from "../../../src/data/gen/charmap.json" with { type: "json" };
import battleWindowData from "../../../src/assets/gen/battle-window.json" with { type: "json" };
const font = fontNormalData;
const charmap = new Map(charmapData.entries);
const MESSAGE_PALETTE = battleWindowData.palette[0];
const oracle = readFileSync("/tmp/gw-probe/rgb/00216.rgb");
for (const text of [" GRASS WHISTLE!", "GRASS WHISTLE!", " GRASSWHISTLE!", "GRASS WHISTLE !"]) {
  const buf = new Uint8Array(240*160*4);
  drawText(buf, font, charmap, text, 16, 137, MESSAGE_PALETTE, { fg: 1, bg: 15, shadow: 6 });
  let match=0,total=0;
  for (let y=139;y<150;y++) for (let x=16;x<110;x++){
    const oo=(y*240+x)*3, aa=(y*240+x)*4;
    const o=[oracle[oo],oracle[oo+1],oracle[oo+2]];
    const a=[buf[aa],buf[aa+1],buf[aa+2]];
    if (o[0]===a[0]&&o[1]===a[1]&&o[2]===a[2]) match++; total++;
  }
  console.log(JSON.stringify(text), "exact match", match+"/"+total);
}
