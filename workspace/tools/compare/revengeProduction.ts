/** Dense bilateral production reducer and typed-seam verifier for MOVE_REVENGE. */
import{createHash}from"node:crypto";import{readFileSync}from"node:fs";import{resolve}from"node:path";import{gunzipSync}from"node:zlib";
import{revengeAtAge,type RevengeLiveInputs,type RevengeSprite}from"../../src/animation/revenge.ts";
import{sceneOnRevengeView,type SceneOnRevengeConfig}from"../../src/animation/sceneOnPresentation.ts";
type Json=Record<string,any>;export type RevengeWindow="player-back"|"opponent-front";const root=resolve(import.meta.dirname,"../..");
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);function invariant(v:unknown,m:string):asserts v{if(!v)throw new Error(`MOVE_REVENGE production drift: ${m}`);}
const OWNED=new Set(["gRevengeSmallScratchSpriteTemplate","gRevengeBigScratchSpriteTemplate","gHorizontalLungeSpriteTemplate","gPersistHitSplatSpriteTemplate"]);
export function revengeRowsFor(window:RevengeWindow):Json[]{const stem=window==="player-back"?"player":"opponent";return JSON.parse(gunzipSync(readFileSync(resolve(root,`tools/compare/evidence/revenge-${stem}-dense-state.json.gz`))).toString()).frames;}
const art=(sprite:Json,name:string)=>({displaySpecies:name,slot:sprite.slot,attr:sprite.attr,subpriority:sprite.subpriority});
const semantic=(sprite:Json):RevengeSprite=>({slot:sprite.slot,template:sprite.template.symbol,callback:sprite.callback.symbol,
 x:sprite.x,y:sprite.y,x2:sprite.x2,y2:sprite.y2,animation:sprite.animNum,attr:sprite.attr,matrix:sprite.matrix,
 data:sprite.data,subpriority:sprite.subpriority,invisible:sprite.invisible});
export function revengeInputsFor(window:RevengeWindow,rows=revengeRowsFor(window),age=0):RevengeLiveInputs{
 const row=rows[age]!,attackerSide=window==="player-back"?"player":"opponent",targetSide=attackerSide==="player"?"opponent":"player",A=row.resourceAllocators;
 const names=window==="player-back"?{attacker:"MACHAMP",target:"SHUCKLE"}:{attacker:"QWILFISH",target:"SHUCKLE"};
 const tile=(tag:number,fallback:number)=>{const i=A.tileTags.slice(0,64).indexOf(tag);return i<0?fallback:A.tileRanges[i][0]};
 const selected=targetSide==="opponent"?"bg1":"bg2";
 const signed=(value:number)=>{const raw=value&0x1ff;return raw>=256?raw-512:raw};
 return{attackerSide,targetSide,attackerSpecies:names.attacker,targetSpecies:names.target,
  attackerCenter:{x:row.battlerSprites.attacker.x,y:row.battlerSprites.attacker.y},targetCenter:{x:row.battlerSprites.target.x,y:row.battlerSprites.target.y},
  attackerArt:art(row.battlerSprites.attacker,names.attacker),targetArt:art(row.battlerSprites.target,names.target),
  ownedSprites:row.sprites.filter((sprite:Json)=>OWNED.has(sprite.template?.symbol)).map(semantic),
  liveTasks:row.tasks.map((task:Json)=>({slot:task.slot,callback:task.func.symbol,data:task.data})),
  buffers:{softwareOam:row.softwareOam,hardwareOam:row.hardwareOam,softwareMatrices:row.softwareMatrices,hardwareMatrices:row.hardwareMatrices},
  palette:{unfaded:row.unfadedPalette,faded:row.fadedPalette,hardware:row.hardwarePalette},registers:row.registers,
  background:{battleVram:rows[0]!.bgVram,currentVram:row.bgVram,monbgPaletteBank:targetSide==="opponent"?8:9,selected,
   scroll:{x:signed(row.registers[`${selected}hofs`]??0),y:signed(row.registers[`${selected}vofs`]??0)}},
  resources:{scratchTileBase:tile(10245,305),swipeTileBase:tile(10246,537),impactTileBase:tile(10135,305),
   scratchLoaded:row.tileTags.includes(10245),swipeLoaded:row.tileTags.includes(10246),impactLoaded:row.tileTags.includes(10135),allocator:A},
  spriteOrder:row.spriteOrder,audio:row.audio,liveCounts:{visualTasks:row.visualTaskCount,soundTasks:row.soundTaskCount,matrixBitmap:A.matrixBitmap},
  animationRng:row.animationRng,gameplayRng:row.rawBattleState.gameplayRng,gameplayState:row.immutableState};}
