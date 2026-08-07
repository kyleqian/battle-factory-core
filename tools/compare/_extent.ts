import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
const oracle = readFileSync("/tmp/minimize-player-rgb/00212.rgb");
const px3=(b,x,y)=>{const i=(y*240+x)*3;return [b[i],b[i+1],b[i+2]];};
// find the attacker sprite (purple body) extent at frame 212. scan y=60..120, x=30..110
// GRIMER body colors are purple-ish; field is 247,247,255
let minX=999,minY=999,maxX=-1,maxY=-1;
for (let y=60;y<120;y++)for(let x=30;x<110;x++){
  const [r,g,b]=px3(oracle,x,y);
  // purple-ish: r in 80..250, g<b, b in 110..250
  if (r>=80 && g<=210 && b>=110 && b>=r-30 && b<=r+60) {
    minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
  }
}
console.log("attacker bbox frame212:", minX, minY, maxX, maxY);
