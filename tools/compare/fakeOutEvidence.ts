import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { copyFileSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fakeOutAtAge } from "../../src/animation/fakeOut.ts";
import {
  createSceneOnMovePresentation,
  sceneOnFakeOutView,
} from "../../src/animation/sceneOnPresentation.ts";
import {
  createInitialState,
  render,
  type EngineState,
} from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";

interface Fixture { scenario:string; probe:string; orientation:string; sourceWindow:{startFrame:number;endFrame:number;frameCount:number}; probeJsonSha256:string; rawRgbSha256:string; changeMap:string; changeMapSha256:string; }
interface Sprite { attr0:number;attr1:number;attr2:number;matrixNum:number;x2:number;y2:number;matrix:{a:number;b:number;c:number;d:number}; }
interface Audio { rawInfo:string;songHeader:number;tracks:readonly {flags:number;panX:number}[]; }
interface Frame { frame:number; gAnimScriptActive:number; scriptOffset:number|null; gAnimFramesToWait:number; visualTaskCount:number; tasks:readonly {func:{symbol:string|null};data:readonly number[]}[]; playerSprite:Sprite; opponentSprite:Sprite; hardwareOam:readonly string[]; hardwareMatrices:readonly unknown[]; fadedPalette:readonly number[]; unfadedPalette:readonly number[]; hardwarePalette:readonly number[]; paletteTags:readonly number[]; registers:Record<string,number>; softwareWindow:{win0h:number;win0v:number}; se1:Audio; se2:Audio; }
interface Probe { schema:string; sourceBounds:{start:number;endExclusive:number}; sourceWindow:Fixture["sourceWindow"]; songHeaders:Readonly<Record<"SE_M_FLATTER"|"SE_M_SKETCH",number>>; frames:readonly Frame[]; }

const root=resolve(dirname(new URL(import.meta.url).pathname),"../..");
const args=process.argv.slice(2);
if(args.length!==2) throw new Error("usage: fakeOutEvidence.ts <player-fixture> <opponent-fixture>");
const vendor=dirname(realpathSync(join(root,"reference/pokeemerald")));

const hex16=(value:number)=>`${(value&0xff).toString(16).padStart(2,"0")}${(value>>>8).toString(16).padStart(2,"0")}`;
const same=(left:unknown,right:unknown)=>JSON.stringify(left)===JSON.stringify(right);

