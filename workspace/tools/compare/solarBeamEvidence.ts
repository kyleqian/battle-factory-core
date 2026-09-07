/** Validate and bank the unsupported MOVE_SOLAR_BEAM dense Scene-ON checkpoint. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { gunzipSync } from "node:zlib";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

type Json = Record<string, any>;
type Side = "player-back" | "opponent-front";
const root = resolve(new URL("../..", import.meta.url).pathname);
const sha = (value: Uint8Array | string): string => createHash("sha256").update(value).digest("hex");
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);
function invariant(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }

const paths = {
  "player-back": {
    scenario: "tools/battle-lab/mechanic-solar-beam-player-gloom-opponent-chansey.json",
    dense: "tools/compare/evidence/solar-beam-player-dense-state.json.gz",
    rgb: "tools/compare/evidence/solar-beam-player-raw-rgb.tar.gz",
    map: "tools/compare/evidence/solar-beam-changemap-player.json",
  },
  "opponent-front": {
    scenario: "tools/battle-lab/mechanic-solar-beam-opponent-gloom-player-chansey.json",
    dense: "tools/compare/evidence/solar-beam-opponent-dense-state.json.gz",
    rgb: "tools/compare/evidence/solar-beam-opponent-raw-rgb.tar.gz",
    map: "tools/compare/evidence/solar-beam-changemap-opponent.json",
  },
} satisfies Record<Side, Json>;

const ownedTemplates = new Set([
  "gPowerAbsorptionOrbSpriteTemplate", "gSolarBeamBigOrbSpriteTemplate", "gSolarBeamSmallOrbSpriteTemplate",
]);
const ownedTasks = new Set([
  "AnimTask_BlendColorCycleLoop", "AnimTask_BlendSpriteColor_Step2", "AnimTask_CreateSmallSolarBeamOrbs",
  "AnimTask_ShakeMon2_Step", "Task_ClearMonBg", "Task_PanFromInitialToTarget", "Task_UpdateMonBg",
]);

function transitions(rows: readonly Json[], select: (row: Json) => unknown): number[] {
  return rows.flatMap((row, age) => age && !same(select(row), select(rows[age - 1]!)) ? [age] : []);
}
function edges(rows: readonly Json[], select: (row: Json) => unknown): unknown[][] {
  return rows.flatMap((row, age) => age === 0 || !same(select(row), select(rows[age - 1]!)) ? [[age, select(row)]] : []);
}
function effects(row: Json, template: string): Json[] {
  return row.sprites.filter((sprite: Json) => sprite.template.symbol === template);
}
function lifetimes(rows: readonly Json[], template: string): Json[] {
  const live = new Map<number, Json>();
  const result: Json[] = [];
  for (const [age, row] of rows.entries()) {
    const current = new Map<number, Json>(effects(row, template).map((sprite: Json) => [sprite.slot, sprite]));
    for (const [slot, sprite] of current) {
      if (!live.has(slot)) live.set(slot, { slot, start: age, first: sprite });
    }
    for (const [slot, life] of live) {
      if (!current.has(slot)) {
        result.push({ ...life, end: age - 1 });
        live.delete(slot);
      }
    }
  }
  for (const life of live.values()) result.push({ ...life, end: rows.length - 1 });
  return result.map((life) => ({
    slot: life.slot, start: life.start, end: life.end,
    callback: life.first.callback.symbol, x: life.first.x, y: life.first.y,
    x2: life.first.x2, y2: life.first.y2, animNum: life.first.animNum,
    subpriority: life.first.subpriority, matrix: life.first.matrix,
    data: life.first.data,
  }));
}
function taskLifetimes(rows: readonly Json[]): Json[] {
  const live = new Map<string, Json>();
  const result: Json[] = [];
  for (const [age, row] of rows.entries()) {
    const current = new Map<string, Json>();
    for (const task of row.tasks.filter((item: Json) => ownedTasks.has(item.func.symbol))) {
      current.set(`${task.slot}:${task.func.symbol}`, task);
    }
    for (const [id, task] of current) if (!live.has(id)) live.set(id, { id, start: age, first: task });
    for (const [id, life] of live) {
      if (!current.has(id)) {
        result.push({ id, start: life.start, end: age - 1, func: life.first.func.symbol, data: life.first.data });
        live.delete(id);
      }
    }
  }
  for (const [id, life] of live) result.push({ id, start: life.start, end: rows.length - 1, func: life.first.func.symbol, data: life.first.data });
  return result;
}
function archiveFrames(path: string, rows: readonly Json[]): Buffer[] {
  const archive = resolve(root, path);
  const members = execFileSync("tar", ["-tzf", archive], { encoding: "utf8" }).trim().split("\n").filter((name) => name.endsWith(".rgb"));
  const bytes = execFileSync("tar", ["-xOzf", archive], { maxBuffer: 256 * 1024 * 1024 });
  const size = 240 * 160 * 3;
  invariant(bytes.length === members.length * size, `${path}: archive shape`);
  const byFrame = new Map(members.map((name, index) => [name.replace(/^.*\//u, "").replace(/\.rgb$/u, ""), bytes.subarray(index * size, (index + 1) * size)]));
  return rows.map((row) => {
    const frame = byFrame.get(String(row.frame).padStart(5, "0"));
    invariant(frame && frame.length === size && sha(frame) === row.sha256, `${path}: RGB row ${row.frame}`);
    return frame;
  });
}
function changedPixels(previous: Buffer | undefined, current: Buffer): Json {
  if (!previous) return { changedPixels: null, bounds: null };
  let count = 0; let minX = 240; let minY = 160; let maxX = -1; let maxY = -1;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    const offset = pixel * 3;
    if (current[offset] === previous[offset] && current[offset + 1] === previous[offset + 1] && current[offset + 2] === previous[offset + 2]) continue;
    count += 1; const x = pixel % 240; const y = Math.floor(pixel / 240);
    minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  return { changedPixels: count, bounds: count ? [minX, minY, maxX, maxY] : null };
}
function tagLife(rows: readonly Json[], tag: number): Json {
  const tile = rows.flatMap((row, age) => row.tileTags.includes(tag) ? [age] : []);
  const palette = rows.flatMap((row, age) => row.paletteTags.includes(tag) ? [age] : []);
  return { tile: [tile[0], tile.at(-1), tile.length], palette: [palette[0], palette.at(-1), palette.length] };
}
function digest(row: Json, key: string): string { return sha(JSON.stringify(row[key])); }
function phaseSummary(rows: readonly Json[], rgb: readonly Buffer[], phase: "setup" | "unleash"): Json {
  const power = lifetimes(rows, "gPowerAbsorptionOrbSpriteTemplate");
  const big = lifetimes(rows, "gSolarBeamBigOrbSpriteTemplate");
  const small = lifetimes(rows, "gSolarBeamSmallOrbSpriteTemplate");
  const tasks = taskLifetimes(rows);
  const rowMap = rows.map((row, age) => ({
    age, frame: row.frame, phase, active: row.animScriptActive, pointer: row.scriptPtr, offset: row.scriptOffset, wait: row.scriptWait,
    tasks: row.tasks.filter((task: Json) => ownedTasks.has(task.func.symbol)).map((task: Json) => ({ slot: task.slot, func: task.func.symbol, data: task.data })),
    sprites: [...ownedTemplates].flatMap((template) => effects(row, template).map((sprite: Json) => ({
      template, slot: sprite.slot, callback: sprite.callback.symbol, x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2,
      anim: sprite.animNum, subpriority: sprite.subpriority, matrix: sprite.matrix, data: sprite.data,
    }))),
    resources: { tile: row.tileTags.includes(10147), palette: row.paletteTags.includes(10147) },
    audio: Object.fromEntries(["SE1", "SE2"].map((channel) => [channel, {
      symbol: row.audio[channel].songHeaderIdentity.symbol,
      tracks: row.audio[channel].tracks.map((track: Json) => ({ flags: track.flags, panX: track.panX })),
    }])),
    registers: { bldcnt: row.registers.bldcnt, bldalpha: row.registers.bldalpha, bldy: row.registers.bldy },
    background: row.battleBg, bgVram: row.bgVram,
    oam: { software: digest(row, "softwareOam"), hardware: digest(row, "hardwareOam") },
    matrices: { software: digest(row, "softwareMatrices"), hardware: digest(row, "hardwareMatrices") },
    palette: { faded: digest(row, "fadedPalette"), hardware: digest(row, "hardwarePalette") },
    immutableState: row.immutableState, animationRng: row.animationRng,
    battlers: digest(row, "battlers"), parties: digest(row, "parties"), engine: digest(row, "engine"),
    ...changedPixels(rgb[age - 1], rgb[age]!),
  }));
  const transfer = (hardware: string, software: string): string => `${rows.slice(1).filter((row, age) => same(row[hardware], rows[age]![software])).length}/${rows.length - 1}`;
  return {
    phase, frameCount: rows.length, rows: rowMap,
    lifecycle: { power, big, small, powerCount: power.length, bigCount: big.length, smallCount: small.length, taskLifetimes: tasks },
    transitions: {
      registers: Object.fromEntries(["bldcnt", "bldalpha", "bldy"].map((key) => [key, transitions(rows, (row) => row.registers[key])])),
      bgVram: transitions(rows, (row) => row.bgVram), audio: transitions(rows, (row) => [row.audio.SE1.songHeaderIdentity.symbol, row.audio.SE2.songHeaderIdentity.symbol]),
      animationRng: transitions(rows, (row) => row.animationRng), gameplayRng: transitions(rows, (row) => row.immutableState.rngValue),
    },
    latches: {
      hardwareOamEqualsPrecedingSoftware: transfer("hardwareOam", "softwareOam"),
      hardwareMatricesEqualsPrecedingSoftware: transfer("hardwareMatrices", "softwareMatrices"),
      hardwarePaletteEqualsPrecedingFaded: transfer("hardwarePalette", "fadedPalette"),
      targetBattlerX2Edges: edges(rows, (row) => row.battlerSprites.target.x2),
    },
    resources: { orbs: tagLife(rows, 10147) },
    state: {
      partiesStable: rows.every((row) => same(row.parties, rows[0]!.parties)),
      battlersStable: rows.every((row) => same(row.battlers, rows[0]!.battlers)),
      engineStable: rows.every((row) => same(row.engine, rows[0]!.engine)),
      immutableStable: rows.every((row) => same(row.immutableState, rows[0]!.immutableState)),
      gameplayRngTransitions: transitions(rows, (row) => row.immutableState.rngValue),
      animationRngDistinct: new Set(rows.map((row) => row.animationRng)).size,
    },
    cleanup: { active: rows.at(-1)!.animScriptActive, visualTasks: rows.at(-1)!.visualTaskCount, soundTasks: rows.at(-1)!.soundTaskCount, ownedTasks: rows.at(-1)!.tasks.filter((task: Json) => ownedTasks.has(task.func.symbol)).length, sprites: [...ownedTemplates].reduce((count, template) => count + effects(rows.at(-1)!, template).length, 0), resources: tagLife(rows, 10147) },
  };
}

function readProbe(side: Side): { readonly compressed: Buffer; readonly json: Buffer; readonly probe: Json } {
  const compressed = readFileSync(resolve(root, paths[side].dense));
  const json = gunzipSync(compressed);
  return { compressed, json, probe: JSON.parse(json.toString("utf8")) as Json };
}
function verifySide(side: Side, writeMap = false): Json {
  const { compressed, json, probe } = readProbe(side);
  const rows = probe.frames as Json[];
  invariant(probe.schema === "solar-beam-dense-evidence/v1" && probe.profile === "battle-scene-on" && probe.move === 76, `${side}: identity`);
  invariant(probe.sourcePointerContract.start === 0x082d08d8 && probe.sourcePointerContract.endExclusive === 0x082d0b2d, `${side}: pointer contract`);
  invariant(probe.bodyWindows.length === 2 && probe.bodyWindows[0].frameCount === 108 && probe.bodyWindows[1].frameCount === 160 && rows.length === 268, `${side}: two-turn windows`);
  invariant(rows.every((row) => row.scriptOwner === "Move_SOLAR_BEAM" && row.scriptPtr >= 0x082d08d8 && row.scriptPtr < 0x082d0b2d), `${side}: complete source ownership`);
  invariant(!rows.at(-1)!.animScriptActive && rows.at(-1)!.visualTaskCount === 0 && rows.at(-1)!.soundTaskCount === 0, `${side}: first inactive cleanup`);
  for (const row of rows) invariant(row.softwareOam.length === 128 && row.hardwareOam.length === 128 && row.softwareMatrices.length === 32 && row.hardwareMatrices.length === 32 && row.fadedPalette.length === 512 && row.hardwarePalette.length === 512 && row.paletteTags.length === 16 && row.tileTags.length === 128 && row.parties.player.length === 3 && row.parties.opponent.length === 3, `${side}: full hardware/state row`);
  const rgb = archiveFrames(paths[side].rgb, rows);
  const first = rows.slice(0, 108); const second = rows.slice(108);
  const firstRgb = rgb.slice(0, 108); const secondRgb = rgb.slice(108);
  const setup = phaseSummary(first, firstRgb, "setup"); const unleash = phaseSummary(second, secondRgb, "unleash");
  invariant(setup.lifecycle.powerCount === 14 && unleash.lifecycle.bigCount === 21 && unleash.lifecycle.smallCount === 15, `${side}: Solar Beam orb census`);
  invariant(setup.state.partiesStable && setup.state.battlersStable && unleash.state.partiesStable && unleash.state.battlersStable, `${side}: state changed during animation body`);
  invariant(setup.cleanup.sprites === 0 && unleash.cleanup.sprites === 0 && setup.cleanup.ownedTasks === 0 && unleash.cleanup.ownedTasks === 0, `${side}: owned cleanup`);
  const map = {
    schema: "solar-beam-normalized-change-map/v1", oracleProfile: "battle-scene-on", side,
    sourceWindow: probe.sourceWindow, bodyWindows: probe.bodyWindows, sourcePointerContract: probe.sourcePointerContract,
    setup, unleash, topology: probe.topology, twoTurnBoundary: probe.stageFacts,
    state: { setup: setup.state, unleash: unleash.state, interBodyGap: probe.stageFacts.interBodyGaps },
  };
  const mapBytes = Buffer.from(`${JSON.stringify(map, null, 2)}\n`);
  if (writeMap) writeFileSync(resolve(root, paths[side].map), mapBytes);
  const current = {
    scenario: paths[side].scenario, scenarioSha256: sha(readFileSync(resolve(root, paths[side].scenario))),
    denseState: paths[side].dense, denseStateSha256: sha(compressed), probeJsonSha256: sha(json),
    rawRgbArchive: paths[side].rgb, rawRgbArchiveSha256: sha(readFileSync(resolve(root, paths[side].rgb))), rawRgbSequenceSha256: sha(Buffer.concat(rgb)),
    changeMap: paths[side].map, changeMapSha256: sha(mapBytes), sourceWindow: probe.sourceWindow,
    summary: { setup, unleash, twoTurnBoundary: probe.stageFacts },
  };
  return current;
}

const fixturePath = resolve(root, "tools/compare/fixtures/solar-beam-evidence.json");
if (process.argv.includes("--write")) {
  const player = verifySide("player-back", true); const opponent = verifySide("opponent-front", true);
  const repeats = { "player-back": process.env.SOLAR_BEAM_PLAYER_REPEAT, "opponent-front": process.env.SOLAR_BEAM_OPPONENT_REPEAT };
  const repeatRgb = { "player-back": process.env.SOLAR_BEAM_PLAYER_REPEAT_RGB, "opponent-front": process.env.SOLAR_BEAM_OPPONENT_REPEAT_RGB };
  const repeatProbeJsonSha256: Record<string, string> = {};
  for (const side of ["player-back", "opponent-front"] as const) {
    invariant(repeats[side] && repeatRgb[side], `${side}: repeat probe and RGB digest required`);
    repeatProbeJsonSha256[side] = sha(readFileSync(repeats[side]!));
    invariant(repeatProbeJsonSha256[side] === (side === "player-back" ? player : opponent).probeJsonSha256, `${side}: repeat dense probe drift`);
    invariant(repeatRgb[side] === (side === "player-back" ? player : opponent).rawRgbSequenceSha256, `${side}: repeat RGB drift`);
  }
  const fixture = {
    schema: "solar-beam-bilateral-evidence/v1", oracleProfile: "battle-scene-on", move: "MOVE_SOLAR_BEAM", moveId: 76,
    status: "unsupported-evidence", coverageCredit: false,
    evidenceScope: { sourceAudit: true, completeTwoTurnPointerBody: true, fullDenseRowsRetained: true, normalizedMaps: true, twiceFreshByteIdentical: true, rawRgbRetained: true, productionAnimationChanged: false, reducerAdded: false, typedSeamAdded: false, compositorAdded: false, actualCoreFramebufferAcceptance: false, alteredLiveGeometryControl: false, coveragePromotion: false, boundaryOrBarrierChanged: false, gameplayStateOwned: false },
    source: { start: "0x082d08d8", endExclusive: "0x082d0b2d", romByteLength: 597, romSha256: "423f7f6832318d13d85460631eda2d3c5fb749526146f4729dc985d22e13fbf9", sourceByteLength: 3624, sourceSha256: "de9a8a0b660bf608ca8ff8c636b4ce5544501f43a2a726a7d8818075501ec331", componentCount: 28, level50CarrierCount: 16, audit: "tools/compare/solarBeamSourceAudit.ts", probe: "tools/compare/solarBeamProbe.py", verifier: "tools/compare/solarBeamEvidence.ts" },
    acceptance: { freshRunsPerOrientation: 2, setupRows: 108, unleashRows: 160, totalRows: 268, firstInactiveCleanupRetained: true, measuredMechanisms: ["setup absorption-orb", "setup blend_color_cycle", "setup monbg/alpha", "unleash solar big/small orbs", "AnimTask_BlendBattleAnimPal", "AnimTask_ShakeMon2", "target-side BG_SOLAR_BEAM_OPPONENT/PLAYER fade/restore", "panse", "cleanup", "two-turn boundary"], latchScope: "Solar Beam maps only; no ANIMATION_LATCHES.md transfer or global rule added" },
    orientations: { "player-back": { ...player, repeatProbeJsonSha256: repeatProbeJsonSha256["player-back"], repeatRawRgbSequenceSha256: repeatRgb["player-back"] }, "opponent-front": { ...opponent, repeatProbeJsonSha256: repeatProbeJsonSha256["opponent-front"], repeatRawRgbSequenceSha256: repeatRgb["opponent-front"] } },
    controls: { distinctExactMoves: ["MOVE_HYPER_FANG", "MOVE_MEGA_PUNCH", "MOVE_MEGA_KICK", "MOVE_FOCUS_PUNCH"], siblingLatchTransfer: false, siblingFramebufferTransfer: false },
    acceptanceVerdict: "Evidence only: MOVE_SOLAR_BEAM and contest-target-side-impact-bg remain unsupported/unfulfilled until a source-relative reducer, typed seam, live compositor, bilateral dense actual-core framebuffer proof, and altered live geometry/species control land.",
  };
  writeFileSync(fixturePath, `${JSON.stringify(fixture, null, 2)}\n`);
}
const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as Json;
const result = { "player-back": verifySide("player-back"), "opponent-front": verifySide("opponent-front") };
for (const side of ["player-back", "opponent-front"] as const) {
  const expected = fixture.orientations[side]; const current = result[side];
  invariant(expected.scenarioSha256 === current.scenarioSha256 && expected.denseStateSha256 === current.denseStateSha256 && expected.probeJsonSha256 === current.probeJsonSha256 && expected.rawRgbArchiveSha256 === current.rawRgbArchiveSha256 && expected.rawRgbSequenceSha256 === current.rawRgbSequenceSha256 && expected.changeMapSha256 === current.changeMapSha256, `${side}: retained receipt drift`);
  invariant(readFileSync(resolve(root, paths[side].map)).equals(Buffer.from(`${JSON.stringify({ schema: "solar-beam-normalized-change-map/v1", oracleProfile: "battle-scene-on", side, sourceWindow: readProbe(side).probe.sourceWindow, bodyWindows: readProbe(side).probe.bodyWindows, sourcePointerContract: readProbe(side).probe.sourcePointerContract, setup: current.summary.setup, unleash: current.summary.unleash, topology: readProbe(side).probe.topology, twoTurnBoundary: readProbe(side).probe.stageFacts, state: { setup: current.summary.setup.state, unleash: current.summary.unleash.state, interBodyGap: readProbe(side).probe.stageFacts.interBodyGaps } }, null, 2)}\n`)), `${side}: map drift`);
}
console.log(JSON.stringify({ schema: fixture.schema, move: fixture.move, status: fixture.status, coverageCredit: fixture.coverageCredit, orientations: Object.fromEntries(Object.entries(result).map(([side, item]: [string, Json]) => [side, { sourceWindow: item.sourceWindow, probeJsonSha256: item.probeJsonSha256, repeatProbeJsonSha256: fixture.orientations[side].repeatProbeJsonSha256, rawRgbSequenceSha256: item.rawRgbSequenceSha256, setupRows: item.summary.setup.frameCount, unleashRows: item.summary.unleash.frameCount, orbCounts: { absorption: item.summary.setup.lifecycle.powerCount, big: item.summary.unleash.lifecycle.bigCount, small: item.summary.unleash.lifecycle.smallCount }, latches: item.summary.setup.latches, unleashLatches: item.summary.unleash.latches, boundary: item.summary.twoTurnBoundary }])), boundary: { moveLedgerEntry: false, trackFulfilled: false, barrierChanged: false } }, null, 2));
