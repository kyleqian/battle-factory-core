/** Hermetic verifier and normalized-map generator for MOVE_PSYWAVE evidence. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";

type Json = Record<string, any>;
type Side = "player-back" | "opponent-front";
const root = resolve(import.meta.dirname, "../..");
const file = (path: string): Buffer => readFileSync(resolve(root, path));
const sha = (value: Uint8Array | string): string => createHash("sha256").update(value).digest("hex");
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
function invariant(value: unknown, message: string): asserts value { if (!value) throw new Error(`Psywave evidence: ${message}`); }
function transitions(rows: Json[], select: (row: Json) => unknown): number[] { return rows.flatMap((row, age) => age && !same(select(row), select(rows[age - 1]!)) ? [age] : []); }
function ranges(rows: Json[], key: "tasks" | "sprites", predicate: (entry: Json) => boolean): Json[] {
  const found = new Map<string, number[]>();
  rows.forEach((row, age) => row[key].filter(predicate).forEach((entry: Json) => { const name = entry.func?.symbol ?? entry.template?.symbol; const id = `${name}:${entry.slot}`; found.set(id, [...(found.get(id) ?? []), age]); }));
  return [...found].flatMap(([id, ages]) => { const groups: number[][] = []; for (const age of ages) { const group = groups.at(-1); if (!group || age !== group.at(-1)! + 1) groups.push([age]); else group.push(age); } const cut = id.lastIndexOf(":"); return groups.map((group) => ({ name: id.slice(0, cut), slot: Number(id.slice(cut + 1)), start: group[0], end: group.at(-1), rows: group.length })); });
}
function rawFrames(path: string, rows: Json[]): Buffer[] {
  const names = execFileSync("tar", ["-tzf", resolve(root, path)], { encoding: "utf8" }).trim().split("\n").filter((name) => name.endsWith(".rgb"));
  const raw = execFileSync("tar", ["-xOzf", resolve(root, path)], { maxBuffer: 64 * 1024 * 1024 });
  const bytes = 240 * 160 * 3;
  invariant(names.length === rows.length && raw.length === rows.length * bytes, `${path} RGB shape`);
  return rows.map((row, age) => { const rgb = raw.subarray(age * bytes, (age + 1) * bytes); invariant(names[age]!.endsWith(`${String(row.frame).padStart(5, "0")}.rgb`) && sha(rgb) === row.sha256, `${path} chronological RGB age ${age}`); return rgb; });
}
const ownedTasks = new Set(["Task_FadeToBg", "SetPsychicBackground_Step", "AnimTask_RunSinAnimTimer", "SoundTask_LoopSEAdjustPanning_Step", "AnimTask_BlendColorCycleLoop"]);
function normalizedMap(side: Side, rows: Json[], rgb: Buffer[]): string {
  const mapped = rows.map((row, age) => ({
    age, frame: row.frame, active: row.animScriptActive, scriptPtr: row.scriptPtr, scriptOffset: row.scriptOffset, scriptWait: row.scriptWait,
    changedPixels: age ? Array.from({ length: 240 * 160 }, (_, pixel) => pixel * 3).filter((i) => rgb[age]![i] !== rgb[age - 1]![i] || rgb[age]![i + 1] !== rgb[age - 1]![i + 1] || rgb[age]![i + 2] !== rgb[age - 1]![i + 2]).length : 0,
    counts: [row.visualTaskCount, row.soundTaskCount], args: row.animArgs,
    tasks: row.tasks.filter((entry: Json) => ownedTasks.has(entry.func.symbol)).map((entry: Json) => [entry.slot, entry.func.symbol, entry.data]),
    rings: row.sprites.filter((entry: Json) => entry.template.symbol === "gPsywaveRingSpriteTemplate").map((entry: Json) => [entry.slot, entry.callback.symbol, entry.x, entry.y, entry.x2, entry.y2, entry.attr, entry.matrixNum, entry.matrix, entry.data, entry.subpriority]),
    battlers: { attacker: [row.battlerSprites.attacker.x2, row.battlerSprites.attacker.y2], target: [row.battlerSprites.target.x2, row.battlerSprites.target.y2] },
    oam: [sha(JSON.stringify(row.softwareOam)), sha(JSON.stringify(row.hardwareOam))], matrices: [sha(JSON.stringify(row.softwareMatrices)), sha(JSON.stringify(row.hardwareMatrices))],
    palettes: [sha(JSON.stringify(row.unfadedPalette)), sha(JSON.stringify(row.fadedPalette)), sha(JSON.stringify(row.hardwarePalette))],
    bg: [row.bgVram, row.battleBg], registers: row.registers,
    resources: [row.tileTags, row.paletteTags, row.resourceAllocators, sha(JSON.stringify(row.spriteOrder))],
    audio: [row.audio.SE1.songHeaderIdentity.symbol, row.audio.SE1.tracks.map((track: Json) => [track.flags, track.pan, track.panX]), row.audio.SE2.songHeaderIdentity.symbol, row.audio.SE2.tracks.map((track: Json) => [track.flags, track.pan, track.panX])],
    rng: [row.animationRng, row.rawBattleState.gameplayRng], state: [sha(JSON.stringify(row.immutableState)), sha(JSON.stringify(row.rawBattleState))], rgb: row.sha256,
  }));
  return `${JSON.stringify({ schema: "psywave-normalized-component-latch-map/v1", side, rows: mapped })}\n`;
}
const expectedTaskLives = [
  { name: "Task_FadeToBg", slot: 0, start: 4, end: 40, rows: 37 }, { name: "Task_FadeToBg", slot: 0, start: 165, end: 202, rows: 38 },
  { name: "SetPsychicBackground_Step", slot: 1, start: 23, end: 183, rows: 161 }, { name: "AnimTask_RunSinAnimTimer", slot: 0, start: 42, end: 140, rows: 99 },
  { name: "SoundTask_LoopSEAdjustPanning_Step", slot: 2, start: 42, end: 128, rows: 87 }, { name: "AnimTask_BlendColorCycleLoop", slot: 3, start: 66, end: 160, rows: 95 },
];
const creationAges = [42, 48, 54, 60, 66, 72, 78, 84, 90, 96, 102, 108];
const resourceEdges = [1, 42, 48, 54, 60, 66, 71, 72, 77, 78, 83, 84, 89, 90, 95, 96, 101, 102, 107, 108, 113, 119, 125, 131, 137, 204];
const targetPaletteEdges = [69, 72, 75, 78, 81, 84, 93, 96, 99, 102, 105, 108, 117, 120, 123, 126, 129, 132, 141, 144, 147, 150, 153, 156];
const configs: Record<Side, Json> = {
  "player-back": { denseState: "tools/compare/evidence/psywave-player-dense-state.json.gz", rawRgbArchive: "tools/compare/evidence/psywave-player-raw-rgb.tar.gz", changeMap: "tools/compare/evidence/psywave-changemap-player.json", startFrame: 72, species: 325 },
  "opponent-front": { denseState: "tools/compare/evidence/psywave-opponent-dense-state.json.gz", rawRgbArchive: "tools/compare/evidence/psywave-opponent-raw-rgb.tar.gz", changeMap: "tools/compare/evidence/psywave-changemap-opponent.json", startFrame: 211, species: 358 },
};

function verifySide(side: Side, config: Json): Json {
  const payload = gunzipSync(file(config.denseState)); const probe = JSON.parse(payload.toString("utf8")) as Json; const rows = probe.frames as Json[]; const rgb = rawFrames(config.rawRgbArchive, rows);
  invariant(probe.schema === "psywave-dense-evidence/v1" && probe.move === 149 && rows.length === 205, `${side} complete dense corpus`);
  invariant(probe.sourceWindow.startFrame === config.startFrame && probe.sourceWindow.endFrame === config.startFrame + 204 && probe.sourceWindow.sourceFrameCount === 128, `${side} source frame range`);
  invariant(probe.sourcePointerContract.start === 0x082d3212 && probe.sourcePointerContract.endExclusive === 0x082d3298 && same(probe.sourcePointerContract.observedParities, [0, 1]), `${side} source pointer contract`);
  invariant(rows[0]!.animScriptActive && rows[0]!.scriptOffset === 0 && !rows.at(-1)!.animScriptActive, `${side} root through inactive cleanup`);
  invariant(probe.setup.sourceInitialized && probe.setup.customPartiesBuiltBeforeBattle && rows.every((row) => row.parties.player.length === 3 && row.parties.opponent.length === 3), `${side} complete party-only staging`);
  const attackerSide = side === "player-back" ? "player" : "opponent"; const attacker = rows[0]!.parties[attackerSide][0];
  invariant(attacker.species === config.species && attacker.level === 50 && same(attacker.moves, [149, 149, 149, 149]) && same(attacker.pp, [14, 15, 15, 15]), `${side} legal carrier and one selected PP`);
  invariant(same(ranges(rows, "tasks", (entry) => ownedTasks.has(entry.func.symbol)), expectedTaskLives), `${side} complete task schedule`);
  const ringLives = ranges(rows, "sprites", (entry) => entry.template.symbol === "gPsywaveRingSpriteTemplate");
  invariant(ringLives.length === 12 && ringLives.every((life) => life.rows === 29) && same(ringLives.map((life) => life.start).sort((a, b) => a - b), creationAges), `${side} twelve 29-row ring lives`);
  invariant(rows.slice(1).every((row, index) => same(row.hardwareOam, rows[index]!.softwareOam) && same(row.hardwareMatrices, rows[index]!.softwareMatrices) && same(row.hardwarePalette, rows[index]!.fadedPalette)), `${side} predecessor OAM/matrix/palette latches`);
  const fadedEdges = transitions(rows, (row) => row.fadedPalette); const hardwareEdges = transitions(rows, (row) => row.hardwarePalette);
  invariant(fadedEdges.length === 63 && same(hardwareEdges, fadedEdges.map((age) => age + 1)), `${side} complete palette predecessor schedule`);
  const targetBank = 16 + (rows[0]!.battlerSprites.target.attr[2] >>> 12);
  invariant(same(transitions(rows, (row) => row.fadedPalette.slice(targetBank * 16, targetBank * 16 + 16)), targetPaletteEdges), `${side} four-leg target palette cycle`);
  invariant(same(transitions(rows, (row) => row.bgVram), [23, 184]) && transitions(rows, (row) => row.battleBg).length === 0, `${side} Psychic BG VRAM/scroll schedule`);
  invariant(!rows.some((row) => row.tasks.some((task: Json) => ["Task_UpdateMonBg", "Task_ClearMonBg"].includes(task.func.symbol))), `${side} monbg is unreachable/unused`);
  invariant(same(transitions(rows, (row) => row.resourceAllocators), resourceEdges) && rows[1]!.tileTags.includes(10165) && !rows.at(-1)!.tileTags.includes(10165), `${side} resource/allocation/order lifecycle`);
  const sound = rows[42]!.tasks.find((task: Json) => task.func.symbol === "SoundTask_LoopSEAdjustPanning_Step");
  invariant(rows[4]!.audio.SE1.songHeaderIdentity.symbol === "se_m_psybeam" && rows[42]!.audio.SE1.songHeaderIdentity.symbol === "se_m_teleport" && same(sound.data.slice(0, 7), side === "player-back" ? [203, -64, 63, 2, 8, 0, 10] : [203, 63, -63, -2, 8, 0, 10]), `${side} exact 2/9/0/10 sound schedule`);
  for (const key of ["playerParty", "opponentParty", "battleMons", "battleOutcome", "battleWeather", "gameplayRng"]) invariant(rows.every((row) => same(row.rawBattleState[key], rows[0]!.rawBattleState[key])), `${side} immutable ${key}`);
  invariant(transitions(rows, (row) => row.rawBattleState.gameplayRng).length === 0 && transitions(rows, (row) => row.animationRng).length === 203, `${side} gameplay/presentation RNG separation`);
  invariant(rows.at(-1)!.visualTaskCount === 0 && rows.at(-1)!.soundTaskCount === 0 && rows.at(-1)!.tasks.length === 0 && rows.at(-1)!.registers.bldcnt === 0 && rows.at(-1)!.registers.bldy === 0, `${side} inactive cleanup`);
  invariant(sha(Buffer.concat(rgb)) === config.rawRgbSequenceSha256 && normalizedMap(side, rows, rgb) === file(config.changeMap).toString("utf8"), `${side} RGB sequence/normalized map`);
  return { sourceWindow: probe.sourceWindow, rows: rows.length, ringLives: ringLives.length, latches: { oam: "204/204", matrices: "204/204", palette: "204/204" }, targetPaletteEdges: targetPaletteEdges.length, bgVramEdges: [23, 184], resourceEdges: resourceEdges.length, presentationRngEdges: 203, gameplayRngEdges: 0, changedRgbRows: transitions(rows, (row) => row.sha256).length, cleanupAge: 204 };
}

export function verifyPsywaveEvidence(): Json {
  const fixture = JSON.parse(file("tools/compare/fixtures/psywave-evidence.json").toString("utf8")) as Json;
  invariant(fixture.status === "exact" && fixture.coverageCredit, "exact coverage boundary");
  for (const key of ["audit", "probe", "verifier"]) invariant(sha(file(fixture.source[key])) === fixture.source[`${key}Sha256`], `source ${key} digest`);
  const auditRun = execFileSync(process.execPath, ["--experimental-strip-types", resolve(root, fixture.source.audit)]);
  invariant(sha(auditRun) === fixture.source.auditRunSha256, "source audit output digest");
  const coverage = JSON.parse(file("ANIMATION_COVERAGE.json").toString("utf8")) as Json;
  invariant(coverage.entries.some((entry: Json) => entry.move === "MOVE_PSYWAVE" && entry.status === "exact"), "Psywave exact coverage");
  const track = coverage.componentTracks.find((entry: Json) => entry.id === "loop-se-adjust-panning");
  invariant(track?.representatives.includes("MOVE_PSYWAVE") && track.fulfilled === true, "shared sound track fulfillment");
  for (const side of ["player-back", "opponent-front"] as const) {
    const config = { ...configs[side], ...fixture.orientations[side] };
    for (const key of ["scenario", "denseState", "rawRgbArchive", "changeMap"]) invariant(sha(file(config[key])) === config[`${key}Sha256`], `${side} ${key} digest`);
    invariant(config.probeJsonSha256 === config.repeatProbeJsonSha256 && config.rawRgbSequenceSha256 === config.repeatRawRgbSequenceSha256, `${side} twice-fresh byte identity`);
    const scenario = JSON.parse(file(config.scenario).toString("utf8")) as Json;
    const required = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"].sort();
    invariant(scenario.mode === "mechanicLab" && scenario.profile === "battle-scene-on" && same(Object.keys(scenario.overrides).sort(), ["parties"]), `${side} party-only stage`);
    invariant([scenario.overrides.parties.player, scenario.overrides.parties.opponent].every((party: Json[]) => party.length === 3 && party.every((mon) => same(Object.keys(mon).sort(), required))), `${side} six complete party records`);
  }
  return { schema: fixture.schema, status: fixture.status, coverageCredit: fixture.coverageCredit, orientations: Object.fromEntries((["player-back", "opponent-front"] as const).map((side) => [side, verifySide(side, { ...configs[side], ...fixture.orientations[side] })])) };
}

if (process.argv.includes("--write-maps")) {
  for (const side of ["player-back", "opponent-front"] as const) { const config = configs[side]; const probe = JSON.parse(gunzipSync(file(config.denseState)).toString("utf8")); writeFileSync(resolve(root, config.changeMap), normalizedMap(side, probe.frames, rawFrames(config.rawRgbArchive, probe.frames))); }
} else if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) console.log(JSON.stringify(verifyPsywaveEvidence(), null, 2));
