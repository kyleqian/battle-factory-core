/** Dense bilateral component and typed-seam verifier for MOVE_SUPERPOWER. */
import{createHash}from"node:crypto";import{readFileSync}from"node:fs";import{resolve}from"node:path";import{gunzipSync}from"node:zlib";
import{superpowerAtAge,type SuperpowerLiveInputs,type SuperpowerSprite}from"../../src/animation/superpower.ts";
import{sceneOnSuperpowerView,type SceneOnSuperpowerConfig}from"../../src/animation/sceneOnPresentation.ts";
type Json=Record<string,any>;export type SuperpowerWindow="player-back"|"opponent-front";const root=resolve(import.meta.dirname,"../..");
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);function invariant(v:unknown,m:string):asserts v{if(!v)throw new Error(`MOVE_SUPERPOWER reducer drift: ${m}`);}
const OWNED=new Set(["gSuperpowerOrbSpriteTemplate","gSuperpowerRockSpriteTemplate","gSuperpowerFireballSpriteTemplate"]);
export function superpowerRowsFor(window:SuperpowerWindow):Json[]{const stem=window==="player-back"?"player":"opponent";return JSON.parse(gunzipSync(readFileSync(resolve(root,`tools/compare/evidence/superpower-${stem}-dense-state.json.gz`))).toString()).frames;}
const art=(sprite:Json,name:string)=>({displaySpecies:name,slot:sprite.slot,attr:sprite.attr,subpriority:sprite.subpriority});
const semantic=(sprite:Json):SuperpowerSprite=>({slot:sprite.slot,template:sprite.template.symbol,callback:sprite.callback.symbol,
 x:sprite.x,y:sprite.y,x2:sprite.x2,y2:sprite.y2,animation:sprite.animNum,attr:sprite.attr,matrix:sprite.matrix,
 data:sprite.data,subpriority:sprite.subpriority,invisible:sprite.invisible});
export function superpowerInputsFor(window:SuperpowerWindow,rows=superpowerRowsFor(window),age=0):SuperpowerLiveInputs{
 const row=rows[age]!,attackerSide=window==="player-back"?"player":"opponent",targetSide=attackerSide==="player"?"opponent":"player",A=row.resourceAllocators;
 const names=window==="player-back"?{attacker:"NIDOQUEEN",target:"SHUCKLE",attackerDisplay:"NIDOQUEEN",targetDisplay:"SHUCKLE"}:
  // MechanicLab replaces the legal battler data with REGISTEEL after the
  // already-created opponent presentation sprite/name remains SEVIPER.
  {attacker:"REGISTEEL",target:"SHUCKLE",attackerDisplay:"SEVIPER",targetDisplay:"SHUCKLE"};
 const tile=(tag:number,fallback:number)=>{const i=A.tileTags.slice(0,64).indexOf(tag);return i<0?fallback:A.tileRanges[i][0]};
 const pal=(tag:number,fallback:number)=>{const i=A.paletteTags.indexOf(tag);return i<0?fallback:i+16};
 return{attackerSide,targetSide,attackerSpecies:names.attacker,targetSpecies:names.target,
  attackerCenter:{x:row.battlerSprites.attacker.x,y:row.battlerSprites.attacker.y},targetCenter:{x:row.battlerSprites.target.x,y:row.battlerSprites.target.y},
  attackerArt:art(row.battlerSprites.attacker,names.attackerDisplay),targetArt:art(row.battlerSprites.target,names.targetDisplay),
  ownedSprites:row.sprites.filter((sprite:Json)=>OWNED.has(sprite.template?.symbol)).map(semantic),
  liveTasks:row.tasks.map((task:Json)=>({slot:task.slot,callback:task.func.symbol,data:task.data})),
  buffers:{softwareOam:row.softwareOam,hardwareOam:row.hardwareOam,softwareMatrices:row.softwareMatrices,hardwareMatrices:row.hardwareMatrices},
  palette:{unfaded:row.unfadedPalette,faded:row.fadedPalette,hardware:row.hardwarePalette},registers:row.registers,
  background:{battleVram:rows[0]!.bgVram,currentVram:row.bgVram,monbgPaletteBank:attackerSide==="player"?9:8},
  resources:{orbTileBase:tile(10212,305),meteorTileBase:tile(10256,537),rockTileBase:tile(10257,433),
   orbPaletteBank:pal(10212,23),meteorPaletteBank:pal(10256,24),rockPaletteBank:pal(10257,25),
   orbLoaded:row.tileTags.includes(10212),meteorLoaded:row.tileTags.includes(10256),rockLoaded:row.tileTags.includes(10257),allocator:A},
  spriteOrder:row.spriteOrder,audio:row.audio,liveCounts:{visualTasks:row.visualTaskCount,soundTasks:row.soundTaskCount,matrixBitmap:A.matrixBitmap},
  animationRng:row.animationRng,gameplayRng:row.rawBattleState.gameplayRng,gameplayState:row.immutableState};}
