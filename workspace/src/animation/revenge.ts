/** Pure source-relative Scene-ON reducer for MOVE_REVENGE. */
import { decodeGbaHardwareOam, type GbaHardwareOamObject } from "./gbaObjCompositor.ts";

export type RevengeSide = "player" | "opponent";
export type RevengeMatrix = readonly [number, number, number, number];
export type RevengeOam = readonly [number, number, number];
export interface RevengeArt { readonly displaySpecies:string; readonly slot:number;
  readonly attr:RevengeOam; readonly subpriority:number; }
export interface RevengeSprite { readonly slot:number; readonly template:string; readonly callback:string;
  readonly x:number; readonly y:number; readonly x2:number; readonly y2:number; readonly animation:number;
  readonly attr:RevengeOam; readonly matrix:RevengeMatrix; readonly data:readonly number[];
  readonly subpriority:number; readonly invisible:boolean; }
export interface RevengeLiveInputs {
  readonly attackerSide:RevengeSide; readonly targetSide:RevengeSide;
  readonly attackerSpecies:string; readonly targetSpecies:string;
  readonly attackerCenter:Readonly<{x:number;y:number}>; readonly targetCenter:Readonly<{x:number;y:number}>;
  readonly attackerArt:RevengeArt; readonly targetArt:RevengeArt;
  readonly ownedSprites:readonly RevengeSprite[];
  readonly liveTasks:readonly Readonly<{slot:number;callback:string;data:readonly number[]}>[];
  readonly buffers:Readonly<{softwareOam:readonly unknown[];hardwareOam:readonly unknown[];
    softwareMatrices:readonly RevengeMatrix[];hardwareMatrices:readonly RevengeMatrix[]}>;
  readonly palette:Readonly<{unfaded:readonly number[];faded:readonly number[];hardware:readonly number[]}>;
  readonly registers:Readonly<Record<string,number>>;
  readonly background:Readonly<{battleVram:unknown;currentVram:unknown;monbgPaletteBank:number;
    selected:"bg1"|"bg2";scroll:Readonly<{x:number;y:number}>}>;
  readonly resources:Readonly<{scratchTileBase:number;swipeTileBase:number;impactTileBase:number;
    scratchLoaded:boolean;swipeLoaded:boolean;impactLoaded:boolean;allocator:unknown}>;
  readonly spriteOrder:readonly number[]; readonly audio:unknown;
  readonly liveCounts:Readonly<{visualTasks:number;soundTasks:number;matrixBitmap:number}>;
  readonly animationRng:number; readonly gameplayRng:unknown; readonly gameplayState:unknown;
}
export interface RevengeSourceCursor { readonly owner:"Move_REVENGE"; readonly pointer:number;
  readonly offset:number; readonly active:boolean; }
export interface RevengeState {
  readonly age:number; readonly active:boolean; readonly source:RevengeSourceCursor;
  readonly battlers:Readonly<{attacker:Readonly<{side:RevengeSide;species:string;center:Readonly<{x:number;y:number}>;art:RevengeArt}>;
    target:Readonly<{side:RevengeSide;species:string;center:Readonly<{x:number;y:number}>;art:RevengeArt}>}>;
  readonly sprites:readonly RevengeSprite[]; readonly tasks:RevengeLiveInputs["liveTasks"];
  readonly monbg:Readonly<{active:boolean;clearing:boolean;selected:"bg1"|"bg2";paletteBank:number;scroll:Readonly<{x:number;y:number}>}>;
  readonly alpha:Readonly<{active:boolean;eva:number;evb:number}>;
  readonly buffers:RevengeLiveInputs["buffers"]; readonly palette:RevengeLiveInputs["palette"];
  readonly registers:RevengeLiveInputs["registers"]; readonly background:RevengeLiveInputs["background"];
  readonly resources:RevengeLiveInputs["resources"]; readonly spriteOrder:readonly number[]; readonly audio:unknown;
  readonly rng:Readonly<{animation:number;gameplay:unknown;gameplayUnchanged:true}>; readonly gameplay:unknown;
  readonly cleanup:Readonly<{firstInactive:boolean;visualTasks:number;soundTasks:number;matrixBitmap:number;ownedSprites:number}>;
}
export interface RevengeDisplayPlan { readonly attacker:GbaHardwareOamObject<RevengeMatrix>|null;
  readonly target:GbaHardwareOamObject<RevengeMatrix>|null;
  readonly scratches:readonly GbaHardwareOamObject<RevengeMatrix>[];
  readonly swipes:readonly GbaHardwareOamObject<RevengeMatrix>[];
  readonly impacts:readonly GbaHardwareOamObject<RevengeMatrix>[]; }

