import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { renderAppTrace } from "../appTrace.ts";

const trace = JSON.parse(readFileSync("tools/compare/traces/sendout.json", "utf8"));
const captures = await renderAppTrace(trace);
const CORNER = { x: 144, y: 12 };
for (const cap of captures) {
  if (cap.frame !== 1504 && cap.frame !== 1519) continue;
  console.log("tick", cap.frame);
  for (let y = 0; y < 3; y++) {
    let row = "";
    for (let x = 0; x < 10; x++) {
      const i = ((CORNER.y+y)*240 + (CORNER.x+x))*4;
      row += `(${cap.rgba[i]},${cap.rgba[i+1]},${cap.rgba[i+2]}) `;
    }
    console.log(row);
  }
}