export function revengeConfigFor(window:RevengeWindow,rows=revengeRowsFor(window),age=0):SceneOnRevengeConfig{const input=revengeInputsFor(window,rows,age),{attackerSide,targetSide,attackerSpecies,targetSpecies,attackerCenter,targetCenter,...animationInputs}=input,row=rows[age]!,player=row.parties.player[0],opponent=row.parties.opponent[0];
 return{move:"REVENGE",attacker:{species:attackerSpecies as never,geometry:{side:attackerSide,spriteCorner:{x:row.battlerSprites.attacker.x-32,y:row.battlerSprites.attacker.y-32},animationCenter:attackerCenter,battlePositionCenter:attackerCenter}},target:{species:targetSpecies as never,geometry:{side:targetSide,spriteCorner:{x:row.battlerSprites.target.x-32,y:row.battlerSprites.target.y-32},animationCenter:targetCenter,battlePositionCenter:targetCenter}},fieldProfile:{playerHp:player.hp,playerMaxHp:player.maxHp,opponentHp:opponent.hp,opponentMaxHp:opponent.maxHp,playerGender:player.gender,opponentGender:opponent.gender},animationInputs};}
export function verifyRevengeProduction(){const result:Json={};for(const window of["player-back","opponent-front"]as const){const rows=revengeRowsFor(window),hashes:string[]=[];invariant(rows.length===145&&!rows[144]!.animScriptActive,`${window}: complete corpus`);for(let pass=0;pass<2;pass++){const hash=createHash("sha256");for(const[age,row]of rows.entries()){const state=revengeAtAge(age,revengeInputsFor(window,rows,age));invariant(state.source.pointer===row.scriptPtr&&state.active===row.animScriptActive,`${window}/${age}: source cursor`);invariant(same(state.sprites,row.sprites.filter((s:Json)=>OWNED.has(s.template?.symbol)).map(semantic)),`${window}/${age}: owned sprites`);invariant(same(state.buffers.hardwareOam,row.hardwareOam)&&same(state.buffers.hardwareMatrices,row.hardwareMatrices)&&same(state.palette.hardware,row.hardwarePalette),`${window}/${age}: hardware buffers`);invariant(same(state.registers,row.registers)&&same(state.audio,row.audio),`${window}/${age}: registers/audio`);invariant(same(state.gameplay,row.immutableState)&&same(state.rng.gameplay,row.rawBattleState.gameplayRng),`${window}/${age}: opaque gameplay`);const view=sceneOnRevengeView({age,config:revengeConfigFor(window,rows,age)}),{attacker:_a,target:_t,...plain}=view;invariant(same(plain,state),`${window}/${age}: typed seam`);hash.update(JSON.stringify(state));}hashes.push(hash.digest("hex"));}invariant(hashes[0]===hashes[1],`${window}: deterministic replay`);result[window]={rows:145,passes:2,componentRows:290,seamRows:290,sha256:hashes[0]};}return result;}
if(process.argv[1]&&resolve(process.argv[1])===resolve(import.meta.filename))console.log(JSON.stringify(verifyRevengeProduction(),null,2));
