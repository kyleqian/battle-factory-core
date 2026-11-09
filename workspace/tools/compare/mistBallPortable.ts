import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync, realpathSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { createScratchDir } from "../lib/scratch.ts";
import { MIST_BALL_FRAME_COUNT, mistBallAtAge } from "../../src/animation/mistBall.ts";
import {
  createSceneOnMovePresentation,
  sceneOnMistBallView,
  type SceneOnMistBallConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";

type Fixture = SceneOnMistBallConfig & {
  schema: "mist-ball-portable-evidence/v1"; oracleProfile: "battle-scene-on";
  orientation: "player-back" | "opponent-front"; scenario: string; probe: string;
  sourceWindow: { startFrame: number; endFrame: number; frameCount: 213 };
  probeJsonSha256: string; secondFreshProbeJsonSha256: string; rawRgbSha256: string;
  changeMap: string; changeMapSha256: string;
  appStage: { presentationAge: number };
  acceptance: { status: "exact"; denseEvidenceFrames: 213; productionFramebufferFrames: 213 };
};
type Frame = {
  frame: number; sha256: string; scriptOffset: number | null; animScriptActive: boolean;
  visualTaskCount: number; soundTaskCount: number; tasks: readonly any[]; sprites: readonly any[];
  battlers: unknown; parties: unknown; immutableState: unknown;
  softwareOam: readonly string[]; hardwareOam: readonly string[]; spriteOrder: readonly number[];
  hardwareMatrices: readonly (readonly number[])[];
  fadedPalette: readonly number[]; unfadedPalette: readonly number[]; hardwarePalette: readonly number[];
  paletteTags: readonly number[]; tileTags: readonly number[];
  registers: Readonly<Record<string, number>>; backgroundPositions: Readonly<Record<string, number>>;
  bg1Tiles: string; bg1Tilemap: string; se1: { status: number }; se2: { status: number };
  playerSprite: any; opponentSprite: any;
};
type Probe = {
  schema: "mist-ball-dense-evidence/v1"; moveId: 296;
  sourceWindow: Fixture["sourceWindow"];
  sourceSymbols: { Move_MIST_BALL: number; Move_FEATHER_DANCE: number };
  lifecycleCounts: { gMistBallSpriteTemplate: number };
  topology: { templates: readonly string[]; callbacks: readonly string[]; tasks: readonly string[] };
  frames: readonly Frame[];
};

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const paths = process.argv.slice(2);
if (!paths.length) paths.push(
  "tools/compare/fixtures/mist-ball-player-latias-opponent-registeel.json",
  "tools/compare/fixtures/mist-ball-opponent-latias-player-registeel.json",
);
if (paths.length !== 2) throw new Error("Mist Ball portable requires both orientations");
const sha = (value: string | Buffer): string => createHash("sha256").update(value).digest("hex");
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const firstReceipts = new Map<string, string>();

function normalizedMap(fixture: Fixture, rgbDir: string): string {
  const run = spawnSync("python3", [join(root, "tools/compare/frame-changemap.py"), rgbDir], { cwd: root, encoding: "utf8" });
  if (run.status !== 0) throw new Error(run.stderr);
  const at = run.stdout.indexOf(" — ");
  if (at < 0) throw new Error("change-map header changed");
  return `# ${basename(fixture.changeMap)} raw RGB888 — ${run.stdout.slice(at + 3)}`;
}

function verify(path: string, runNumber: number): void {
  const fixture = JSON.parse(readFileSync(resolve(root, path), "utf8")) as Fixture;
  const scratch = createScratchDir(`pokebench-mist-ball-${fixture.orientation}-`);
  const output = join(scratch, "probe.json"), rgbDir = join(scratch, "rgb");
  const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
  const run = spawnSync("python3", [join(root, "tools/run-mgba-probe.py"), output, "--",
    join(vendor, "mgba-venv/bin/python"), resolve(root, fixture.probe), resolve(root, fixture.scenario), output, rgbDir,
  ], { cwd: root, encoding: "utf8" });
  if (run.stdout) process.stdout.write(run.stdout);
  if (run.stderr) process.stderr.write(run.stderr);
  if (run.status !== 0) throw new Error(`${fixture.orientation}: fresh probe failed`);
  const bytes = readFileSync(output), receipt = sha(bytes), probe = JSON.parse(bytes.toString()) as Probe;
  const failures: string[] = [];
  if (fixture.schema !== "mist-ball-portable-evidence/v1" || fixture.oracleProfile !== "battle-scene-on"
      || probe.schema !== "mist-ball-dense-evidence/v1" || probe.moveId !== 296) failures.push("schema/profile/move");
  if (!same(probe.sourceSymbols, { Move_MIST_BALL: 0x082ce62e, Move_FEATHER_DANCE: 0x082ce6bc })
      || !same(probe.sourceWindow, fixture.sourceWindow) || probe.frames.length !== 213) failures.push("exclusive pointer/window");
  const expectedReceipt = runNumber === 1 ? fixture.probeJsonSha256 : fixture.secondFreshProbeJsonSha256;
  if (receipt !== expectedReceipt) failures.push("committed receipt digest");
  if (runNumber === 1) firstReceipts.set(fixture.orientation, receipt);
  else if (firstReceipts.get(fixture.orientation) !== receipt) failures.push("twice-fresh byte stability");

  const requiredTemplates = ["gMistBallSpriteTemplate", "gComplexPaletteBlendSpriteTemplate"];
  const requiredCallbacks = ["StartAnimLinearTranslation", "AnimTranslateLinear_WithFollowup", "DestroyAnimSprite", "AnimComplexPaletteBlend_Step1", "AnimComplexPaletteBlend_Step2"];
  const requiredTasks = ["AnimTask_ShakeMon_Step", "AnimTask_MistBallFog", "AnimTask_MistBallFog_Step", "AnimTask_BlendSpriteColor_Step2"];
  if (requiredTemplates.some((value) => !probe.topology.templates.includes(value))
      || requiredCallbacks.some((value) => !probe.topology.callbacks.includes(value))
      || requiredTasks.some((value) => !probe.topology.tasks.includes(value))
      || probe.lifecycleCounts.gMistBallSpriteTemplate !== 1) failures.push("complete callback/task topology");
  if (probe.topology.templates.some((value) => value.includes("Feather"))) failures.push("loaded-unused WHITE_FEATHER spawned");

  const first = probe.frames[0]!;
  const rgbHash = createHash("sha256");
  for (const [age, frame] of probe.frames.entries()) {
    const rgbPath = join(rgbDir, `${String(frame.frame).padStart(5, "0")}.rgb`);
    const rgb = readFileSync(rgbPath); rgbHash.update(rgb);
    const shape = frame.frame === fixture.sourceWindow.startFrame + age && sha(rgb) === frame.sha256
      && (frame.scriptOffset === null || frame.scriptOffset >= 0 && frame.scriptOffset < 0x8e)
      && frame.softwareOam.length === 128 && frame.hardwareOam.length === 128
      && frame.spriteOrder.length === 64 && frame.hardwareMatrices.length === 32
      && frame.fadedPalette.length === 512 && frame.unfadedPalette.length === 512
      && frame.hardwarePalette.length === 512 && frame.paletteTags.length === 16 && frame.tileTags.length === 128
      && Object.keys(frame.registers).length === 10 && frame.bg1Tiles.length === 0x1000 && frame.bg1Tilemap.length === 0x1000;
    if (!shape) failures.push(`frame ${frame.frame}: dense shape/raw/script bounds`);
    if (!same(frame.battlers, first.battlers) || !same(frame.parties, first.parties)
        || !same(frame.immutableState, first.immutableState)) failures.push(`frame ${frame.frame}: immutable battle outcome state`);
    if (age > 0 && (!same(frame.hardwareOam, probe.frames[age - 1]!.softwareOam)
        || !same(frame.hardwarePalette, probe.frames[age - 1]!.fadedPalette))) failures.push(`frame ${frame.frame}: OAM/palette RAM+1 latch`);
  }
  const files = readdirSync(rgbDir).filter((value) => value.endsWith(".rgb"));
  if (files.length !== 213 || rgbHash.digest("hex") !== fixture.rawRgbSha256) failures.push("raw RGB window");
  const map = normalizedMap(fixture, rgbDir), committedMap = readFileSync(resolve(root, fixture.changeMap), "utf8");
  if (map !== committedMap || sha(map) !== fixture.changeMapSha256) failures.push("orientation change map");

  const projectile = probe.frames.flatMap((frame) => frame.sprites).filter((sprite) => sprite.template.symbol === "gMistBallSpriteTemplate");
  const resourceContract = probe.frames.some((frame) => frame.tileTags.includes(10155) && frame.paletteTags.includes(10155))
    && probe.frames.some((frame) => frame.tileTags.includes(10270) && frame.paletteTags.includes(10270));
  const bgContract = probe.frames.some((frame) => frame.backgroundPositions.gBattle_BG1_X === -121)
    && new Set(probe.frames.map((frame) => frame.bg1Tiles)).size > 1
    && new Set(probe.frames.map((frame) => frame.bg1Tilemap)).size > 1
    && probe.frames.some((frame) => frame.registers.bldcnt === 16194)
    && probe.frames.some((frame) => frame.registers.bldalpha !== 0);
  const audioContract = probe.frames.some((frame) => frame.se1.status !== 0 || frame.se2.status !== 0);
  const cleanup = first.animScriptActive && !probe.frames.at(-1)!.animScriptActive && probe.frames.at(-1)!.visualTaskCount === 0;
  if (projectile.length !== 32 || !resourceContract || !bgContract || !audioContract || !cleanup) failures.push("resource/BG1/audio/projectile/cleanup contract");
  if (fixture.acceptance.status !== "exact" || fixture.acceptance.denseEvidenceFrames !== 213
      || fixture.acceptance.productionFramebufferFrames !== 213) failures.push("exact acceptance");

  const stage = createSceneOnMovePresentation<SceneOnMistBallConfig>({
    move: "MIST_BALL", attacker: fixture.attacker, target: fixture.target,
    fieldProfile: fixture.fieldProfile,
  });
  for (const [index, oracle] of probe.frames.entries()) {
    const age = fixture.appStage.presentationAge + index;
    const component = mistBallAtAge(age, {
      attacker: fixture.attacker.geometry.animationCenter,
      target: fixture.target.geometry.animationCenter,
    });
    const seam = sceneOnMistBallView({ ...stage, age });
    const seamMatch = same(
      { ...seam, age: undefined, attacker: undefined, target: undefined },
      component,
    );
    const actualProjectile = oracle.sprites.find(
      (sprite: any) => sprite.template.symbol === "gMistBallSpriteTemplate",
    );
    const componentMatch = oracle.visualTaskCount === component.visualTaskCount
      && oracle.tileTags.includes(10155) === component.smallBubblesLoaded
      && oracle.paletteTags.includes(10155) === component.smallBubblesLoaded
      && oracle.tileTags.includes(10270) === component.whiteFeatherLoaded
      && oracle.paletteTags.includes(10270) === component.whiteFeatherLoaded
      && Boolean(actualProjectile) === Boolean(component.projectile)
      && (!actualProjectile || !component.projectile || same(
        { x: actualProjectile.x + actualProjectile.x2, y: actualProjectile.y + actualProjectile.y2 },
        { x: component.projectile.x, y: component.projectile.y },
      ))
      && oracle.backgroundPositions.gBattle_BG1_X === component.fog.scrollX
      && oracle.registers.bldalpha === (component.fog.eva | component.fog.evb << 8)
      && (fixture.target.geometry.side === "player"
        ? oracle.playerSprite.x2 : oracle.opponentSprite.x2) === component.targetX2;
    const rgb = readFileSync(join(rgbDir, `${String(oracle.frame).padStart(5, "0")}.rgb`));
    const engine: EngineState = {
      ...createInitialState(), rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age },
    };
    const app = render(engine);
    let diff = 0;
    for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
      if (app[pixel * 4] !== rgb[pixel * 3]
          || app[pixel * 4 + 1] !== rgb[pixel * 3 + 1]
          || app[pixel * 4 + 2] !== rgb[pixel * 3 + 2]) diff += 1;
    }
    const cleanupExact = index !== MIST_BALL_FRAME_COUNT - 1
      || (!component.active && !oracle.animScriptActive && oracle.visualTaskCount === 0);
    if (!seamMatch || !componentMatch || diff !== 0 || !cleanupExact) {
      failures.push(`frame ${oracle.frame}/age ${age}: seam=${seamMatch} component=${componentMatch} diff=${diff} cleanup=${cleanupExact}`);
    }
  }
  console.log(`${fixture.orientation} run ${runNumber}: 213/213 dense reducer/seam/task/sprite/software+hardware OAM/matrix/palette/tag/BG1/audio/state/raw-RGB/normalized-map/production-framebuffer frames exact; probe/raw/map ${receipt}/${fixture.rawRgbSha256}/${sha(map)}`);
  if (failures.length) throw new Error(`${fixture.orientation}: ${[...new Set(failures)].slice(0, 60).join(", ")} (scratch ${scratch})`);
}

for (let run = 1; run <= 2; run += 1) for (const path of paths) verify(path, run);
