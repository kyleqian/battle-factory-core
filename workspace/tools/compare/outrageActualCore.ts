/** Complete retained-RGB production gate for MOVE_OUTRAGE's legal body. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  createSceneOnMovePresentation,
  sceneOnOutrageView,
  type SceneOnOutrageConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { outrageAtAge } from "../../src/animation/outrage.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";
import {
  outrageConfigFor,
  outrageInputsFor,
  verifyOutrageReducer,
  type OutrageOrientation,
} from "./verifyOutrageReducer.ts";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const sha256 = (value: Uint8Array | string): string =>
  createHash("sha256").update(value).digest("hex");

function rowsFor(orientation: OutrageOrientation): Json[] {
  const side = orientation === "player-back" ? "player" : "opponent";
  const corpus = JSON.parse(gunzipSync(readFileSync(resolve(
    root,
    `tools/compare/evidence/outrage-${side}-dense-state.json.gz`,
  ))).toString("utf8")) as Json;
  if (corpus.profile !== "battle-scene-on" || corpus.move !== 200 || corpus.frames.length !== 120) {
    throw new Error(`${orientation}: retained Outrage corpus changed`);
  }
  return corpus.frames;
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

function compareOrientation(orientation: OutrageOrientation): Json {
  const stem = orientation === "player-back" ? "player" : "opponent";
  const rows = rowsFor(orientation);
  const config = outrageConfigFor(orientation, rows);
  const input = outrageInputsFor(orientation, rows);
  const scratch = createScratchDir(`pokebench-outrage-${stem}-`);
  execFileSync("tar", [
    "-xzf",
    resolve(root, `tools/compare/evidence/outrage-${stem}-raw-rgb.tar.gz`),
    "-C",
    scratch,
  ]);
  let componentMatched = 0;
  let seamMatched = 0;
  let rawRgbMatched = 0;
  let framebufferMatched = 0;
  let residualPixels = 0;
  const failures: string[] = [];
  for (const [age, row] of rows.entries()) {
    const component = outrageAtAge(age, input);
    const state = { ...createSceneOnMovePresentation(config), age };
    const view = sceneOnOutrageView(state);
    if (component.source.pointerOffset !== row.scriptOffset
      || component.source.wait !== row.scriptWait
      || component.active !== row.animScriptActive) {
      throw new Error(`${orientation}/age${age}: component drift`);
    }
    componentMatched += 1;
    if (view.source.pointerOffset !== component.source.pointerOffset
      || view.sprites.length !== component.sprites.length
      || view.tasks.length !== component.tasks.length) {
      throw new Error(`${orientation}/age${age}: seam drift`);
    }
    seamMatched += 1;
    const raw = readFileSync(resolve(scratch, `${String(row.frame).padStart(5, "0")}.rgb`));
    if (sha256(raw) !== row.sha256) throw new Error(`${orientation}/age${age}: raw RGB drift`);
    rawRgbMatched += 1;
    // Construct a new core state for every row. The launcher runs this gate
    // twice as separate processes; no renderer state is shared across rows or
    // processes.
    const app = render({
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: state,
    });
    const residual = frameDiff(app, raw);
    residualPixels += residual;
    if (residual === 0) framebufferMatched += 1;
    else failures.push(`${age}:${residual}`);
  }
  return {
    orientation,
    rows: rows.length,
    componentMatched,
    seamMatched,
    rawRgbMatched,
    framebufferMatched,
    residualPixels,
    failures,
  };
}

function alteredControl(): Json {
  const rows = rowsFor("player-back");
  const base = outrageConfigFor("player-back", rows);
  const input = base.animationInputs;
  const hardware = [...input.palettes.hardware];
  hardware[16 * 16 + 1] = hardware[16 * 16 + 2]!;
  const altered: SceneOnOutrageConfig = {
    ...base,
    attacker: {
      species: "CROBAT",
      geometry: {
        side: "opponent",
        spriteCorner: { x: 169, y: 11 },
        animationCenter: { x: 201, y: 43 },
        battlePositionCenter: { x: 201, y: 43 },
      },
    },
    target: {
      species: "BLISSEY",
      geometry: {
        side: "player",
        spriteCorner: { x: 7, y: 85 },
        animationCenter: { x: 39, y: 117 },
        battlePositionCenter: { x: 39, y: 85 },
      },
    },
    animationInputs: {
      ...input,
      attackerSprite: {
        ...input.attackerSprite,
        slot: 21,
        x: 201,
        y: 43,
        subpriority: 55,
        attr: [11, 32969, 2417],
      },
      targetSprite: {
        ...input.targetSprite,
        slot: 22,
        x: 39,
        y: 117,
        subpriority: 14,
        attr: [85, 32775, 6617],
      },
      taskSlots: {
        loopSe: input.taskSlots.loopSe + 30,
        blendColorCycle: input.taskSlots.blendColorCycle + 30,
        translateMonElliptical: input.taskSlots.translateMonElliptical + 30,
        shakeMon2: input.taskSlots.shakeMon2 + 30,
      },
      spriteSlots: {
        flames: input.spriteSlots.flames.map((slot) => (slot + 29) & 63),
      },
      resources: {
        smallEmber: {
          ...input.resources.smallEmber,
          paletteAllocatorSlot: input.resources.smallEmber.paletteAllocatorSlot - 1,
          hardwarePaletteBank: input.resources.smallEmber.hardwarePaletteBank - 1,
        },
      },
      allocator: {
        ...input.allocator,
        spriteOrder: [...input.allocator.spriteOrder].reverse(),
        initialMatrixBitmap: input.allocator.initialMatrixBitmap ^ 0x40,
      },
      palettes: { ...input.palettes, hardware },
      animationRngSeed: 0x12345678,
    },
  };
  const ages = [0, 6, 14, 35, 64, 80, 92, 107, 118, 119];
  const digest = (config: SceneOnOutrageConfig): string => sha256(Buffer.concat(
    ages.map((age) => Buffer.from(render({
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...createSceneOnMovePresentation(config), age },
    }))),
  ));
  const canonical = digest(base);
  const changed = digest(altered);
  if (canonical === changed) throw new Error("altered Outrage control did not change framebuffer");
  const baseView = sceneOnOutrageView({ ...createSceneOnMovePresentation(base), age: 35 });
  const alteredView = sceneOnOutrageView({ ...createSceneOnMovePresentation(altered), age: 35 });
  if (sha256(JSON.stringify(baseView)) === sha256(JSON.stringify(alteredView))) {
    throw new Error("altered Outrage control did not change seam output");
  }
  if (altered.animationInputs.gameplayRng !== input.gameplayRng
    || altered.animationInputs.gameplayState !== input.gameplayState) {
    throw new Error("altered Outrage control changed opaque gameplay identity");
  }
  return {
    species: ["CROBAT", "BLISSEY"],
    sidesReversed: true,
    geometryAllocationOrderPaletteAndPresentationRngChanged: true,
    gameplayRngOpaqueAndUnchanged: true,
    canonical,
    changed,
  };
}

verifyOutrageReducer();
const orientations = [
  compareOrientation("player-back"),
  compareOrientation("opponent-front"),
];
const stable = {
  schema: "outrage-actual-core-verdict/v1",
  oracleProfile: "battle-scene-on",
  move: "MOVE_OUTRAGE",
  processId: process.pid,
  rows: 240,
  componentMatched: orientations.reduce((sum, row) => sum + row.componentMatched, 0),
  seamMatched: orientations.reduce((sum, row) => sum + row.seamMatched, 0),
  rawRgbMatched: orientations.reduce((sum, row) => sum + row.rawRgbMatched, 0),
  framebufferMatched: orientations.reduce((sum, row) => sum + row.framebufferMatched, 0),
  residualPixels: orientations.reduce((sum, row) => sum + row.residualPixels, 0),
  orientations,
  alteredLiveControl: alteredControl(),
  freshProcessPass: 1,
};
const report = { ...stable, digest: sha256(JSON.stringify(stable)) };
console.log(JSON.stringify(report));
if (process.argv.includes("--require-exact") && report.residualPixels !== 0) process.exitCode = 1;