export const REVENGE_ROOT=0x082d5731;
const EDGES=[0,1,4,7,21,73,76,82,96,99,109,128] as const;
const OFFSETS=[0,3,5,23,43,50,63,78,85,125,146,150] as const;
const IDENTITY:RevengeMatrix=[256,0,0,256];
export function revengeSourceAtAge(age:number):RevengeSourceCursor{
  if(!Number.isInteger(age)||age<0)throw new Error(`invalid Revenge age ${age}`);
  let edge=0;for(let i=0;i<EDGES.length;i+=1)if(age>=EDGES[i]!)edge=i;
  return{owner:"Move_REVENGE",pointer:REVENGE_ROOT+OFFSETS[edge]!,offset:OFFSETS[edge]!,active:age<144};
}
export function revengeAtAge(age:number,input:Readonly<RevengeLiveInputs>):RevengeState{
  if(input.attackerSide===input.targetSide)throw new Error("Revenge requires opposite sides");
  const source=revengeSourceAtAge(age),alpha=input.registers.bldalpha??0;
  return{age,active:source.active,source,
    battlers:{attacker:{side:input.attackerSide,species:input.attackerSpecies,center:input.attackerCenter,art:input.attackerArt},
      target:{side:input.targetSide,species:input.targetSpecies,center:input.targetCenter,art:input.targetArt}},
    sprites:input.ownedSprites,tasks:input.liveTasks,
    monbg:{active:age>=4&&age<=130,clearing:age>=128&&age<=130,selected:input.background.selected,
      paletteBank:input.background.monbgPaletteBank,scroll:input.background.scroll},
    alpha:{active:(input.registers.bldcnt??0)!==0,eva:alpha&0x1f,evb:alpha>>>8&0x1f},
    buffers:input.buffers,palette:input.palette,registers:input.registers,background:input.background,
    resources:input.resources,spriteOrder:input.spriteOrder,audio:input.audio,
    rng:{animation:input.animationRng,gameplay:input.gameplayRng,gameplayUnchanged:true},gameplay:input.gameplayState,
    cleanup:{firstInactive:age===144,visualTasks:input.liveCounts.visualTasks,soundTasks:input.liveCounts.soundTasks,
      matrixBitmap:input.liveCounts.matrixBitmap,ownedSprites:input.ownedSprites.length}};
}
export function revengeDisplayPlan(state:Readonly<RevengeState>):RevengeDisplayPlan{
  const objects=decodeGbaHardwareOam(state.buffers.hardwareOam,state.buffers.hardwareMatrices,IDENTITY);
  const tile=(object:GbaHardwareOamObject<RevengeMatrix>)=>object.attr[2]&0x3ff;
  const find=(art:RevengeArt)=>objects.find(object=>object.attr[2]===art.attr[2])??null;
  return{attacker:find(state.battlers.attacker.art),target:find(state.battlers.target.art),
    scratches:state.resources.scratchLoaded?objects.filter(object=>tile(object)>=state.resources.scratchTileBase&&tile(object)<state.resources.scratchTileBase+48):[],
    swipes:state.resources.swipeLoaded?objects.filter(object=>tile(object)>=state.resources.swipeTileBase&&tile(object)<state.resources.swipeTileBase+128):[],
    impacts:state.resources.impactLoaded?objects.filter(object=>tile(object)>=state.resources.impactTileBase&&tile(object)<state.resources.impactTileBase+16):[]};
}
