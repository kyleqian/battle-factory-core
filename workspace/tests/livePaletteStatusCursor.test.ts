import { censusDeal } from '../tools/integration/censusRound.ts';
import assert from 'node:assert/strict';
import { it } from 'vitest';
import type { GbaButton } from '../src/input.ts';
import {
 createFactoryRoundBattleOrchestrator, beginFactoryRoundBattleStartIntro,
 advanceFactoryRoundBattleStartIntro, advanceFactoryRoundBattleCommand,
 advanceFactoryRoundBattleResolution,
} from '../src/engine/factoryRoundBattleOrchestrator.ts';
it('keeps current input immutable when an actual status receipt trails the final projected body', () => {
let state=beginFactoryRoundBattleStartIntro(createFactoryRoundBattleOrchestrator({id:'status-tail',battleScene:'on',factoryWinStreak:0,playerTrainerId:416049562,battleTowerLevel50WinStreak:0,facilityState:{rentsCount:0},...censusDeal({ seed: 549, factoryWinStreak: 0 })}));
let frame=0;
const step=(keys:readonly GbaButton[]=[])=>{
 if(++frame>20000)throw new Error('route budget');
 if(state.battleStartIntro)state=advanceFactoryRoundBattleStartIntro(state,new Set(keys));
 else if(state.battleResolutionPresentation)state=advanceFactoryRoundBattleResolution(state,new Set(keys));
 else state=advanceFactoryRoundBattleCommand(state,new Set(keys));
};
const until=(p:()=>boolean)=>{while(!p())step((state.battleStartIntro&&frame%16===0)||(state.battleResolutionPresentation?.lifecycle.phase==='awaiting-message-dismiss'&&frame%2===0)?['A']:[])};
const pulse=(key:GbaButton)=>{step();step([key]);step()};
until(()=>state.battleCommandPresentation?.lifecycle.phase==='action-menu');pulse('A');until(()=>state.battleCommandPresentation?.lifecycle.phase==='fight-menu');pulse('DOWN');pulse('A');
until(()=>{const r=state.battleResolutionPresentation,c=r?.segments[r.segmentIndex]?.commands[r.commandIndex];return r?.lifecycle.phase==='presenting'&&c?.type==='move-animation'&&c.animation?.moveId===122});
const snapshot=state;const r=snapshot.battleResolutionPresentation!;
until(()=>!!state.battleResolutionPresentation?.segments[r.segmentIndex]?.events.some(e=>e.payload.kind==='status-animation'));
const actualEvents=state.battleResolutionPresentation!.segments[r.segmentIndex]!.events;state=snapshot;
// Retain the actual later receipt while omitting its projection: the cursor
// must honor graphics events independently of presentation command count.
const seg={...r.segments[r.segmentIndex]!,events:actualEvents};const command=seg.commands[r.commandIndex]!;
assert.equal(command.type,'move-animation');const event=seg.events.find(e=>e.payload.kind==='status-animation');assert.equal(event?.sequence,15);assert.equal(r.liveMovePaletteInput?.historyKnown,true);
const before=state.battle;
state={...state,liveMovePaletteHost:{...state.liveMovePaletteHost!,commandKey:"",eventCursor:undefined},battleResolutionPresentation:{...r,liveMovePaletteInput:undefined,segments:r.segments.map((s,index)=>index===r.segmentIndex?{...s,events:actualEvents,commands:s.commands.slice(0,r.commandIndex+1)}:s)}};
state=advanceFactoryRoundBattleResolution(state);
assert.equal(state.liveMovePaletteHost?.host.historyKnown,false);
assert.equal(state.battleResolutionPresentation?.liveMovePaletteInput?.historyKnown,true);
const input=state.battleResolutionPresentation?.liveMovePaletteInput;
for(let i=0;i<5;i++){state=advanceFactoryRoundBattleResolution(state);assert.equal(state.battleResolutionPresentation?.liveMovePaletteInput,input);assert.equal(state.liveMovePaletteHost?.host.historyKnown,false);assert.equal(state.battle,before);}
}, 60000);
