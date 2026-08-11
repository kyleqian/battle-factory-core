import { drawText } from "../../../src/engine/font.ts";
import { readFileSync } from "node:fs";
import fontNormalData from "../../../src/data/gen/font-normal.json" with { type: "json" };
import charmapData from "../../../src/data/gen/charmap.json" with { type: "json" };
import battleWindowData from "../../../src/assets/gen/battle-window.json" with { type: "json" };
const font = fontNormalData;
const charmap = new Map(charmapData.entries);
const MESSAGE_PALETTE = battleWindowData.palette[0];
const oracle = readFileSync("/tmp/gw-probe/rgb/00216.rgb");
const buf = new Uint8Array(240*160*4);
drawText(buf, font, charmap, "GRASS WHISTLE!", 16, 137, MESSAGE_PALETTE, [0, 1]);
console.log("oracle cols 16-110 rows 139-149:");
for (let y=139;y<150;y++){
  let oline="", aline="";
  for (let x=16;x<110;x++){
    const oo=(y*240+x)*3, aa=(y*240+x)*4;
    oline += (oracle[oo]===255&&oracle[oo+1]===255&&oracle[oo+2]===255)?"#":((oracle[oo]===107&&oracle[oo+1]===90&&oracle[oo+2]===115)?".":" ");
    aline += (buf[aa]===255&&buf[aa+1]===255&&buf[aa+2]===255)?"#":((buf[aa]===107&&buf[aa+1]===90&&buf[aa+2]===115)?".":" ");
  }
  console.log(`${y} O|${oline}|`);
  console.log(`  A|${aline}|`);
}
