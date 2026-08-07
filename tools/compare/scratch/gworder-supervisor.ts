import { readFileSync } from "node:fs";
import { createSceneOnMovePresentation, sceneOnGrassWhistleView } from "../../../src/animation/sceneOnPresentation.ts";
const scratch = process.argv[2]!;
const fixture = JSON.parse(readFileSync(process.argv[3]!,"utf8")) as any;
const probe = JSON.parse(readFileSync(scratch + "/probe.json","utf8")) as any;
const stage = createSceneOnMovePresentation({ move: "GRASS_WHISTLE", attacker: fixture.attacker, target: fixture.target, fieldProfile: fixture.fieldProfile });
const moveFrames = probe.frames.filter((f:any)=>f.inMoveScript);
// Match ROM notes to app notes by localAge (data[0]) instead of array index.
let ok=0; const bad:string[]=[];
for (const frame of moveFrames) {
  const age = frame.frame - fixture.denseWindow.startFrame;
  const v:any = sceneOnGrassWhistleView({ ...stage, age } as any);
  if (v.notes.length !== frame.notes.length) { if(bad.length<5) bad.push(`f${frame.frame} count ${v.notes.length}vs${frame.notes.length}`); continue; }
  const rom=[...frame.notes].sort((a:any,b:any)=>b.data[0]-a.data[0]);
  const app=[...v.notes].sort((a:any,b:any)=>b.localAge-a.localAge);
  let good=true;
  for(let i=0;i<rom.length;i++){
    const a:any=rom[i], note:any=app[i];
    if(!(a.x===note.x&&a.y===note.y&&a.y2===note.y2&&a.animNum===note.animation&&a.paletteNum===8&&a.data[0]===note.localAge&&a.data[1]===1&&a.data[2]===0&&a.data[3]===0)){
      good=false;
      if(bad.length<5) bad.push(`f${frame.frame}/a${age} n${i} app{x:${note.x},y:${note.y},y2:${note.y2},an:${note.animation},la:${note.localAge}} rom{x:${a.x},y:${a.y},y2:${a.y2},an:${a.animNum},la:${a.data[0]},pal:${a.paletteNum},d:${a.data.slice(0,4)}}`);
      break;
    }
  }
  if(good) ok++;
}
console.log(`age-matched clean: ${ok}/${moveFrames.length}`);
bad.forEach(b=>console.log("  "+b));
