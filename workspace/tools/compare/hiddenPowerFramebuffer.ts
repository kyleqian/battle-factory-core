/** Actual-core comparator and typed live fixture adapter for MOVE_HIDDEN_POWER. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  createSceneOnMovePresentation,
  sceneOnHiddenPowerView,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";
import {
  hiddenPowerConfigFor,
  hiddenPowerFixture as fixture,
  hiddenPowerRowsFor,
  type HiddenPowerOrientation,
} from "./hiddenPowerFixture.ts";

export { hiddenPowerConfigFor, hiddenPowerRowsFor, type HiddenPowerOrientation } from "./hiddenPowerFixture.ts";

type Row = Record<string, any>;
const root = resolve(new URL("../..", import.meta.url).pathname);
const sha = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");

function findRgb(path: string, filename: string): string {
  for (const entry of readdirSync(path)) {
    const child = join(path, entry);
    if (statSync(child).isDirectory()) { try { return findRgb(child, filename); } catch { continue; } }
    if (entry === filename) return child;
  }
  throw new Error(`missing Hidden Power RGB ${filename}`);
}

export function compareHiddenPowerRows(
  orientation: HiddenPowerOrientation,
  rows: readonly Row[],
  rgbRoot: string,
) {
  const stage = createSceneOnMovePresentation(hiddenPowerConfigFor(orientation, rows));
  let matched = 0;
  let residualPixels = 0;
  const failures: string[] = [];
  for (const [age, row] of rows.entries()) {
    const seam = sceneOnHiddenPowerView({ ...stage, age });
    if (seam.sourceOffset !== row.scriptOffset || seam.sourceWait !== row.scriptWait
      || seam.scriptActive !== row.animScriptActive) throw new Error(`${orientation} age ${age}: typed seam mismatch`);
    const engine: EngineState = { ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...stage, age } };
    const app = render(engine);
    const raw = readFileSync(findRgb(rgbRoot, `${String(row.frame).padStart(5, "0")}.rgb`));
    if (sha(raw) !== row.sha256) throw new Error(`${orientation} age ${age}: raw hash`);
    let residual = 0, minX = 240, minY = 160, maxX = -1, maxY = -1;
    for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
      if (app[pixel * 4] === raw[pixel * 3] && app[pixel * 4 + 1] === raw[pixel * 3 + 1]
        && app[pixel * 4 + 2] === raw[pixel * 3 + 2]) continue;
      residual += 1;
      const x = pixel % 240, y = Math.floor(pixel / 240);
      minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
    residualPixels += residual;
    if (residual === 0) matched += 1;
    else failures.push(`${age}:${residual}:${minX},${minY}-${maxX},${maxY}`);
  }
  return { matched, residualPixels, failures };
}

export function verifyHiddenPowerFramebuffer() {
  const output = [];
  for (const orientation of ["player-back", "opponent-front"] as const) {
    const rows = hiddenPowerRowsFor(orientation);
    const item = fixture.orientations[orientation];
    const archive = readFileSync(resolve(root, item.rawRgbArchive));
    if (sha(archive) !== item.rawRgbArchiveSha256) throw new Error(`${orientation} RGB archive hash`);
    const scratch = createScratchDir(`pokebench-hidden-power-${orientation}-`);
    execFileSync("tar", ["-xzf", resolve(root, item.rawRgbArchive), "-C", scratch]);
    const compared = compareHiddenPowerRows(orientation, rows, scratch);
    if (compared.failures.length) throw new Error(`${orientation}: ${compared.matched}/180 residual ${compared.residualPixels}; ${compared.failures.slice(0, 40).join(",")}`);
    output.push({ orientation, componentRows: 180, seamRows: 180, rawRgbRows: 180, framebufferRows: 180, residualPixels: 0 });
  }
  return output;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  for (const result of verifyHiddenPowerFramebuffer()) console.log(`${result.orientation}: 180/180 framebuffer rows, residual=0`);
  console.log("MOVE_HIDDEN_POWER: 360/360 exact with zero residual pixels");
}
