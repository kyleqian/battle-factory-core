import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import coverage from "../../ANIMATION_COVERAGE.json" with { type: "json" };
import { verifySnoreEvidence } from "../../tools/compare/snoreEvidence.ts";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname,"../..");

describe("MOVE_SNORE source/legal bilateral evidence checkpoint",()=>{
  it("pins the complete source/ELF/ROM graph, carrier census, and legal reachability",()=>{
    const text=execFileSync(process.execPath,["--experimental-strip-types","tools/compare/snoreSourceAudit.ts"],{cwd:root,encoding:"utf8",maxBuffer:8*1024*1024});
    expect(execFileSync(process.execPath,["--experimental-strip-types","tools/compare/snoreSourceAudit.ts"],{cwd:root,encoding:"utf8",maxBuffer:8*1024*1024})).toBe(text);
    const audit=JSON.parse(text) as Json;
    expect(audit).toMatchObject({schema:"snore-source-audit/v1",move:"MOVE_SNORE",moveId:173,status:"unsupported-source-staging-checkpoint",coverageCredit:false,graph:{blocks:["Move_SNORE","SnoreEffect"]},resource:{tag:"ANIM_TAG_SNORE_Z",value:10197,tileBytes:512},carriers:{factoryCount:1,level50Count:1},staging:{sleepCarrierSetId:226,transientOverrides:[],battleStateInjected:false,completePartiesBeforeBattleInit:true}});
    expect(audit.source.commands).toHaveLength(18);
    expect(audit.graph.components).toHaveLength(10);
    expect(audit.source.pointerOwnedRoot).toMatchObject({nextDispatchLabel:"Move_LIGHT_SCREEN",branches:{directlyReachableBlocks:["Move_SNORE","SnoreEffect"],complete:true}});
    expect(audit.carriers.level50[0]).toMatchObject({index:196,label:"FRONTIER_MON_SEALEO_1",species:"SPECIES_SEALEO",moves:["MOVE_ICE_BALL","MOVE_HAIL","MOVE_SNORE","MOVE_REST"]});
    expect(audit.battleReachability).toMatchObject({failure:expect.stringContaining("awake"),success:expect.stringContaining("STATUS1_SLEEP")});
    for(const record of [audit.source.pointerOwnedRoot,audit.source.directBodies.snoreEffect,...Object.values(audit.source.directBodies.sprite),...Object.values(audit.source.directBodies.tasks).flat()]) expect(record).toHaveProperty("rom.romSha256");
  });

  it("regenerates all 140 unthinned bilateral semantic/raw-RGB/map rows and Snore-owned latches",()=>{
    const first=verifySnoreEvidence(); expect(verifySnoreEvidence()).toEqual(first);
    expect(first).toEqual({schema:"snore-bilateral-evidence/v1",status:"unsupported-evidence-checkpoint",coverageCredit:false,sourceAuditSha256:"21a7ba061f701bab8d4d950d0f2ee54192ffdde99c8f0260db777e0b6607e944",orientations:{
      "player-back":{rows:70,startFrame:692,endFrame:761,probeJsonSha256:"e3767ec89638ef79a6443b158b9960e2440fb6e2c4d2724119693a9ebfcbd0d6",rawRgbSequenceSha256:"5b0ce66294865c6587320dfeb4a7142e758f30153fb5cc90fcf5df01a974bd6b",zSpriteLives:6,oamRamPlusOneRows:69,scaleRamPlusTwoRows:28,targetShakeRamPlusTwoRows:26,platformRamPlusOneEdges:16,cleanupAge:69},
      "opponent-front":{rows:70,startFrame:700,endFrame:769,probeJsonSha256:"6bee2b368d7ea678d2b4dd175298f2959d3f5dad62e4a0c2d35928b0eaa0fd3c",rawRgbSequenceSha256:"e9487046e68778aed5a4f4b26e644c315047f3003d30d91d45c2356836d5c0b2",zSpriteLives:6,oamRamPlusOneRows:69,scaleRamPlusTwoRows:28,targetShakeRamPlusTwoRows:26,platformRamPlusOneEdges:16,cleanupAge:69}},totals:{rows:140,zSpriteLives:12,residualPixelsCompared:false}});
    for(const stem of ["player","opponent"]){const map=JSON.parse(readFileSync(resolve(root,`tools/compare/evidence/snore-changemap-${stem}.json`),"utf8"));expect(map.rows).toHaveLength(70);expect(map.rows[0]).toMatchObject({age:0,active:true,scriptOffset:0});expect(map.rows.at(-1)).toMatchObject({age:69,active:false,counts:[0,0]});}
  });

  it("keeps Snore unsupported with no reducer, seam, compositor, component, track, or sibling credit",()=>{
    const data=coverage as Json; expect(data.queue).not.toContain("MOVE_SNORE"); expect(data.entries.find((entry:Json)=>entry.move==="MOVE_SNORE")).toBeUndefined();
    expect(JSON.stringify(data.componentTracks.filter((track:Json)=>track.representatives?.includes("MOVE_SNORE")))).toBe("[]");
  });
});
