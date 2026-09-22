/** Pure source-relative Scene-ON reducer for MOVE_SUPERPOWER. */
import { decodeGbaHardwareOam, type GbaHardwareOamObject } from "./gbaObjCompositor.ts";

export type SuperpowerSide = "player" | "opponent";
export type SuperpowerMatrix = readonly [number, number, number, number];
export type SuperpowerOam = readonly [number, number, number];
export interface SuperpowerArt { readonly displaySpecies:string; readonly slot:number;
  readonly attr:SuperpowerOam; readonly subpriority:number; }
export interface SuperpowerSprite { readonly slot:number; readonly template:string; readonly callback:string;
  readonly x:number; readonly y:number; readonly x2:number; readonly y2:number; readonly animation:number;
  readonly attr:SuperpowerOam; readonly matrix:SuperpowerMatrix; readonly data:readonly number[];
  readonly subpriority:number; readonly invisible:boolean; }
export interface SuperpowerLiveInputs {
  readonly attackerSide:SuperpowerSide; readonly targetSide:SuperpowerSide;
  readonly attackerSpecies:string; readonly targetSpecies:string;
  readonly attackerCenter:Readonly<{x:number;y:number}>; readonly targetCenter:Readonly<{x:number;y:number}>;
  readonly attackerArt:SuperpowerArt; readonly targetArt:SuperpowerArt;
  readonly ownedSprites:readonly SuperpowerSprite[];
  readonly liveTasks:readonly Readonly<{slot:number;callback:string;data:readonly number[]}>[];
  readonly buffers:Readonly<{softwareOam:readonly unknown[];hardwareOam:readonly unknown[];
    softwareMatrices:readonly SuperpowerMatrix[];hardwareMatrices:readonly SuperpowerMatrix[]}>;
  readonly palette:Readonly<{unfaded:readonly number[];faded:readonly number[];hardware:readonly number[]}>;
  readonly registers:Readonly<Record<string,number>>;
  readonly background:Readonly<{battleVram:unknown;currentVram:unknown;monbgPaletteBank:number}>;
  readonly resources:Readonly<{orbTileBase:number;meteorTileBase:number;rockTileBase:number;
    orbPaletteBank:number;meteorPaletteBank:number;rockPaletteBank:number;
    orbLoaded:boolean;meteorLoaded:boolean;rockLoaded:boolean;allocator:unknown}>;
  readonly spriteOrder:readonly number[]; readonly audio:unknown;
  readonly liveCounts:Readonly<{visualTasks:number;soundTasks:number;matrixBitmap:number}>;
  readonly animationRng:number; readonly gameplayRng:unknown; readonly gameplayState:unknown;
}
export interface SuperpowerSourceCursor { readonly owner:"Move_SUPERPOWER"; readonly pointer:number;
  readonly offset:number; readonly active:boolean; }
export interface SuperpowerState {
  readonly age:number; readonly active:boolean; readonly source:SuperpowerSourceCursor;
  readonly battlers:Readonly<{attacker:Readonly<{side:SuperpowerSide;species:string;center:Readonly<{x:number;y:number}>;art:SuperpowerArt}>;
    target:Readonly<{side:SuperpowerSide;species:string;center:Readonly<{x:number;y:number}>;art:SuperpowerArt}>}>;
  readonly sprites:readonly SuperpowerSprite[];
  readonly tasks:SuperpowerLiveInputs["liveTasks"];
  readonly monbg:Readonly<{active:boolean;clearing:boolean;selected:"bg1"|"bg2";paletteBank:number}>;
  readonly fieldShake:Readonly<{active:boolean;softwareStartsAt:36;hardwareStartsAt:37;vofs:number}>;
  readonly alpha:Readonly<{active:boolean;eva:number;evb:number}>;
  readonly buffers:SuperpowerLiveInputs["buffers"]; readonly palette:SuperpowerLiveInputs["palette"];
  readonly registers:SuperpowerLiveInputs["registers"]; readonly background:SuperpowerLiveInputs["background"];
  readonly resources:SuperpowerLiveInputs["resources"]; readonly spriteOrder:readonly number[]; readonly audio:unknown;
  readonly rng:Readonly<{animation:number;gameplay:unknown;gameplayUnchanged:true}>; readonly gameplay:unknown;
  readonly cleanup:Readonly<{firstInactive:boolean;visualTasks:number;soundTasks:number;matrixBitmap:number;ownedSprites:number}>;
}
export interface SuperpowerDisplayPlan {
  readonly attacker:GbaHardwareOamObject<SuperpowerMatrix>|null;
  readonly target:GbaHardwareOamObject<SuperpowerMatrix>|null;
  readonly orbs:readonly GbaHardwareOamObject<SuperpowerMatrix>[];
  readonly rocks:readonly GbaHardwareOamObject<SuperpowerMatrix>[];
  readonly meteors:readonly GbaHardwareOamObject<SuperpowerMatrix>[];
}
export const SUPERPOWER_ROOT=0x082cdfa3;
const POINTER_OFFSETS=[0,3,6,9,11,31,59,76,93,110,127,144,159,180,186] as const;
const AGE_EDGES=[0,1,4,7,10,13,35,77,87,97,107,117,193,211,242] as const;
const IDENTITY:SuperpowerMatrix=[256,0,0,256];

