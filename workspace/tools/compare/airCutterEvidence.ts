/**
 * Hermetic receipt verifier for the MOVE_AIR_CUTTER source/staging checkpoint.
 *
 * This intentionally verifies recorded legal Scene-ON evidence only.  It does
 * not import a production reducer, compositor, or presentation seam, and it
 * grants no coverage credit.  Re-running the mGBA capture is a separate,
 * explicit staging operation through tools/run-mgba-probe.py.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { gunzipSync } from "node:zlib";

type Json = Record<string, any>;
type Orientation = "player-back" | "opponent-front";

const root = resolve(new URL("../..", import.meta.url).pathname);
const fixture = JSON.parse(readFileSync(
  resolve(root, "tools/compare/fixtures/air-cutter-evidence.json"), "utf8",
)) as Json;
const orientations: readonly Orientation[] = ["player-back", "opponent-front"];
const ownedTemplates = new Set([
  "gAirWaveProjectileSpriteTemplate",
  "gAirCutterSliceSpriteTemplate",
]);
const sourceStart = 0x082ced58;
const sourceEnd = 0x082cedba;
const frameBytes = 240 * 160 * 3;

const sha = (value: Buffer | string): string =>
  createHash("sha256").update(value).digest("hex");
const same = (left: unknown, right: unknown): boolean =>
  JSON.stringify(left) === JSON.stringify(right);
function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function transitionRows(rows: readonly Json[], key: string): number[] {
  return rows.slice(1).flatMap((row, index) =>
    same(row[key], rows[index]![key]) ? [] : [index + 1],
  );
}

function predecessorMatches(rows: readonly Json[], hardware: string, software: string): number {
  return rows.slice(1).filter((row, index) =>
    same(row[hardware], rows[index]![software]),
  ).length;
}

function ownedSprites(row: Json): Json[] {
  return row.sprites.filter((sprite: Json) =>
    ownedTemplates.has(sprite.template?.symbol),
  );
}

function normalizedOwnedSprites(row: Json): Json[] {
  return ownedSprites(row).map((sprite) => ({
    slot: sprite.slot,
    template: sprite.template?.symbol,
    callback: sprite.callback?.symbol,
    x: sprite.x,
    y: sprite.y,
    x2: sprite.x2,
    y2: sprite.y2,
    animNum: sprite.animNum,
    animCmdIndex: sprite.animCmdIndex,
    data: sprite.data,
  }));
}

function firstAtOrAfter(values: readonly number[], minimum: number): number | null {
  return values.find((value) => value >= minimum) ?? null;
}

function pixelChanges(rows: readonly Json[], rgb: readonly Buffer[]): Json[] {
  return rows.map((row, age) => {
    let changedPixels = 0;
    let minX = 240;
    let minY = 160;
    let maxX = -1;
    let maxY = -1;
    if (age > 0) {
      const before = rgb[age - 1]!;
      const after = rgb[age]!;
      for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
        const offset = pixel * 3;
        if (before[offset] === after[offset]
          && before[offset + 1] === after[offset + 1]
          && before[offset + 2] === after[offset + 2]) continue;
        changedPixels += 1;
        const x = pixel % 240;
        const y = Math.floor(pixel / 240);
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
    const target = row.battlerSprites.target;
    return {
      age,
      frame: row.frame,
      scriptOffset: row.scriptOffset,
      active: row.animScriptActive,
      changedPixels,
      bounds: changedPixels ? [minX, minY, maxX, maxY] : null,
      ownedSprites: normalizedOwnedSprites(row),
      ownedTasks: row.tasks.map((task: Json) => task.func?.symbol).filter((name: string | null) =>
        name && (/AirCutter|ShakeMon2/.test(name)),
      ),
      target: {
        slot: target.slot,
        x: target.x,
        y: target.y,
        x2: target.x2,
        y2: target.y2,
      },
      visualTaskCount: row.visualTaskCount,
      soundTaskCount: row.soundTaskCount,
      registers: row.registers,
      paletteTags: row.paletteTags,
      tileTags: row.tileTags,
    };
  });
}

function buildChangeMap(
  orientation: Orientation,
  rows: readonly Json[],
  rgb: readonly Buffer[],
): string {
  const changes = pixelChanges(rows, rgb);
  const waveRows = changes.filter((row) => row.ownedSprites.some((sprite: Json) =>
    sprite.template === "gAirWaveProjectileSpriteTemplate",
  )).map((row) => row.age);
  const sliceRows = changes.filter((row) => row.ownedSprites.some((sprite: Json) =>
    sprite.template === "gAirCutterSliceSpriteTemplate",
  )).map((row) => row.age);
  const shakeRows = changes.filter((row) => row.ownedTasks.includes("AnimTask_ShakeMon2_Step"))
    .map((row) => row.age);
  const targetAxisRows = changes.slice(1).flatMap((row, index) =>
    row.target.x2 === changes[index]!.target.x2 && row.target.y2 === changes[index]!.target.y2
      ? [] : [index + 1],
  );
  const oamSoftwareTransitions = transitionRows(rows, "softwareOam");
  const oamHardwareTransitions = transitionRows(rows, "hardwareOam");
  const paletteHardwareTransitions = transitionRows(rows, "hardwarePalette");
  const paletteFadedTransitions = transitionRows(rows, "fadedPalette");
  const firstWave = waveRows[0] ?? null;
  const firstSlice = sliceRows[0] ?? null;
  const firstShake = shakeRows[0] ?? null;
  const firstChangedAfter = (age: number | null): number | null => age === null
    ? null
    : changes.find((row) => row.age >= age && row.changedPixels > 0)?.age ?? null;
  const tags = (key: "paletteTags" | "tileTags") =>
    [...new Set(rows.flatMap((row) => row[key]))].filter((tag) => tag >= 10000 && tag < 20000)
      .sort((left, right) => left - right);
  const output = {
    schema: "air-cutter-normalized-change-map/v1",
    orientation,
    sourceWindow: {
      startFrame: rows[0]!.frame,
      endFrame: rows.at(-1)!.frame,
      frameCount: rows.length,
    },
    resourceTags: { palette: tags("paletteTags"), tile: tags("tileTags") },
    edges: {
      firstWaveSpriteRamRow: firstWave,
      firstWaveSoftwareOamTransition: firstAtOrAfter(oamSoftwareTransitions, firstWave ?? 0),
      firstWaveHardwareOamTransition: firstAtOrAfter(oamHardwareTransitions, firstWave ?? 0),
      firstWaveFramebufferDelta: firstChangedAfter(firstWave),
      firstSliceSpriteRamRow: firstSlice,
      firstSliceSoftwareOamTransition: firstAtOrAfter(oamSoftwareTransitions, firstSlice ?? 0),
      firstSliceHardwareOamTransition: firstAtOrAfter(oamHardwareTransitions, firstSlice ?? 0),
      firstSliceFramebufferDelta: firstChangedAfter(firstSlice),
      firstShakeTaskRamRow: firstShake,
      firstTargetAxisRamRow: firstAtOrAfter(targetAxisRows, firstShake ?? 0),
      firstFramebufferDeltaAtOrAfterShake: firstChangedAfter(firstShake),
      firstInactiveScriptRow: changes.findIndex((row) => !row.active),
      note: "The shake interval overlaps the slice, so this source/staging map deliberately records rather than attributes a standalone display latch.",
    },
    latches: {
      hardwareOamEqualsPrecedingSoftware: `${predecessorMatches(rows, "hardwareOam", "softwareOam")}/${rows.length - 1}`,
      hardwareMatricesEqualsPrecedingSoftware: `${predecessorMatches(rows, "hardwareMatrices", "softwareMatrices")}/${rows.length - 1}`,
      hardwarePaletteEqualsPrecedingFaded: `${predecessorMatches(rows, "hardwarePalette", "fadedPalette")}/${rows.length - 1}`,
      paletteTransitionRows: {
        faded: paletteFadedTransitions,
        hardware: paletteHardwareTransitions,
      },
      interpretation: "Move-owned staging measurement only; no cross-move inheritance or coverage acceptance is implied.",
    },
    transitions: {
      softwareOam: oamSoftwareTransitions,
      hardwareOam: oamHardwareTransitions,
      softwareMatrices: transitionRows(rows, "softwareMatrices"),
      hardwareMatrices: transitionRows(rows, "hardwareMatrices"),
      fadedPalette: paletteFadedTransitions,
      hardwarePalette: paletteHardwareTransitions,
      paletteTags: transitionRows(rows, "paletteTags"),
      tileTags: transitionRows(rows, "tileTags"),
      tasks: transitionRows(rows, "tasks"),
      sprites: transitionRows(rows, "sprites"),
      registers: transitionRows(rows, "registers"),
    },
    rows: changes,
  };
  return `${JSON.stringify(output, null, 2)}\n`;
}

function readRgb(receipt: Json, rows: readonly Json[], orientation: Orientation): Buffer[] {
  const archive = resolve(root, receipt.rawRgbArchive);
  invariant(sha(readFileSync(archive)) === receipt.rawRgbArchiveSha256,
    `${orientation}: raw RGB archive digest`);
  const names = execFileSync("tar", ["-tzf", archive], { encoding: "utf8" })
    .trim().split("\n").filter((name) => name.endsWith(".rgb"));
  const bytes = execFileSync("tar", ["-xOzf", archive], { maxBuffer: 64 * 1024 * 1024 });
  invariant(names.length === rows.length && bytes.length === rows.length * frameBytes,
    `${orientation}: raw RGB archive shape`);
  const byName = new Map(names.map((name, index) => [
    basename(name), bytes.subarray(index * frameBytes, (index + 1) * frameBytes),
  ]));
  const rgb = rows.map((row) => byName.get(`${String(row.frame).padStart(5, "0")}.rgb`));
  invariant(rgb.every(Boolean), `${orientation}: RGB receipt omitted a dense row`);
  const frames = rgb as Buffer[];
  invariant(sha(Buffer.concat(frames)) === receipt.rawRgbSequenceSha256,
    `${orientation}: raw RGB sequence digest`);
  invariant(frames.every((frame, index) => sha(frame) === rows[index]!.sha256),
    `${orientation}: raw RGB row digest`);
  return frames;
}

function assertDenseReceipt(orientation: Orientation, receipt: Json, probe: Json, rows: readonly Json[]): void {
  invariant(probe.schema === "air-cutter-dense-evidence/v1" && probe.profile === "battle-scene-on"
    && probe.move === 314, `${orientation}: probe contract`);
  invariant(probe.setup.sourceInitialized && probe.setup.customPartiesBuiltBeforeBattle,
    `${orientation}: legal source route / pre-init party staging`);
  invariant(rows.length === receipt.window.frameCount
    && probe.sourceWindow.startFrame === receipt.window.startFrame
    && probe.sourceWindow.endFrame === receipt.window.endFrame
    && probe.sourceWindow.frameCount === receipt.window.frameCount,
  `${orientation}: incomplete source window`);
  invariant(rows.every((row, age) => row.frame === receipt.window.startFrame + age),
    `${orientation}: non-consecutive source rows`);
  invariant(rows[0]!.scriptPtr === sourceStart
    && rows[0]!.scriptPointerIdentity.symbol === "Move_AIR_CUTTER"
    && rows.at(-1)!.scriptPtr === sourceEnd - 1
    && rows.at(-1)!.animScriptActive === false,
  `${orientation}: source pointer / first inactive cleanup boundary`);
  invariant(rows.slice(0, -1).every((row) => row.animScriptActive && row.scriptOwner === "Move_AIR_CUTTER"),
    `${orientation}: early inactive or foreign source row`);
  invariant(probe.sourcePointerContract.start === sourceStart
    && probe.sourcePointerContract.endExclusive === sourceEnd
    && probe.sourcePointerContract.observedParities.includes(0)
    && probe.sourcePointerContract.observedParities.includes(1),
  `${orientation}: source interval drift`);
  invariant(rows.every((row) => row.softwareOam.length === 128
    && row.hardwareOam.length === 128
    && row.softwareMatrices.length === 32
    && row.hardwareMatrices.length === 32
    && row.fadedPalette.length === 512
    && row.unfadedPalette.length === 512
    && row.hardwarePalette.length === 512
    && row.paletteTags.length === 16
    && row.tileTags.length === 128
    && row.resourceAllocators
    && row.rawBattleState
    && row.battlers && row.parties && row.engine && row.immutableState),
  `${orientation}: incomplete semantic / raw receipt row`);
  invariant(rows.every((row) => same(row.resourceAllocators.paletteTags, row.paletteTags)
    && same(row.resourceAllocators.tileTags, row.tileTags)),
  `${orientation}: allocator receipt drift`);
  for (const tag of [10003, 10135, 10138]) {
    invariant(rows.some((row) => row.paletteTags.includes(tag))
      && rows.some((row) => row.tileTags.includes(tag)), `${orientation}: missing animation tag ${tag}`);
  }
  for (const task of ["AirCutterProjectileStep1", "AirCutterProjectileStep2", "AnimTask_ShakeMon2_Step"]) {
    invariant(probe.topology.tasks.includes(task), `${orientation}: missing task ${task}`);
  }
  for (const template of ownedTemplates) {
    invariant(probe.topology.templates.includes(template), `${orientation}: missing template ${template}`);
  }
  for (const callback of ["AnimAirWaveProjectile", "AnimAirWaveProjectile_Step1", "AnimAirWaveProjectile_Step2", "AnimSlice_Step"]) {
    invariant(probe.topology.callbacks.includes(callback), `${orientation}: missing callback ${callback}`);
  }
  invariant(probe.sourceSymbols.AnimTask_AirCutterProjectile
    && probe.sourceSymbols.gAirCutterSliceSpriteTemplate
    && probe.sourceSymbols.gAirWaveProjectileSpriteTemplate,
  `${orientation}: exclusive source components not symbolized`);
  const attackerParty = receipt.attacker === "player" ? rows[0]!.parties.player : rows[0]!.parties.opponent;
  const targetParty = receipt.attacker === "player" ? rows[0]!.parties.opponent : rows[0]!.parties.player;
  invariant(attackerParty.length === 3 && targetParty.length === 3
    && attackerParty[0].species === 42 && attackerParty[0].moves.every((move: number) => move === 314)
    && targetParty[0].species === 113 && targetParty[0].moves.every((move: number) => move === 33),
  `${orientation}: exact four-slot attacker / target decision constraint`);
  invariant([...attackerParty, ...targetParty].every((mon: Json) => mon.checksumValid),
    `${orientation}: staged party checksum`);
}

function verifyOrientation(orientation: Orientation): Json {
  const receipt = fixture.orientations[orientation];
  invariant(sha(readFileSync(resolve(root, receipt.scenario))) === receipt.scenarioSha256,
    `${orientation}: scenario digest`);
  const denseArchive = readFileSync(resolve(root, receipt.denseState));
  invariant(sha(denseArchive) === receipt.denseStateSha256, `${orientation}: dense archive digest`);
  const bytes = gunzipSync(denseArchive);
  invariant(sha(bytes) === receipt.probeJsonSha256, `${orientation}: dense JSON digest`);
  const probe = JSON.parse(bytes.toString("utf8")) as Json;
  const rows = probe.frames as Json[];
  assertDenseReceipt(orientation, receipt, probe, rows);
  const rgb = readRgb(receipt, rows, orientation);
  const map = buildChangeMap(orientation, rows, rgb);
  const mapPath = resolve(root, receipt.changeMap);
  if (process.argv.includes("--write-maps")) writeFileSync(mapPath, map);
  else invariant(sha(readFileSync(mapPath)) === receipt.changeMapSha256
    && readFileSync(mapPath, "utf8") === map, `${orientation}: change map drift`);
  const parsedMap = JSON.parse(map) as Json;
  invariant(parsedMap.edges.firstWaveSpriteRamRow === 17
    && parsedMap.edges.firstWaveFramebufferDelta === 19
    && parsedMap.edges.firstSliceSpriteRamRow === 76
    && parsedMap.edges.firstInactiveScriptRow === rows.length - 1,
  `${orientation}: move-owned change-map edges`);
  invariant(parsedMap.latches.hardwareOamEqualsPrecedingSoftware === "111/111"
    && parsedMap.latches.hardwareMatricesEqualsPrecedingSoftware === "111/111"
    && parsedMap.latches.hardwarePaletteEqualsPrecedingFaded === "110/111",
  `${orientation}: move-owned latch map`);
  return {
    orientation,
    sourceRows: rows.length,
    rawRgbRows: rgb.length,
    firstWaveRamRow: parsedMap.edges.firstWaveSpriteRamRow,
    firstWaveFramebufferDelta: parsedMap.edges.firstWaveFramebufferDelta,
    firstSliceRamRow: parsedMap.edges.firstSliceSpriteRamRow,
    firstInactiveScriptRow: parsedMap.edges.firstInactiveScriptRow,
    latches: parsedMap.latches,
    coverageCredit: false,
  };
}

export function verifyAirCutterEvidence(): Record<Orientation, Json> {
  invariant(fixture.schema === "air-cutter-bilateral-evidence/v1"
    && fixture.oracleProfile === "battle-scene-on"
    && fixture.move === "MOVE_AIR_CUTTER"
    && fixture.moveId === 314
    && fixture.status === "unsupported-evidence"
    && fixture.coverageCredit === false,
  "Air Cutter evidence scope drift");
  invariant(fixture.evidenceScope.fullDenseRowsRetained
    && fixture.evidenceScope.semanticStateRetained
    && fixture.evidenceScope.rawRgbReceiptsRetained
    && fixture.evidenceScope.perOrientationChangeMaps
    && fixture.evidenceScope.twiceFreshByteIdentical
    && !fixture.evidenceScope.productionAnimationChanged
    && !fixture.evidenceScope.reducerAdded
    && !fixture.evidenceScope.typedSeamAdded
    && !fixture.evidenceScope.compositorAdded
    && !fixture.evidenceScope.coveragePromotion,
  "Air Cutter staging-only boundary drift");
  return Object.fromEntries(orientations.map((orientation) => [
    orientation,
    verifyOrientation(orientation),
  ])) as Record<Orientation, Json>;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  console.log(JSON.stringify(verifyAirCutterEvidence(), null, 2));
}
