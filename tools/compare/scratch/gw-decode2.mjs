import { drawText } from "../../../src/engine/font.ts";
import { readFileSync } from "node:fs";
import fontNormalData from "../../../src/data/gen/font-normal.json" with { type: "json" };
import charmapData from "../../../src/data/gen/charmap.json" with { type: "json" };
import battleWindowData from "../../../src/assets/gen/battle-window.json" with { type: "json" };
const font = fontNormalData;
const charmap = new Map(charmapData.entries);
const MESSAGE_PALETTE = battleWindowData.palette[0];
const oracle = readFileSync("/tmp/gw-probe/rgb/00216.rgb");
// Extract oracle line2 as a glyph bitmap per column run
function oracleGlyph(xStart, xEnd) {
  const rows=[];
  for (let y=139;y<150;y++){
    let row="";
    for (let x=xStart;x<xEnd;x++){
      const oo=(y*240+x)*3;
      row += (oracle[oo]===255?"#":(oracle[oo]===107&&oracle[oo+1]===90?".":" "));
    }
    rows.push(row);
  }
  return rows;
}
const g = oracleGlyph(16, 110);
for (const row of g) console.log("|"+row+"|");
