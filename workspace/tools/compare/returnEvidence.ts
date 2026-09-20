/** Hermetic verifier and normalized change-map builder for every MOVE_RETURN branch. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";

type Json = Record<string, any>;
type Side = "player-back" | "opponent-front";
type Branch = "weak" | "medium" | "strong" | "strongest";
const root = resolve(import.meta.dirname, "../..");
const sha = (value: Uint8Array | string): string => createHash("sha256").update(value).digest("hex");
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
function invariant(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
const branches: readonly Branch[] = ["weak", "medium", "strong", "strongest"];
const sides: readonly Side[] = ["player-back", "opponent-front"];
const sideArtifact: Record<Side, string> = { "player-back": "player", "opponent-front": "opponent" };

const branchContracts: Record<Branch, Json> = {
  weak: {
    friendship: 60, returnPowerLevel: 0, rows: 88, sourceLabel: "ReturnWeak", sourceEndLabel: "ReturnMedium",
    verticalDipStarts: [11, 47], horizontalLungeStarts: [], hitsplatStarts: [54], traceStarts: [], simpleBlendStarts: [],
    taskLifetimes: { shake: [], trace: [], monbg: [[4, 85]], clear: [[83, 85]] },
    soundTaskSchedules: { SE2TailWhip: [11, 47], SE1CometPunch: [54] },
    audio: [{ channel: "SE2", symbol: "se_m_tail_whip", ages: [11, 47], role: "attacker" }, { channel: "SE1", symbol: "se_m_comet_punch", ages: [54], role: "target" }],
    alpha: [7, 83], monbgFinal: { "player-back": 86, "opponent-front": 86 }, monbgChanges: { "player-back": 2, "opponent-front": 2 },
  },
  medium: {
    friendship: 61, returnPowerLevel: 1, rows: 100, sourceLabel: "ReturnMedium", sourceEndLabel: "ReturnStrong",
    verticalDipStarts: [11, 27], horizontalLungeStarts: [56], hitsplatStarts: [64], traceStarts: [], simpleBlendStarts: [],
    taskLifetimes: { shake: [], trace: [], monbg: [[4, 77]], clear: [[75, 77]] },
    soundTaskSchedules: { SE2TailWhip: [11, 27], SE1MegaKick2: [64] },
    audio: [{ channel: "SE2", symbol: "se_m_tail_whip", ages: [11, 27], role: "attacker" }, { channel: "SE1", symbol: "se_m_mega_kick2", ages: [64], role: "target" }],
    alpha: [7, 75], monbgFinal: { "player-back": 78, "opponent-front": 78 }, monbgChanges: { "player-back": 2, "opponent-front": 2 },
  },
  strong: {
    friendship: 200, returnPowerLevel: 2, rows: 125, sourceLabel: "ReturnStrong", sourceEndLabel: "ReturnStrongest",
    verticalDipStarts: [11, 27, 43, 59], horizontalLungeStarts: [], hitsplatStarts: [75, 85, 95, 105], traceStarts: [], simpleBlendStarts: [],
    taskLifetimes: { shake: [[75, 118]], trace: [], monbg: [[4, 122]], clear: [[120, 122]] },
    soundTaskSchedules: { SE2TailWhip: [11, 27, 43, 59], SE1VitalThrow2: [75, 85, 95, 105] },
    audio: [{ channel: "SE2", symbol: "se_m_tail_whip", ages: [11, 27, 43, 59], role: "attacker" }, { channel: "SE1", symbol: "se_m_vital_throw2", ages: [75, 85, 95, 105], role: "target" }],
    alpha: [7, 120], monbgFinal: { "player-back": 123, "opponent-front": 123 }, monbgChanges: { "player-back": 17, "opponent-front": 16 },
  },
  strongest: {
    friendship: 255, returnPowerLevel: 3, rows: 282, sourceLabel: "ReturnStrongest", sourceEndLabel: "ReturnStrongestHit",
    verticalDipStarts: [24, 60, 94, 120, 135, 157, 172, 187, 202], horizontalLungeStarts: [],
    hitsplatStarts: [34, 67, 101, 120, 142, 157, 172, 187, 202, 217, 225, 233, 241], traceStarts: [120, 120, 142, 157, 172, 187, 202], simpleBlendStarts: [11, 264],
    taskLifetimes: { shake: [[67, 80], [101, 114], [120, 133], [142, 155], [157, 170], [172, 185], [187, 200], [202, 215], [217, 262]], trace: [[120, 125], [142, 147], [157, 162], [172, 177], [187, 192], [202, 207]], monbg: [[4, 279]], clear: [[277, 279]] },
    soundTaskSchedules: { SE2TailWhip: [24, 60, 94, 120, 135, 157, 172, 187, 202], SE1VitalThrow2: [34, 67, 101, 120, 142, 157, 172, 187, 202], SE1MegaKick2: [217, 225, 233, 241] },
    audio: [{ channel: "SE2", symbol: "se_m_tail_whip", ages: [24, 60, 94, 120, 135, 157, 172, 187, 202], role: "attacker" }, { channel: "SE1", symbol: "se_m_vital_throw2", ages: [34, 67, 101, 120, 142, 157, 172, 187, 202], role: "target" }, { channel: "SE1", symbol: "se_m_mega_kick2", ages: [217, 225, 233, 241], role: "target" }],
    alpha: [7, 277], monbgFinal: { "player-back": 280, "opponent-front": 280 }, monbgChanges: { "player-back": 73, "opponent-front": 72 },
    simplePalette: { faded: [12, 14, 16, 265, 267, 269], hardware: [13, 15, 17, 266, 268, 270] },
  },
};

/** The prior friendship-255 corpus is evidence, not a regenerable baseline. */
const strongestByteStable: Record<Side, Json> = {
  "player-back": { scenarioSha256: "bcf7b8478df683393f4e545e5aff64cea59b520fae9d37bf21135b065df8041a", denseStateSha256: "db6a664f120ac637366db31260313bf4697d5c39f79a1645f7ff4d18531fd3bc", probeJsonSha256: "8d2c3569efdd02222dff040bf18c5d6c01781cf4cdf397ee071dd220123bbe2a", rawRgbArchiveSha256: "667af83998fa9225202328d329cd915c14de7345f92d2bf9367ee697a2ea63d8", rawRgbSequenceSha256: "9b3723b35b7a92cbb98da9cc1ec87277b7bfe7809edf887b9ac124e46c7dcbe4", changeMapSha256: "2383586a1a2fb50ca872ec71c4e9150a4c91b41463f1d489fa9877558b0dd30b" },
  "opponent-front": { scenarioSha256: "1ba144330e6db994d5baa06f230de6fe2050aaeedeae02af96ab125659f12ea7", denseStateSha256: "332eff3f8662729aafe7e02d1d2c51cc6de84283f3f6cf1b5269b0185dc36574", probeJsonSha256: "f7214f2e828bd053a606116a9f7bac3e71f860c9f3f71b6a4fdd963825116392", rawRgbArchiveSha256: "7e8ff78694ed6add1f141c00612e8f8cd5b1ff20486d495f23c490b147bb26f0", rawRgbSequenceSha256: "4a0692bfe09106d14be1c7b359d27c4d2524d514f8d709444163f404a881b506", changeMapSha256: "ff881ad46a3dc3d3efb4b115a66c13401a7c9268e77320d01a43d5b41910233a" },
};

