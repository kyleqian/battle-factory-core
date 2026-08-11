import { drawText } from "../../../src/engine/font.ts";
import { readFileSync } from "node:fs";
import fontNormalData from "../../../src/data/gen/font-normal.json" with { type: "json" };
import charmapData from "../../../src/data/gen/charmap.json" with { type: "json" };
import battleWindowData from "../../../src/assets/gen/battle-window.json" with { type: "json" };
const font = fontNormalData;
const charmap = new Map(charmapData.entries);
const MESSAGE_PALETTE = battleWindowData.palette[0];
const oracle = readFileSync("/tmp/gw-probe/rgb/00216.rgb");
function render(text, y){
  const buf = new Uint8Array(240*160*4);
  drawText(buf, font, charmap, text, 16, y, MESSAGE_PALETTE, { fg: 1, bg: 15, shadow: 6 });
  return buf;
}
function fgColumns(buf, yStart, yEnd){
  const cols=[];
  for (let x=16;x<160;x++){
    let c=0;
    for (let y=yStart;y<yEnd;y++){
      const aa=(y*240+x)*4;
      if (buf[aa]===255) c++;
    }
    cols.push(c);
  }
  return cols.join(",");
}
function oracleFg(yStart,yEnd){
  const cols=[];
  for (let x=16;x<160;x++){
    let c=0;
    for (let y=yStart;y<yEnd;y++){
      const oo=(y*240+x)*3;
      if (oracle[oo]===255) c++;
    }
    cols.push(c);
  }
  return cols.join(",");
}
const o = oracleFg(124,134);
const oc=o.split(",");
for (const text of ["ROSELIA used", "ROSELIA used GRASS", "ROSELIA used G", "used"]) {
  const f = fgColumns(render(text, 121), 124, 134).split(",");
  let match=0;
  for (let i=0;i<oc.length;i++) if (oc[i]===f[i]) match++;
  console.log(JSON.stringify(text), "col-match", match+"/"+oc.length);
}
