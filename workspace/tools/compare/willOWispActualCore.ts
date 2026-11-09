/** Complete retained-RGB actual-core gate for MOVE_WILL_O_WISP. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createSceneOnMovePresentation, sceneOnWillOWispView,
  type SceneOnWillOWispConfig } from "../../src/animation/sceneOnPresentation.ts";
import { willOWispAtAge, willOWispDisplayPlan } from "../../src/animation/willOWisp.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";
import { willOWispConfigFor, willOWispInputsFor, willOWispRowsFor,
  verifyWillOWispReducer, type WillOWispWindow } from "./verifyWillOWispReducer.ts";
type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const sha256 = (value: Uint8Array | string) => createHash("sha256").update(value).digest("hex");
function frameDiff(app: Uint8Array, oracle: Uint8Array) { let pixels = 0;
  for (let p = 0; p < 240 * 160; p += 1) if (app[p*4] !== oracle[p*3]
    || app[p*4+1] !== oracle[p*3+1] || app[p*4+2] !== oracle[p*3+2]) pixels += 1;
  return pixels; }
function compareWindow(window: WillOWispWindow): Json {
  const stem = window === "player-back" ? "player" : "opponent", rows = willOWispRowsFor(window);
  const scratch = createScratchDir(`pokebench-will-o-wisp-${stem}-`);
  execFileSync("tar", ["-xzf", resolve(root, `tools/compare/evidence/will-o-wisp-${stem}-raw-rgb.tar.gz`), "-C", scratch]);
  let componentMatched=0,seamMatched=0,rawRgbMatched=0,framebufferMatched=0,residualPixels=0;
  const failures:string[]=[], sequence=createHash("sha256");
  for (const [age,row] of rows.entries()) { const config=willOWispConfigFor(window,rows,age);
    const state={...createSceneOnMovePresentation(config),age};
    const component=willOWispAtAge(age,willOWispInputsFor(window,rows,age));
    if(component.source.pointer!==row.scriptPtr)throw new Error(`${window}/${age}: component drift`); componentMatched++;
    const view=sceneOnWillOWispView(state),plan=willOWispDisplayPlan(view);
    if(!plan.attacker||view.palette.hardware.length!==512)throw new Error(`${window}/${age}: seam drift`); seamMatched++;
    const raw=readFileSync(resolve(scratch,`${String(row.frame).padStart(5,"0")}.rgb`));
    if(sha256(raw)!==row.sha256)throw new Error(`${window}/${age}: RGB drift`);rawRgbMatched++;sequence.update(raw);
    const residual=frameDiff(render({...createInitialState(),rngMode:"frontierBattle",sceneOnPresentation:state}),raw);
    residualPixels+=residual;if(!residual)framebufferMatched++;else failures.push(`${age}:${residual}`);
  }
  return {window,rows:rows.length,componentMatched,seamMatched,rawRgbMatched,framebufferMatched,residualPixels,
    chronologicalRawRgbSha256:sequence.digest("hex"),failures};
}
function alteredControl() { const rows=willOWispRowsFor("player-back"),age=170,base=willOWispConfigFor("player-back",rows,age),input=base.animationInputs;
  const altered:SceneOnWillOWispConfig={...base,
    attacker:{species:"CROBAT" as never,geometry:{side:"opponent",spriteCorner:{x:168,y:10},animationCenter:{x:200,y:42},battlePositionCenter:{x:200,y:42}}},
    target:{species:"BLISSEY" as never,geometry:{side:"player",spriteCorner:{x:8,y:82},animationCenter:{x:40,y:114},battlePositionCenter:{x:40,y:122}}},
    animationInputs:{...input,attackerArt:{...input.attackerArt,displaySpecies:"CROBAT"},
      targetArt:{...input.targetArt,displaySpecies:"BLISSEY"},
      resources:{...input.resources,orbTileBase:600,fireTileBase:700,allocator:{altered:true}},
      spriteOrder:[...input.spriteOrder].reverse(),animationRng:input.animationRng^0x12345678}};
  const digest=(config:SceneOnWillOWispConfig)=>sha256(render({...createInitialState(),rngMode:"frontierBattle",
    sceneOnPresentation:{...createSceneOnMovePresentation(config),age}}));
  const canonical=digest(base),changed=digest(altered);if(canonical===changed)throw new Error("altered control unchanged");
  return {species:["CROBAT","BLISSEY"],sidesGeometryAllocationChanged:true,
    gameplayStateOpaqueAndUnchanged:altered.animationInputs.gameplayState===input.gameplayState,
    gameplayRngOpaqueAndUnchanged:altered.animationInputs.gameplayRng===input.gameplayRng,canonical,changed}; }
export function willOWispActualCoreVerdict(){verifyWillOWispReducer();const windows=[compareWindow("player-back"),compareWindow("opponent-front")];
  const stable={schema:"will-o-wisp-actual-core-verdict/v1",oracleProfile:"battle-scene-on",move:"MOVE_WILL_O_WISP",rows:427,
    componentMatched:427,seamMatched:427,rawRgbMatched:427,framebufferMatched:windows.reduce((s,w)=>s+w.framebufferMatched,0),
    residualPixels:windows.reduce((s,w)=>s+w.residualPixels,0),windows,alteredLiveControl:alteredControl()};
  return {...stable,digest:sha256(JSON.stringify(stable))};}
if(process.argv[1]&&resolve(process.argv[1])===resolve(import.meta.filename)){const r=willOWispActualCoreVerdict();console.log(JSON.stringify(r));if(process.argv.includes("--require-exact")&&r.residualPixels)process.exitCode=1;}
