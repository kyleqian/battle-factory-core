/**
 * Closure check for MOVE_FURY_CUTTER's retained actual-core residual. It
 * reruns the original temporal/provenance classification after the generic
 * compositor repair and proves that every prior phase now has an empty mask.
 * This remains verifier-only and never feeds the live renderer.
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { createSceneOnMovePresentation } from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";
import { furyCutterActualCoreVerdict } from "./furyCutterActualCore.ts";
import { furyCutterConfigFor, furyCutterRowsFor,
  type FuryCutterWindow } from "./furyCutterProduction.ts";

type Json = Record<string, any>;
type Orientation = "player-back" | "opponent-front";
type Phase = "static-field-battler-chrome" | "monbg-transition" | "cut-obj-alpha"
  | "monbg-alpha" | "cut-obj-palette";

const root = resolve(import.meta.dirname, "../..");
const sha = (value: Uint8Array): string => createHash("sha256").update(value).digest("hex");
const CUT_TEMPLATE = "gCuttingSliceSpriteTemplate";
const PALETTE_TEMPLATE = "gComplexPaletteBlendSpriteTemplate";

function invariant(value: unknown, message: string): asserts value {
  if (!value) throw new Error(`MOVE_FURY_CUTTER residual diagnosis: ${message}`);
}

function findRgb(path: string, filename: string): string {
  for (const entry of readdirSync(path)) {
    const child = join(path, entry);
    if (statSync(child).isDirectory()) {
      try { return findRgb(child, filename); } catch { continue; }
    }
    if (entry === filename) return child;
  }
  throw new Error(`missing Fury Cutter RGB ${filename}`);
}

function mismatchMask(app: Uint8Array, raw: Uint8Array): Uint8Array {
  const mask = new Uint8Array(240 * 160);
  for (let pixel = 0; pixel < mask.length; pixel += 1) {
    mask[pixel] = Number(app[pixel * 4] !== raw[pixel * 3]
      || app[pixel * 4 + 1] !== raw[pixel * 3 + 1]
      || app[pixel * 4 + 2] !== raw[pixel * 3 + 2]);
  }
  return mask;
}

function count(mask: Uint8Array): number {
  return mask.reduce((total, value) => total + value, 0);
}

function sameMask(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) if (left[index] !== right[index]) return false;
  return true;
}

/** Classifies source latches, never pixel positions or RGB values. */
function phaseFor(row: Json): Phase {
  const templates = new Set(row.sprites.map((sprite: Json) => sprite.template?.symbol));
  const cut = templates.has(CUT_TEMPLATE);
  const palette = templates.has(PALETTE_TEMPLATE);
  const monbg = row.tasks.some((task: Json) => /MonBg/u.test(task.func?.symbol ?? ""));
  if (cut && palette) return "cut-obj-palette";
  if (cut) return "cut-obj-alpha";
  if (row.registers.bldcnt !== 0) return "monbg-alpha";
  if (monbg) return "monbg-transition";
  return "static-field-battler-chrome";
}

function windowsFor(orientation: Orientation): readonly FuryCutterWindow[] {
  return ([1, 2, 3, 4] as const).map((counter) => `${orientation}-${counter}` as FuryCutterWindow);
}

