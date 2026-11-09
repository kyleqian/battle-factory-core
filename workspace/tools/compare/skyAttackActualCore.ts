/** Complete retained-RGB production gate for MOVE_SKY_ATTACK. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { createSceneOnMovePresentation, sceneOnSkyAttackView,
  type SceneOnSkyAttackConfig } from "../../src/animation/sceneOnPresentation.ts";
import { skyAttackAtAge, type SkyAttackBody } from "../../src/animation/skyAttack.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";
import { skyAttackConfigFor, skyAttackInputsFor, verifySkyAttackReducer,
  type SkyAttackOrientation } from "./verifySkyAttackReducer.ts";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const sha256 = (value: Uint8Array | string): string =>
  createHash("sha256").update(value).digest("hex");
function rowsFor(orientation: SkyAttackOrientation): Json[] {
  const stem = orientation === "player-back" ? "player" : "opponent";
  const rows = (JSON.parse(gunzipSync(readFileSync(resolve(root,
    `tools/compare/evidence/sky-attack-${stem}-dense-state.json.gz`))).toString("utf8")) as Json).frames;
  if (rows.length !== 330) throw new Error(`${orientation}: retained corpus changed`);
  return rows;
}
function frameDiff(app: Uint8Array, oracle: Uint8Array): number {
  let pixels = 0;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) if (
    app[pixel * 4] !== oracle[pixel * 3]
    || app[pixel * 4 + 1] !== oracle[pixel * 3 + 1]
    || app[pixel * 4 + 2] !== oracle[pixel * 3 + 2]) pixels += 1;
  return pixels;
}
function compareOrientation(orientation: SkyAttackOrientation): Json {
  const stem = orientation === "player-back" ? "player" : "opponent";
  const rows = rowsFor(orientation), input = skyAttackInputsFor(orientation);
  const scratch = createScratchDir(`pokebench-sky-attack-${stem}-`);
  execFileSync("tar", ["-xzf", resolve(root,
    `tools/compare/evidence/sky-attack-${stem}-raw-rgb.tar.gz`), "-C", scratch]);
  let componentMatched = 0, seamMatched = 0, rawRgbMatched = 0;
  let framebufferMatched = 0, residualPixels = 0;
  const failures: string[] = [];
  for (const [body, bodyRows] of [["setup", rows.slice(0, 149)],
    ["unleash", rows.slice(149)]] as const) {
    const config = skyAttackConfigFor(body as SkyAttackBody, { ...input,
      gameplayRng: bodyRows[0]!.rawBattleState.gameplayRng,
      gameplayState: bodyRows[0]!.immutableState });
    const stage = createSceneOnMovePresentation(config);
    for (const [age, row] of bodyRows.entries()) {
      const state = { ...stage, age }, reducer = skyAttackAtAge(body, age, {
        ...input, gameplayRng: bodyRows[0]!.rawBattleState.gameplayRng,
        gameplayState: bodyRows[0]!.immutableState });
      const view = sceneOnSkyAttackView(state);
      if (view.source.pointer !== row.scriptPtr || view.source.wait !== row.scriptWait
        || view.active !== row.animScriptActive) throw new Error(`${orientation}/${body}/${age}: component drift`);
      componentMatched += 1;
      const { attacker, target, ...seam } = view;
      if (JSON.stringify(seam) !== JSON.stringify(reducer)) throw new Error(`${orientation}/${body}/${age}: seam drift`);
      seamMatched += 1;
      const raw = readFileSync(resolve(scratch, `${String(row.frame).padStart(5, "0")}.rgb`));
      if (sha256(raw) !== row.sha256) throw new Error(`${orientation}/${body}/${age}: raw RGB drift`);
      rawRgbMatched += 1;
      const residual = frameDiff(render({ ...createInitialState(), rngMode: "frontierBattle",
        sceneOnPresentation: state }), raw);
      residualPixels += residual;
      if (residual === 0) framebufferMatched += 1;
      else failures.push(`${body}/${age}:${residual}`);
    }
  }
  return { orientation, rows: rows.length, setupRows: 149, unleashRows: 181,
    componentMatched, seamMatched, rawRgbMatched, framebufferMatched,
    residualPixels, failures };
}
function alteredControl(): Json {
  const input = skyAttackInputsFor("player-back"), base = skyAttackConfigFor("unleash", input);
  const altered: SceneOnSkyAttackConfig = { ...base,
    attacker: { species: "WAILORD", geometry: { side: "opponent", spriteCorner: { x: 169, y: 13 }, animationCenter: { x: 201, y: 37 }, battlePositionCenter: { x: 201, y: 45 } } },
    target: { species: "BLISSEY", geometry: { side: "player", spriteCorner: { x: 7, y: 81 }, animationCenter: { x: 39, y: 121 }, battlePositionCenter: { x: 39, y: 113 } } },
    animationInputs: { ...base.animationInputs,
      attackerSprite: { ...base.animationInputs.attackerSprite, slot: 21, x: 201, y: 45, attr: [13, 0xc0a9, 0x6d23], subpriority: 55, oamPriority: 3 },
      targetSprite: { ...base.animationInputs.targetSprite, slot: 22, x: 39, y: 113, attr: [81, 0xc007, 0x4123], subpriority: 14, oamPriority: 0 },
      bird: { ...base.animationInputs.bird, slot: 20, matrixNum: 9, subpriority: 7 },
      taskSlots: { monbg: 6, blendSetup: 7, shake: 8, sound: 9, fade: 10, blendUnleash: 11, birdShake: 12, slidingBg: 13, clearMonbg: 14, fadeBg: 15 },
      allocator: { ...base.animationInputs.allocator, matrixBitmap: 0x95, spriteOrder: base.animationInputs.allocator.spriteOrder.slice().reverse() },
      animationRngSeed: 0x12345678,
    } };
  const digest = (config: SceneOnSkyAttackConfig) => sha256(Buffer.concat(
    [0, 26, 45, 54, 70, 86, 112, 140, 161, 180].map((age) => Buffer.from(render({
      ...createInitialState(), rngMode: "frontierBattle",
      sceneOnPresentation: { ...createSceneOnMovePresentation(config), age },
    })))));
  const canonical = digest(base), changed = digest(altered);
  if (canonical === changed) throw new Error("altered Sky Attack control did not change framebuffer");
  return { species: ["WAILORD", "BLISSEY"], sidesReversed: true,
    geometryAndPictureOriginsChanged: true, allocationsAndPainterOrderChanged: true,
    animationRngChanged: true, framebufferChanged: true,
    gameplayRngOpaqueAndUnchanged: altered.animationInputs.gameplayRng === base.animationInputs.gameplayRng,
    canonical, changed };
}
verifySkyAttackReducer();
const orientations = [compareOrientation("player-back"), compareOrientation("opponent-front")];
const stable = { schema: "sky-attack-actual-core-verdict/v1", oracleProfile: "battle-scene-on",
  move: "MOVE_SKY_ATTACK", rows: 660,
  componentMatched: orientations.reduce((n, row) => n + row.componentMatched, 0),
  seamMatched: orientations.reduce((n, row) => n + row.seamMatched, 0),
  rawRgbMatched: orientations.reduce((n, row) => n + row.rawRgbMatched, 0),
  framebufferMatched: orientations.reduce((n, row) => n + row.framebufferMatched, 0),
  residualPixels: orientations.reduce((n, row) => n + row.residualPixels, 0),
  orientations, alteredLiveControl: alteredControl() };
const report = { ...stable, digest: sha256(JSON.stringify(stable)) };
console.log(JSON.stringify(report));
if (process.argv.includes("--require-exact") && report.residualPixels !== 0) process.exitCode = 1;