for(let runNumber=1;runNumber<=2;runNumber+=1) for(const fixturePath of args){
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
  const playerAttacks=fixture.orientation.startsWith("player");
  const stage=createSceneOnMovePresentation({
    move:"FAKE_OUT",
    attacker:{species:"MAKUHITA",geometry:playerAttacks
      ? {side:"player" as const,spriteCorner:{x:40,y:59},animationCenter:{x:72,y:91},battlePositionCenter:{x:72,y:80}}
      : {side:"opponent" as const,spriteCorner:{x:144,y:20},animationCenter:{x:176,y:52},battlePositionCenter:{x:176,y:40}}},
    target:{species:"SHUCKLE",geometry:playerAttacks
      ? {side:"opponent" as const,spriteCorner:{x:144,y:17},animationCenter:{x:176,y:49},battlePositionCenter:{x:176,y:40}}
      : {side:"player" as const,spriteCorner:{x:40,y:59},animationCenter:{x:72,y:91},battlePositionCenter:{x:72,y:80}}},
    fieldProfile:playerAttacks
      ? {playerHp:179,playerMaxHp:179,opponentHp:127,opponentMaxHp:127,playerGender:"male" as const,opponentGender:"male" as const}
      : {playerHp:127,playerMaxHp:127,opponentHp:179,opponentMaxHp:179,playerGender:"male" as const,opponentGender:"male" as const},
    targetPictureYOffset:fixture.orientation.startsWith("player")?9:11,
  });
  const frameMap=new Map(probe.frames.map(frame=>[frame.frame,frame]));
  let matched=0,seamMatched=0,hardwareMatched=0,framebufferMatched=0;
  const mismatches:string[]=[];
  for(const frame of source){
    const age=frame.frame-probe.sourceWindow.startFrame, expected=fakeOutAtAge(age,playerAttacks?"player":"opponent",playerAttacks?9:11), target=playerAttacks?frame.opponentSprite:frame.playerSprite;
    const complete=frame.hardwareOam.length===128&&frame.hardwareMatrices.length===32&&frame.fadedPalette.length===512&&frame.unfadedPalette.length===512&&frame.hardwarePalette.length===512&&frame.paletteTags.length===16&&frame.se1.tracks.length===3&&frame.se2.tracks.length===3&&Boolean(frame.se1.rawInfo)&&Boolean(frame.se2.rawInfo);
    const component=frame.softwareWindow.win0h===expected.softwareWin0H&&target.x2===expected.target.x2&&target.y2===expected.target.y2&&JSON.stringify(target.matrix)===JSON.stringify(expected.target.matrix)&&frame.registers.win0h===expected.displayedWin0H&&(age===0||frame.registers.win0v===expected.displayedWin0V)&&Boolean(frame.gAnimScriptActive)===expected.active;
    if(complete&&component) matched+=1;
    const seam=sceneOnFakeOutView({...stage,age});
    const seamExact=same(seam.target,expected.target)&&seam.softwareWin0H===expected.softwareWin0H&&seam.displayedWin0H===expected.displayedWin0H&&seam.bgWhiteCoeff===expected.bgWhiteCoeff&&same(seam.sound,expected.sound)&&seam.active===expected.active;
    if(seamExact) seamMatched+=1;
    const prior=frameMap.get(frame.frame-1);
    const matrixPrior=frameMap.get(frame.frame-2);
    const priorTarget=prior?(playerAttacks?prior.opponentSprite:prior.playerSprite):null;
    const matrixTarget=matrixPrior?(playerAttacks?matrixPrior.opponentSprite:matrixPrior.playerSprite):null;
    const priorAttr0=age===38&&priorTarget!==null
      ? priorTarget.attr0|0x200
      : priorTarget?.attr0;
    const oamExact=priorTarget===null||frame.hardwareOam.some(item=>item.startsWith(hex16(priorAttr0!)+hex16(priorTarget.attr1)+hex16(priorTarget.attr2)));
    const matrixExact=matrixTarget===null||same(frame.hardwareMatrices[target.matrixNum],matrixTarget.matrix);
    const registers=age===0
      ? frame.registers.dispcnt===0xbf40&&frame.registers.win0h===240&&frame.registers.win0v===161&&frame.registers.winin===16191&&frame.registers.winout===16191&&frame.registers.bldcnt===0&&frame.registers.bldy===0
      : age<=15
        ? frame.registers.dispcnt===0xbf40&&frame.registers.win0h===expected.displayedWin0H&&frame.registers.win0v===160&&frame.registers.winin===16159&&frame.registers.winout===16191&&frame.registers.bldcnt===200&&frame.registers.bldy===16
        : age===16
          ? frame.registers.dispcnt===0xbf40&&frame.registers.win0h===0&&frame.registers.win0v===160&&frame.registers.winin===16159&&frame.registers.winout===16191&&frame.registers.bldcnt===136&&frame.registers.bldy===16
          : frame.registers.dispcnt===0xbf40&&frame.registers.win0h===0&&frame.registers.win0v===0&&frame.registers.winin===16191&&frame.registers.winout===16191&&frame.registers.bldcnt===0&&frame.registers.bldy===0;
    const hardware=complete&&oamExact&&matrixExact&&registers;
    if(hardware) hardwareMatched+=1;
    // The opening script opcode launches on the callback after the pointer
    // first enters Move_FAKE_OUT; the post-shutter opcode executes in the
    // current callback once AnimTask_FakeOut releases the script wait.
    const launchedSound=age===1
      ? sceneOnFakeOutView({...stage,age:0}).sound
      : age===17 ? expected.sound : null;
    const sound=launchedSound===null||(frame.se1.songHeader===probe.songHeaders[launchedSound.id]&&frame.se1.tracks[0]?.flags===131&&frame.se1.tracks[0]?.panX===launchedSound.pan);
    const engine:EngineState={...createInitialState(),rngMode:"frontierBattle",sceneOnPresentation:{...stage,age}};
    const app=render(engine),oracleRgb=readFileSync(join(rgb,`${String(frame.frame).padStart(5,"0")}.rgb`));
    let diff=0;const samples:string[]=[];
    for(let pixel=0;pixel<240*160;pixel+=1){
      if(app[pixel*4]===oracleRgb[pixel*3]&&app[pixel*4+1]===oracleRgb[pixel*3+1]&&app[pixel*4+2]===oracleRgb[pixel*3+2]) continue;
      diff+=1;if(samples.length<4) samples.push(`${pixel%240},${Math.floor(pixel/240)}:${app[pixel*4]},${app[pixel*4+1]},${app[pixel*4+2]}!=${oracleRgb[pixel*3]},${oracleRgb[pixel*3+1]},${oracleRgb[pixel*3+2]}`);
    }
    if(diff===0) framebufferMatched+=1;
    if(!complete||!component||!seamExact||!hardware||!sound||diff!==0) mismatches.push(`frame ${frame.frame}/age ${age}: source=${complete&&component} seam=${seamExact} hardware=${hardware} sound=${sound} framebuffer=${diff===0} diff=${diff} samples=${samples.join(",")}`);
  }
  console.log(`${fixture.orientation} run ${runNumber}: source/reducer ${matched}/86; seam ${seamMatched}/86; hardware ${hardwareMatched}/86; framebuffer ${framebufferMatched}/86`);
  if(mismatches.length){console.error(mismatches.slice(0,50).join("\n"));console.error(`scratch: ${scratch}`);process.exit(1);}
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
