import { readFileSync } from "node:fs";
import { createSceneOnMovePresentation, sceneOnGrassWhistleView } from "../../../src/animation/sceneOnPresentation.ts";
const scratch = process.argv[2]!;
const fixture = JSON.parse(readFileSync(process.argv[3]!,"utf8")) as any;
const probe = JSON.parse(readFileSync(scratch + "/probe.json","utf8")) as any;
const stage = createSceneOnMovePresentation({ move: "GRASS_WHISTLE", attacker: fixture.attacker, target: fixture.target, fieldProfile: fixture.fieldProfile });
const moveFrames = probe.frames.filter((f:any)=>f.inMoveScript);
const tally = new Map<string,number>();
const samples = new Map<string,string>();
let ok=0;
for (const frame of moveFrames) {
  const age = frame.frame - fixture.denseWindow.startFrame;
  const v = sceneOnGrassWhistleView({ ...stage, age } as any);
  let clean = true;
  if (v.notes.length !== frame.notes.length) { bump("noteCount", `f${frame.frame} ${v.notes.length}vs${frame.notes.length}`); clean=false; }
  const n = Math.min(v.notes.length, frame.notes.length);
  for (let i=0;i<n;i++){
    const note:any=v.notes[i], a:any=frame.notes[i];
    for (const [k, mine, theirs] of [["x",note.x,a.x],["y",note.y,a.y],["y2",note.y2,a.y2],["anim",note.animation,a.animNum],["pal",8,a.paletteNum],["localAge",note.localAge,a.data[0]],["d1",1,a.data[1]],["d2",0,a.data[2]],["d3",0,a.data[3]]] as any[]) {
      if (mine!==theirs){ bump(k, `f${frame.frame}/a${age} note${i} mine=${mine} rom=${theirs}`); clean=false; }
    }
  }
  if (v.visualTaskCount!==frame.visualTaskCount){ bump("visualTaskCount", `f${frame.frame}/a${age} ${v.visualTaskCount}vs${frame.visualTaskCount}`); clean=false; }
  if (clean) ok++;
}
function bump(k:string,s:string){ tally.set(k,(tally.get(k)??0)+1); if(!samples.has(k)) samples.set(k,s); }
console.log(`clean ${ok}/${moveFrames.length}`);
for (const [k,c] of [...tally].sort((a,b)=>b[1]-a[1])) console.log(`  ${k.padEnd(15)} ${String(c).padStart(4)} mismatches   e.g. ${samples.get(k)}`);
