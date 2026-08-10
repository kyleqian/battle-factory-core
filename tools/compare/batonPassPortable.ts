import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { batonPassAtAge } from "../../src/animation/batonPass.ts";
import { createSceneOnMovePresentation, sceneOnBatonPassView, type SceneOnBatonPassConfig } from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";

type Fixture = SceneOnBatonPassConfig & {
  schema: "baton-pass-portable-evidence/v1"; oracleProfile: "battle-scene-on";
  orientation: "player-back" | "opponent-front"; scenario: string; probe: string; probeMoveId: 226;
  sourceWindow: { startFrame: number; endFrame: number; frameCount: 53 };
  evidenceSha256: string; rawRgbSha256: string; changeMap: string; changeMapSha256: string;
  acceptance: { status: "unsupported" | "exact"; componentMatching: number; framebufferMatching: number };
};
type Sprite = { slot:number; template:number; x:number; y:number; x2:number; y2:number; attr0:number; attr1:number; attr2:number; data:readonly number[] };
type BattlerSprite = Sprite & { invisible:boolean; matrix:{a:number;b:number;c:number;d:number}; hardwareMatrix:{a:number;b:number;c:number;d:number} };
type Frame = { frame:number; sha256:string; scriptOffset:number|null; animScriptActive:boolean; player:unknown; opponent:unknown;
  playerSprite:BattlerSprite; opponentSprite:BattlerSprite; sprites:readonly Sprite[]; tasks:readonly {func:number;data:readonly number[]}[];
  visualTaskCount:number; soundTaskCount:number; fadedPalette:readonly number[]; hardwarePalette:readonly number[];
  unfadedPalette:readonly number[]; paletteTags:readonly number[]; tileTags:readonly number[];
  softwareOam:readonly string[]; hardwareOam:readonly (readonly number[])[]; hardwareMatrices:readonly (readonly number[])[];
  se1:{songHeader:number;tracks:readonly {flags:number;pan:number;panX:number}[]}; dispcnt:number;bldcnt:number;bldalpha:number;bldy:number };
type Probe = { schema:"baton-pass-dense-evidence/v1"; scriptBounds:{Move_BATON_PASS:number;Move_PERISH_SONG:number}; templates:Record<string,number>; taskFuncs:Record<string,number>; songHeaders:Record<string,number>; frames:readonly Frame[] };
const root=resolve(dirname(new URL(import.meta.url).pathname),"../..");
const paths=process.argv.slice(2); if(paths.length!==2) throw new Error("usage: batonPassPortable.ts <player fixture> <opponent fixture>");
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
const sha=(v:string|Buffer)=>createHash("sha256").update(v).digest("hex");

function blendGbaColor(color:number,target:number,coeff:number):number {
  const r=color&0x1f,g=(color>>5)&0x1f,b=(color>>10)&0x1f;
  const tr=target&0x1f,tg=(target>>5)&0x1f,tb=(target>>10)&0x1f;
  return (r+(((tr-r)*coeff)>>4))|((g+(((tg-g)*coeff)>>4))<<5)|((b+(((tb-b)*coeff)>>4))<<10);
}

function normalizedChangeMap(fixture:Fixture,rgbDir:string):string {
  const run=spawnSync("python3",[join(root,"tools/compare/frame-changemap.py"),rgbDir],{cwd:root,encoding:"utf8"});
  if(run.status!==0)throw new Error(`${fixture.orientation}: change-map generation failed`);
  const separator=run.stdout.indexOf(" — ");
  if(separator<0)throw new Error(`${fixture.orientation}: change-map header changed`);
  return `# ${basename(fixture.changeMap)} raw RGB888 — ${run.stdout.slice(separator+3)}`;
}

function framebufferDiff(app:Uint8Array,rgb:Buffer):number { let n=0; for(let i=0;i<240*160;i++) if(app[i*4]!==rgb[i*3]||app[i*4+1]!==rgb[i*3+1]||app[i*4+2]!==rgb[i*3+2]) n++; return n; }