export function superpowerSourceAtAge(age:number):SuperpowerSourceCursor {
  if(!Number.isInteger(age)||age<0)throw new Error(`invalid Superpower age ${age}`);
  let edge=0;for(let i=0;i<AGE_EDGES.length;i+=1)if(age>=AGE_EDGES[i]!)edge=i;
  return {owner:"Move_SUPERPOWER",pointer:SUPERPOWER_ROOT+POINTER_OFFSETS[edge]!,
    offset:POINTER_OFFSETS[edge]!,active:age<247};
}

export function superpowerAtAge(age:number,input:Readonly<SuperpowerLiveInputs>):SuperpowerState {
  if(input.attackerSide===input.targetSide)throw new Error("Superpower requires opposite sides");
  const source=superpowerSourceAtAge(age),alpha=input.registers.bldalpha??0;
  return {age,active:source.active,source,
    battlers:{attacker:{side:input.attackerSide,species:input.attackerSpecies,center:input.attackerCenter,art:input.attackerArt},
      target:{side:input.targetSide,species:input.targetSpecies,center:input.targetCenter,art:input.targetArt}},
    sprites:input.ownedSprites,tasks:input.liveTasks,
    monbg:{active:age>=(input.attackerSide==="player"?10:11)&&age<=245,clearing:age>=242&&age<=245,
      selected:input.attackerSide==="player"?"bg2":"bg1",paletteBank:input.background.monbgPaletteBank},
    fieldShake:{active:age>=37&&age<=214,softwareStartsAt:36,hardwareStartsAt:37,vofs:input.registers.bg3vofs??0},
    alpha:{active:(input.registers.bldcnt??0)!==0,eva:alpha&0xff,evb:alpha>>>8&0xff},
    buffers:input.buffers,palette:input.palette,registers:input.registers,background:input.background,
    resources:input.resources,spriteOrder:input.spriteOrder,audio:input.audio,
    rng:{animation:input.animationRng,gameplay:input.gameplayRng,gameplayUnchanged:true},gameplay:input.gameplayState,
    cleanup:{firstInactive:age===247,visualTasks:input.liveCounts.visualTasks,soundTasks:input.liveCounts.soundTasks,
      matrixBitmap:input.liveCounts.matrixBitmap,ownedSprites:input.ownedSprites.length}};
}

export function superpowerDisplayPlan(state:Readonly<SuperpowerState>):SuperpowerDisplayPlan {
  const objects=decodeGbaHardwareOam(state.buffers.hardwareOam,state.buffers.hardwareMatrices,IDENTITY);
  const tile=(object:GbaHardwareOamObject<SuperpowerMatrix>)=>object.attr[2]&0x3ff;
  const range=(value:number,base:number,length:number)=>value>=base&&value<base+length;
  const find=(art:SuperpowerArt)=>objects.find(object=>object.attr[2]===art.attr[2])??null;
  return {attacker:find(state.battlers.attacker.art),target:find(state.battlers.target.art),
    orbs:objects.filter(object=>range(tile(object),state.resources.orbTileBase,64)),
    rocks:objects.filter(object=>range(tile(object),state.resources.rockTileBase,20)),
    meteors:objects.filter(object=>range(tile(object),state.resources.meteorTileBase,64))};
}
