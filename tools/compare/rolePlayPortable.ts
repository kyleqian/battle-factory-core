import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { rolePlayAtAge } from "../../src/animation/rolePlay.ts";
import { createSceneOnMovePresentation, sceneOnRolePlayView, type SceneOnRolePlayConfig } from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";

type Fixture = {
  schema: "role-play-portable-evidence/v1"; oracleProfile: "battle-scene-on"; orientation: "player-back" | "opponent-front";
  scenario: string; probe: string; sourceWindow: { startFrame: number; endFrame: number; frameCount: 147 };
  probeJsonSha256: string; rawRgbSha256: string; changeMap: string; changeMapSha256: string;
  attacker: { side: "player" | "opponent" }; fieldProfile: SceneOnRolePlayConfig["fieldProfile"];
};
type Sprite = { slot:number;template:number;x:number;y:number;attr0:number;attr1:number;attr2:number;subpriority:number;objMode:number;affineMode:number;matrix:readonly number[];hardwareMatrix:readonly number[] };
type Frame = { frame:number;sha256:string;scriptOffset:number|null;animScriptActive:boolean;player:Record<string,unknown>;opponent:Record<string,unknown>;
  playerSprite:{invisible:boolean;attr2:number};opponentSprite:{invisible:boolean;attr2:number};sprites:readonly Sprite[];tasks:readonly {func:number;data:readonly number[]}[];
  visualTaskCount:number;soundTaskCount:number;fadedPalette:readonly number[];unfadedPalette:readonly number[];hardwarePalette:readonly number[];
  paletteTags:readonly number[];tileTags:readonly number[];
  softwareOam:readonly string[];hardwareOam:readonly (readonly number[])[];hardwareMatrices:readonly (readonly number[])[];
  se1:{songHeader:number;tracks:readonly {flags:number;panX:number}[]};se2:{songHeader:number;tracks:readonly {flags:number;panX:number}[]};bldcnt:number;bldalpha:number };
type Probe = { schema:"role-play-dense-evidence/v1";sourceBounds:{Move_ROLE_PLAY:number;Move_REFRESH:number};templates:{additionalMon:number;simplePaletteBlend:number};taskFuncs:Record<string,number>;songHeaders:Record<string,number>;frames:readonly Frame[] };

const root=resolve(dirname(new URL(import.meta.url).pathname),"../..");
const paths=process.argv.slice(2); if(paths.length!==2)throw new Error("usage: rolePlayPortable.ts <player fixture> <opponent fixture>");
const sha=(value:string|Buffer)=>createHash("sha256").update(value).digest("hex");
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
const receipts=new Map<string,string>();

function blend(color:number,target:number,coeff:number):number { const r=color&31,g=(color>>5)&31,b=(color>>10)&31,tr=target&31,tg=(target>>5)&31,tb=(target>>10)&31;return (r+(((tr-r)*coeff)>>4))|((g+(((tg-g)*coeff)>>4))<<5)|((b+(((tb-b)*coeff)>>4))<<10); }
function normalizedMap(fixture:Fixture,rgbDir:string):string { const run=spawnSync("python3",[join(root,"tools/compare/frame-changemap.py"),rgbDir],{cwd:root,encoding:"utf8"});if(run.status!==0)throw new Error("change map");const at=run.stdout.indexOf(" — ");return `# ${basename(fixture.changeMap)} raw RGB888 — ${run.stdout.slice(at+3)}`; }
function diff(app:Uint8Array,rgb:Buffer):number { let n=0;for(let i=0;i<240*160;i++)if(app[i*4]!==rgb[i*3]||app[i*4+1]!==rgb[i*3+1]||app[i*4+2]!==rgb[i*3+2])n++;return n; }

function config(fixture:Fixture):SceneOnRolePlayConfig {
  const player=fixture.attacker.side==="player";
  return { move:"ROLE_PLAY", fieldProfile:fixture.fieldProfile,
    attacker:{species:"KADABRA",geometry:player
      ? {side:"player",spriteCorner:{x:40,y:56},animationCenter:{x:72,y:88},battlePositionCenter:{x:72,y:80}}
      : {side:"opponent",spriteCorner:{x:144,y:13},animationCenter:{x:176,y:45},battlePositionCenter:{x:176,y:42}}},
    target:{species:"ONIX",geometry:player
      ? {side:"opponent",spriteCorner:{x:144,y:10},animationCenter:{x:176,y:42},battlePositionCenter:{x:176,y:40}}
      : {side:"player",spriteCorner:{x:40,y:48},animationCenter:{x:72,y:80},battlePositionCenter:{x:72,y:80}}},
  };
}