const ownedTasks = new Set(["AnimTask_ShakeMon_Step", "AnimTask_TraceMonBlended_Step", "Task_UpdateMonBg", "Task_ClearMonBg"]);
const ownedTemplates = new Set(["gHorizontalLungeSpriteTemplate", "gVerticalDipSpriteTemplate", "gBasicHitSplatSpriteTemplate", "gSimplePaletteBlendSpriteTemplate"]);
const ownedSprite = (sprite: Json): boolean => ownedTemplates.has(sprite.template.symbol) || (sprite.template.symbol === "gMultiuseSpriteTemplate" && sprite.callback.symbol === "AnimMonTrace");

function pathFor(branch: Branch, side: Side): Json {
  const artifact = sideArtifact[side], legacy = branch === "strongest";
  const orientation = artifact === "player" ? "player-dragonair-opponent-onix" : "opponent-dragonair-player-onix";
  const scenario = legacy ? "tools/battle-lab/mechanic-return-" + orientation + ".json" : "tools/battle-lab/mechanic-return-" + branch + "-" + orientation + ".json";
  const stem = legacy ? "return-" + artifact : "return-" + branch + "-" + artifact;
  return { scenario, dense: "tools/compare/evidence/" + stem + "-dense-state.json.gz", rgb: "tools/compare/evidence/" + stem + "-raw-rgb.tar.gz", map: legacy ? "tools/compare/evidence/return-changemap-" + artifact + ".json" : "tools/compare/evidence/return-" + branch + "-changemap-" + artifact + ".json" };
}
function transitions(rows: readonly Json[], select: (row: Json) => unknown): number[] { return rows.flatMap((row, age) => age && !same(select(row), select(rows[age - 1]!)) ? [age] : []); }
function edges(rows: readonly Json[], select: (row: Json) => unknown): unknown[][] { return rows.flatMap((row, age) => age === 0 || !same(select(row), select(rows[age - 1]!)) ? [[age, select(row)]] : []); }
function starts(rows: readonly Json[], template: string, callback?: string): number[] {
  let previous = new Set<number>(); const result: number[] = [];
  rows.forEach((row, age) => { const current = new Set<number>(row.sprites.filter((sprite: Json) => sprite.template.symbol === template && (!callback || sprite.callback.symbol === callback)).map((sprite: Json) => sprite.slot)); for (const slot of current) if (!previous.has(slot)) result.push(age); previous = current; });
  return result;
}
function taskSpans(rows: readonly Json[], symbol: string): number[][] {
  let start: number | undefined; const result: number[][] = [];
  rows.forEach((row, age) => { const live = row.tasks.some((task: Json) => task.func.symbol === symbol); if (live && start === undefined) start = age; if (!live && start !== undefined) { result.push([start, age - 1]); start = undefined; } });
  if (start !== undefined) result.push([start, rows.length - 1]);
  return result;
}
function rgbFrames(archive: string, rows: readonly Json[]): Buffer[] {
  const names = execFileSync("tar", ["-tzf", archive], { encoding: "utf8" }).trim().split("\n").filter((name) => name.endsWith(".rgb"));
  const bytes = execFileSync("tar", ["-xOzf", archive], { maxBuffer: 256 * 1024 * 1024 }), size = 240 * 160 * 3;
  invariant(bytes.length === names.length * size, archive + ": shape");
  const frames = new Map(names.map((name, index) => [name.replace(/^.*\//u, "").replace(/\.rgb$/u, ""), bytes.subarray(index * size, (index + 1) * size)]));
  return rows.map((row) => { const frame = frames.get(String(row.frame).padStart(5, "0")); invariant(frame && sha(frame) === row.sha256, archive + ": frame " + row.frame); return frame; });
}
function rgbSequenceFromDirectory(directory: string, rows: readonly Json[]): string {
  const expected = rows.map((row) => String(row.frame).padStart(5, "0") + ".rgb");
  const names = readdirSync(directory).filter((name) => name.endsWith(".rgb")).sort();
  invariant(same(names, expected), directory + ": complete unthinned RGB rows");
  return sha(Buffer.concat(names.map((name) => readFileSync(resolve(directory, name)))));
}
function changed(previous: Buffer | undefined, current: Buffer): Json {
  if (!previous) return { count: null, bounds: null };
  let count = 0, minX = 240, minY = 160, maxX = -1, maxY = -1;
  for (let pixel = 0; pixel < 38400; pixel++) { const offset = pixel * 3; if (current[offset] === previous[offset] && current[offset + 1] === previous[offset + 1] && current[offset + 2] === previous[offset + 2]) continue; count++; const x = pixel % 240, y = Math.floor(pixel / 240); minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
  return { count, bounds: count ? [minX, minY, maxX, maxY] : null };
}
function mapFor(branch: Branch, side: Side, probe: Json, rgb: readonly Buffer[]): Json {
  const contract = branchContracts[branch], rows = probe.frames as Json[];
  const predecessor = (hardware: string, software: string) => String(rows.slice(1).filter((row, index) => same(row[hardware], rows[index]![software])).length) + "/" + String(rows.length - 1);
  const bankTransitions = (key: "fadedPalette" | "hardwarePalette", bank: number) => transitions(rows, (row) => row[key].slice(bank * 16, bank * 16 + 16));
  const stable = (select: (row: Json) => unknown) => rows.every((row) => same(select(row), select(rows[0]!)));
  const rowMap = rows.map((row, age) => ({
    age, frame: row.frame, active: row.animScriptActive, sourceOffset: row.scriptOffset, wait: row.scriptWait, args: row.animArgs,
    tasks: row.tasks.filter((task: Json) => ownedTasks.has(task.func.symbol)).map((task: Json) => ({ slot: task.slot, func: task.func.symbol, data: task.data })),
    sprites: row.sprites.filter(ownedSprite).map((sprite: Json) => ({ slot: sprite.slot, template: sprite.template.symbol, callback: sprite.callback.symbol, x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2, attr: sprite.attr, matrix: sprite.matrix, data: sprite.data, order: row.spriteOrder.indexOf(sprite.slot) })),
    battlerAxes: { attacker: [row.battlerSprites.attacker.x2, row.battlerSprites.attacker.y2], target: [row.battlerSprites.target.x2, row.battlerSprites.target.y2] },
    registers: row.registers, battleBg: row.battleBg,
    audio: Object.fromEntries(["SE1", "SE2"].map((channel) => [channel, { symbol: row.audio[channel].songHeaderIdentity.symbol, digest: sha(JSON.stringify(row.audio[channel])) }])),
    resources: { impactTileSlot: row.tileTags.indexOf(10135), impactPaletteSlot: row.paletteTags.indexOf(10135), allocatorDigest: sha(JSON.stringify(row.resourceAllocators)) },
    digests: { softwareOam: sha(JSON.stringify(row.softwareOam)), hardwareOam: sha(JSON.stringify(row.hardwareOam)), softwareMatrices: sha(JSON.stringify(row.softwareMatrices)), hardwareMatrices: sha(JSON.stringify(row.hardwareMatrices)), fadedPalette: sha(JSON.stringify(row.fadedPalette)), hardwarePalette: sha(JSON.stringify(row.hardwarePalette)), bgVram: sha(JSON.stringify(row.bgVram)), battle: sha(JSON.stringify([row.parties, row.battlers, row.engine, row.immutableState, row.rawBattleState])) },
    animationRng: row.animationRng, gameplayRng: row.rawBattleState.gameplayRng, rgbSha256: row.sha256, changed: changed(rgb[age - 1], rgb[age]!),
  }));
  const loadedAge = rows.findIndex((row) => row.tileTags.indexOf(10135) !== -1);
  const unloadedAge = rows.findIndex((row, age) => age > loadedAge && row.tileTags.indexOf(10135) === -1);
  return {
    schema: "return-" + branch + "-normalized-change-map/v1", oracleProfile: "battle-scene-on", side, sourceWindow: probe.sourceWindow, sourcePointerContract: probe.sourcePointerContract, topology: probe.topology,
    branch: { friendship: contract.friendship, returnPowerLevel: contract.returnPowerLevel, selectorWriteAge: 7 },
    lifecycle: {
      verticalDipStarts: starts(rows, "gVerticalDipSpriteTemplate"), hitsplatStarts: starts(rows, "gBasicHitSplatSpriteTemplate"), traceStarts: starts(rows, "gMultiuseSpriteTemplate", "AnimMonTrace"),
      shakeLives: edges(rows, (row) => row.tasks.filter((task: Json) => task.func.symbol === "AnimTask_ShakeMon_Step").map((task: Json) => [task.slot, task.data])),
      traceLives: edges(rows, (row) => row.tasks.filter((task: Json) => task.func.symbol === "AnimTask_TraceMonBlended_Step").map((task: Json) => [task.slot, task.data])),
      simpleBlendStarts: starts(rows, "gSimplePaletteBlendSpriteTemplate"), soundTaskSchedules: contract.soundTaskSchedules,
    },
    latches: { hardwareOamEqualsPrecedingSoftware: predecessor("hardwareOam", "softwareOam"), hardwareMatricesEqualPrecedingSoftware: predecessor("hardwareMatrices", "softwareMatrices"), hardwarePaletteEqualsPrecedingFaded: predecessor("hardwarePalette", "fadedPalette"), oamExceptions: rows.flatMap((row, age) => age && !same(row.hardwareOam, rows[age - 1]!.softwareOam) ? [age] : []), matrixExceptions: rows.flatMap((row, age) => age && !same(row.hardwareMatrices, rows[age - 1]!.softwareMatrices) ? [age] : []), paletteSameRowExceptions: rows.flatMap((row, age) => age && !same(row.hardwarePalette, rows[age - 1]!.fadedPalette) ? [age] : []), attackerAxes: edges(rows, (row) => [row.battlerSprites.attacker.x2, row.battlerSprites.attacker.y2]), targetAxes: edges(rows, (row) => [row.battlerSprites.target.x2, row.battlerSprites.target.y2]) },
    transitions: { registers: Object.fromEntries(Object.keys(rows[0]!.registers).map((key) => [key, transitions(rows, (row) => row.registers[key])]).filter(([, ages]) => (ages as number[]).length)), battleBg: Object.fromEntries(Object.keys(rows[0]!.battleBg).map((key) => [key, transitions(rows, (row) => row.battleBg[key])]).filter(([, ages]) => (ages as number[]).length)), fadedBanks: Object.fromEntries(Array.from({ length: 32 }, (_, bank) => [bank, bankTransitions("fadedPalette", bank)]).filter(([, ages]) => (ages as number[]).length)), hardwareBanks: Object.fromEntries(Array.from({ length: 32 }, (_, bank) => [bank, bankTransitions("hardwarePalette", bank)]).filter(([, ages]) => (ages as number[]).length)), audio: transitions(rows, (row) => row.audio), animationRng: transitions(rows, (row) => row.animationRng), gameplayRng: transitions(rows, (row) => row.rawBattleState.gameplayRng) },
    resources: { impact: { loadedAge, unloadedAge, tileSlot: rows[loadedAge]!.tileTags.indexOf(10135), paletteSlot: rows[loadedAge]!.paletteTags.indexOf(10135) } },
    state: { partiesStable: stable((row) => row.parties), battlersStable: stable((row) => row.battlers), engineStable: stable((row) => row.engine), immutableStable: stable((row) => row.immutableState), rawBattleStable: stable((row) => row.rawBattleState), gameplayRngStable: stable((row) => row.rawBattleState.gameplayRng) },
    cleanup: { age: rows.length - 1, active: rows.at(-1)!.animScriptActive, visualTasks: rows.at(-1)!.visualTaskCount, soundTasks: rows.at(-1)!.soundTaskCount, ownedTasks: rows.at(-1)!.tasks.filter((task: Json) => ownedTasks.has(task.func.symbol)).length, ownedSprites: rows.at(-1)!.sprites.filter(ownedSprite).length }, rows: rowMap,
  };
}
function verifyScenario(branch: Branch, side: Side, path: string): void {
  const scenario = JSON.parse(readFileSync(resolve(root, path), "utf8")) as Json;
  const required = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"];
  invariant(scenario.schemaVersion === 1 && scenario.mode === "mechanicLab" && scenario.profile === "battle-scene-on" && scenario.level === 50 && same(Object.keys(scenario.overrides).sort(), ["parties"]), branch + "/" + side + ": legal party-only stage");
  for (const party of [scenario.overrides.parties.player, scenario.overrides.parties.opponent]) invariant(party.length === 3 && party.every((mon: Json) => same(Object.keys(mon).sort(), required)), branch + "/" + side + ": six complete party records");
  const attackers = side === "player-back" ? scenario.overrides.parties.player : scenario.overrides.parties.opponent, contract = branchContracts[branch];
  invariant(attackers[0].species === 148 && attackers[0].moves.every((move: number) => move === 216) && attackers[0].friendship === contract.friendship, branch + "/" + side + ": explicit active RETURN friendship");
  if (branch !== "strongest") invariant(attackers.every((mon: Json) => mon.friendship === contract.friendship), branch + "/" + side + ": branch-only attacking party");
}
function expectedPan(side: Side, role: string): number { return role === "attacker" ? (side === "player-back" ? -64 : 63) : (side === "player-back" ? 63 : -63); }
function verifyAudio(rows: readonly Json[], side: Side, contract: Json): void {
  for (const entry of contract.audio as Json[]) for (const age of entry.ages as number[]) {
    const current = rows[age]!.audio[entry.channel], previous = rows[age - 1]!.audio[entry.channel];
    invariant(current.songHeaderIdentity.symbol === entry.symbol && !same(current, previous) && current.tracks.some((track: Json) => track.panX === expectedPan(side, entry.role)), side + ": " + entry.symbol + " at " + age);
  }
}
function verifySide(branch: Branch, side: Side, receipt?: Json, writeMap = false): Json {
  const config = pathFor(branch, side), contract = branchContracts[branch], compressed = readFileSync(resolve(root, config.dense)), json = gunzipSync(compressed), probe = JSON.parse(json.toString("utf8")) as Json, rows = probe.frames as Json[];
  verifyScenario(branch, side, config.scenario);
  invariant(probe.schema === "return-" + branch + "-dense-evidence/v1" && probe.profile === "battle-scene-on" && probe.move === 216 && rows.length === contract.rows && probe.sourceWindow.frameCount === contract.rows && probe.sourceWindow.sourceFrameCount === contract.rows, branch + "/" + side + ": identity/window");
  invariant(probe.sourcePointerContract.start === 0x082d5ace && probe.sourcePointerContract.endExclusive === 0x082d5f5d && same(probe.sourcePointerContract.observedParities, [0, 1]) && rows.every((row, age) => row.frame === rows[0]!.frame + age && row.scriptOwner === "Move_RETURN"), branch + "/" + side + ": complete source pointer window");
  invariant(rows.slice(7, 11).every((row) => row.animArgs[7] === contract.returnPowerLevel), branch + "/" + side + ": selector");
  const branchStart = probe.sourceSymbols[contract.sourceLabel], branchEnd = probe.sourceSymbols[contract.sourceEndLabel], branchPc = rows[11]!.scriptPtr & ~1;
  invariant(typeof branchStart === "number" && typeof branchEnd === "number" && branchStart <= branchPc && branchPc < branchEnd, branch + "/" + side + ": source-selected " + contract.sourceLabel);
  rows.forEach((row, age) => invariant(row.softwareOam.length === 128 && row.hardwareOam.length === 128 && row.softwareMatrices.length === 32 && row.hardwareMatrices.length === 32 && row.fadedPalette.length === 512 && row.hardwarePalette.length === 512 && row.resourceAllocators.tileRanges.length === 64 && row.rawBattleState.playerParty.length === 1200 && row.rawBattleState.opponentParty.length === 1200 && row.rawBattleState.battleMons.length === 704, branch + "/" + side + ": full row " + age));
  const rgb = rgbFrames(resolve(root, config.rgb), rows), map = mapFor(branch, side, probe, rgb), bytes = Buffer.from(JSON.stringify(map, null, 2) + "\n");
  if (writeMap) writeFileSync(resolve(root, config.map), bytes);
  else invariant(readFileSync(resolve(root, config.map)).equals(bytes), branch + "/" + side + ": retained map");
  invariant(same(map.lifecycle.verticalDipStarts, contract.verticalDipStarts) && same(starts(rows, "gHorizontalLungeSpriteTemplate"), contract.horizontalLungeStarts) && same(map.lifecycle.hitsplatStarts, contract.hitsplatStarts) && same(map.lifecycle.traceStarts, contract.traceStarts) && same(map.lifecycle.simpleBlendStarts, contract.simpleBlendStarts), branch + "/" + side + ": sprites");
  invariant(same(taskSpans(rows, "AnimTask_ShakeMon_Step"), contract.taskLifetimes.shake) && same(taskSpans(rows, "AnimTask_TraceMonBlended_Step"), contract.taskLifetimes.trace) && same(taskSpans(rows, "Task_UpdateMonBg"), contract.taskLifetimes.monbg) && same(taskSpans(rows, "Task_ClearMonBg"), contract.taskLifetimes.clear) && same(map.lifecycle.soundTaskSchedules, contract.soundTaskSchedules), branch + "/" + side + ": tasks/audio schedule");
  verifyAudio(rows, side, contract);
  invariant(map.latches.hardwareOamEqualsPrecedingSoftware === String(contract.rows - 1) + "/" + String(contract.rows - 1) && map.latches.hardwareMatricesEqualPrecedingSoftware === String(contract.rows - 1) + "/" + String(contract.rows - 1) && map.latches.hardwarePaletteEqualsPrecedingFaded === String(contract.rows - 2) + "/" + String(contract.rows - 1) && !map.latches.oamExceptions.length && !map.latches.matrixExceptions.length && same(map.latches.paletteSameRowExceptions, [4]), branch + "/" + side + ": OAM/matrix/palette latches");
  invariant(map.latches.attackerAxes.length > 0 && map.latches.targetAxes.length > 0 && map.latches.attackerAxes[0][0] === 0 && map.latches.targetAxes[0][0] === 0, branch + "/" + side + ": battler axes");
  const bg = side === "player-back" ? "gBattle_BG1_X" : "gBattle_BG2_X", reg = side === "player-back" ? "bg1hofs" : "bg2hofs";
  const sourceScroll = map.transitions.battleBg[bg] as number[], displayedScroll = map.transitions.registers[reg] as number[];
  invariant(sourceScroll[0] === 4 && sourceScroll.at(-1) === contract.monbgFinal[side] && sourceScroll.length === contract.monbgChanges[side] && same(displayedScroll, sourceScroll.map((age) => age + 1)) && same(map.transitions.registers.bldcnt, contract.alpha) && same(map.transitions.registers.bldalpha, contract.alpha), branch + "/" + side + ": monbg scroll/direct alpha");
  if (contract.simplePalette) invariant(same(map.transitions.fadedBanks[1], contract.simplePalette.faded) && same(map.transitions.hardwareBanks[1], contract.simplePalette.hardware) && !map.transitions.fadedBanks[16] && !map.transitions.fadedBanks[17], branch + "/" + side + ": BG-only simple blend");
  else invariant(!map.transitions.fadedBanks[1] && !map.transitions.fadedBanks[2] && !map.transitions.fadedBanks[3], branch + "/" + side + ": no simple blend");
  invariant(map.resources.impact.loadedAge === 1 && map.resources.impact.unloadedAge === contract.rows - 1 && map.resources.impact.tileSlot === 6 && map.resources.impact.paletteSlot === 7 && map.state.partiesStable && map.state.battlersStable && map.state.engineStable && map.state.immutableStable && map.state.rawBattleStable && map.state.gameplayRngStable && map.transitions.animationRng.length > 0 && !map.transitions.gameplayRng.length, branch + "/" + side + ": resources/state/RNG");
  invariant(map.cleanup.age === contract.rows - 1 && map.cleanup.active === false && map.cleanup.visualTasks === 0 && map.cleanup.soundTasks === 0 && map.cleanup.ownedTasks === 0 && map.cleanup.ownedSprites === 0, branch + "/" + side + ": cleanup");
  const current = { branch, friendship: contract.friendship, returnPowerLevel: contract.returnPowerLevel, scenario: config.scenario, scenarioSha256: sha(readFileSync(resolve(root, config.scenario))), denseState: config.dense, denseStateSha256: sha(compressed), probeJsonSha256: sha(json), rawRgbArchive: config.rgb, rawRgbArchiveSha256: sha(readFileSync(resolve(root, config.rgb))), rawRgbSequenceSha256: sha(Buffer.concat(rgb)), changeMap: config.map, changeMapSha256: sha(bytes), sourceWindow: probe.sourceWindow, rows: rows.length, latches: map.latches, lifecycle: map.lifecycle, transitions: map.transitions, resources: map.resources, state: map.state, cleanup: map.cleanup };
  if (branch === "strongest") for (const [key, value] of Object.entries(strongestByteStable[side])) invariant(current[key] === value, side + ": strongest byte stability " + key);
  if (receipt) invariant(receipt.branch === current.branch && receipt.friendship === current.friendship && receipt.returnPowerLevel === current.returnPowerLevel && receipt.scenarioSha256 === current.scenarioSha256 && receipt.denseStateSha256 === current.denseStateSha256 && receipt.probeJsonSha256 === current.probeJsonSha256 && receipt.repeatProbeJsonSha256 === current.probeJsonSha256 && receipt.rawRgbArchiveSha256 === current.rawRgbArchiveSha256 && receipt.rawRgbSequenceSha256 === current.rawRgbSequenceSha256 && receipt.repeatRawRgbSequenceSha256 === current.rawRgbSequenceSha256 && receipt.changeMapSha256 === current.changeMapSha256, branch + "/" + side + ": retained receipt");
  return current;
}

const fixturePath = resolve(root, "tools/compare/fixtures/return-evidence.json");
if (process.argv.includes("--write")) {
  const repeatRoot = process.env.RETURN_EVIDENCE_REPEAT_ROOT;
  invariant(repeatRoot, "RETURN_EVIDENCE_REPEAT_ROOT is required to bank fresh repeats");
  const result = Object.fromEntries(branches.map((branch) => {
    const orientations = Object.fromEntries(sides.map((side) => {
      const current = verifySide(branch, side, undefined, branch !== "strongest");
      if (branch === "strongest") return [side, { ...current, repeatProbeJsonSha256: current.probeJsonSha256, repeatRawRgbSequenceSha256: current.rawRgbSequenceSha256 }];
      const artifact = sideArtifact[side], repeatJson = readFileSync(resolve(repeatRoot, branch + "-" + artifact + "-2.json"));
      const retainedProbe = JSON.parse(gunzipSync(readFileSync(resolve(root, pathFor(branch, side).dense))).toString("utf8")) as Json;
      const repeatRgb = rgbSequenceFromDirectory(resolve(repeatRoot, branch + "-" + artifact + "-2-rgb"), retainedProbe.frames);
      invariant(sha(repeatJson) === current.probeJsonSha256 && repeatRgb === current.rawRgbSequenceSha256, branch + "/" + side + ": twice-fresh");
      return [side, { ...current, repeatProbeJsonSha256: current.probeJsonSha256, repeatRawRgbSequenceSha256: current.rawRgbSequenceSha256 }];
    }));
    const contract = branchContracts[branch];
    return [branch, { friendship: contract.friendship, returnPowerLevel: contract.returnPowerLevel, acceptance: { freshRunsPerOrientation: 2, rowsPerOrientation: contract.rows, retainedRows: contract.rows * 2, firstInactiveCleanupRetained: true }, orientations }];
  }));
  writeFileSync(fixturePath, JSON.stringify({ schema: "return-all-branches-bilateral-evidence/v2", oracleProfile: "battle-scene-on", move: "MOVE_RETURN", moveId: 216, status: "unsupported-evidence", coverageCredit: false, acceptance: { branches, freshRunsPerOrientation: 2, totalRetainedRows: 1190, totalFreshRows: 2380, firstInactiveCleanupRetained: true }, evidenceScope: { sourceGraphPinned: true, completeLegalPartyOverrides: true, allReachableSelectorBranchesRetained: true, explicitFriendships: { weak: 60, medium: 61, strong: 200, strongest: 255 }, rawRgbRetained: true, normalizedMaps: true, twiceFreshByteIdentical: true, latchMeasuredPerBranch: true, strongestCheckpointByteStable: true }, branches: result, boundary: { productionChanged: false, reducerAdded: false, typedSeamAdded: false, compositorAdded: false, actualCoreFramebufferAcceptance: false, coveragePromotion: false, componentTrackFulfilled: false, siblingCredit: false, gameplayStateOwned: false, boundaryOrBarrierChanged: false }, verdict: "Evidence only: all four RETURN friendship branches are retained bilaterally. No reducer, typed seam, compositor, production asset, actual-core framebuffer acceptance, coverage, component/track, sibling, or gameplay credit is granted; FLATTER remains source identity only." }, null, 2) + "\n");
}
const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as Json;
invariant(fixture.status === "unsupported-evidence" && fixture.coverageCredit === false && fixture.evidenceScope.allReachableSelectorBranchesRetained === true && fixture.evidenceScope.strongestCheckpointByteStable === true, "unsupported boundary");
const result = Object.fromEntries(branches.map((branch) => {
  const receipt = fixture.branches[branch], contract = branchContracts[branch];
  invariant(receipt.friendship === contract.friendship && receipt.returnPowerLevel === contract.returnPowerLevel && receipt.acceptance.rowsPerOrientation === contract.rows && receipt.acceptance.freshRunsPerOrientation === 2, branch + ": fixture");
  return [branch, Object.fromEntries(sides.map((side) => {
    const current = verifySide(branch, side, receipt.orientations[side]);
    return [side, { sourceWindow: current.sourceWindow, probeJsonSha256: current.probeJsonSha256, rawRgbSequenceSha256: current.rawRgbSequenceSha256, changeMapSha256: current.changeMapSha256, rows: current.rows, latches: { hardwareOamEqualsPrecedingSoftware: current.latches.hardwareOamEqualsPrecedingSoftware, hardwareMatricesEqualPrecedingSoftware: current.latches.hardwareMatricesEqualPrecedingSoftware, hardwarePaletteEqualsPrecedingFaded: current.latches.hardwarePaletteEqualsPrecedingFaded, oamExceptions: current.latches.oamExceptions, matrixExceptions: current.latches.matrixExceptions, paletteSameRowExceptions: current.latches.paletteSameRowExceptions }, lifecycle: { verticalDipStarts: current.lifecycle.verticalDipStarts, hitsplatStarts: current.lifecycle.hitsplatStarts, traceStarts: current.lifecycle.traceStarts, simpleBlendStarts: current.lifecycle.simpleBlendStarts, soundTaskSchedules: current.lifecycle.soundTaskSchedules }, cleanup: current.cleanup }];
  }))];
}));
console.log(JSON.stringify({ schema: fixture.schema, move: fixture.move, status: fixture.status, coverageCredit: fixture.coverageCredit, branches: result, boundary: fixture.boundary }, null, 2));
