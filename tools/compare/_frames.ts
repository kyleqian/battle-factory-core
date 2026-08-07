import { readFileSync } from "node:fs";
const px3=(b,x,y)=>{const i=(y*240+x)*3;return [b[i],b[i+1],b[i+2]];};
for (const f of [210,211,212]) {
  const o = readFileSync(`/tmp/minimize-player-rgb/${String(f).padStart(5,"0")}.rgb`);
  let minX=999,minY=999,maxX=-1,maxY=-1;
  for (let y=60;y<120;y++)for(let x=30;x<110;x++){
    const [r,g,b]=px3(o,x,y);
    if (r>=80 && g<=210 && b>=110 && b<=r+60) { minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y); }
  }
  console.log(`frame ${f}: bbox ${minX},${minY}-${maxX},${maxY}`);
}
