import { readFileSync } from "node:fs";
import { createSceneOnMovePresentation, sceneOnGrassWhistleView } from "../../../src/animation/sceneOnPresentation.ts";
const scratch = process.argv[2]!;
const fixture = JSON.parse(readFileSync("/Users/kyle/Developer/pokebench/pokeemerald-factory/runs/20260717-004950_warm-bison/.worktrees/animation-main/.worktrees/animation-20260807-084212/tools/compare/fixtures/grass-whistle-player-roselia-opponent-onix.json","utf8")) as any;
const probe = JSON.parse(readFileSync(scratch + "/probe.json","utf8")) as any;
const stage = createSceneOnMovePresentation({ move: "GRASS_WHISTLE", attacker: fixture.attacker, target: fixture.target, fieldProfile: fixture.fieldProfile });
const moveFrames = probe.frames.filter((f:any)=>f.inMoveScript);
for (const mode of ["actual","displayed"] as const) {
  let ok=0; const bad:string[]=[];
  for (const frame of moveFrames) {
    const age = frame.frame - fixture.denseWindow.startFrame;
    const v = sceneOnGrassWhistleView({ ...stage, age: mode==="actual"?age:age-1 } as any);
    const full = sceneOnGrassWhistleView({ ...stage, age } as any);
    const noteExact = v.notes.length===frame.notes.length && v.notes.every((note:any,i:number)=>{
      const a=frame.notes[i]; if(!a) return false;
      return a.x===note.x && a.y===note.y && a.y2===note.y2 && a.animNum===note.animation && a.paletteNum===8
        && a.data[0]===note.localAge && a.data[1]===1 && a.data[2]===0 && a.data[3]===0;
    });
    if (noteExact && full.visualTaskCount===frame.visualTaskCount) ok++;
    else if (bad.length<6) bad.push(`f${frame.frame}/a${age}: n ${v.notes.length}vs${frame.notes.length} vt ${full.visualTaskCount}vs${frame.visualTaskCount}`);
  }
  console.log(`${mode}: ${ok}/${moveFrames.length}`);
  if (bad.length) console.log("  " + bad.join("\n  "));
}
