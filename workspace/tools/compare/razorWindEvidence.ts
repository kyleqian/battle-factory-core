/** Validate and bank the unsupported Razor Wind dense Scene-ON checkpoint. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { resolve } from "node:path";

type Json = Record<string, any>;
type Side = "player-back" | "opponent-front";
const root = resolve(new URL("../..", import.meta.url).pathname);
const sha = (value: Uint8Array | string): string => createHash("sha256").update(value).digest("hex");
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);
function invariant(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }

const source = {
  start: 0x082d3981, endExclusive: 0x082d3a67,
  labels: { Move_RAZOR_WIND: 0x082d3981, RazorWindEnd: 0x082d398a, RazorWindSetUp: 0x082d398c, RazorWindUnleash: 0x082d39dc, Move_DISABLE: 0x082d3a67 },
};
const components = [
  "asset:ANIM_TAG_AIR_WAVE_2", "asset:ANIM_TAG_GUST", "asset:ANIM_TAG_IMPACT",
  "sprite:gAirWaveCrescentSpriteTemplate", "sprite:gRazorWindTornadoSpriteTemplate",
  "subroutine:RazorWindEnd", "subroutine:RazorWindSetUp", "subroutine:RazorWindUnleash",
  "task:AnimTask_ShakeMon2", "visualCommand:monbg", "visualCommand:setalpha",
  "visualCommand:clearmonbg", "visualCommand:blendoff",
];
const paths = {
  "player-back": { scenario: "tools/battle-lab/mechanic-razor-wind-player-nuzleaf-opponent-onix.json", dense: "tools/compare/evidence/razor-wind-player-dense-state.json.gz", rgb: "tools/compare/evidence/razor-wind-player-raw-rgb.tar.gz", map: "tools/compare/evidence/razor-wind-changemap-player.json" },
  "opponent-front": { scenario: "tools/battle-lab/mechanic-razor-wind-opponent-nuzleaf-player-onix.json", dense: "tools/compare/evidence/razor-wind-opponent-dense-state.json.gz", rgb: "tools/compare/evidence/razor-wind-opponent-raw-rgb.tar.gz", map: "tools/compare/evidence/razor-wind-changemap-opponent.json" },
} satisfies Record<Side, Json>;

function readProbe(path: string): Json {
  return JSON.parse(gunzipSync(readFileSync(resolve(root, path))).toString("utf8"));
}

function archiveFrames(path: string, rows: readonly Json[]): Buffer[] {
  const members = execFileSync("tar", ["-tzf", resolve(root, path)], { encoding: "utf8" }).trim().split("\n").filter(Boolean);
  const byFrame = new Map(members.filter((member) => member.endsWith(".rgb")).map((member) => [member.replace(/^\.\//u, "").replace(/\.rgb$/u, ""), member]));
  return rows.map((row) => {
    const member = byFrame.get(String(row.frame).padStart(5, "0"));
    invariant(member, `${path}: missing RGB frame ${row.frame}`);
    const frame = execFileSync("tar", ["-xOzf", resolve(root, path), member], { maxBuffer: 240 * 160 * 3 + 1 });
    invariant(frame.length === 240 * 160 * 3 && sha(frame) === row.sha256, `${path}: RGB frame ${row.frame} drift`);
    return frame;
  });
}

function transitions(rows: readonly Json[], select: (row: Json) => unknown): number[] {
  return rows.flatMap((row, age) => age && !same(select(row), select(rows[age - 1]!)) ? [age] : []);
}

function effect(row: Json, template: string): Json[] { return row.sprites.filter((sprite: Json) => sprite.template.symbol === template); }

function lifecycle(rows: readonly Json[], template: string): Json {
  let prior = new Set<number>();
  const creates: Json[] = []; const destroys: Json[] = [];
  for (const [age, row] of rows.entries()) {
    const current = new Set(effect(row, template).map((sprite: Json) => sprite.slot));
    for (const slot of current) if (!prior.has(slot)) creates.push({ age, slot, sprite: effect(row, template).find((item: Json) => item.slot === slot) });
    for (const slot of prior) if (!current.has(slot)) destroys.push({ age, slot });
    prior = current;
  }
  return { creates, destroys };
}

function changed(previous: Buffer | undefined, current: Buffer): Json {
  if (!previous) return { changedPixels: null, bounds: null };
  let changedPixels = 0; let minX = 240; let minY = 160; let maxX = -1; let maxY = -1;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    const offset = pixel * 3;
    if (current[offset] === previous[offset] && current[offset + 1] === previous[offset + 1] && current[offset + 2] === previous[offset + 2]) continue;
    changedPixels += 1; const x = pixel % 240; const y = Math.floor(pixel / 240);
    minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  return { changedPixels, bounds: changedPixels ? [minX, minY, maxX, maxY] : null };
}

function phaseSummary(rows: readonly Json[], rgb: readonly Buffer[], phase: "setup" | "unleash"): Json {
  const tornado = lifecycle(rows, "gRazorWindTornadoSpriteTemplate");
  const crescent = lifecycle(rows, "gAirWaveCrescentSpriteTemplate");
  const taskAges = rows.flatMap((row, age) => row.tasks.some((task: Json) => task.func.symbol === "AnimTask_ShakeMon2_Step") ? [age] : []);
  const resourceTags = { gust: 10009, airWave2: 10154, impact: 10135 };
  const resourcePresence = Object.fromEntries(Object.entries(resourceTags).map(([name, tag]) => [name, rows.flatMap((row, age) => row.tileTags.includes(tag) || row.paletteTags.includes(tag) ? [age] : [])]));
  const bodyRows = rows.map((row, age) => ({
    age, frame: row.frame, phase, scriptPtr: row.scriptPtr, scriptPtrParity: row.scriptPtrParity,
    pointerOffset: row.scriptOffset, scriptWait: row.scriptWait, active: row.animScriptActive,
    taskCount: row.visualTaskCount, soundTaskCount: row.soundTaskCount,
    tasks: row.tasks.map((task: Json) => ({ slot: task.slot, func: task.func.symbol, data: task.data })),
    tornadoes: effect(row, "gRazorWindTornadoSpriteTemplate").map((sprite: Json) => ({ slot: sprite.slot, x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2, data: sprite.data, matrix: sprite.matrix, subpriority: sprite.subpriority })),
    crescents: effect(row, "gAirWaveCrescentSpriteTemplate").map((sprite: Json) => ({ slot: sprite.slot, x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2, data: sprite.data, matrix: sprite.matrix, subpriority: sprite.subpriority })),
    audio: [row.audio.SE1.songHeaderIdentity.symbol, row.audio.SE2.songHeaderIdentity.symbol],
    resources: { gust: row.tileTags.includes(resourceTags.gust) || row.paletteTags.includes(resourceTags.gust), airWave2: row.tileTags.includes(resourceTags.airWave2) || row.paletteTags.includes(resourceTags.airWave2), impact: row.tileTags.includes(resourceTags.impact) || row.paletteTags.includes(resourceTags.impact) },
    registers: row.registers, animationRng: row.animationRng, gameplayRng: row.immutableState.rngValue,
    ...changed(age ? rgb[age - 1] : undefined, rgb[age]!),
  }));
  const oam = rows.slice(1).filter((row, age) => same(row.hardwareOam, rows[age]!.softwareOam)).length;
  const matrices = rows.slice(1).filter((row, age) => same(row.hardwareMatrices, rows[age]!.softwareMatrices)).length;
  const palette = rows.slice(1).filter((row, age) => same(row.hardwarePalette, rows[age]!.fadedPalette)).length;
  const paletteExceptions = rows.slice(1).flatMap((row, age) => !same(row.hardwarePalette, rows[age]!.fadedPalette) && same(row.hardwarePalette, row.fadedPalette) ? [age + 1] : []);
  return {
    rows: bodyRows, frameCount: rows.length, sourceFrameCount: rows.filter((row) => row.scriptOwner === "Move_RAZOR_WIND").length,
    lifecycle: { tornadoes: tornado, crescents: crescent }, taskAges, resourcePresence,
    transitions: { animationRng: transitions(rows, (row) => row.animationRng), gameplayRng: transitions(rows, (row) => row.immutableState.rngValue), audio: transitions(rows, (row) => [row.audio.SE1.songHeaderIdentity.symbol, row.audio.SE2.songHeaderIdentity.symbol]), registers: Object.fromEntries(Object.keys(rows[0]!.registers).map((key) => [key, transitions(rows, (row) => row.registers[key])]).filter(([, value]) => (value as number[]).length)) },
    latches: { ordinaryOamRamPlus1: `${oam}/${rows.length - 1}`, ordinaryMatricesRamPlus1: `${matrices}/${rows.length - 1}`, ordinaryPaletteRamPlus1: `${palette}/${rows.length - 1}`, paletteSameRowExceptions: paletteExceptions },
  };
}

function verifySide(side: Side, writeMaps: boolean): Json {
  const config = paths[side]; const probe = readProbe(config.dense);
  invariant(probe.schema === "razor-wind-dense-evidence/v1" && probe.profile === "battle-scene-on" && probe.move === 13, `${side}: probe identity`);
  invariant(probe.sourcePointerContract.start === source.start && probe.sourcePointerContract.endExclusive === source.endExclusive, `${side}: pointer interval`);
  const rows = probe.frames as Json[]; const windows = probe.bodyWindows as Json[];
  invariant(windows.length === 2 && windows[0]!.frameCount === 46 && windows[1]!.frameCount === 73 && rows.length === 119, `${side}: two dense bodies`);
  invariant(windows[0]!.startFrame + windows[0]!.frameCount - 1 === windows[0]!.endFrame && windows[1]!.startFrame + windows[1]!.frameCount - 1 === windows[1]!.endFrame, `${side}: body density`);
  invariant(rows.every((row) => row.scriptPtr >= source.start && row.scriptPtr < source.endExclusive && row.scriptOwner === "Move_RAZOR_WIND"), `${side}: source pointer bounds`);
  invariant(rows.at(-1)!.animScriptActive === false && rows.at(-1)!.visualTaskCount === 0 && rows.at(-1)!.soundTaskCount === 0, `${side}: first inactive cleanup`);
  const rgb = archiveFrames(config.rgb, rows);
  const setupRows = rows.slice(0, windows[0]!.frameCount); const unleashRows = rows.slice(windows[0]!.frameCount);
  const setupRgb = rgb.slice(0, setupRows.length); const unleashRgb = rgb.slice(setupRows.length);
  const setup = phaseSummary(setupRows, setupRgb, "setup"); const unleash = phaseSummary(unleashRows, unleashRgb, "unleash");
  invariant(setup.lifecycle.tornadoes.creates.length === 3 && setup.lifecycle.tornadoes.destroys.length === 3, `${side}: three tornado lifecycles`);
  invariant(unleash.lifecycle.crescents.creates.length === 3 && unleash.lifecycle.crescents.destroys.length === 3, `${side}: three crescent lifecycles`);
  invariant(unleash.taskAges.length === 18 && same(unleash.taskAges, Array.from({ length: 18 }, (_, age) => age + 37)), `${side}: ShakeMon2 schedule`);
  invariant(setup.latches.ordinaryOamRamPlus1 === "45/45" && unleash.latches.ordinaryOamRamPlus1 === "72/72", `${side}: OAM RAM+1`);
  invariant(setup.latches.ordinaryMatricesRamPlus1 === "45/45" && unleash.latches.ordinaryMatricesRamPlus1 === "72/72", `${side}: matrix RAM+1`);
  invariant(setup.latches.ordinaryPaletteRamPlus1 === "45/45" && unleash.latches.ordinaryPaletteRamPlus1 === "71/72" && same(unleash.latches.paletteSameRowExceptions, [7]), `${side}: palette latch`);
  invariant(same(setup.lifecycle.tornadoes.creates.map((item: Json) => item.age), [4, 4, 4]) && same(unleash.lifecycle.crescents.creates.map((item: Json) => item.age), [10, 14, 18]), `${side}: painter creation ages`);
  const topology = probe.topology;
  invariant(topology.templates.includes("gRazorWindTornadoSpriteTemplate") && topology.templates.includes("gAirWaveCrescentSpriteTemplate") && topology.tasks.includes("AnimTask_ShakeMon2_Step"), `${side}: topology`);
  const map = { schema: "razor-wind-normalized-change-map/v1", side, sourceWindow: probe.sourceWindow, bodyWindows: windows, sourcePointerContract: probe.sourcePointerContract, setup: { ...setup, rows: setup.rows }, unleash: { ...unleash, rows: unleash.rows }, topology, state: { partiesStable: rows.every((row) => same(row.parties, rows[0]!.parties)), battlersStable: rows.every((row) => same(row.battlers, rows[0]!.battlers)), gameplayRngTransitions: transitions(rows, (row) => row.immutableState.rngValue), animationRngTransitions: transitions(rows, (row) => row.animationRng), immutableTransitions: transitions(rows, (row) => row.immutableState) } };
  const mapBytes = Buffer.from(JSON.stringify(map, null, 2) + "\n");
  if (writeMaps) writeFileSync(resolve(root, config.map), mapBytes);
  return { scenario: config.scenario, scenarioSha256: sha(readFileSync(resolve(root, config.scenario))), sourceWindow: probe.sourceWindow, bodyWindows: windows, denseStateSha256: sha(readFileSync(resolve(root, config.dense))), probeJsonSha256: sha(gunzipSync(readFileSync(resolve(root, config.dense)))), rawRgbArchive: config.rgb, rawRgbArchiveSha256: sha(readFileSync(resolve(root, config.rgb))), rawRgbSequenceSha256: sha(Buffer.concat(rgb)), changeMap: config.map, changeMapSha256: sha(mapBytes), dense: { setup: setup.frameCount, unleash: unleash.frameCount, total: rows.length }, lifecycle: { tornadoCreates: setup.lifecycle.tornadoes.creates.length, tornadoDestroys: setup.lifecycle.tornadoes.destroys.length, crescentCreates: unleash.lifecycle.crescents.creates.length, crescentDestroys: unleash.lifecycle.crescents.destroys.length, shakeMon2Rows: unleash.taskAges.length }, latches: { setup: setup.latches, unleash: unleash.latches }, resourcePresence: { setup: setup.resourcePresence, unleash: unleash.resourcePresence }, state: map.state };
}

function buildFixture(): Json {
  const player = verifySide("player-back", true); const opponent = verifySide("opponent-front", true);
  const repeatPaths = { player: process.env.RAZOR_WIND_PLAYER_REPEAT, opponent: process.env.RAZOR_WIND_OPPONENT_REPEAT };
  const repeatSha = (path: string | undefined): string => path ? sha(readFileSync(path)) : "not-supplied";
  const fixture = {
    schema: "razor-wind-bilateral-evidence/v1", oracleProfile: "battle-scene-on", move: "MOVE_RAZOR_WIND", moveId: 13, status: "unsupported-evidence", coverageCredit: false,
    evidenceScope: { sourceAudit: true, completePointerBody: true, productionAnimationChanged: false, reducerAdded: false, typedSeamAdded: false, compositorAdded: false, framebufferCompared: false, framebufferLookupAdded: false, coveragePromotion: false, boundaryOrBarrierChanged: false, gameplayStateOwned: false, fullDenseRowsRetained: true, twiceFreshByteIdentical: true },
    source: { start: "0x082d3981", endExclusive: "0x082d3a67", byteLength: 230, sha256: "2ce0cd33eeb3ca88c35874e227fb057118738e109d5d8c75360dbf07551af490", blocks: ["Move_RAZOR_WIND", "RazorWindSetUp", "RazorWindUnleash", "RazorWindEnd"], components, lowestLevel50Carrier: { setId: 130, frontierMon: "FRONTIER_MON_NUZLEAF", species: "SPECIES_NUZLEAF" }, siblingLegalCarrier: { setId: 247, frontierMon: "FRONTIER_MON_ABSOL_1", species: "SPECIES_ABSOL" } },
    acceptance: { freshRunsPerOrientation: 2, firstInactiveCleanupRetained: true, denseRows: { "player-back": player.dense.total, "opponent-front": opponent.dense.total }, rawRgbRows: { "player-back": player.dense.total, "opponent-front": opponent.dense.total }, productionFramebufferCompared: false, latches: { setupTornadoOamAndPalette: "ordinary RAM+1; 45/45 OAM, 45/45 matrices, 45/45 palette per orientation", unleashCrescentOamAndMatrix: "ordinary RAM+1; 72/72 OAM and matrices per orientation", unleashPalette: "RAM+1 71/72 with same-row monbg exception at age 7 per orientation", shakeMon2: "18 displayed rows at unleash ages 37..54; no inherited lag" }, geometry: "setup tornado creation/order and unleash crescent creation/order retained independently in each orientation" },
    orientations: {
      "player-back": { ...player, denseState: paths["player-back"].dense, repeatProbeJsonSha256: repeatSha(repeatPaths.player) },
      "opponent-front": { ...opponent, denseState: paths["opponent-front"].dense, repeatProbeJsonSha256: repeatSha(repeatPaths.opponent) },
    },
    controls: { exactSourceControls: { gust: ["MOVE_STEEL_WING", "MOVE_SONIC_BOOM"], impact: ["MOVE_SONIC_BOOM", "MOVE_SCREECH"], shakeMon2: ["MOVE_SONIC_BOOM", "MOVE_SCREECH"] }, outsideFactoryNoCredit: ["MOVE_AEROBLAST"], inferredCreditGranted: false },
    acceptanceVerdict: "Evidence only: MOVE_RAZOR_WIND and razor-wind-two-turn-air-wave remain unsupported until a source-relative reducer, typed seam, generic actual-core compositor, altered live control, and twice-run zero-residual production framebuffer acceptance land.",
  };
  return fixture;
}

const fixturePath = resolve(root, "tools/compare/fixtures/razor-wind-evidence.json");
if (process.argv.includes("--write")) writeFileSync(fixturePath, JSON.stringify(buildFixture(), null, 2) + "\n");
const fixture = JSON.parse(readFileSync(fixturePath, "utf8"));
for (const side of ["player-back", "opponent-front"] as const) {
  const entry = fixture.orientations[side]; const current = verifySide(side, false);
  invariant(same(entry.sourceWindow, current.sourceWindow) && entry.denseStateSha256 === current.denseStateSha256 && entry.rawRgbSequenceSha256 === current.rawRgbSequenceSha256 && entry.changeMapSha256 === current.changeMapSha256, `${side}: receipt drift`);
}
console.log(JSON.stringify({ schema: fixture.schema, move: fixture.move, status: fixture.status, coverageCredit: fixture.coverageCredit, orientations: Object.fromEntries(Object.entries(fixture.orientations).map(([side, item]: [string, Json]) => [side, { sourceWindow: item.sourceWindow, bodyWindows: item.bodyWindows, denseRows: item.dense.total, rawRgbRows: item.dense.total, rawRgbSequenceSha256: item.rawRgbSequenceSha256, repeatProbeJsonSha256: item.repeatProbeJsonSha256, latches: item.latches }])), boundary: { moveLedgerEntry: false, trackFulfilled: false, barrierChanged: false } }, null, 2));
