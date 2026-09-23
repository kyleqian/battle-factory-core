/** Source-relative Scene-ON reducer for the battle body of MOVE_MEGAHORN. */
import { decodeGbaHardwareOam, type GbaHardwareOamObject } from "./gbaObjCompositor.ts";

export type MegaHornSide = "player" | "opponent";
export type MegaHornMatrix = readonly [number, number, number, number];
export type MegaHornOam = readonly [number, number, number];
export interface MegaHornArt { readonly displaySpecies: string; readonly slot: number;
  readonly attr: MegaHornOam; readonly subpriority: number; }
export interface MegaHornLiveInputs {
  readonly attackerSide: MegaHornSide; readonly targetSide: MegaHornSide;
  readonly attackerSpecies: string; readonly targetSpecies: string;
  readonly attackerCenter: Readonly<{x:number;y:number}>; readonly targetCenter: Readonly<{x:number;y:number}>;
  readonly attackerArt: MegaHornArt; readonly targetArt: MegaHornArt;
  readonly liveTasks: readonly Readonly<{slot:number;callback:string;data:readonly number[]}>[];
  readonly buffers: Readonly<{softwareOam:readonly unknown[];hardwareOam:readonly unknown[];
    softwareMatrices:readonly MegaHornMatrix[];hardwareMatrices:readonly MegaHornMatrix[]}>;
  readonly palette: Readonly<{unfaded:readonly number[];faded:readonly number[];hardware:readonly number[]}>;
  readonly registers: Readonly<Record<string,number>>;
  readonly background: Readonly<{battleVram:unknown;currentVram:unknown;monbgPaletteBank:number}>;
  readonly resources: Readonly<{hornTileBase:number;impactTileBase:number;hornPaletteBank:number;
    impactPaletteBank:number;hornLoaded:boolean;impactLoaded:boolean;allocator:unknown}>;
  readonly spriteOrder:readonly number[]; readonly audio:unknown;
  readonly liveCounts:Readonly<{visualTasks:number;soundTasks:number;matrixBitmap:number}>;
  readonly animationRng:number; readonly gameplayRng:unknown; readonly gameplayState:unknown;
}
export interface MegaHornState {
  readonly age:number; readonly active:boolean;
  readonly source:Readonly<{owner:"Move_MEGAHORN";pointer:number;offset:number;branch:"battle";
    background:"BG_DRILL";scroll:readonly[-2304,768,1,-1];join:"MegahornContinue"}>;
  readonly contest:Readonly<{dormantInBattle:true;entry:"MegahornInContest";background:"BG_DRILL_CONTESTS";
    scroll:readonly[2304,768,0,-1];join:"MegahornContinue"}>;
  readonly battlers:Readonly<{attacker:Readonly<{side:MegaHornSide;species:string;center:Readonly<{x:number;y:number}>;art:MegaHornArt}>;
    target:Readonly<{side:MegaHornSide;species:string;center:Readonly<{x:number;y:number}>;art:MegaHornArt}>}>;
  readonly horn:Readonly<{active:boolean;startAge:94;endAge:100;args:readonly[-42,25,0,0,6];
    affineRotations:readonly[30,-99,94]}>;
  readonly monbg:Readonly<{active:boolean;clearing:boolean;selected:"bg1"|"bg2";paletteBank:number}>;
  readonly tasks:MegaHornLiveInputs["liveTasks"]; readonly buffers:MegaHornLiveInputs["buffers"];
  readonly palette:MegaHornLiveInputs["palette"]; readonly registers:MegaHornLiveInputs["registers"];
  readonly background:MegaHornLiveInputs["background"]; readonly resources:MegaHornLiveInputs["resources"];
  readonly spriteOrder:readonly number[]; readonly audio:unknown;
  readonly rng:Readonly<{animation:number;gameplay:unknown;gameplayUnchanged:true}>; readonly gameplay:unknown;
  readonly cleanup:Readonly<{firstInactive:boolean;visualTasks:number;soundTasks:number;matrixBitmap:number}>;
}
export interface MegaHornDisplayPlan {
  readonly attacker:GbaHardwareOamObject<MegaHornMatrix>; readonly target:GbaHardwareOamObject<MegaHornMatrix>|null;
  readonly horns:readonly GbaHardwareOamObject<MegaHornMatrix>[]; readonly impacts:readonly GbaHardwareOamObject<MegaHornMatrix>[];
}
export const MEGAHORN_ROOT=0x082d1924;
const IDENTITY:MegaHornMatrix=[256,0,0,256];
const POINTER_EDGES=([0,3,6,8,19,35,56,59,78,97,133,174,189,202,207,212,213] as const);
const AGE_EDGES=([0,1,4,7,10,29,48,77,89,94,100,110,122,127,135,156] as const);

