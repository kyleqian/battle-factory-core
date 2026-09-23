/** Diagnose entire source-owned Shadow Punch bodies with persistent palette input.
 * The source supplies only static legal field state, semantic start/finish and RGB;
 * all palette history and animation-body frames are computed by production code.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import species from "../../src/data/gen/species-stats.json" with { type: "json" };
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { createLiveMovePaletteHost, prepareLiveMovePalette } from "../../src/engine/liveMoveAnimationPalette.ts";
import { shadowPunchLiveBackgroundBldy } from "../../src/animation/shadowPunchFadeHost.ts";
import { liveView, type Fixture } from "./liveAdapterFramebuffer.ts";
import { createScratchDir } from "../lib/scratch.ts";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
const vendor=dirname(realpathSync(join(root,"reference/pokeemerald")));
const hash=(bytes:Uint8Array|string)=>createHash("sha256").update(bytes).digest("hex");
interface SourceEvent {kind:"battle-main"|"update-fade"|"run-tasks"|"transfer-palette";vcount:number;pcmDmaCounter:number;pcmDmaPeriod:number;c15:number;}
interface Row {frame:number;sha256:string;scriptActive:boolean;bldcnt:number;bldy:number;controllerFlags:number;intervalEvents:SourceEvent[];}
interface Mon {species:number;hp:number;maxHp:number;}
interface Window {moveId:number;attacker:0|1;target:0|1;initial:{battlers:{player:Mon;opponent:Mon}};rows:Row[];}
const receipts=[];
for(const attacker of [0,1] as const) {
 const scenario="tools/integration/fixtures/shadow-after-smoke-palette-history"+(attacker===1?"-opponent":"")+".json";
 let priorDigest:string|undefined;
 for(let freshRun=0;freshRun<2;freshRun++) {
  const scratch=createScratchDir("pokebench-palette-framebuffer-"),output=join(scratch,"source.json"),rgbDir=join(scratch,"rgb");
  const probe=spawnSync("python3",[join(root,"tools/run-mgba-probe.py"),output,"--",join(vendor,"mgba-venv/bin/python"),join(root,"tools/integration/livePaletteFramebufferProbe.py"),join(root,scenario),output,rgbDir],{cwd:root,encoding:"utf8"});
  assert.equal(probe.status,0,probe.stdout+probe.stderr);
  const bytes=readFileSync(output),source=JSON.parse(bytes.toString("utf8")) as {windows:Window[]};
  const digest=hash(bytes);
  if(priorDigest)assert.equal(digest,priorDigest,"fresh source windows agree");
  priorDigest=digest;
  assert.deepEqual(source.windows.map(w=>w.moveId),[325,108,325,108]);
  let host=createLiveMovePaletteHost();
  const bodies=[];
  for(const [index,w]of source.windows.entries()) {
   const names=Object.fromEntries((["player","opponent"] as const).map(side=>[side,species.species.find(x=>x.id===w.initial.battlers[side].species)!.name.replace("SPECIES_","")]));
   const side=w.attacker===0?"player":"opponent",other=w.attacker===0?"opponent":"player";
   const fixture:Fixture={move:w.moveId===325?"SHADOW_PUNCH":"SMOKESCREEN",probe:"",scenario,attacker:{species:names[side]!,geometry:{side}},target:{species:names[other]!,geometry:{side:other}},fieldProfile:{playerHp:w.initial.battlers.player.hp,playerMaxHp:w.initial.battlers.player.maxHp,opponentHp:w.initial.battlers.opponent.hp,opponentMaxHp:w.initial.battlers.opponent.maxHp,playerGender:"male",opponentGender:"male"}};
   const initial=liveView(fixture,0);
   assert(initial.effect?.type==="move");
   const prepared=prepareLiveMovePalette(host,initial.effect.request);host=prepared.next;
   if(w.moveId!==325)continue;
   // The existing Shadow Punch reducer's source contract begins at the first
   // nonzero BLDCNT write (Task_FadeToBg), not at script resource loading.
   const first=w.rows.findIndex(r=>r.bldcnt!==0);
   assert(first>=0);
   assert(!w.rows.at(-1)!.scriptActive);
   assert.equal(w.rows.at(-1)!.controllerFlags & (1<<w.attacker),0);
   const comparisons=[];
   for(const [age,row]of w.rows.slice(first).entries()) {
    const rgb=readFileSync(join(rgbDir,String(row.frame).padStart(5,"0")+".rgb"));
    assert.equal(hash(rgb),row.sha256);
    const rgba=new Uint8Array(240*160*4),control=new Uint8Array(rgba.length),view=liveView(fixture,age);
    assert(view.effect?.type==="move");
    renderBattleResolutionLiveView(rgba,{...view,effect:{...view.effect,paletteInput:prepared.input}});
    renderBattleResolutionLiveView(control,view);
    let residualPixels=0,withoutHistoryPixels=0,chromePixels=0;
    for(let p=0;p<240*160;p++) {
     if(rgb[p*3]!==rgba[p*4]||rgb[p*3+1]!==rgba[p*4+1]||rgb[p*3+2]!==rgba[p*4+2]){residualPixels++;if(p>=240*112)chromePixels++;}
     if(rgb[p*3]!==control[p*4]||rgb[p*3+1]!==control[p*4+1]||rgb[p*3+2]!==control[p*4+2])withoutHistoryPixels++;
    }
    comparisons.push({age,frame:row.frame,residualPixels,withoutHistoryPixels,chromePixels,sourceBldy:row.bldy,productionBldy:shadowPunchLiveBackgroundBldy(age),mainCallbackRan:row.intervalEvents.some(e=>e.kind==="battle-main"),source:row.sha256,live:hash(rgba)});
   }
   writeFileSync(join(scratch,"comparison-"+index+".json"),JSON.stringify(comparisons,null,2)+"\n");
   const residuals=comparisons.filter(r=>r.residualPixels>0);
   const missedRestoreSetupCallbackAges=comparisons.filter(r=>r.age>=80&&r.age<=83&&!r.mainCallbackRan).map(r=>r.age);
   bodies.push({index,frames:comparisons.length,sourceStart:comparisons[0]!.frame,sourceEnd:comparisons.at(-1)!.frame,exactFrames:comparisons.filter(r=>r.residualPixels===0).length,residualPixels:comparisons.reduce((a,r)=>a+r.residualPixels,0),withoutHistoryPixels:comparisons.reduce((a,r)=>a+r.withoutHistoryPixels,0),missedRestoreSetupCallbackAges,digest:hash(JSON.stringify(comparisons)),firstResiduals:residuals.slice(0,3)});
  }
  if(freshRun===1) {
   const firstRun=receipts.find(r=>r.attacker===attacker && r.freshRun===0);
   assert(firstRun);
   assert.deepEqual(bodies,firstRun.bodies,"fresh production comparisons agree");
  }
  receipts.push({scenario,attacker,freshRun,sourceDigest:digest,bodies});
  console.log(JSON.stringify({attacker,freshRun,bodies:bodies.map(b=>({frames:b.frames,residualPixels:b.residualPixels,withoutHistoryPixels:b.withoutHistoryPixels}))}));
 }
}
const exact=receipts.every(r=>r.bodies.every(b=>b.residualPixels===0));
writeFileSync(join(root,"tools/integration/fixtures/live-palette-framebuffer-diagnosis.json"),JSON.stringify({schema:"live-palette-framebuffer-diagnosis/v1",verdict:exact?"exact":"partial",claim:"Complete source-owned Shadow Punch fade/body/controller-cleanup windows; excludes script resource preload and subsequent hit/HP presentation. Remaining framebuffer residuals are retained, not discarded.",receipts},null,2)+"\n");
if(!exact)process.exitCode=1;