function verify(path:string,runNumber:number):void {
  const fixture=JSON.parse(readFileSync(resolve(path),"utf8")) as Fixture;
  const scratch=createScratchDir(`pokebench-role-play-${fixture.orientation}-`),output=join(scratch,"probe.json"),rgbDir=join(scratch,"rgb");
  const vendor=dirname(realpathSync(join(root,"reference/pokeemerald")));
  const run=spawnSync("python3",[join(root,"tools/run-mgba-probe.py"),output,"--",join(vendor,"mgba-venv/bin/python"),resolve(root,fixture.probe),resolve(root,fixture.scenario),output,rgbDir],{cwd:root,encoding:"utf8"});
  if(run.stdout)process.stdout.write(run.stdout);if(run.stderr)process.stderr.write(run.stderr);if(run.status!==0)throw new Error(`${fixture.orientation}: probe failed`);
  const bytes=readFileSync(output),probe=JSON.parse(bytes.toString()) as Probe, failures:string[]=[];
  if(probe.schema!=="role-play-dense-evidence/v1"||probe.frames.length!==147||probe.sourceBounds.Move_REFRESH-probe.sourceBounds.Move_ROLE_PLAY!==0x5c)failures.push("window/source bounds");
  if(sha(bytes)!==fixture.probeJsonSha256)failures.push("probe digest");
  const stage=createSceneOnMovePresentation(config(fixture)),raw=createHash("sha256");let components=0,framebuffers=0;
  const first=probe.frames[0]!;
  for(const [age,oracle] of probe.frames.entries()){
    const before=failures.length,predicted=rolePlayAtAge(age,fixture.attacker.side,stage.config.attacker.geometry.battlePositionCenter),seam=sceneOnRolePlayView({...stage,age});
    const rgb=readFileSync(join(rgbDir,`${String(oracle.frame).padStart(5,"0")}.rgb`));raw.update(rgb);if(sha(rgb)!==oracle.sha256)failures.push(`age ${age}: raw`);
    const {age:_a,attacker:_b,target:_c,displayedTargetWhiteCoefficient:_d,displayedBgBlackCoefficient:_e,displayedSilhouette:_f,...software}=seam;if(!same(software,predicted))failures.push(`age ${age}: seam`);
    if(oracle.frame!==fixture.sourceWindow.startFrame+age||oracle.scriptOffset!==predicted.scriptOffset||oracle.animScriptActive!==predicted.active||oracle.visualTaskCount!==predicted.visualTaskCount)failures.push(`age ${age}: pointer/tasks`);
    const sprites=oracle.sprites.filter(s=>s.template===probe.templates.additionalMon);if((predicted.silhouette===null)!==(sprites.length===0))failures.push(`age ${age}: silhouette life`);
    if(predicted.silhouette){const s=sprites[0]!;if(sprites.length!==1||!same({slot:s.slot,x:s.x,y:s.y,subpriority:s.subpriority,priority:(s.attr2>>10)&3,objMode:s.objMode,affineMode:s.affineMode,paletteNum:(s.attr2>>12)&15,tileNum:s.attr2&1023,matrix:s.matrix},{slot:3,x:predicted.silhouette.x,y:predicted.silhouette.y,subpriority:5,priority:2,objMode:1,affineMode:predicted.silhouette.affineMode,paletteNum:7,tileNum:305,matrix:[predicted.silhouette.matrix.a,0,0,predicted.silhouette.matrix.d]}))failures.push(`age ${age}: silhouette software`);}
    const target=fixture.attacker.side==="player"?oracle.opponentSprite:oracle.playerSprite,targetBank=256+((target.attr2>>12)&15)*16;
    if([...Array(16)].some((_,i)=>oracle.fadedPalette[targetBank+i]!==blend(oracle.unfadedPalette[targetBank+i]!,32767,predicted.targetWhiteCoefficient)))failures.push(`age ${age}: target palette`);
    for(const bank of [1,2,3])for(let i=0;i<16;i++)if(oracle.fadedPalette[bank*16+i]!==blend(oracle.unfadedPalette[bank*16+i]!,0,predicted.bgBlackCoefficient))failures.push(`age ${age}: bg palette`);
    const attacker=fixture.attacker.side==="player"?oracle.playerSprite:oracle.opponentSprite;if(attacker.invisible!==predicted.attackerOnMonBg)failures.push(`age ${age}: monbg`);
    if(oracle.paletteTags.includes(55125)!==predicted.silhouetteResourceLoaded)failures.push(`age ${age}: additional-mon palette tag`);
    if(predicted.blend?(oracle.bldcnt!==16192||oracle.bldalpha!==(predicted.blend.eva|(predicted.blend.evb<<8))):(oracle.bldcnt!==0||oracle.bldalpha!==0))failures.push(`age ${age}: blend regs`);
    // The first handoff still contains the outgoing pre-source transfer;
    // from the second source display onward palette scanout is RAM+1.
    if(age>1&&!same(oracle.hardwarePalette,probe.frames[age-1]!.fadedPalette))failures.push(`age ${age}: palette latch`);
    if(age>=2&&predicted.silhouette){const prior=probe.frames[age-2]!.sprites.find(s=>s.template===probe.templates.additionalMon);if(prior&&!same(sprites[0]?.hardwareMatrix,prior.matrix))failures.push(`age ${age}: affine hardware lag`);}
    if(!same(oracle.player,first.player)||!same(oracle.opponent,first.opponent))failures.push(`age ${age}: battle state`);
    if(oracle.soundTaskCount!==Number(predicted.delayedDetectWait!==null))failures.push(`age ${age}: delayed sound task count`);
    if(predicted.delayedDetectWait!==null&&!oracle.tasks.some(task=>task.data[0]===209&&task.data[1]===(fixture.attacker.side==="player"?-64:63)&&task.data[2]===predicted.delayedDetectWait))failures.push(`age ${age}: DETECT delay/pan task`);
    if(predicted.sound==="SE_M_TRI_ATTACK"&&(oracle.se1.songHeader!==probe.songHeaders.SE_M_TRI_ATTACK||!oracle.se1.tracks.some(track=>(track.flags&0x80)!==0&&track.panX===predicted.soundPan)))failures.push(`age ${age}: TRI_ATTACK identity/pan`);
    if(predicted.sound==="SE_M_DETECT"&&(oracle.se2.songHeader!==probe.songHeaders.SE_M_DETECT||!oracle.se2.tracks.some(track=>(track.flags&0x80)!==0&&track.panX===predicted.soundPan)))failures.push(`age ${age}: DETECT identity/pan`);
    if(oracle.fadedPalette.length!==512||oracle.hardwarePalette.length!==512||oracle.softwareOam.length!==128||oracle.hardwareOam.length!==128||oracle.hardwareMatrices.length!==32)failures.push(`age ${age}: hardware shape`);
    if(failures.length===before)components++;
    const engine:EngineState={...createInitialState(),rngMode:"frontierBattle",sceneOnPresentation:{...stage,age}};const pixels=diff(render(engine),rgb);if(pixels===0)framebuffers++;else failures.push(`age ${age}: framebuffer ${pixels}`);
  }
  const rawDigest=raw.digest("hex");if(rawDigest!==fixture.rawRgbSha256)failures.push("raw digest");const map=normalizedMap(fixture,rgbDir);if(map!==readFileSync(resolve(fixture.changeMap),"utf8")||sha(map)!==fixture.changeMapSha256)failures.push("change map");
  const receipt=sha(bytes);if(runNumber===1)receipts.set(fixture.orientation,receipt);else if(receipts.get(fixture.orientation)!==receipt)failures.push("fresh receipt");
  console.log(`${fixture.orientation} run ${runNumber}: component ${components}/147 framebuffer ${framebuffers}/147 probe/raw/map ${receipt}/${rawDigest}/${sha(map)}`);
  if(failures.length){console.error(failures.slice(0,80).join("\n"));console.error(`scratch: ${scratch}`);process.exitCode=1;}
}
for(let run=1;run<=2;run++)for(const path of paths)verify(path,run);
