/** speciesAudit5: bbox + top colour pairs (ROM<-live) per age. usage: npx vite-node speciesAudit5Diff.ts <fixture.json> <evidenceRunDir> <firstFrame> <age>... */
import { readFileSync } from "node:fs";
import "../../src/engine/monPicPixelsInstall.ts";
import { join, resolve } from "node:path";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { liveView, type Fixture } from "./liveAdapterFramebuffer.ts";
const [fp, scratch, first, ...ages] = process.argv.slice(2);
const f = JSON.parse(readFileSync(resolve(fp!), "utf8")) as Fixture;
for (const a of ages.map(Number)) {
  const live = new Uint8Array(240*160*4); renderBattleResolutionLiveView(live, liveView(f, a));
  const rgb = readFileSync(join(scratch!, "rgb", `${String(Number(first)+a).padStart(5,"0")}.rgb`));
  let x0=999,y0=999,x1=-1,y1=-1,n=0; const pairs = new Map<string, number>();
  for (let p=0;p<240*160;p++){ const h=(i:number)=>[...i===0?[rgb[p*3],rgb[p*3+1],rgb[p*3+2]]:[live[p*4],live[p*4+1],live[p*4+2]]].map(v=>v!.toString(16).padStart(2,"0")).join("");
    if (h(0)!==h(1)){ n++; const x=p%240,y=(p/240)|0; x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y); const k=h(0)+"<-"+h(1); pairs.set(k,(pairs.get(k)??0)+1);} }
  console.log(`age ${a}: ${n}px bbox x${x0}-${x1} y${y0}-${y1}`, [...pairs].sort((a,b)=>b[1]-a[1]).slice(0,4));
}
