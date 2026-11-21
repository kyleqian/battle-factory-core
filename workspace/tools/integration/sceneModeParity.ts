import { censusDeal } from "./censusRound.ts";
import assert from "node:assert/strict";
import {
 createFactoryRoundBattleOrchestrator, advanceFactoryRoundPresentation, completeFactoryRoundPresentation, submitFactoryRoundPlayerDecision,
} from "../../src/engine/factoryRoundBattleOrchestrator.ts";
export function verifySceneModeParity(seedCount = 40, steps = 12): number {
let decisions=0;
for(let seed=0;seed<seedCount;seed++){
 const setup=(battleScene:"on"|"off")=>{
  let state=createFactoryRoundBattleOrchestrator({id:"parity",battleScene,factoryWinStreak:0,playerTrainerId:416049562,battleTowerLevel50WinStreak:0,facilityState:{rentsCount:0},...censusDeal({ seed, factoryWinStreak: 0 })});
  return advanceFactoryRoundPresentation(completeFactoryRoundPresentation(state,{commandId:state.round.presentation!.command.commandId}));
 };
 let on=setup("on"),off=setup("off");
 for(let turn=0;turn<steps;turn++){
  assert.deepEqual(on.battle?.rng,off.battle?.rng, `seed ${seed} step ${turn} RNG`);
  if(!on.battle || !off.battle)break;
  const {hitMarker:am,...ar}=on.battle.rules.rulesContext;
  const {hitMarker:bm,...br}=off.battle.rules.rulesContext;
  assert.deepEqual(ar,br,`seed ${seed} step ${turn} rules`);
  assert.equal(am&~128,bm&~128);
  assert.deepEqual(on.battle.boundary,off.battle.boundary);
  const b=on.battle.boundary;
  if(b.kind!=="decision-required" || b.request.side!=="player")break;
  const decision=b.request.kind==="command" ? b.request.legalDecisions[0]! : {kind:"switch" as const,partyIndex:b.request.legalPartyIndexes[0]!};
  on=submitFactoryRoundPlayerDecision(on,decision);
  off=submitFactoryRoundPlayerDecision(off,decision);
  decisions++;
 }
}
return decisions;
}
