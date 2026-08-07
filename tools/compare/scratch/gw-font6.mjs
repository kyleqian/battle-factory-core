import { drawText } from "../../../src/engine/font.ts";
import { readFileSync } from "node:fs";
import fontNormalData from "../../../src/data/gen/font-normal.json" with { type: "json" };
import charmapData from "../../../src/data/gen/charmap.json" with { type: "json" };
import battleWindowData from "../../../src/assets/gen/battle-window.json" with { type: "json" };
const font = fontNormalData;
const charmap = new Map(charmapData.entries);
const MESSAGE_PALETTE = battleWindowData.palette[0];
const oracle = readFileSync("/tmp/gw-probe/rgb/00216.rgb");
for (const text of ["GRASSWHISTLE!", "GRASS WHISTLE!"]) {
  const buf = new Uint8Array(240*160*4);
  drawText(buf, font, charmap, text, 16, 137, MESSAGE_PALETTE, { fg: 1, bg: 15, shadow: 6 });
  console.log("=== " + text + " diff vs oracle (row 140 cols 16-100) ===");
  for (let x=16;x<100;x++){
    const oo=(140*240+x)*3, aa=(140*240+x)*4;
    const o=[oracle[oo],oracle[oo+1],oracle[oo+2]].join();
    const a=[buf[aa],buf[aa+1],buf[aa+2]].join();
    if (o!==a) console.log(`col ${x}: oracle(${o}) app(${a})`);
  }
}
