import { drawText } from "../../../src/engine/font.ts";
import { readFileSync } from "node:fs";
import fontNormalData from "../../../src/data/gen/font-normal.json" with { type: "json" };
import charmapData from "../../../src/data/gen/charmap.json" with { type: "json" };
import battleWindowData from "../../../src/assets/gen/battle-window.json" with { type: "json" };
const font = fontNormalData;
const charmap = new Map(charmapData.entries);
const MESSAGE_PALETTE = battleWindowData.palette[0];
const MESSAGE_TEXT_COLORS = [0, 1];
const oracle = readFileSync("/tmp/gw-probe/rgb/00216.rgb");
const candidates = ["GRASS WHISTLE!", "GRASS WHISTLE", "GRASS WHISTLE !", "GRASS WHISTLE! ", "GRASS WHISTLE ! ", "GRASSWHISTLE!", "GRASS  WHISTLE!"];
for (const text of candidates) {
  const buf = new Uint8Array(240*160*4);
  drawText(buf, font, charmap, text, 16, 137, MESSAGE_PALETTE, MESSAGE_TEXT_COLORS);
  let match=0, total=0;
  for (let y=139;y<150;y++) for (let x=30;x<110;x++){
    const oo=(y*240+x)*3, aa=(y*240+x)*4;
    const o=(oracle[oo]===255&&oracle[oo+1]===255&&oracle[oo+2]===255)?1:(oracle[oo]===107&&oracle[oo+1]===90&&oracle[oo+2]===115?2:0);
    const a=(buf[aa]===255&&buf[aa+1]===255&&buf[aa+2]===255)?1:(buf[aa]===107&&buf[aa+1]===90&&buf[aa+2]===115?2:0);
    if (o===a) match++; total++;
  }
  console.log(text, "match", match+"/"+total);
}
