import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { copyFileSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fakeOutAtAge } from "../../src/animation/fakeOut.ts";
import { createScratchDir } from "../lib/scratch.ts";

interface Fixture { scenario:string; probe:string; orientation:string; sourceWindow:{startFrame:number;endFrame:number;frameCount:number}; probeJsonSha256:string; rawRgbSha256:string; changeMap:string; changeMapSha256:string; }
interface Frame { frame:number; gAnimScriptActive:number; scriptOffset:number|null; gAnimFramesToWait:number; visualTaskCount:number; tasks:readonly {func:{symbol:string|null};data:readonly number[]}[]; playerSprite:{x2:number;y2:number;matrix:{a:number;b:number;c:number;d:number}}; opponentSprite:{x2:number;y2:number;matrix:{a:number;b:number;c:number;d:number}}; hardwareOam:readonly string[]; hardwareMatrices:readonly unknown[]; fadedPalette:readonly number[]; unfadedPalette:readonly number[]; hardwarePalette:readonly number[]; paletteTags:readonly number[]; registers:Record<string,number>; softwareWindow:{win0h:number;win0v:number}; se1:{rawInfo:string;tracks:readonly unknown[]}; se2:{rawInfo:string;tracks:readonly unknown[]}; }
interface Probe { schema:string; sourceBounds:{start:number;endExclusive:number}; sourceWindow:Fixture["sourceWindow"]; frames:readonly Frame[]; }

const root=resolve(dirname(new URL(import.meta.url).pathname),"../..");
const args=process.argv.slice(2);
if(args.length!==2) throw new Error("usage: fakeOutEvidence.ts <player-fixture> <opponent-fixture>");
const vendor=dirname(realpathSync(join(root,"reference/pokeemerald")));

for(const fixturePath of args){
  const fixture=JSON.parse(readFileSync(resolve(fixturePath),"utf8")) as Fixture;
  const scratch=createScratchDir("pokebench-fakeout-evidence-");
  const output=join(scratch,"probe.json"), rgb=join(scratch,"rgb"), sourceRgb=join(scratch,"source-rgb");
  const run=spawnSync("python3",[join(root,"tools/run-mgba-probe.py"),output,"--",join(vendor,"mgba-venv/bin/python"),resolve(root,fixture.probe),resolve(root,fixture.scenario),output,rgb],{cwd:root,encoding:"utf8"});
  if(run.stdout) process.stdout.write(run.stdout); if(run.stderr) process.stderr.write(run.stderr);
  if(run.status!==0) process.exit(run.status??1);
  const bytes=readFileSync(output), probe=JSON.parse(bytes.toString()) as Probe;
  if(probe.schema!=="fake-out-dense-evidence/v1"||probe.sourceBounds.start!==0x082d3f2e||probe.sourceBounds.endExclusive!==0x082d3f69) throw new Error(`${fixture.orientation}: source identity changed`);
  if(JSON.stringify(probe.sourceWindow)!==JSON.stringify(fixture.sourceWindow)) throw new Error(`${fixture.orientation}: source window changed`);
  const source=probe.frames.filter(f=>f.frame>=probe.sourceWindow.startFrame&&f.frame<=probe.sourceWindow.endFrame);
  if(source.length!==86||source.some((f,i)=>f.frame!==probe.sourceWindow.startFrame+i)) throw new Error(`${fixture.orientation}: source interval is not dense`);
  const playerAttacks=fixture.orientation.startsWith("player"); let matched=0;
  for(const frame of source){
    const age=frame.frame-probe.sourceWindow.startFrame, expected=fakeOutAtAge(age,playerAttacks?"player":"opponent",playerAttacks?9:11), target=playerAttacks?frame.opponentSprite:frame.playerSprite;
    const complete=frame.hardwareOam.length===128&&frame.hardwareMatrices.length===32&&frame.fadedPalette.length===512&&frame.unfadedPalette.length===512&&frame.hardwarePalette.length===512&&frame.paletteTags.length===16&&frame.se1.tracks.length===3&&frame.se2.tracks.length===3&&Boolean(frame.se1.rawInfo)&&Boolean(frame.se2.rawInfo);
    const component=frame.softwareWindow.win0h===expected.softwareWin0H&&target.x2===expected.target.x2&&target.y2===expected.target.y2&&JSON.stringify(target.matrix)===JSON.stringify(expected.target.matrix)&&frame.registers.win0h===expected.displayedWin0H&&(age===0||frame.registers.win0v===expected.displayedWin0V)&&Boolean(frame.gAnimScriptActive)===expected.active;
    if(complete&&component) matched+=1;
  }
  if(matched!==86) throw new Error(`${fixture.orientation}: source/reducer ${matched}/86`);
  const rawHash=createHash("sha256");
  for(const frame of source) rawHash.update(readFileSync(join(rgb,`${String(frame.frame).padStart(5,"0")}.rgb`)));
  if(createHash("sha256").update(bytes).digest("hex")!==fixture.probeJsonSha256||rawHash.digest("hex")!==fixture.rawRgbSha256) throw new Error(`${fixture.orientation}: deterministic receipt changed`);
  const mkdir=spawnSync("mkdir",[sourceRgb]); if(mkdir.status!==0) throw new Error("source RGB scratch mkdir failed");
  for(const frame of source) copyFileSync(join(rgb,`${String(frame.frame).padStart(5,"0")}.rgb`),join(sourceRgb,`${String(frame.frame).padStart(5,"0")}.rgb`));
  const mapRun=spawnSync("python3",[join(root,"tools/compare/frame-changemap.py"),sourceRgb],{encoding:"utf8"});
  if(mapRun.status!==0) throw new Error(`${fixture.orientation}: change-map generation failed`);
  const label=playerAttacks?"player-back":"opponent-front";
  const map=mapRun.stdout.replace(/^# .* —/,`# MOVE_FAKE_OUT ${label} —`);
  if(map!==readFileSync(resolve(root,fixture.changeMap),"utf8")||createHash("sha256").update(map).digest("hex")!==fixture.changeMapSha256) throw new Error(`${fixture.orientation}: change-map drift`);
  console.log(`${fixture.orientation}: 86/86 source/reducer; deterministic RGB/map receipt`);
}
