/** Validate and bank the unsupported bilateral MOVE_DIVE dense checkpoint. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";

type Json = Record<string, any>;
type Side = "player-back" | "opponent-front";
const root = resolve(new URL("../..", import.meta.url).pathname);
const sha = (value: Uint8Array | string): string => createHash("sha256").update(value).digest("hex");
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);
function invariant(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }

const config = {
  "player-back": {
    scenario: "tools/battle-lab/mechanic-dive-player-chinchou-opponent-onix.json",
    dense: "tools/compare/evidence/dive-player-dense-state.json.gz",
    rgb: "tools/compare/evidence/dive-player-raw-rgb.tar.gz",
    map: "tools/compare/evidence/dive-changemap-player.json",
    repeatProbeJsonSha256: "2947e75c2cfec66122980939fb6a15fc1ad2ff270f0a267fcbf149734e63e94c",
    windows: [118, 93],
  },
  "opponent-front": {
    scenario: "tools/battle-lab/mechanic-dive-opponent-chinchou-player-onix.json",
    dense: "tools/compare/evidence/dive-opponent-dense-state.json.gz",
    rgb: "tools/compare/evidence/dive-opponent-raw-rgb.tar.gz",
    map: "tools/compare/evidence/dive-changemap-opponent.json",
    repeatProbeJsonSha256: "7cef3cdf69ecdf085293ebbab315e51a6eb392ecfaa9a2c1db8ee6ba1b60e368",
    windows: [115, 93],
  },
} as const;
const sourceRanges = [
  { start: 0x082d653d, endExclusive: 0x082d65f7 },
  { start: 0x082cb102, endExclusive: 0x082cb275 },
];
const effectTemplates = [
  "gDiveBallSpriteTemplate", "gDiveWaterSplashSpriteTemplate",
  "gSprayWaterDropletSpriteTemplate", "gWaterHitSplatSpriteTemplate",
  "gSmallDriftingBubblesSpriteTemplate",
];
const resourceTags = [10148, 10155, 10156, 10272, 10273];

function rawRgb(path: string, rows: readonly Json[]): { bytes: Buffer; archiveSha256: string; sequenceSha256: string } {
  const absolute = resolve(root, path);
  const members = execFileSync("tar", ["-tzf", absolute], { encoding: "utf8" })
    .trim().split("\n").filter((member) => member.endsWith(".rgb"));
  const expected = rows.map((row) => `./${String(row.frame).padStart(5, "0")}.rgb`);
  invariant(same(members, expected), `${path}: RGB members are not the dense row sequence`);
  const bytes = execFileSync("tar", ["-xOzf", absolute], { maxBuffer: rows.length * 240 * 160 * 3 + 1 });
  invariant(bytes.length === rows.length * 240 * 160 * 3, `${path}: RGB byte length`);
  rows.forEach((row, age) => invariant(
    sha(bytes.subarray(age * 240 * 160 * 3, (age + 1) * 240 * 160 * 3)) === row.sha256,
    `${path}: frame ${row.frame} RGB digest`,
  ));
  return { bytes, archiveSha256: sha(readFileSync(absolute)), sequenceSha256: sha(bytes) };
}

function relation(current: unknown, software: readonly Json[], age: number): string {
  if (age > 0 && same(current, software[age - 1])) return "ram+1";
  if (age > 1 && same(current, software[age - 2])) return "ram+2";
  if (same(current, software[age])) return "same-row";
  return "other";
}

function compactMap(side: Side, probe: Json, rgbSequenceSha256: string): Json {
  const rows = probe.frames as Json[];
  const bodyForAge = (age: number): { phase: "setup" | "attack"; phaseAge: number } => {
    const setupLength = probe.bodyWindows[0].frameCount;
    return age < setupLength
      ? { phase: "setup", phaseAge: age }
      : { phase: "attack", phaseAge: age - setupLength };
  };
  return {
    schema: "dive-normalized-change-map/v1", side,
    sourcePointerContracts: probe.sourcePointerContracts,
    bodyWindows: probe.bodyWindows,
    rawRgbSequenceSha256: rgbSequenceSha256,
    rows: rows.map((row, age) => ({
      ...bodyForAge(age), frame: row.frame, rawRgbSha256: row.sha256,
      scriptPtr: row.scriptPtr, scriptOffset: row.scriptOffset,
      active: row.animScriptActive, scriptWait: row.scriptWait,
      visualTaskCount: row.visualTaskCount, soundTaskCount: row.soundTaskCount,
      effects: row.sprites.filter((sprite: Json) => effectTemplates.includes(sprite.template.symbol)).map((sprite: Json) => ({
        slot: sprite.slot, template: sprite.template.symbol, callback: sprite.callback.symbol,
        attr: sprite.attr, x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2,
        matrixNum: sprite.matrixNum, matrix: sprite.matrix, data: sprite.data,
        subpriority: sprite.subpriority, invisible: sprite.invisible,
      })),
      tasks: row.tasks.map((task: Json) => ({ slot: task.slot, func: task.func.symbol, data: task.data })),
      transfers: {
        oam: relation(row.hardwareOam, rows.map((item) => item.softwareOam), age),
        matrices: relation(row.hardwareMatrices, rows.map((item) => item.softwareMatrices), age),
        palette: relation(row.hardwarePalette, rows.map((item) => item.fadedPalette), age),
      },
      resourceTags: resourceTags.filter((tag) => row.tileTags.includes(tag) || row.paletteTags.includes(tag)),
      registers: row.registers,
      audio: [row.audio.SE1.songHeaderIdentity.symbol, row.audio.SE2.songHeaderIdentity.symbol],
      animationRng: row.animationRng, immutableStateSha256: sha(JSON.stringify(row.immutableState)),
      softwareOamSha256: sha(JSON.stringify(row.softwareOam)), hardwareOamSha256: sha(JSON.stringify(row.hardwareOam)),
      softwareMatricesSha256: sha(JSON.stringify(row.softwareMatrices)), hardwareMatricesSha256: sha(JSON.stringify(row.hardwareMatrices)),
      fadedPaletteSha256: sha(JSON.stringify(row.fadedPalette)), hardwarePaletteSha256: sha(JSON.stringify(row.hardwarePalette)),
    })),
  };
}

function verifySide(side: Side, write: boolean): Json {
  const item = config[side];
  const compressed = readFileSync(resolve(root, item.dense));
  const jsonBytes = gunzipSync(compressed);
  const probe = JSON.parse(jsonBytes.toString("utf8"));
  invariant(probe.schema === "dive-dense-evidence/v1" && probe.profile === "battle-scene-on" && probe.move === 291, `${side}: identity`);
  invariant(same(probe.sourcePointerContracts, sourceRanges), `${side}: disjoint source ranges`);
  invariant(same(probe.bodyWindows.map((window: Json) => window.frameCount), item.windows), `${side}: body lengths`);
  invariant(probe.bodyWindows.every((window: Json) => window.endFrame - window.startFrame + 1 === window.frameCount), `${side}: dense windows`);
  invariant(probe.frames.length === item.windows[0] + item.windows[1], `${side}: complete row count`);
  let offset = 0;
  for (const window of probe.bodyWindows) {
    const rows = probe.frames.slice(offset, offset + window.frameCount);
    invariant(rows.at(-1).animScriptActive === false && rows.at(-1).visualTaskCount === 0 && rows.at(-1).soundTaskCount === 0, `${side}: first inactive cleanup`);
    invariant(rows.every((row: Json) => same(row.parties, rows[0].parties)), `${side}: parties mutated inside animation body`);
    invariant(rows.every((row: Json) => same(row.immutableState, rows[0].immutableState)), `${side}: gameplay state mutated inside animation body`);
    offset += window.frameCount;
  }
  invariant(probe.frames.every((row: Json) => row.softwareOam.length === 128 && row.hardwareOam.length === 128
    && row.softwareMatrices.length === 32 && row.hardwareMatrices.length === 32
    && row.fadedPalette.length === 512 && row.unfadedPalette.length === 512 && row.hardwarePalette.length === 512
    && row.paletteTags.length === 16 && row.tileTags.length === 128
    && row.parties.player.length === 3 && row.parties.opponent.length === 3
    && row.audio.SE1.tracks.length === 4 && row.audio.SE2.tracks.length === 4), `${side}: required surfaces`);
  const rgb = rawRgb(item.rgb, probe.frames);
  const map = compactMap(side, probe, rgb.sequenceSha256);
  const mapBytes = Buffer.from(JSON.stringify(map, null, 2) + "\n");
  if (write) writeFileSync(resolve(root, item.map), mapBytes);
  const phaseSummary = probe.bodyWindows.map((window: Json, phase: number) => {
    const start = phase ? probe.bodyWindows[0].frameCount : 0;
    const rows = probe.frames.slice(start, start + window.frameCount);
    const relations = (surface: "oam" | "matrices" | "palette") => map.rows.slice(start, start + window.frameCount).slice(1).map((row: Json) => row.transfers[surface]);
    return {
      phase: phase ? "attack" : "setup", rows: rows.length,
      oam: relations("oam"), matrices: relations("matrices"), palette: relations("palette"),
      templates: Object.fromEntries(effectTemplates.map((template) => [template, rows.filter((row: Json) => row.sprites.some((sprite: Json) => sprite.template.symbol === template)).length])),
      registerTransitions: Object.fromEntries(Object.keys(rows[0].registers).map((key) => [key, rows.flatMap((row: Json, age: number) => age && row.registers[key] !== rows[age - 1].registers[key] ? [age] : [])]).filter(([, ages]) => (ages as number[]).length)),
    };
  });
  return {
    scenario: item.scenario, scenarioSha256: sha(readFileSync(resolve(root, item.scenario))),
    denseState: item.dense, denseStateSha256: sha(compressed), probeJsonSha256: sha(jsonBytes),
    repeatProbeJsonSha256: item.repeatProbeJsonSha256, twiceFreshByteIdentical: sha(jsonBytes) === item.repeatProbeJsonSha256,
    rawRgbArchive: item.rgb, rawRgbArchiveSha256: rgb.archiveSha256, rawRgbSequenceSha256: rgb.sequenceSha256,
    changeMap: item.map, changeMapSha256: sha(mapBytes), bodyWindows: probe.bodyWindows,
    denseRows: probe.frames.length, phases: phaseSummary, topology: probe.topology,
  };
}

function build(write: boolean): Json {
  const player = verifySide("player-back", write);
  const opponent = verifySide("opponent-front", write);
  invariant(player.twiceFreshByteIdentical && opponent.twiceFreshByteIdentical, "fresh payload drift");
  return {
    schema: "dive-bilateral-evidence/v1", oracleProfile: "battle-scene-on",
    move: "MOVE_DIVE", moveId: 291, status: "unsupported-evidence", coverageCredit: false,
    evidenceScope: { completeDisjointPointerBodies: true, fullDenseRowsRetained: true, twiceFreshByteIdentical: true, rawRgbRetained: true, normalizedChangeMaps: true, productionAnimationChanged: false, reducerAdded: false, typedSeamAdded: false, compositorAdded: false, framebufferCompared: false, gameplayStateOwned: false, boundaryOrBarrierChanged: false },
    source: { ranges: sourceRanges, lifecycle: { diveBall: 1, splashes: 2, sprayDroplets: 20, waterImpacts: 9, driftingBubbles: 18, shakeMon2: 1 } },
    orientations: { "player-back": player, "opponent-front": opponent },
    acceptanceVerdict: "Evidence only: MOVE_DIVE remains unsupported and two-turn-semi-invulnerable remains unfulfilled until a pure source-relative reducer, typed seam, generic assets/compositor, bilateral actual-core zero-residual framebuffer equality, and cleanup ratchets land.",
  };
}

const fixturePath = resolve(root, "tools/compare/fixtures/dive-evidence.json");
if (process.argv.includes("--write")) writeFileSync(fixturePath, JSON.stringify(build(true), null, 2) + "\n");
const fixture = JSON.parse(readFileSync(fixturePath, "utf8"));
const current = build(false);
invariant(same(fixture, current), "Dive fixture or change-map drifted");
console.log(JSON.stringify({
  schema: fixture.schema, move: fixture.move, status: fixture.status,
  coverageCredit: fixture.coverageCredit,
  orientations: Object.fromEntries(Object.entries(fixture.orientations).map(([side, item]: [string, any]) => [side, {
    bodyWindows: item.bodyWindows, denseRows: item.denseRows,
    probeJsonSha256: item.probeJsonSha256, rawRgbSequenceSha256: item.rawRgbSequenceSha256,
    changeMapSha256: item.changeMapSha256, twiceFreshByteIdentical: item.twiceFreshByteIdentical,
  }])),
  boundary: { moveLedgerEntry: false, trackFulfilled: false, barrierChanged: false },
}, null, 2));
