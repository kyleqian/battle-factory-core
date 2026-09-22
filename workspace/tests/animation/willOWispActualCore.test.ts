import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
const root=resolve(import.meta.dirname,"../..");
const run=()=>JSON.parse(execFileSync(process.execPath,["--experimental-strip-types",
  "tools/compare/willOWispActualCore.ts","--require-exact"],{cwd:root,encoding:"utf8",maxBuffer:16*1024*1024}));
describe("MOVE_WILL_O_WISP actual core",()=>{it("matches all 427 retained RGB rows twice fresh",()=>{
  const first=run(),second=run();expect(second).toEqual(first);expect(first).toMatchObject({
    schema:"will-o-wisp-actual-core-verdict/v1",rows:427,componentMatched:427,seamMatched:427,
    rawRgbMatched:427,framebufferMatched:427,residualPixels:0,
    windows:[{window:"player-back",rows:214,framebufferMatched:214,residualPixels:0,failures:[]},
      {window:"opponent-front",rows:213,framebufferMatched:213,residualPixels:0,failures:[]}],
    alteredLiveControl:{species:["CROBAT","BLISSEY"],sidesGeometryAllocationChanged:true,
      gameplayStateOpaqueAndUnchanged:true,gameplayRngOpaqueAndUnchanged:true}});
},30_000);});
