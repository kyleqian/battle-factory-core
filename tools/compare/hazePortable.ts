import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { createSceneOnMovePresentation, sceneOnHazeView, type SceneOnHazeConfig } from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";

interface Fixture extends SceneOnHazeConfig {
  orientation: string; scenario: string; probe: string; changeMap: string;
  sourceWindow: { startFrame: number; endFrame: number; frameCount: number };
  sourceBounds: { start: string; endExclusive: string };
  probeJsonSha256: string; rawRgbSha256: string; changeMapSha256: string;
}
interface Task { function: { symbol: string | null }; data: number[] }
interface Battler { attr: number[]; invisible: boolean }
interface Frame {
  frame: number; sha256: string; script: { active: boolean; pointer: number; inBounds: boolean };
  activeTasks: Task[]; visualTaskCount: number; soundTaskCount: number; battlers: Battler[];
  registers: { bg1cnt: number; bg1hofs: number; bg1vofs: number; bldcnt: number; bldalpha: number };
  bg: { x: number; y: number; charBlock1: string; screenBlocks: string };
  fadedPalette: number[]; unfadedPalette: number[]; hardwarePalette: number[];
  se1: { songHeader: number; status: number }; battle: unknown;
}
interface Probe { schema: string; sourceBounds: { start: number; endExclusive: number }; songHeader: number; frames: Frame[] }

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const args = process.argv.slice(2);
if (args.length !== 2) throw new Error("usage: hazePortable.ts <player-fixture> <opponent-fixture>");
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const stable = (value: unknown) => {
  const battle = value as Record<string, Record<string, unknown>>;
  return Object.fromEntries(["player", "opponent"].map((side) => [side, {
    species: battle[side]!.species, hp: battle[side]!.hp, maxHp: battle[side]!.maxHp,
    item: battle[side]!.item, status1: battle[side]!.status1, status2: battle[side]!.status2,
    status3: battle[side]!.status3, statStages: battle[side]!.statStages,
  }]));
};
function diffFrame(app: Uint8ClampedArray, raw: Buffer): number {
  let diff = 0;
  for (let i = 0; i < 240 * 160; i++) if (app[i*4] !== raw[i*3] || app[i*4+1] !== raw[i*3+1] || app[i*4+2] !== raw[i*3+2]) diff++;
  return diff;
}
function blendBlack(color: number, coeff: number): number {
  const factor = 16 - coeff;
  return Math.floor((color & 31) * factor / 16)
    | (Math.floor(((color >> 5) & 31) * factor / 16) << 5)
    | (Math.floor(((color >> 10) & 31) * factor / 16) << 10);
}

