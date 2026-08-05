import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import {
  createSceneOnMovePresentation,
  sceneOnMetalClawView,
  type SceneOnDragonRageFieldProfile,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import { createScratchDir } from "../lib/scratch.ts";

interface Fixture {
  readonly scenario: string;
  readonly probe: string;
  readonly denseWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number };
  readonly appStage: { readonly presentationAge: number };
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly attackerSpriteCenter: Readonly<{ x: number; y: number }>;
  readonly fieldProfile: SceneOnDragonRageFieldProfile;
  readonly evidenceSha256: string;
  readonly secondFreshEvidenceSha256: string;
  readonly rawRgbSha256: string;
  readonly acceptance: { readonly status: "partial" | "exact"; readonly framebufferMatching?: number };
}
interface ProbeSprite {
  readonly slot: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly animNum: number;
  readonly callback: { readonly symbol?: string };
}
interface ProbeFrame {
  readonly frame: number;
  readonly globalY: number;
  readonly battlerSprites: readonly ProbeSprite[];
  readonly tasks: readonly { readonly func: { readonly symbol?: string } }[];
  readonly effectSprites: {
    readonly claw: readonly ProbeSprite[];
    readonly lunge: readonly ProbeSprite[];
    readonly shake: readonly ProbeSprite[];
  };
  readonly registers: Record<string, number>;
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixture = JSON.parse(readFileSync(resolve(process.argv[2]!), "utf8")) as Fixture;
const scratch = createScratchDir("pokebench-metal-claw-compare-");
const output = join(scratch, "probe.json");
const rgbDir = join(scratch, "rgb");
const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
const run = spawnSync("python3", [
  join(root, "tools/run-mgba-probe.py"), output, "--",
  join(vendor, "mgba-venv/bin/python"), resolve(root, fixture.probe),
  resolve(root, fixture.scenario), output, rgbDir,
], { cwd: root, encoding: "utf8" });
if (run.stdout) process.stdout.write(run.stdout);
if (run.stderr) process.stderr.write(run.stderr);
if (run.status !== 0) process.exit(run.status ?? 1);

const bytes = readFileSync(output);
const probe = JSON.parse(bytes.toString("utf8")) as {
  readonly schema: string;
  readonly sourceWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number };
  readonly topology: { readonly tasks: string[] };
  readonly frames: readonly ProbeFrame[];
};
const evidenceHash = createHash("sha256").update(bytes).digest("hex");
const rgbHash = createHash("sha256");
for (const frame of probe.frames) {
  rgbHash.update(readFileSync(join(rgbDir, `${String(frame.frame).padStart(5, "0")}.rgb`)));
}
const errors: string[] = [];
if (probe.schema !== "metal-claw-dense-evidence/v1") errors.push("probe schema drifted");
if (JSON.stringify(probe.sourceWindow) !== JSON.stringify(fixture.denseWindow)) errors.push("source window drifted");
if (probe.frames.length !== fixture.denseWindow.frameCount) errors.push("dense frame count drifted");
if (evidenceHash !== fixture.evidenceSha256) errors.push(`evidence hash ${evidenceHash}`);
if (evidenceHash !== fixture.secondFreshEvidenceSha256) errors.push("second-fresh evidence pin differs");
const actualRgbHash = rgbHash.digest("hex");
if (actualRgbHash !== fixture.rawRgbSha256) errors.push(`RGB hash ${actualRgbHash}`);
if (!probe.frames[0]?.tasks.some((t) => t.func.symbol === "AnimTask_MetallicShine")
  || probe.frames.at(-1)?.registers.BLDCNT !== 0
  || probe.frames.at(-1)?.effectSprites.claw.length !== 0) {
  errors.push("active/cleanup boundary drifted");
}
const taskNames = new Set(probe.frames.flatMap((frame) => frame.tasks.map((task) => task.func.symbol)));
for (const symbol of ["AnimTask_MetallicShine_Step", "Task_LoopAndPlaySE"]) {
  if (!taskNames.has(symbol)) errors.push(`missing task lifecycle ${symbol}`);
}
for (const name of ["claw", "lunge", "shake"]) {
  const present = probe.frames.some((frame) => frame.effectSprites[name].length > 0);
  if (!present) errors.push(`missing ${name} sprite family`);
}
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`${probe.frames.length}/${fixture.denseWindow.frameCount} dense semantic/RGB evidence frames reproduced`);
console.log(`evidence ${evidenceHash}; RGB ${actualRgbHash}`);