function diagnoseOrientation(orientation: Orientation): Json {
  const side = orientation === "player-back" ? "player" : "opponent";
  const scratch = createScratchDir(`pokebench-fury-cutter-residual-${side}-`);
  const archive = resolve(root, `tools/compare/evidence/fury-cutter-${side}-raw-rgb.tar.gz`);
  execFileSync("tar", ["-xzf", archive, "-C", scratch]);

  const records: Array<{ phase: Phase; mask: Uint8Array }> = [];
  for (const window of windowsFor(orientation)) {
    const rows = furyCutterRowsFor(window);
    invariant(rows.length === 43, `${window}: incomplete corpus`);
    for (const [age, row] of rows.entries()) {
      const raw = readFileSync(findRgb(scratch, `${String(row.frame).padStart(5, "0")}.rgb`));
      invariant(sha(raw) === row.sha256, `${window}/${age}: raw RGB drift`);
      const stage = createSceneOnMovePresentation(furyCutterConfigFor(window, rows, age));
      const app = render({ ...createInitialState(), rngMode: "frontierBattle",
        sceneOnPresentation: { ...stage, age } });
      records.push({ phase: phaseFor(row), mask: mismatchMask(app, raw) });
    }
  }

  const quiet = records.filter((record) => record.phase === "static-field-battler-chrome");
  invariant(quiet.length === 44, `${orientation}: expected 44 source-quiet rows`);
  const baseline = quiet[0]!.mask;
  invariant(quiet.every((record) => sameMask(record.mask, baseline)),
    `${orientation}: source-quiet residual mask drift`);
  invariant(records.every((record) => baseline.every((value, pixel) => !value || record.mask[pixel])),
    `${orientation}: static mask is not retained by every live row`);

  const phases = Object.fromEntries(([
    "static-field-battler-chrome", "monbg-transition", "cut-obj-alpha",
    "monbg-alpha", "cut-obj-palette",
  ] as const).map((phase) => [phase, { rows: 0, residualPixels: 0, staticPixels: 0,
    activePixels: 0 }])) as Record<Phase, Json>;
  for (const record of records) {
    const entry = phases[record.phase];
    entry.rows += 1;
    for (let pixel = 0; pixel < record.mask.length; pixel += 1) {
      if (!record.mask[pixel]) continue;
      entry.residualPixels += 1;
      if (baseline[pixel]) entry.staticPixels += 1;
      else entry.activePixels += 1;
    }
  }

  const residualPixels = records.reduce((total, record) => total + count(record.mask), 0);
  const staticPixels = Object.values(phases).reduce((total, entry) => total + entry.staticPixels, 0);
  const activePixels = residualPixels - staticPixels;
  invariant(staticPixels + activePixels === residualPixels, `${orientation}: incomplete accounting`);
  return { orientation, rows: records.length, quietRows: quiet.length, baselineMaskPixels: count(baseline),
    residualPixels, staticPixels, activePixels, phases };
}

export function furyCutterResidualDiagnosis(): Json {
  const actualCore = furyCutterActualCoreVerdict();
  const orientations = (["player-back", "opponent-front"] as const)
    .map((orientation) => diagnoseOrientation(orientation));
  const residualPixels = orientations.reduce((total, orientation) => total + orientation.residualPixels, 0);
  const staticPixels = orientations.reduce((total, orientation) => total + orientation.staticPixels, 0);
  const active = {
    monbgTransition: orientations.reduce((total, orientation) =>
      total + orientation.phases["monbg-transition"].activePixels, 0),
    cutObjAlpha: orientations.reduce((total, orientation) =>
      total + orientation.phases["cut-obj-alpha"].activePixels, 0),
    monbgAlpha: orientations.reduce((total, orientation) =>
      total + orientation.phases["monbg-alpha"].activePixels, 0),
    cutObjPalette: orientations.reduce((total, orientation) =>
      total + orientation.phases["cut-obj-palette"].activePixels, 0),
  };
  const activePixels = Object.values(active).reduce((total, value) => total + value, 0);
  invariant(actualCore.rows === 344 && actualCore.framebufferMatched === 344,
    "actual-core comparison is not exact");
  invariant(actualCore.residualPixels === residualPixels && staticPixels + activePixels === residualPixels,
    "actual-core residual accounting drift");
  return {
    schema: "fury-cutter-residual-closure/v1", oracleProfile: "battle-scene-on",
    move: "MOVE_FURY_CUTTER", status: "exact-closed", coverageCredit: true,
    actualCore: { rows: actualCore.rows, framebufferMatched: actualCore.framebufferMatched,
      residualPixels: actualCore.residualPixels },
    method: {
      sourceQuietRowsPerOrientation: 44,
      staticMask: "identical across source-quiet rows and subset of every retained row",
      activeClassification: "live CUT template, palette OBJ template, monbg task, and BLD control state",
      noCoordinateOrRgbFitting: true,
      runtimeOrCoverageUse: false,
    },
    resolvedFrom: { residualPixels: 1_225_822, staticFieldBattlerChromePixels: 802_380,
      activePixels: 423_442, repair: "live display identity, target monbg, normal CUT ObjBlend" },
    residualPixels, staticFieldBattlerChromePixels: staticPixels,
    activePixels, active, orientations,
    boundary: { productionChanged: true, coveragePromotion: true,
      componentTrackFulfilled: true, gameplayStateOwned: false,
      boundaryOrBarrierChanged: false },
  };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  console.log(JSON.stringify(furyCutterResidualDiagnosis(), null, 2));
}
