/** Strict shared-production-framebuffer verifier for retained Sweet Scent evidence. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  createSceneOnMovePresentation,
  sceneOnSweetScentView,
  type SceneOnPresentationBattler,
  type SceneOnSweetScentConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";
import { verifySweetScentEvidence } from "./sweetScentEvidence.ts";

const fixture = JSON.parse(readFileSync(
  "tools/compare/fixtures/sweet-scent-evidence.json",
  "utf8",
));
export type SweetScentOrientation = "player-back" | "opponent-front";
type DenseRow = Readonly<{
  frame: number;
  sha256: string;
  battlers: Readonly<{
    player: Readonly<{ hp: number; maxHp: number }>;
    opponent: Readonly<{ hp: number; maxHp: number }>;
  }>;
}>;

const PETAL_SLOTS = [3, 4, 5, 7, 9, 10, 3, 11, 12, 13, 14, 15,
  16, 17, 4, 5, 7, 9, 10, 3, 11, 12, 13, 14] as const;

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function findRgb(root: string, filename: string): string {
  for (const entry of readdirSync(root)) {
    const path = join(root, entry);
    if (statSync(path).isDirectory()) {
      try { return findRgb(path, filename); } catch { continue; }
    }
    if (entry === filename) return path;
  }
  throw new Error(`missing ${filename} below ${root}`);
}

function battler(
  species: "WEEPINBELL" | "ONIX",
  side: "player" | "opponent",
): SceneOnPresentationBattler {
  return {
    species,
    geometry: {
      side,
      spriteCorner: side === "player"
        ? { x: 40, y: species === "WEEPINBELL" ? 57 : 48 }
        : { x: 144, y: species === "WEEPINBELL" ? 19 : 10 },
      animationCenter: side === "player" ? { x: 72, y: 90 } : { x: 176, y: 42 },
      battlePositionCenter: side === "player" ? { x: 72, y: 80 } : { x: 176, y: 40 },
    },
  };
}

export function sweetScentConfigFor(
  orientation: SweetScentOrientation,
  rows: readonly DenseRow[],
): SceneOnSweetScentConfig {
  const playerAttacker = orientation === "player-back";
  const first = rows[0]!;
  return {
    move: "SWEET_SCENT",
    attacker: battler("WEEPINBELL", playerAttacker ? "player" : "opponent"),
    target: battler("ONIX", playerAttacker ? "opponent" : "player"),
    fieldProfile: {
      playerHp: first.battlers.player.hp,
      playerMaxHp: first.battlers.player.maxHp,
      opponentHp: first.battlers.opponent.hp,
      opponentMaxHp: first.battlers.opponent.maxHp,
      playerGender: "male",
      opponentGender: "male",
    },
    animationProfile: {
      spriteSlots: PETAL_SLOTS,
      targetSubpriority: playerAttacker ? 28 : 38,
    },
  };
}

export function compareSweetScentRows(
  orientation: SweetScentOrientation,
  rows: readonly DenseRow[],
  rgbRoot: string,
): Readonly<{ matched: number; residualPixels: number; failures: readonly string[] }> {
  const stage = createSceneOnMovePresentation(sweetScentConfigFor(orientation, rows));
  const failures: string[] = [];
  let matched = 0;
  let residualPixels = 0;
  for (const [pointerAge, row] of rows.entries()) {
    const age = pointerAge - 4;
    const seam = sceneOnSweetScentView({ ...stage, age });
    if (seam.age !== age) throw new Error(`${orientation} row ${pointerAge}: seam age`);
    const engine: EngineState = {
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age },
    };
    const app = render(engine);
    const raw = readFileSync(findRgb(
      rgbRoot,
      `${String(row.frame).padStart(5, "0")}.rgb`,
    ));
    if (sha256(raw) !== row.sha256) throw new Error(`${orientation} row ${pointerAge}: raw SHA`);
    let residual = 0;
    let minX = 240; let minY = 160; let maxX = -1; let maxY = -1;
    for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
      if (app[pixel * 4] === raw[pixel * 3]
        && app[pixel * 4 + 1] === raw[pixel * 3 + 1]
        && app[pixel * 4 + 2] === raw[pixel * 3 + 2]) continue;
      residual += 1;
      const x = pixel % 240; const y = Math.floor(pixel / 240);
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
    residualPixels += residual;
    if (residual === 0) matched += 1;
    else failures.push(`${pointerAge}:${residual}:${minX},${minY}-${maxX},${maxY}`);
  }
  return { matched, residualPixels, failures };
}

export function verifySweetScentFramebuffer(): readonly Readonly<{
  orientation: SweetScentOrientation;
  componentRows: 175;
  seamRows: 175;
  rawRgbRows: 175;
  framebufferRows: 175;
  residualPixels: 0;
}>[] {
  verifySweetScentEvidence();
  const results = [];
  let total = 0;
  for (const orientation of ["player-back", "opponent-front"] as const) {
    const receipt = fixture.orientations[orientation];
    const denseBytes = readFileSync(receipt.denseState);
    if (sha256(denseBytes) !== receipt.denseStateSha256
      || sha256(readFileSync(receipt.rawRgbArchive)) !== receipt.rawRgbArchiveSha256) {
      throw new Error(`${orientation}: retained archive hash drifted`);
    }
    const rows = JSON.parse(gunzipSync(denseBytes).toString()).frames as DenseRow[];
    if (rows.length !== 175) throw new Error(`${orientation}: expected 175 rows`);
    const scratch = createScratchDir(`pokebench-sweet-scent-${orientation}-`);
    execFileSync("tar", ["-xzf", receipt.rawRgbArchive, "-C", scratch]);
    const compared = compareSweetScentRows(orientation, rows, scratch);
    if (compared.failures.length) {
      throw new Error(`${orientation}: ${compared.matched}/175 residual ${compared.residualPixels}; ${compared.failures.join(",")}`);
    }
    total += compared.matched;
    results.push({ orientation, componentRows: 175 as const, seamRows: 175 as const,
      rawRgbRows: 175 as const, framebufferRows: 175 as const,
      residualPixels: compared.residualPixels as 0 });
  }
  if (total !== 350) throw new Error(`incomplete bilateral proof ${total}/350`);
  return results;
}

if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  for (const result of verifySweetScentFramebuffer()) {
    console.log(`${result.orientation}: framebuffer=175/175 residual=0`);
  }
  console.log("MOVE_SWEET_SCENT: 350/350 exact with zero residual pixels");
}
