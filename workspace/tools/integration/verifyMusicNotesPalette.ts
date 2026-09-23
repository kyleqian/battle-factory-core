/** Verify source-owned note allocations, faded writes and retained scratch RAM. */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import data from "../../src/data/gen/live-animation-palette-resources.json" with { type: "json" };
import { createLiveMovePaletteHost, prepareLiveMovePalette } from "../../src/engine/liveMoveAnimationPalette.ts";
import { createScratchDir } from "../lib/scratch.ts";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
const vendor=dirname(realpathSync(join(root,"reference/pokeemerald")));
const request=(moveId:number,attacker:0|1)=>({moveId,attacker,target:attacker===0?1 as const:0 as const,turn:0,power:0,damage:0,friendship:70,multihit:0});
const receipts=[];
for(const [moveId,name]of [[47,"sing"],[320,"grass-whistle"]] as const) {
 for(const attacker of [0,1] as const) {
  const side=attacker===0?"player":"opponent";
  const scenario="tools/integration/fixtures/palette-notes-"+name+"-"+side+".json";
  let previous:string|undefined;
  for(let freshRun=0;freshRun<2;freshRun++) {
   const scratch=createScratchDir("pokebench-music-notes-palette-"),output=join(scratch,"source.json");
   const probe=spawnSync("python3",[join(root,"tools/run-mgba-probe.py"),output,"--",join(vendor,"mgba-venv/bin/python"),join(root,"tools/integration/musicNotesPaletteProbe.py"),join(root,scenario),output,String(moveId)],{cwd:root,encoding:"utf8"});
   assert.equal(probe.status,0,probe.stdout+probe.stderr);
   const bytes=readFileSync(output),digest=createHash("sha256").update(bytes).digest("hex");
   if(previous)assert.equal(digest,previous,"fresh source palette states agree");
   previous=digest;
   type Row={frame:number;tags:number[];unfaded:number[];faded:number[];scriptActive:number};
   const source=JSON.parse(bytes.toString("utf8")) as {first:Row;rainbow:Row;cleanup:Row};
   const before=createLiveMovePaletteHost(),after=prepareLiveMovePalette(before,request(moveId,attacker));
   assert(after.input.historyKnown && after.next.historyKnown);
   assert.equal(source.cleanup.scriptActive,0);
   const banks=data.rainbowNotes.map(r=>source.rainbow.tags.indexOf(r.tag));
   assert.deepEqual(banks,[7,8,9,10],"source allocation order");
   for(const [i,row]of data.rainbowNotes.entries()) {
    const offset=banks[i]!*16+1;
    assert.deepEqual(source.rainbow.faded.slice(offset,offset+5),row.colors);
    assert.deepEqual(source.cleanup.faded.slice(offset,offset+5),row.colors);
    assert.deepEqual(after.next.memory.faded.slice(256+offset,256+offset+5),row.colors);
    assert(!source.cleanup.tags.includes(row.tag));
    assert(!after.next.memory.tags.includes(row.tag));
   }
   // The first loaded resource overwrites both buffers; the three extra
   // allocations leave unfaded rows unchanged. Only bank 9 has a production
   // startup provider, so no claim is made for unknown stale rows 8 and 10.
   assert.deepEqual(source.rainbow.unfaded.slice(7*16,8*16),after.next.memory.unfaded.slice(256+7*16,256+8*16));
   for(const bank of [8,9,10]) assert.deepEqual(source.rainbow.unfaded.slice(bank*16,(bank+1)*16),source.first.unfaded.slice(bank*16,(bank+1)*16));
   const scratchRow=before.memory.unfaded.slice(256+9*16,256+10*16);
   assert.deepEqual(source.rainbow.unfaded.slice(9*16,10*16),scratchRow);
   assert.deepEqual(source.cleanup.unfaded.slice(9*16,10*16),scratchRow);
   assert.deepEqual(prepareLiveMovePalette(after.next,request(325,attacker)).input.traceScratchUnfadedPalette,prepareLiveMovePalette(before,request(325,attacker)).input.traceScratchUnfadedPalette);
   const receipt={scenario,moveId,attacker,freshRun,sourceDigest:digest,banks,firstFrame:source.first.frame,rainbowFrame:source.rainbow.frame,cleanupFrame:source.cleanup.frame};
   receipts.push(receipt);console.log(JSON.stringify(receipt));
  }
 }
}
writeFileSync(join(root,"tools/integration/fixtures/music-notes-palette-receipt.json"),JSON.stringify({schema:"music-notes-palette-receipt/v1",scope:"Source allocation order, owned faded writes, cleanup tags and retained bank-9 unfaded scratch; no complete graphics-memory or framebuffer claim.",freshRunsPerOrientation:2,receipts},null,2)+"\n");
