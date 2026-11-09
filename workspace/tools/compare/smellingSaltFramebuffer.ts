/** Strict shared-production-framebuffer verifier for retained Smelling Salt evidence. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  createSceneOnMovePresentation,
  sceneOnSmellingSaltView,
  type SceneOnPresentationBattler,
  type SceneOnSmellingSaltConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";

const root = resolve(new URL("../..", import.meta.url).pathname);
const receipt = JSON.parse(readFileSync(
  resolve(root, "tools/compare/fixtures/smelling-salt-evidence.json"),
  "utf8",
)) as Record<string, any>;

export type SmellingSaltOrientation = "player-back" | "opponent-front";

type DensePartyMon = Readonly<{
  hp: number;
  maxHp: number;
  gender: "male" | "female" | "genderless";
}>;

type DenseSprite = Readonly<{
  x: number;
  y: number;
  x2: number;
  y2: number;
  matrix: readonly number[];
}>;

type DenseRow = Readonly<{
  frame: number;
  sha256: string;
  animScriptActive: boolean;
  scriptOffset: number | null;
  battlerSprites: Readonly<{ attacker: DenseSprite; target: DenseSprite }>;
  parties: Readonly<{
    player: readonly DensePartyMon[];
    opponent: readonly DensePartyMon[];
  }>;
}>;

const sha256 = (value: Uint8Array | Buffer | string): string =>
  createHash("sha256").update(value).digest("hex");

function findRgb(path: string, filename: string): string {
  for (const entry of readdirSync(path)) {
    const child = join(path, entry);
    if (statSync(child).isDirectory()) {
      try {
        return findRgb(child, filename);
      } catch {
        continue;
      }
    }
    if (entry === filename) return child;
  }
  throw new Error("missing Smelling Salt RGB " + filename);
}

function rowsFor(orientation: SmellingSaltOrientation): readonly DenseRow[] {
  const item = receipt.orientations[orientation];
  const scenario = readFileSync(resolve(root, item.scenario));
  const dense = readFileSync(resolve(root, item.denseState));
  const rawArchive = readFileSync(resolve(root, item.rawRgbArchive));
  if (sha256(scenario) !== item.scenarioSha256
    || sha256(dense) !== item.denseStateSha256
    || sha256(rawArchive) !== item.rawRgbArchiveSha256) {
    throw new Error(orientation + " retained evidence hash drifted");
  }
  const probeJson = gunzipSync(dense);
  if (sha256(probeJson) !== item.probeJsonSha256) {
    throw new Error(orientation + " dense evidence decompression drifted");
  }
  const concatenatedRgb = execFileSync(
    "tar",
    ["-xOzf", resolve(root, item.rawRgbArchive)],
    { maxBuffer: 32 * 1024 * 1024 },
  );
  if (concatenatedRgb.length !== item.window.frameCount * 240 * 160 * 3
    || sha256(concatenatedRgb) !== item.rawRgbSequenceSha256) {
    throw new Error(orientation + " raw RGB sequence drifted");
  }
  return (JSON.parse(probeJson.toString("utf8")) as { frames: DenseRow[] }).frames;
}

function verifyChangeMap(
  orientation: SmellingSaltOrientation,
  rows: readonly DenseRow[],
  rgbRoot: string,
): void {
  const item = receipt.orientations[orientation];
  const first = rows[0];
  if (!first) throw new Error(orientation + " empty change-map window");
  const rgbDir = dirname(findRgb(
    rgbRoot,
    String(first.frame).padStart(5, "0") + ".rgb",
  ));
  const generated = execFileSync(
    "python3",
    [resolve(root, "tools/compare/frame-changemap.py"), rgbDir],
    { cwd: root, encoding: "utf8" },
  ).split("\n");
  generated[0] = `# smelling-salt-${orientation === "player-back" ? "player" : "opponent"} raw RGB888 — 121 frames, 240x160`;
  const normalized = generated.join("\n");
  const retained = readFileSync(resolve(root, item.changeMap), "utf8");
  if (normalized !== retained || sha256(retained) !== item.changeMapSha256) {
    throw new Error(orientation + " normalized change map drifted");
  }
}

function battler(
  species: "GRANBULL" | "ONIX",
  side: "player" | "opponent",
  source: DenseSprite,
  animationCenter: Readonly<{ x: number; y: number }>,
): SceneOnPresentationBattler {
  return {
    species: species as SceneOnPresentationBattler["species"],
    geometry: {
      side,
      spriteCorner: { x: source.x - 32, y: source.y - 32 },
      animationCenter,
      battlePositionCenter: side === "player" ? { x: 72, y: 80 } : { x: 176, y: 40 },
    },
  };
}

function visualGender(value: DensePartyMon["gender"]): "male" | "female" {
  if (value === "genderless") {
    throw new Error("Smelling Salt evidence field profile requires visible gender");
  }
  return value;
}

export function smellingSaltConfigFor(
  orientation: SmellingSaltOrientation,
  rows: readonly DenseRow[],
): SceneOnSmellingSaltConfig {
  const first = rows[0];
  if (!first) throw new Error("empty Smelling Salt dense window");
  const playerAttacker = orientation === "player-back";
  const player = first.parties.player[0];
  const opponent = first.parties.opponent[0];
  if (!player || !opponent) throw new Error("incomplete Smelling Salt party");
  return {
    move: "SMELLING_SALT",
    attacker: battler(
      "GRANBULL",
      playerAttacker ? "player" : "opponent",
      first.battlerSprites.attacker,
      playerAttacker ? { x: 72, y: 85 } : { x: 176, y: 46 },
    ),
    target: battler(
      "ONIX",
      playerAttacker ? "opponent" : "player",
      first.battlerSprites.target,
      playerAttacker ? { x: 176, y: 42 } : { x: 72, y: 88 },
    ),
    fieldProfile: {
      playerHp: player.hp,
      playerMaxHp: player.maxHp,
      opponentHp: opponent.hp,
      opponentMaxHp: opponent.maxHp,
      playerGender: visualGender(player.gender),
      opponentGender: visualGender(opponent.gender),
    },
    animationProfile: playerAttacker
      ? {
          targetLeft: 148,
          targetRight: 204,
          targetTop: 10,
          targetPictureY: 42,
          targetVerticalSpan: 60,
        }
      : {
          targetLeft: 44,
          targetRight: 100,
          targetTop: 56,
          targetPictureY: 88,
          targetVerticalSpan: 64,
        },
  };
}

export function compareSmellingSaltRows(
  orientation: SmellingSaltOrientation,
  rows: readonly DenseRow[],
  rgbRoot: string,
): Readonly<{ matched: number; residualPixels: number; failures: readonly string[] }> {
  const stage = createSceneOnMovePresentation(smellingSaltConfigFor(orientation, rows));
  const failures: string[] = [];
  let matched = 0;
  let residualPixels = 0;
  for (const [age, row] of rows.entries()) {
    const seam = sceneOnSmellingSaltView({ ...stage, age });
    if (seam.sourceOffset !== row.scriptOffset
      || seam.scriptActive !== row.animScriptActive) {
      throw new Error(orientation + " typed seam mismatch at age " + age);
    }
    const engine: EngineState = {
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age },
    };
    const app = render(engine);
    const raw = readFileSync(findRgb(
      rgbRoot,
      String(row.frame).padStart(5, "0") + ".rgb",
    ));
    if (sha256(raw) !== row.sha256) {
      throw new Error(orientation + " raw RGB hash mismatch at age " + age);
    }
    let residual = 0;
    let minX = 240;
    let minY = 160;
    let maxX = -1;
    let maxY = -1;
    for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
      if (app[pixel * 4] === raw[pixel * 3]
        && app[pixel * 4 + 1] === raw[pixel * 3 + 1]
        && app[pixel * 4 + 2] === raw[pixel * 3 + 2]) continue;
      residual += 1;
      const x = pixel % 240;
      const y = Math.floor(pixel / 240);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
    residualPixels += residual;
    if (residual === 0) matched += 1;
    else failures.push(`${age}:${residual}:${minX},${minY}-${maxX},${maxY}`);
  }
  return { matched, residualPixels, failures };
}

export function verifySmellingSaltFramebuffer(): readonly Readonly<{
  orientation: SmellingSaltOrientation;
  componentRows: 121;
  seamRows: 121;
  rawRgbRows: 121;
  changeMapRows: 121;
  framebufferRows: 121;
  residualPixels: 0;
}>[] {
  const results = [];
  let total = 0;
  for (const orientation of ["player-back", "opponent-front"] as const) {
    const rows = rowsFor(orientation);
    if (rows.length !== 121) throw new Error(orientation + " incomplete dense window");
    const scratch = createScratchDir("pokebench-smelling-salt-" + orientation + "-");
    execFileSync("tar", [
      "-xzf",
      resolve(root, receipt.orientations[orientation].rawRgbArchive),
      "-C",
      scratch,
    ]);
    verifyChangeMap(orientation, rows, scratch);
    const compared = compareSmellingSaltRows(orientation, rows, scratch);
    if (compared.failures.length > 0) {
      throw new Error(
        orientation + ": " + compared.matched + "/121 residual "
          + compared.residualPixels + "; " + compared.failures.join(","),
      );
    }
    total += compared.matched;
    results.push({
      orientation,
      componentRows: 121 as const,
      seamRows: 121 as const,
      rawRgbRows: 121 as const,
      changeMapRows: 121 as const,
      framebufferRows: compared.matched as 121,
      residualPixels: compared.residualPixels as 0,
    });
  }
  if (total !== 242) throw new Error("incomplete Smelling Salt proof " + total + "/242");
  return results;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  for (const result of verifySmellingSaltFramebuffer()) {
    console.log(result.orientation + ": 121/121 framebuffer rows, residual=0");
  }
  console.log("MOVE_SMELLING_SALT: 242/242 exact with zero residual pixels");
}