export function superpowerConfigFor(window:SuperpowerWindow,rows=superpowerRowsFor(window),age=0):SceneOnSuperpowerConfig{const input=superpowerInputsFor(window,rows,age),{attackerSide,targetSide,attackerSpecies,targetSpecies,attackerCenter,targetCenter,...animationInputs}=input,row=rows[age]!,player=row.parties.player[0],opponent=row.parties.opponent[0];
 return{move:"SUPERPOWER",attacker:{species:attackerSpecies as never,geometry:{side:attackerSide,spriteCorner:{x:row.battlerSprites.attacker.x-32,y:row.battlerSprites.attacker.y-32},animationCenter:attackerCenter,battlePositionCenter:attackerCenter}},target:{species:targetSpecies as never,geometry:{side:targetSide,spriteCorner:{x:row.battlerSprites.target.x-32,y:row.battlerSprites.target.y-32},animationCenter:targetCenter,battlePositionCenter:targetCenter}},fieldProfile:{playerHp:player.hp,playerMaxHp:player.maxHp,opponentHp:opponent.hp,opponentMaxHp:opponent.maxHp,playerGender:player.gender,opponentGender:opponent.gender},animationInputs};}
export function verifySuperpowerReducer(){const result:Json={};for(const window of["player-back","opponent-front"]as const){const rows=superpowerRowsFor(window),hashes:string[]=[];invariant(rows.length===248&&!rows[247]!.animScriptActive,`${window}: complete corpus`);for(let pass=0;pass<2;pass++){const hash=createHash("sha256");for(const[age,row]of rows.entries()){const state=superpowerAtAge(age,superpowerInputsFor(window,rows,age));invariant(state.source.pointer===row.scriptPtr&&state.active===row.animScriptActive,`${window}/${age}: source cursor`);invariant(same(state.sprites,row.sprites.filter((s:Json)=>OWNED.has(s.template?.symbol)).map(semantic)),`${window}/${age}: owned sprites`);invariant(same(state.buffers.hardwareOam,row.hardwareOam)&&same(state.buffers.hardwareMatrices,row.hardwareMatrices)&&same(state.palette.hardware,row.hardwarePalette),`${window}/${age}: hardware buffers`);invariant(same(state.registers,row.registers)&&same(state.audio,row.audio),`${window}/${age}: registers/audio`);invariant(same(state.gameplay,row.immutableState)&&same(state.rng.gameplay,row.rawBattleState.gameplayRng),`${window}/${age}: opaque gameplay`);const view=sceneOnSuperpowerView({age,config:superpowerConfigFor(window,rows,age)}),{attacker:_a,target:_t,...plain}=view;invariant(same(plain,state),`${window}/${age}: typed seam`);hash.update(JSON.stringify(state));}hashes.push(hash.digest("hex"));}invariant(hashes[0]===hashes[1],`${window}: deterministic replay`);result[window]={rows:248,passes:2,componentRows:496,seamRows:496,sha256:hashes[0]};}return result;}
if(process.argv[1]&&resolve(process.argv[1])===resolve(import.meta.filename))console.log(JSON.stringify(verifySuperpowerReducer(),null,2));
