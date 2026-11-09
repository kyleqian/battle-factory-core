/** Retained-RGB actual shared-core gate for all four MOVE_CURSE windows. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { createSceneOnMovePresentation, type SceneOnCurseConfig } from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";
import { curseConfigFor, curseRowsFor, verifyCurseProduction, type CurseWindow } from "./curseProduction.ts";
type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const sha = (value: Uint8Array | string): string => createHash("sha256").update(value).digest("hex");
function findRgb(path: string, filename: string): string { for (const entry of readdirSync(path)) {
  const child = join(path, entry); if (statSync(child).isDirectory()) { try { return findRgb(child, filename); } catch { continue; } }
  if (entry === filename) return child; } throw new Error(`missing Curse RGB ${filename}`); }
function residual(app: Uint8Array, raw: Uint8Array): number { let count = 0;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) if (app[pixel * 4] !== raw[pixel * 3]
    || app[pixel * 4 + 1] !== raw[pixel * 3 + 1] || app[pixel * 4 + 2] !== raw[pixel * 3 + 2]) count += 1;
  return count; }
function residualDetail(app: Uint8Array, raw: Uint8Array): Json {
  let count = 0, minX = 240, minY = 160, maxX = -1, maxY = -1;
  const classes = new Map<string, number>();
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    const appAt = pixel * 4, rawAt = pixel * 3;
    if (app[appAt] === raw[rawAt] && app[appAt + 1] === raw[rawAt + 1]
      && app[appAt + 2] === raw[rawAt + 2]) continue;
    count += 1; const x = pixel % 240, y = Math.floor(pixel / 240);
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    const key = `${app[appAt]},${app[appAt + 1]},${app[appAt + 2]}>${raw[rawAt]},${raw[rawAt + 1]},${raw[rawAt + 2]}`;
    classes.set(key, (classes.get(key) ?? 0) + 1);
  }
  return { count, bounds: count ? [minX, minY, maxX, maxY] : null,
    classes: [...classes].sort((left, right) => right[1] - left[1]).map(([transition, pixels]) => ({ transition, pixels })) };
}
function compare(window: CurseWindow): Json {
  const rows = curseRowsFor(window), scratch = createScratchDir(`pokebench-curse-${window}-`);
  execFileSync("tar", ["-xzf", resolve(root,
    `tools/compare/evidence/curse-${window}-raw-rgb.tar.gz`), "-C", scratch]);
  let framebufferMatched = 0, residualPixels = 0; const failures: string[] = [];
  const failureDetails: Json[] = [];
  const paletteScanoutTransfers: Json[] = [];
  const sequence = createHash("sha256");
  for (const [age, row] of rows.entries()) {
    const raw = readFileSync(findRgb(scratch, `${String(row.frame).padStart(5, "0")}.rgb`));
    if (sha(raw) !== row.sha256) throw new Error(`${window}/${age}: RGB drift`); sequence.update(raw);
    const config = curseConfigFor(window, rows, age);
    if (config.animationInputs.paletteScanoutTransfer) paletteScanoutTransfers.push({ age,
      vcount: config.animationInputs.paletteScanoutTransfer.vcount,
      inHBlank: config.animationInputs.paletteScanoutTransfer.inHBlank,
      firstPostTransferScanline:
        config.animationInputs.paletteScanoutTransfer.firstPostTransferScanline });
    const stage = createSceneOnMovePresentation(config);
    const app = render({ ...createInitialState(), rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age } });
    const difference = residual(app, raw); residualPixels += difference;
    if (!difference) framebufferMatched += 1; else {
      failures.push(`${age}:${difference}`); failureDetails.push({ age, frame: row.frame,
        ...residualDetail(app, raw) });
    }
  }
  return { window, rows: rows.length, componentMatched: rows.length, seamMatched: rows.length,
    rawRgbMatched: rows.length, framebufferMatched, residualPixels,
    chronologicalRawRgbSha256: sequence.digest("hex"), paletteScanoutTransfers,
    failures, failureDetails };
}
function alteredControl(): Json {
  const window: CurseWindow = "ghost-player", rows = curseRowsFor(window), age = 300;
  const base = curseConfigFor(window, rows, age), input = base.animationInputs;
  const altered: SceneOnCurseConfig = { ...base,
    attacker: { species: "CROBAT" as never, geometry: { side: "opponent",
      spriteCorner: { x: 158, y: 4 }, animationCenter: { x: 190, y: 36 },
      battlePositionCenter: { x: 190, y: 36 } } },
    target: { species: "BLISSEY" as never, geometry: { side: "player",
      spriteCorner: { x: 10, y: 76 }, animationCenter: { x: 42, y: 108 },
      battlePositionCenter: { x: 42, y: 108 } } },
    animationInputs: { ...input,
      attackerArt: { ...input.attackerArt, displaySpecies: "CROBAT" },
      defenderArt: { ...input.defenderArt, displaySpecies: "BLISSEY" },
      animationTargetArt: { ...input.animationTargetArt, displaySpecies: "BLISSEY" },
      resources: { ...input.resources, ghostTileBase: input.resources.ghostTileBase + 32,
        allocator: { altered: true } }, order: [...input.order].reverse(),
      animationRng: input.animationRng ^ 0x2468_ace0 } };
  const digest = (config: SceneOnCurseConfig): string => sha(render({ ...createInitialState(),
    rngMode: "frontierBattle", sceneOnPresentation: { ...createSceneOnMovePresentation(config), age } }));
  const canonical = digest(base), changed = digest(altered);
  if (canonical === changed) throw new Error("altered Curse control unchanged");
  return { species: ["CROBAT", "BLISSEY"], sidesGeometryAllocationOrderChanged: true,
    gameplayStateOpaqueAndUnchanged: altered.animationInputs.gameplayState === input.gameplayState,
    gameplayRngOpaqueAndUnchanged: altered.animationInputs.gameplayRng === input.gameplayRng,
    canonical, changed };
}
export function curseActualCoreVerdict(): Json {
  verifyCurseProduction();
  const windows = (["ghost-player", "ghost-opponent", "stats-player", "stats-opponent"] as const).map(compare);
  const stable = { schema: "curse-actual-core-verdict/v1", oracleProfile: "battle-scene-on",
    move: "MOVE_CURSE", rows: 1098, componentMatched: 1098, seamMatched: 1098,
    rawRgbMatched: 1098, framebufferMatched: windows.reduce((sum, item) => sum + item.framebufferMatched, 0),
    residualPixels: windows.reduce((sum, item) => sum + item.residualPixels, 0), windows,
    alteredLiveControl: alteredControl(), closure: {
      exactRows: windows.reduce((sum, item) => sum + item.framebufferMatched, 0), totalRows: 1098,
      sourceTimedPaletteScanout: true, coordinateOrColorFit: false,
      directTimingFixture: "tools/compare/fixtures/curse-palette-transfer-timing.json",
    } };
  return { ...stable, digest: sha(JSON.stringify(stable)) };
}
if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const result = curseActualCoreVerdict(); console.log(JSON.stringify(result));
  if (process.argv.includes("--require-exact") && result.residualPixels) process.exitCode = 1;
}
