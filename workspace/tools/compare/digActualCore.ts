/** Complete retained-RGB production gate for both MOVE_DIG bodies. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  createSceneOnMovePresentation,
  sceneOnDigView,
  type SceneOnDigConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";
import {
  digConfigFor,
  verifyDigReducer,
  type DigOrientation,
} from "./verifyDigReducer.ts";

type Json = Record<string, any>;
type DigBody = "setup" | "unleash";
const root = resolve(new URL("../..", import.meta.url).pathname);
const bodyLengths: Record<DigBody, number> = { setup: 195, unleash: 68 };
const sha256 = (value: Uint8Array | string): string =>
  createHash("sha256").update(value).digest("hex");

function rowsFor(orientation: DigOrientation): Json[] {
  const stem = orientation === "player-back" ? "player" : "opponent";
  const corpus = JSON.parse(gunzipSync(readFileSync(resolve(root,
    `tools/compare/evidence/dig-${stem}-dense-state.json.gz`))).toString("utf8")) as Json;
  if (corpus.schema !== "dig-dense-evidence/v1" || corpus.profile !== "battle-scene-on"
    || corpus.move !== 91 || corpus.frames.length !== 263) {
    throw new Error(`${orientation}: retained Dig corpus changed`);
  }
  return corpus.frames;
}

function phaseRows(rows: Json[], body: DigBody): Json[] {
  const start = body === "setup" ? 0 : bodyLengths.setup;
  return rows.slice(start, start + bodyLengths[body]);
}

function frameDiff(app: Uint8Array, oracle: Uint8Array): number {
  let pixels = 0;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    if (app[pixel * 4] !== oracle[pixel * 3]
      || app[pixel * 4 + 1] !== oracle[pixel * 3 + 1]
      || app[pixel * 4 + 2] !== oracle[pixel * 3 + 2]) pixels += 1;
  }
  return pixels;
}

function compareOrientation(orientation: DigOrientation): Json {
  const stem = orientation === "player-back" ? "player" : "opponent";
  const rows = rowsFor(orientation);
  const scratch = createScratchDir(`pokebench-dig-${stem}-`);
  execFileSync("tar", ["-xzf", resolve(root,
    `tools/compare/evidence/dig-${stem}-raw-rgb.tar.gz`), "-C", scratch]);
  let componentMatched = 0, framebufferMatched = 0, residualPixels = 0;
  const failures: string[] = [];
  const bodies: Json[] = [];
  for (const body of ["setup", "unleash"] as const) {
    const phase = phaseRows(rows, body);
    const config = digConfigFor(rows, orientation, body);
    const stage = createSceneOnMovePresentation(config);
    let bodyMatched = 0, bodyResidual = 0;
    for (const [age, row] of phase.entries()) {
      const state = { ...stage, age };
      const view = sceneOnDigView(state);
      if (view.source.pointerOffset !== row.scriptOffset || view.source.wait !== row.scriptWait
        || view.active !== row.animScriptActive) throw new Error(`${orientation}/${body}/age${age}: seam drift`);
      componentMatched += 1;
      const raw = readFileSync(resolve(scratch, `${String(row.frame).padStart(5, "0")}.rgb`));
      if (sha256(raw) !== row.sha256) throw new Error(`${orientation}/${body}/age${age}: raw RGB drift`);
      const residual = frameDiff(render({ ...createInitialState(), rngMode: "frontierBattle",
        sceneOnPresentation: state }), raw);
      residualPixels += residual;
      bodyResidual += residual;
      if (residual === 0) { framebufferMatched += 1; bodyMatched += 1; }
      else failures.push(`${body}/${age}:${residual}`);
    }
    bodies.push({ body, rows: phase.length, framebufferMatched: bodyMatched,
      residualPixels: bodyResidual });
  }
  return { orientation, rows: rows.length, componentMatched, framebufferMatched,
    residualPixels, bodies, failures };
}

function alteredControl(): Json {
  const rows = rowsFor("player-back");
  const base = digConfigFor(rows, "player-back", "setup");
  const inputs = base.animationInputs;
  const altered: SceneOnDigConfig = {
    ...base,
    attacker: { species: "FLYGON", geometry: { side: "player",
      spriteCorner: { x: 31, y: 55 }, animationCenter: { x: 63, y: 87 },
      battlePositionCenter: { x: 63, y: 87 } } },
    target: { species: "BLISSEY", geometry: { side: "opponent",
      spriteCorner: { x: 147, y: 13 }, animationCenter: { x: 179, y: 45 },
      battlePositionCenter: { x: 179, y: 45 } } },
    animationInputs: {
      ...inputs,
      attackerElevationY: 73,
      attackerSpriteSlot: 2, targetSpriteSlot: 19,
      moundSlots: [20, 21],
      plumeSlots: Array.from({ length: 20 }, (_, index) => 22 + index),
      impactSpriteSlot: 42, impactMatrixNum: 7,
      moundMatrixNum: 5, plumeMatrixNum: 6,
      digTaskSlot: 3, updateMonBgTaskSlot: 4, clearMonBgTaskSlot: 5,
      shakeTaskSlot: 6,
      spriteOrder: [...inputs.spriteOrder].reverse(),
      monBg: { ...inputs.monBg, snapshot: { x: 63, y: 160 },
        baseScroll: { x: -49, y: -128 }, activeCnt: inputs.monBg.activeCnt ^ 2 },
      setupBgOffset: { x: -49, y: -73 },
      initialMatrixBitmap: inputs.initialMatrixBitmap ^ 0x20,
      initialScanline: { ...inputs.initialScanline,
        srcBuffer: inputs.initialScanline.srcBuffer === 0 ? 1 : 0,
        buffers: [
          inputs.initialScanline.buffers[0].map((value, index) => index >= 160 ? value ^ 1 : value),
          inputs.initialScanline.buffers[1].map((value, index) => index >= 160 ? value ^ 1 : value),
        ],
      },
    },
  };
  const digest = (config: SceneOnDigConfig): string => sha256(Buffer.concat(
    [0, 7, 10, 18, 52, 86, 120, 154, 167, 193, 194].map((age) => Buffer.from(render({
      ...createInitialState(), rngMode: "frontierBattle",
      sceneOnPresentation: { ...createSceneOnMovePresentation(config), age },
    }))),
  ));
  const canonical = digest(base), changed = digest(altered);
  if (canonical === changed) throw new Error("altered Dig control did not change framebuffer");
  return { species: ["FLYGON", "BLISSEY"], geometryChanged: true,
    allocationMatrixTaskOrderMonbgScanlineChanged: true, canonical, changed };
}

verifyDigReducer();
const orientations = [compareOrientation("player-back"), compareOrientation("opponent-front")];
const stable = {
  schema: "dig-actual-core-verdict/v1", oracleProfile: "battle-scene-on",
  move: "MOVE_DIG", rows: 526,
  componentMatched: orientations.reduce((sum, row) => sum + row.componentMatched, 0),
  framebufferMatched: orientations.reduce((sum, row) => sum + row.framebufferMatched, 0),
  residualPixels: orientations.reduce((sum, row) => sum + row.residualPixels, 0),
  orientations, alteredLiveControl: alteredControl(),
};
const report = { ...stable, digest: sha256(JSON.stringify(stable)) };
console.log(JSON.stringify(report));
if (process.argv.includes("--require-exact") && report.residualPixels !== 0) process.exitCode = 1;
