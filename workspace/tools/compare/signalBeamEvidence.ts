/** Strict hermetic verifier/map builder for MOVE_SIGNAL_BEAM dense evidence. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { gunzipSync } from "node:zlib";

type Json = Record<string, any>;
type Side = "player-back" | "opponent-front";
const root = resolve(new URL("../..", import.meta.url).pathname);
const file = (path: string): Buffer => readFileSync(resolve(root, path));
const sha = (value: Buffer | string): string => createHash("sha256").update(value).digest("hex");
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
function invariant(value: unknown, message: string): asserts value { if (!value) throw new Error(`Signal Beam evidence drift: ${message}`); }
const transitions = (rows: Json[], read: (row: Json) => unknown): number[] => rows.slice(1).flatMap((row, age) => same(read(row), read(rows[age]!)) ? [] : [age + 1]);
function ranges(rows: Json[], key: "tasks" | "sprites", select: (entry: Json) => boolean): Json[] {
  const slots = new Map<number, number[]>();
  for (const [age, row] of rows.entries()) for (const entry of row[key]) if (select(entry)) slots.set(entry.slot, [...(slots.get(entry.slot) ?? []), age]);
  return [...slots].flatMap(([slot, ages]) => {
    const groups: number[][] = [];
    for (const age of ages) { const group = groups.at(-1); if (!group || age !== group.at(-1)! + 1) groups.push([age]); else group.push(age); }
    return groups.map((group) => ({ slot, start: group[0], end: group.at(-1), rows: group.length }));
  }).sort((a, b) => a.start - b.start || a.slot - b.slot);
}
const paletteBanks = (palette: number[]): string[] => Array.from({ length: 32 }, (_, bank) => sha(JSON.stringify(palette.slice(bank * 16, bank * 16 + 16))));
const owned = new Set(["gSignalBeamRedOrbSpriteTemplate", "gSignalBeamGreenOrbSpriteTemplate", "gComplexPaletteBlendSpriteTemplate"]);
const retained: Record<Side, Json> = {
  "player-back": { state: "tools/compare/evidence/signal-beam-player-dense-state.json.gz", rgb: "tools/compare/evidence/signal-beam-player-raw-rgb.tar.gz", map: "tools/compare/evidence/signal-beam-changemap-player.json" },
  "opponent-front": { state: "tools/compare/evidence/signal-beam-opponent-dense-state.json.gz", rgb: "tools/compare/evidence/signal-beam-opponent-raw-rgb.tar.gz", map: "tools/compare/evidence/signal-beam-changemap-opponent.json" },
};

function rawFrames(path: string, rows: Json[]): Buffer[] {
  const names = execFileSync("tar", ["-tzf", resolve(root, path)], { encoding: "utf8" }).trim().split("\n").filter((name) => name.endsWith(".rgb"));
  const raw = execFileSync("tar", ["-xOzf", resolve(root, path)], { maxBuffer: 32 * 1024 * 1024 });
  const bytes = 240 * 160 * 3;
  invariant(names.length === rows.length && raw.length === rows.length * bytes, `${path}: chronological RGB shape`);
  return rows.map((row, age) => { const frame = raw.subarray(age * bytes, (age + 1) * bytes); invariant(basename(names[age]!) === `${String(row.frame).padStart(5, "0")}.rgb` && sha(frame) === row.sha256, `${path}: RGB row ${age}`); return frame; });
}

function normalizedMap(side: Side, rows: Json[], rgb: Buffer[]): string {
  const mapped = rows.map((row, age) => {
    let changedPixels = 0, minX = 240, minY = 160, maxX = -1, maxY = -1;
    if (age) for (let pixel = 0; pixel < 240 * 160; pixel++) { const offset = pixel * 3; if (rgb[age]![offset] === rgb[age - 1]![offset] && rgb[age]![offset + 1] === rgb[age - 1]![offset + 1] && rgb[age]![offset + 2] === rgb[age - 1]![offset + 2]) continue; changedPixels++; const x = pixel % 240, y = Math.floor(pixel / 240); minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
    const sprite = (entry: Json) => ({ slot: entry.slot, template: entry.template.symbol, callback: entry.callback.symbol, attr: entry.attr, x: entry.x, y: entry.y, x2: entry.x2, y2: entry.y2, subpriority: entry.subpriority, flags: entry.flags, matrixNum: entry.matrixNum, matrix: entry.matrix, data: entry.data });
    const battler = (entry: Json) => ({ slot: entry.slot, x: entry.x, y: entry.y, x2: entry.x2, y2: entry.y2, attr: entry.attr, flags: entry.flags, subpriority: entry.subpriority });
    return {
      age, frame: row.frame, active: row.animScriptActive, scriptPtr: row.scriptPtr, scriptOffset: row.scriptOffset, scriptWait: row.scriptWait,
      changedPixels, bounds: changedPixels ? [minX,minY,maxX,maxY] : null, counts: { visual: row.visualTaskCount, sound: row.soundTaskCount }, animArgs: row.animArgs,
      sprites: row.sprites.filter((entry: Json) => owned.has(entry.template.symbol)).map(sprite), tasks: row.tasks.map((entry: Json) => ({ slot: entry.slot, func: entry.func.symbol, data: entry.data })),
      battlers: { attacker: battler(row.battlerSprites.attacker), target: battler(row.battlerSprites.target) }, spriteOrder: row.spriteOrder,
      oam: { software: sha(JSON.stringify(row.softwareOam)), hardware: sha(JSON.stringify(row.hardwareOam)) }, matrices: { software: sha(JSON.stringify(row.softwareMatrices)), hardware: sha(JSON.stringify(row.hardwareMatrices)), allocation: row.resourceAllocators.matrixBitmap },
      palettes: { unfaded: paletteBanks(row.unfadedPalette), faded: paletteBanks(row.fadedPalette), hardware: paletteBanks(row.hardwarePalette) },
      resources: Object.fromEntries([10073,10264,10265].map((tag) => [tag, { tile: row.tileTags.indexOf(tag), palette: row.paletteTags.indexOf(tag) }])),
      allocators: sha(JSON.stringify(row.resourceAllocators)), registers: row.registers, bg: { scroll: row.battleBg, vram: row.bgVram },
      audio: { se1: row.audio.SE1.songHeaderIdentity.symbol, se1Tracks: row.audio.SE1.tracks.map((track: Json) => ({ flags: track.flags, pan: track.pan, panX: track.panX })), se2: row.audio.SE2.songHeaderIdentity.symbol },
      rng: { presentation: row.animationRng, gameplay: row.rawBattleState.gameplayRng }, state: { semantic: sha(JSON.stringify(row.immutableState)), raw: Object.fromEntries(Object.entries(row.rawBattleState).map(([key,value]) => [key,sha(JSON.stringify(value))])) },
    };
  });
  return `${JSON.stringify({ schema: "signal-beam-normalized-banked-change-map/v1", side, rows: mapped })}\n`;
}

function verifySide(side: Side, config: Json): Json {
  const json = gunzipSync(file(config.denseState)), probe = JSON.parse(json.toString("utf8")) as Json, rows = probe.frames as Json[];
  const rgb = rawFrames(config.rawRgbArchive, rows), count = side === "player-back" ? 146 : 145, cleanup = count - 1;
  invariant(sha(json) === config.probeJsonSha256 && config.probeJsonSha256 === config.repeatProbeJsonSha256, `${side}: twice-fresh semantic bytes`);
  invariant(sha(Buffer.concat(rgb)) === config.rawRgbSequenceSha256 && config.rawRgbSequenceSha256 === config.repeatRawRgbSequenceSha256, `${side}: twice-fresh RGB bytes`);
  invariant(probe.schema === "signal-beam-dense-evidence/v1" && probe.profile === "battle-scene-on" && probe.move === 324 && same(probe.sourceWindow, config.sourceWindow), `${side}: identity/window`);
  invariant(rows.length === count && rows[0]!.animScriptActive && rows[0]!.scriptPtr === 0x082d0eb2 && rows[0]!.scriptOffset === 0 && !rows.at(-1)!.animScriptActive && rows.at(-1)!.scriptOffset === 198, `${side}: complete root-to-cleanup`);
  invariant(probe.sourcePointerContract.start === 0x082d0eb2 && probe.sourcePointerContract.endExclusive === 0x082d0f9a && same(probe.sourcePointerContract.observedParities, [0,1]), `${side}: pointer contract`);
  invariant(rows.every((row) => row.softwareOam.length === 128 && row.hardwareOam.length === 128 && row.softwareMatrices.length === 32 && row.hardwareMatrices.length === 32 && row.unfadedPalette.length === 512 && row.fadedPalette.length === 512 && row.hardwarePalette.length === 512 && row.rawBattleState && row.resourceAllocators), `${side}: complete banks`);

  const expectedLives = Array.from({ length: 23 }, (_, index) => ({ start: 18 + index * 3, end: 46 + index * 3 }));
  for (const template of ["gSignalBeamRedOrbSpriteTemplate","gSignalBeamGreenOrbSpriteTemplate"] as const) {
    const lives = ranges(rows, "sprites", (entry) => entry.template.symbol === template);
    invariant(lives.length === 23 && lives.every((life, index) => life.start === expectedLives[index]!.start && life.end === expectedLives[index]!.end && life.rows === 29), `${side}: all ${template} lives`);
    for (const life of lives) {
      for (let age = life.start; age <= life.end; age++) { const entry = rows[age]!.sprites.find((item: Json) => item.slot === life.slot && item.template.symbol === template); invariant(entry?.callback.symbol === "AnimToTargetInSinWave_Step" && entry.flags === 1 && entry.matrixNum === 0 && same(entry.matrix,[256,0,0,256]), `${side}: ${template} callback age ${age}`); }
    }
  }
  invariant(same(ranges(rows,"sprites",(entry) => entry.template.symbol === "gComplexPaletteBlendSpriteTemplate"),[{slot:17,start:36,end:89,rows:54}]), `${side}: palette helper life`);
  invariant(same(ranges(rows,"tasks",(entry) => entry.func.symbol === "AnimTask_ShakeMon_Step"),[{slot:0,start:10,end:57,rows:48},{slot:3,start:36,end:83,rows:48}]), `${side}: bilateral ShakeMon lives`);
  invariant(same(ranges(rows,"tasks",(entry) => entry.func.symbol === "AnimTask_RunSinAnimTimer"),[{slot:2,start:18,end:116,rows:99}]), `${side}: sinus timer life`);
  invariant(same(ranges(rows,"tasks",(entry) => entry.func.symbol === "Task_PanFromInitialToTarget"),[{slot:1,start:18,end:side === "player-back" ? 143 : 142,rows:side === "player-back" ? 126 : 125}]), `${side}: pan task life`);
  invariant(rows.slice(18,117).every((row, index) => row.tasks.find((task: Json) => task.func.symbol === "AnimTask_RunSinAnimTimer")?.data[0] === 99 - index), `${side}: sinus timer countdown`);
  invariant(rows.slice(1).every((row, age) => same(row.hardwareOam,rows[age]!.softwareOam) && same(row.hardwareMatrices,rows[age]!.softwareMatrices) && same(row.hardwarePalette,rows[age]!.fadedPalette)), `${side}: OAM/matrix/palette RAM+1`);
  invariant(transitions(rows,(row) => row.resourceAllocators.matrixBitmap).length === 0, `${side}: no affine allocation`);
  invariant(same(transitions(rows,(row) => [10264,10265,10073].map((tag) => [row.tileTags.indexOf(tag),row.paletteTags.indexOf(tag)])),[1,4,7,cleanup]), `${side}: resource load/free schedule`);
  const targetBank = side === "player-back" ? 17 : 16;
  invariant(same(transitions(rows,(row) => paletteBanks(row.fadedPalette)[targetBank]),[36,44,53,62,71,80,90]) && same(transitions(rows,(row) => paletteBanks(row.hardwarePalette)[targetBank]),[37,45,54,63,72,81,91]), `${side}: target palette RAM+1 cycle`);
  invariant(same(transitions(rows,(row) => row.registers),[1]) && transitions(rows,(row) => row.battleBg).length === 0 && transitions(rows,(row) => row.bgVram).length === 0, `${side}: only entry WIN0 reset; no move BG/register mechanism`);
  invariant(rows[18]!.audio.SE1.songHeaderIdentity.symbol === "se_m_bubble_beam" && rows[18]!.audio.SE1.tracks[0].panX === (side === "player-back" ? -63 : 62), `${side}: Bubble Beam pan/audio start`);
  const pan = rows[18]!.tasks.find((task: Json) => task.func.symbol === "Task_PanFromInitialToTarget")!.data;
  invariant(same(pan.slice(0,4),side === "player-back" ? [-64,63,1,0] : [63,-63,-1,0]), `${side}: pan sweep direction`);
  invariant(transitions(rows,(row) => row.animationRng).length === cleanup && transitions(rows,(row) => row.rawBattleState.gameplayRng).length === 0, `${side}: presentation/gameplay RNG separation`);
  for (const key of ["playerParty","opponentParty","battleMons","battleOutcome","battleWeather","gameplayRng"]) invariant(rows.every((row) => same(row.rawBattleState[key],rows[0]!.rawBattleState[key])), `${side}: immutable ${key}`);
  invariant(rows.every((row) => same(row.immutableState,rows[0]!.immutableState) && row.parties.player.slice(1).concat(row.parties.opponent.slice(1)).every((mon: Json) => mon.checksumValid)), `${side}: semantic state/benches`);
  const attacker = side === "player-back" ? rows[0]!.parties.player[0] : rows[0]!.parties.opponent[0];
  invariant(attacker.species === 168 && attacker.moves.every((move: number) => move === 324) && attacker.pp.reduce((sum: number, pp: number) => sum + pp,0) === 59, `${side}: legal Ariados and one PP spent`);
  invariant(rows.at(-1)!.visualTaskCount === 0 && rows.at(-1)!.soundTaskCount === 0 && rows.at(-1)!.tasks.length === 0 && !rows.at(-1)!.sprites.some((entry: Json) => owned.has(entry.template.symbol)) && [10073,10264,10265].every((tag) => !rows.at(-1)!.tileTags.includes(tag) && !rows.at(-1)!.paletteTags.includes(tag)), `${side}: complete cleanup`);
  invariant(normalizedMap(side,rows,rgb) === file(config.changeMap).toString("utf8"), `${side}: normalized map regeneration`);
  return { rows: count, changedRows: transitions(rows,(row) => row.sha256).length, probeJsonSha256: sha(json), rawRgbSequenceSha256: sha(Buffer.concat(rgb)), cleanupAge: cleanup };
}

export function verifySignalBeamEvidence(): Json {
  const fixture = JSON.parse(file("tools/compare/fixtures/signal-beam-evidence.json").toString("utf8")) as Json;
  invariant(fixture.schema === "signal-beam-bilateral-evidence/v1" && fixture.status === "unsupported-evidence-checkpoint" && fixture.coverageCredit === false, "unsupported evidence boundary");
  for (const side of ["player-back","opponent-front"] as const) for (const key of ["scenario","denseState","rawRgbArchive","changeMap"]) invariant(sha(file(fixture.orientations[side][key])) === fixture.orientations[side][`${key}Sha256`], `${side}: ${key} digest`);
  for (const key of ["audit","probe","sharedProbe","stagingReceipt"]) invariant(sha(file(fixture.source[key])) === fixture.source[`${key}Sha256`], `source ${key}`);
  invariant(sha(execFileSync(process.execPath,["--experimental-strip-types",fixture.source.audit],{cwd:root})) === fixture.source.auditRunSha256, "source audit regeneration");
  const coverage = JSON.parse(file("ANIMATION_COVERAGE.json").toString("utf8")) as Json, track = coverage.componentTracks.find((entry: Json) => entry.id === "signal-beam-orb-stream");
  invariant(coverage.entries.some((entry: Json) => entry.move === "MOVE_SIGNAL_BEAM" && entry.status === "exact") && same(coverage.queue, ["MOVE_NIGHTMARE"]) && track?.fulfilled === true, "exact queue/track boundary");
  return { schema: fixture.schema, status: fixture.status, coverageCredit: fixture.coverageCredit, orientations: Object.fromEntries((["player-back","opponent-front"] as const).map((side) => [side,verifySide(side,fixture.orientations[side])])) };
}

if (process.argv.includes("--write-maps")) for (const side of ["player-back","opponent-front"] as const) { const probe = JSON.parse(gunzipSync(file(retained[side].state)).toString("utf8")) as Json; writeFileSync(resolve(root,retained[side].map),normalizedMap(side,probe.frames,rawFrames(retained[side].rgb,probe.frames))); console.log(`wrote ${retained[side].map}`); }
else if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) console.log(JSON.stringify(verifySignalBeamEvidence(),null,2));