const stage = createSceneOnMovePresentation({
  move: "METAL_CLAW",
  attacker: fixture.attacker,
  target: fixture.target,
  fieldProfile: fixture.fieldProfile,
  attackerSpriteCenter: fixture.attackerSpriteCenter,
});
let engine: EngineState = {
  ...createInitialState(),
  rngMode: "frontierBattle",
  sceneOnPresentation: {
    ...stage,
    age: fixture.appStage.presentationAge,
  },
};
const attackerIndex = fixture.attacker.geometry.side === "player" ? 0 : 1;
let framebufferMatching = 0;
let semanticMatching = 0;
const mismatches: string[] = [];
const semanticDiffs: string[] = [];
for (const frame of probe.frames) {
  const age = engine.sceneOnPresentation!.age;
  const view = sceneOnMetalClawView({ ...stage, age });
  const oracle = frame;
  const attacker = oracle.battlerSprites[attackerIndex]!;
  const lungeMatches = attacker.x2 === view.attackerOffset.x2;
  const shakeMatches = oracle.globalY === view.targetGlobalY;
  const expectedSlashes = view.slashes
    .map((s) => [s.x, s.y, s.animationFrame].join(",")).sort();
  const actualSlashes = oracle.effectSprites.claw
    .map((s) => [s.x, s.y, s.animNum].join(",")).sort();
  const slashMatches = JSON.stringify(expectedSlashes) === JSON.stringify(actualSlashes);
  if (lungeMatches && shakeMatches && slashMatches) semanticMatching += 1;
  else semanticDiffs.push(
    `frame ${frame.frame}/age ${age}: lunge=${lungeMatches} shake=${shakeMatches} slash=${slashMatches}`,
  );
  const oracleRgb = readFileSync(join(rgbDir, `${String(frame.frame).padStart(5, "0")}.rgb`));
  const rgba = render(engine);
  let diff = 0;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    if (oracleRgb[pixel * 3] !== rgba[pixel * 4]
      || oracleRgb[pixel * 3 + 1] !== rgba[pixel * 4 + 1]
      || oracleRgb[pixel * 3 + 2] !== rgba[pixel * 4 + 2]) diff += 1;
  }
  if (diff === 0) framebufferMatching += 1;
  else if (mismatches.length < 12) mismatches.push(`${frame.frame}/age${age}:${diff}px`);
  engine = { ...engine, sceneOnPresentation: { ...engine.sceneOnPresentation!, age: age + 1 } };
}
console.log(`${semanticMatching}/${fixture.denseWindow.frameCount} reducer-vs-oracle semantic frames matched`);
console.log(`${framebufferMatching}/${fixture.denseWindow.frameCount} production framebuffer frames matched`);
if (semanticDiffs.length) console.log(`first semantic diffs: ${semanticDiffs.slice(0, 12).join(", ")}`);
if (mismatches.length) console.log(`first framebuffer mismatches: ${mismatches.join(", ")}`);
if (fixture.acceptance.framebufferMatching !== undefined
  && framebufferMatching !== fixture.acceptance.framebufferMatching) {
  console.error(`pinned partial framebuffer count ${fixture.acceptance.framebufferMatching} drifted to ${framebufferMatching}`);
  process.exit(1);
}
if (semanticMatching !== fixture.denseWindow.frameCount) {
  console.error(`reducer semantic coverage ${semanticMatching}/${fixture.denseWindow.frameCount} incomplete`);
  process.exit(1);
}
if (fixture.acceptance.status === "exact" && framebufferMatching !== fixture.denseWindow.frameCount) process.exit(1);