function verify(path:string):void {
  const fixture=JSON.parse(readFileSync(resolve(path),"utf8")) as Fixture;
  const scratch=createScratchDir(`pokebench-baton-pass-${fixture.orientation}-`), output=join(scratch,"probe.json"), rgbDir=join(scratch,"rgb");
  const vendor=dirname(realpathSync(join(root,"reference/pokeemerald")));
  const run=spawnSync("python3",[join(root,"tools/run-mgba-probe.py"),output,"--",join(vendor,"mgba-venv/bin/python"),resolve(root,fixture.probe),resolve(root,fixture.scenario),output,rgbDir,String(fixture.probeMoveId)],{cwd:root,encoding:"utf8"});
  if(run.stdout)process.stdout.write(run.stdout); if(run.stderr)process.stderr.write(run.stderr); if(run.status!==0)throw new Error(`${fixture.orientation}: probe failed`);
  const probe=JSON.parse(readFileSync(output,"utf8")) as Probe;
  if(probe.schema!=="baton-pass-dense-evidence/v1"||probe.frames.length!==53||probe.scriptBounds.Move_PERISH_SONG-probe.scriptBounds.Move_BATON_PASS!==0x22) throw new Error(`${fixture.orientation}: incomplete source window`);
  const stage=createSceneOnMovePresentation(fixture), evidence=createHash("sha256"), raw=createHash("sha256"), failures:string[]=[];
  let components=0, framebuffers=0;
  const first=probe.frames[0]!;
  for(const [age,oracle] of probe.frames.entries()) {
    const before=failures.length, expected=batonPassAtAge(age,fixture.attacker.geometry.animationCenter), seam=sceneOnBatonPassView({...stage,age});
    const rgb=readFileSync(join(rgbDir,`${String(oracle.frame).padStart(5,"0")}.rgb`)); evidence.update(JSON.stringify(oracle)); evidence.update(rgb); raw.update(rgb);
    if(sha(rgb)!==oracle.sha256) failures.push(`age ${age}: raw hash`);
    const {age:_a,attacker:_b,target:_c,displayedBgPaletteY:_d,displayedBattlerPaletteY:_e,displayedPokeball:_f,displayedAttackerMatrix:_g,displayedAttackerInvisible:_h,...software}=seam;
    if(!same(software,expected)) failures.push(`age ${age}: typed seam`);
    if(oracle.frame!==fixture.sourceWindow.startFrame+age||oracle.scriptOffset!==expected.scriptOffset||oracle.animScriptActive!==expected.active) failures.push(`age ${age}: pointer/cleanup`);
    const actual=oracle.sprites.map(s=>({slot:s.slot,template:s.template,x:s.x,y:s.y,y2:s.y2,data:s.data}));
    const wanted=expected.pokeball?[{slot:3,template:probe.templates.gBatonPassPokeballSpriteTemplate,x:expected.pokeball.x,y:expected.pokeball.y,y2:expected.pokeball.y2,data:[expected.pokeball.phase,expected.pokeball.data1,expected.pokeball.data2,expected.pokeball.data3,0,0,0,0]}]:[];
    if(!same(actual,wanted)) failures.push(`age ${age}: Pokeball software`);
    const attacker=fixture.attacker.geometry.side==="player"?oracle.playerSprite:oracle.opponentSprite;
    if(!same(attacker.matrix,expected.attackerMatrix)||attacker.invisible!==expected.attackerInvisible) failures.push(`age ${age}: attacker matrix/invisible`);
    if(oracle.visualTaskCount!==expected.visualTaskCount||oracle.soundTaskCount!==0) failures.push(`age ${age}: task counts`);
    const blendTasks=oracle.tasks.filter(t=>t.func===probe.taskFuncs.AnimTask_BlendColorCycle||t.func===probe.taskFuncs.AnimTask_BlendColorCycleLoop);
    if(blendTasks.length!==Number(expected.blendTaskActive)) failures.push(`age ${age}: blend task`);
    if(blendTasks.some(t=>t.data[0]!==31||t.data[1]!==1||t.data[4]!==11||t.data[5]!==31455)) failures.push(`age ${age}: blend task arguments`);
    const selectedBg=[1,2,3].flatMap(bank=>Array.from({length:16},(_,index)=>bank*16+index));
    const attackerBank=256+(attacker.attr2>>>12)*16;
    const selectedAttacker=Array.from({length:16},(_,index)=>attackerBank+index);
    const target=fixture.target.geometry.side==="player"?oracle.playerSprite:oracle.opponentSprite;
    const targetBank=256+(target.attr2>>>12)*16;
    const unselected=[...Array.from({length:16},(_,index)=>index),...Array.from({length:16},(_,index)=>targetBank+index)];
    if(selectedBg.some(index=>oracle.fadedPalette[index]!==blendGbaColor(oracle.unfadedPalette[index]!,31455,expected.bgPaletteY))
      ||selectedAttacker.some(index=>oracle.fadedPalette[index]!==blendGbaColor(oracle.unfadedPalette[index]!,31455,expected.battlerPaletteY))
      ||unselected.some(index=>oracle.fadedPalette[index]!==oracle.unfadedPalette[index])) failures.push(`age ${age}: software palette blend/selector`);
    if(oracle.tileTags.includes(10226)!==expected.pokeballLoaded||oracle.paletteTags.includes(10226)!==expected.pokeballLoaded) failures.push(`age ${age}: Pokeball resource tags`);
    if(age>0) {
      const prior=probe.frames[age-1]!;
      if(!same(oracle.hardwarePalette,prior.fadedPalette)) failures.push(`age ${age}: hardware palette transfer`);
      if(!same(attacker.hardwareMatrix,(fixture.attacker.geometry.side==="player"?prior.playerSprite:prior.opponentSprite).matrix)) failures.push(`age ${age}: live matrix transfer`);
      if(!prior.sprites.every(sprite=>oracle.hardwareOam.some(item=>same(item,[sprite.attr0,sprite.attr1,sprite.attr2])))) failures.push(`age ${age}: Pokeball hardware OAM transfer`);
      const priorAttacker=fixture.attacker.geometry.side==="player"?prior.playerSprite:prior.opponentSprite;
      const attackerOnHardware=oracle.hardwareOam.some(item=>same(item,[priorAttacker.attr0,priorAttacker.attr1,priorAttacker.attr2]));
      if(attackerOnHardware===priorAttacker.invisible) failures.push(`age ${age}: attacker hardware OAM visibility transfer`);
    }
    if(oracle.fadedPalette.length!==512||oracle.unfadedPalette.length!==512||oracle.hardwarePalette.length!==512||oracle.softwareOam.length!==128||oracle.hardwareOam.length!==128||oracle.hardwareMatrices.length!==32) failures.push(`age ${age}: hardware shape`);
    if(!same(oracle.player,first.player)||!same(oracle.opponent,first.opponent)||oracle.dispcnt!==first.dispcnt||oracle.bldcnt!==first.bldcnt||oracle.bldalpha!==first.bldalpha||oracle.bldy!==first.bldy) failures.push(`age ${age}: immutable state/registers`);
    // playsewithpan is issued at source age 1; the m4a track header/pan is
    // visible in hardware at age 4 in both orientations.
    if(age===4) {
      const pan=fixture.attacker.geometry.side==="player"?-64:63;
      const audible=oracle.se1.tracks.some(track=>(track.flags&0x80)!==0&&track.panX===pan);
      if(oracle.se1.songHeader!==probe.songHeaders.SE_M_BATON_PASS||!audible) failures.push(`age ${age}: audio/pan`);
    }
    const engine:EngineState={...createInitialState(),rngMode:"frontierBattle",sceneOnPresentation:{...stage,age}};
    const diff=framebufferDiff(render(engine),rgb); if(diff===0)framebuffers++; else failures.push(`age ${age}: framebuffer ${diff}px`);
    if(failures.length===before)components++;
  }
  const evidenceDigest=evidence.digest("hex"), rawDigest=raw.digest("hex");
  console.log(`${fixture.orientation}: component ${components}/53 framebuffer ${framebuffers}/53 evidence ${evidenceDigest} raw ${rawDigest}`);
  if(fixture.evidenceSha256&&fixture.evidenceSha256!==evidenceDigest)failures.push("evidence digest");
  if(fixture.rawRgbSha256&&fixture.rawRgbSha256!==rawDigest)failures.push("raw digest");
  const changeMap=normalizedChangeMap(fixture,rgbDir);
  if(changeMap!==readFileSync(resolve(fixture.changeMap),"utf8")||sha(changeMap)!==fixture.changeMapSha256)failures.push("regenerated change map");
  if(fixture.acceptance.status!=="exact"||fixture.acceptance.componentMatching!==53||fixture.acceptance.framebufferMatching!==53)failures.push("fixture acceptance");
  if(failures.length){console.error(failures.slice(0,120).join("\n"));process.exitCode=1;}
}
for(const path of paths)verify(path);
