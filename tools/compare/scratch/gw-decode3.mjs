import { drawText } from "../../../src/engine/font.ts";
import { readFileSync } from "node:fs";
import fontNormalData from "../../../src/data/gen/font-normal.json" with { type: "json" };
import charmapData from "../../../src/data/gen/charmap.json" with { type: "json" };
import battleWindowData from "../../../src/assets/gen/battle-window.json" with { type: "json" };
const font = fontNormalData;
const charmap = new Map(charmapData.entries);
const MESSAGE_PALETTE = battleWindowData.palette[0];
const oracle = readFileSync("/tmp/gw-probe/rgb/00216.rgb");
// Render each candidate to a bitmap and compute per-column fg coverage to fingerprint.
function render(text){
  const buf = new Uint8Array(240*160*4);
  drawText(buf, font, charmap, text, 16, 137, MESSAGE_PALETTE, { fg: 1, bg: 15, shadow: 6 });
  return buf;
}
function fgColumns(buf){
  const cols=[];
  for (let x=16;x<110;x++){
    let c=0;
    for (let y=139;y<150;y++){
      const aa=(y*240+x)*4;
      if (buf[aa]===255) c++;
    }
    cols.push(c);
  }
  return cols.join(",");
}
function oracleFg(){
  const cols=[];
  for (let x=16;x<110;x++){
    let c=0;
    for (let y=139;y<150;y++){
      const oo=(y*240+x)*3;
      if (oracle[oo]===255) c++;
    }
    cols.push(c);
  }
  return cols.join(",");
}
const o = oracleFg();
console.log("oracle cols:", o);
for (const text of ["GRASS WHISTLE!", "GRASSWHISTLE!", "WHISTLE!", "GRASS WHISTLE", "GRASSWHISTLE"]) {
  const f = fgColumns(render(text));
  let match=0;
  const oc=o.split(","), fc=f.split(",");
  for (let i=0;i<oc.length;i++) if (oc[i]===fc[i]) match++;
  console.log(text, "col-match", match+"/"+oc.length);
}