const fresh = new Map<string, { probe: string; raw: string; map: string }>();
for (let runNumber = 1; runNumber <= 2; runNumber++) for (const path of args) {
  const fixture = JSON.parse(readFileSync(resolve(path!), "utf8")) as Fixture;
  const scratch = createScratchDir("pokebench-haze-");
  const output = join(scratch, "probe.json"); const rgb = join(scratch, "rgb");
  const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
  const run = spawnSync("python3", [join(root,"tools/run-mgba-probe.py"),output,"--",join(vendor,"mgba-venv/bin/python"),resolve(root,fixture.probe),resolve(root,fixture.scenario),output,rgb], { cwd: root, encoding: "utf8" });
  if (run.stdout) process.stdout.write(run.stdout); if (run.stderr) process.stderr.write(run.stderr);
  if (run.status !== 0) process.exit(run.status ?? 1);
  const bytes = readFileSync(output); const probe = JSON.parse(bytes.toString()) as Probe;
  const probeHash = createHash("sha256").update(bytes).digest("hex");
  if (probe.schema !== "haze-dense-evidence/v1" || probe.frames.length !== 202
    || probe.frames[0]!.frame !== fixture.sourceWindow.startFrame || probe.frames.at(-1)!.frame !== fixture.sourceWindow.endFrame
    || probe.sourceBounds.start !== Number.parseInt(fixture.sourceBounds.start,16) || probe.sourceBounds.endExclusive !== Number.parseInt(fixture.sourceBounds.endExclusive,16)
    || probeHash !== fixture.probeJsonSha256) throw new Error(`${fixture.orientation}: probe receipt drift ${probeHash}`);
  const stage = createSceneOnMovePresentation<SceneOnHazeConfig>({ move:"HAZE",attacker:fixture.attacker,target:fixture.target,fieldProfile:fixture.fieldProfile });
  const initialBattle = stable(probe.frames[0]!.battle); const rawHash = createHash("sha256"); const failures: string[] = [];
  let component=0,seam=0,hardware=0,framebuffer=0;
  for (let i=0;i<probe.frames.length;i++) {
    const row=probe.frames[i]!; const age=row.frame-fixture.sourceWindow.startFrame; const view=sceneOnHazeView({...stage,age});
    const hazeTasks=row.activeTasks.filter((t)=>t.function.symbol === "AnimTask_HazeScrollingFog" || t.function.symbol === "AnimTask_HazeScrollingFog_Step");
    const regs = age === 0 ? row.registers.bldcnt===0 && row.registers.bldalpha===0
      : age === 201 ? row.registers.bldcnt===0 && row.registers.bldalpha===0 && row.registers.bg1cnt===7169 && row.registers.bg1hofs===0
      : row.registers.bldcnt===16194 && row.registers.bldalpha===view.fogEva+(view.fogEvb<<8) && row.registers.bg1cnt===7173 && row.registers.bg1hofs===(view.bg1X&511) && row.registers.bg1vofs===0;
    const blendActive = (age >= 35 && age < 84) || (age >= 127 && age < 159);
    const componentOk = hazeTasks.length===Number(view.taskActive) && regs
      && row.visualTaskCount===Number(age>=3&&age<200)+Number(blendActive)
      && row.soundTaskCount===0 && row.script.inBounds && same(stable(row.battle),initialBattle);
    if(componentOk) component++; if(same(view,sceneOnHazeView({...stage,age}))) seam++;
    const paletteOk=row.battlers.every((b)=>{
      const base=256+((b.attr[2]!>>12)&15)*16;
      return row.fadedPalette.slice(base,base+16).every((c,index)=>c===blendBlack(row.unfadedPalette[base+index]!,view.battlerBlackCoeff));
    });
    const prior=probe.frames[i-1];
    const transferOk=!prior || age===1 || row.battlers.every((b)=>{const base=256+((b.attr[2]!>>12)&15)*16;return same(row.hardwarePalette.slice(base,base+16),prior.fadedPalette.slice(base,base+16));});
    const charReference = age < 2 ? probe.frames[0]! : age < 197 ? probe.frames[2]! : age < 199 ? probe.frames[197]! : probe.frames[199]!;
    const mapReference = age < 4 ? probe.frames[0]! : age < 199 ? probe.frames[4]! : probe.frames[199]!;
    const bgOk=row.bg.charBlock1===charReference.bg.charBlock1 && row.bg.screenBlocks===mapReference.bg.screenBlocks;
    const audioOk=age===0 || row.se1.songHeader===probe.songHeader;
    const hardwareOk=paletteOk&&transferOk&&bgOk&&audioOk&&row.hardwareOam.length===128;
    if(hardwareOk) hardware++;
    const raw=readFileSync(join(rgb,`${String(row.frame).padStart(5,"0")}.rgb`)); rawHash.update(raw);
    if(createHash("sha256").update(raw).digest("hex")!==row.sha256) throw new Error("raw frame hash drift");
    const engine:EngineState={...createInitialState(),rngMode:"frontierBattle",sceneOnPresentation:{...stage,age}};
    const diff=diffFrame(render(engine),raw); if(diff===0) framebuffer++;
    if(!componentOk||!hardwareOk||diff!==0) failures.push(`${row.frame}/age${age}: component=${componentOk} hardware=${hardwareOk} framebufferDiff=${diff}`);
  }
  const rawDigest=rawHash.digest("hex"); const mapRun=spawnSync("python3",[join(root,"tools/compare/frame-changemap.py"),rgb],{encoding:"utf8"});
  if(mapRun.status!==0) throw new Error("change-map generation failed");
  const map=mapRun.stdout.replace(/^# .* —/,`# MOVE_HAZE ${fixture.orientation} —`); const mapHash=createHash("sha256").update(map).digest("hex");
  if(rawDigest!==fixture.rawRgbSha256||mapHash!==fixture.changeMapSha256||map!==readFileSync(resolve(root,fixture.changeMap),"utf8")) throw new Error(`${fixture.orientation}: RGB/change-map drift`);
  const receipt={probe:probeHash,raw:rawDigest,map:mapHash}; if(fresh.has(fixture.orientation)&&!same(fresh.get(fixture.orientation),receipt)) throw new Error("fresh runs differ"); fresh.set(fixture.orientation,receipt);
  console.log(`${fixture.orientation} run ${runNumber}: component ${component}/202; seam ${seam}/202; hardware ${hardware}/202; framebuffer ${framebuffer}/202; probe=${probeHash}; raw=${rawDigest}`);
  if(failures.length) throw new Error(failures.slice(0,40).join("\n"));
}