export function megaHornSourceAtAge(age:number,side:MegaHornSide):MegaHornState["source"]{
  if(!Number.isInteger(age)||age<0)throw new Error(`invalid Megahorn age ${age}`);
  let edge=0;for(let i=0;i<AGE_EDGES.length;i+=1)if(age>=AGE_EDGES[i]!)edge=i;
  const offset=age>=(side==="player"?176:175)?213:POINTER_EDGES[edge]!;
  return {owner:"Move_MEGAHORN",pointer:MEGAHORN_ROOT+offset,offset,
    branch:"battle",background:"BG_DRILL",scroll:[-2304,768,1,-1],join:"MegahornContinue"};
}
export function megaHornAtAge(age:number,input:Readonly<MegaHornLiveInputs>):MegaHornState{
  if(input.attackerSide===input.targetSide)throw new Error("Megahorn requires opposite sides");
  const cleanup=input.attackerSide==="player"?176:175;
  return {age,active:age<cleanup,source:megaHornSourceAtAge(age,input.attackerSide),
    contest:{dormantInBattle:true,entry:"MegahornInContest",background:"BG_DRILL_CONTESTS",
      scroll:[2304,768,0,-1],join:"MegahornContinue"},
    battlers:{attacker:{side:input.attackerSide,species:input.attackerSpecies,center:input.attackerCenter,art:input.attackerArt},
      target:{side:input.targetSide,species:input.targetSpecies,center:input.targetCenter,art:input.targetArt}},
    horn:{active:age>=94&&age<=100,startAge:94,endAge:100,args:[-42,25,0,0,6],affineRotations:[30,-99,94]},
    monbg:{active:age>=7&&age<=135,clearing:age>=135&&age<=138,
      selected:input.targetSide==="opponent"?"bg1":"bg2",paletteBank:input.background.monbgPaletteBank},
    tasks:input.liveTasks,buffers:input.buffers,palette:input.palette,registers:input.registers,
    background:input.background,resources:input.resources,spriteOrder:input.spriteOrder,audio:input.audio,
    rng:{animation:input.animationRng,gameplay:input.gameplayRng,gameplayUnchanged:true},gameplay:input.gameplayState,
    cleanup:{firstInactive:age===cleanup,visualTasks:input.liveCounts.visualTasks,
      soundTasks:input.liveCounts.soundTasks,matrixBitmap:input.liveCounts.matrixBitmap}};
}
export function megaHornDisplayPlan(state:Readonly<MegaHornState>):MegaHornDisplayPlan{
  const objects=decodeGbaHardwareOam(state.buffers.hardwareOam,state.buffers.hardwareMatrices,IDENTITY);
  const tile=(o:GbaHardwareOamObject<MegaHornMatrix>)=>o.attr[2]&0x3ff;
  const range=(v:number,b:number,n:number)=>v>=b&&v<b+n;
  const horns=objects.filter(o=>range(tile(o),state.resources.hornTileBase,8));
  const impacts=objects.filter(o=>range(tile(o),state.resources.impactTileBase,16));
  const battler=(art:MegaHornArt)=>objects.find(o=>o.attr[2]===art.attr[2])??null;
  const attacker=battler(state.battlers.attacker.art);if(!attacker)throw new Error("missing Megahorn attacker hardware OAM");
  return {attacker,target:battler(state.battlers.target.art),horns,impacts};
}
