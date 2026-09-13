/** Strict hermetic verifier for MOVE_BONEMERANG's bilateral dense evidence. */
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
function invariant(value: unknown, message: string): asserts value { if (!value) throw new Error(`Bonemerang evidence drift: ${message}`); }
const transitions = (rows: Json[], read: (row: Json) => unknown): number[] => rows.slice(1).flatMap((row, age) => same(read(row), read(rows[age]!)) ? [] : [age + 1]);
const edgeValues = (rows: Json[], read: (row: Json) => unknown): unknown[] => rows.flatMap((row, age) => age && same(read(row), read(rows[age - 1]!)) ? [] : [[age, read(row)]]);
function ranges(rows: Json[], key: "tasks" | "sprites", select: (entry: Json) => boolean): Json[] {
  const output: Json[] = []; let start: number | null = null; let slot = -1;
  for (let age = 0; age < rows.length; age++) {
    const entry = rows[age]![key].find(select);
    if (entry && start === null) { start = age; slot = entry.slot; }
    if (!entry && start !== null) { output.push({ slot, start, end: age - 1, rows: age - start }); start = null; }
  }
  if (start !== null) output.push({ slot, start, end: rows.length - 1, rows: rows.length - start });
  return output;
}
const paletteBanks = (palette: number[]): string[] => Array.from({ length: 32 }, (_, bank) => sha(JSON.stringify(palette.slice(bank * 16, bank * 16 + 16))));
const owned = new Set(["gBonemerangSpriteTemplate", "gBasicHitSplatSpriteTemplate", "gHorizontalLungeSpriteTemplate"]);

function rawFrames(path: string, rows: Json[]): Buffer[] {
  const names = execFileSync("tar", ["-tzf", resolve(root, path)], { encoding: "utf8" }).trim().split("\n").filter((name) => name.endsWith(".rgb"));
  const raw = execFileSync("tar", ["-xOzf", resolve(root, path)], { maxBuffer: 16 * 1024 * 1024 });
  const bytes = 240 * 160 * 3;
  invariant(names.length === rows.length && raw.length === rows.length * bytes, `${path}: RGB archive shape`);
  return rows.map((row, age) => {
    invariant(basename(names[age]!) === `${String(row.frame).padStart(5, "0")}.rgb`, `${path}: chronological member ${age}`);
    const frame = raw.subarray(age * bytes, (age + 1) * bytes);
    invariant(sha(frame) === row.sha256, `${path}: raw row ${age}`);
    return frame;
  });
}

function normalizedMap(side: Side, rows: Json[], rgb: Buffer[]): string {
  const mapped = rows.map((row, age) => {
    let changedPixels = 0, minX = 240, minY = 160, maxX = -1, maxY = -1;
    if (age) for (let pixel = 0; pixel < 240 * 160; pixel++) {
      const offset = pixel * 3;
      if (rgb[age]![offset] === rgb[age - 1]![offset] && rgb[age]![offset + 1] === rgb[age - 1]![offset + 1] && rgb[age]![offset + 2] === rgb[age - 1]![offset + 2]) continue;
      changedPixels++; const x = pixel % 240, y = Math.floor(pixel / 240);
      minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
    const sprite = (entry: Json) => ({ slot: entry.slot, template: entry.template.symbol, callback: entry.callback.symbol, attr: entry.attr, x: entry.x, y: entry.y, x2: entry.x2, y2: entry.y2, animNum: entry.animNum, animCmdIndex: entry.animCmdIndex, subpriority: entry.subpriority, flags: entry.flags, matrixNum: entry.matrixNum, matrix: entry.matrix, data: entry.data });
    const battler = (entry: Json) => ({ slot: entry.slot, x: entry.x, y: entry.y, x2: entry.x2, y2: entry.y2, subpriority: entry.subpriority, flags: entry.flags, attr: entry.attr });
    return {
      age, frame: row.frame, active: row.animScriptActive, scriptOffset: row.scriptOffset, scriptWait: row.scriptWait,
      changedPixels, bounds: changedPixels ? [minX, minY, maxX, maxY] : null,
      counts: { visual: row.visualTaskCount, sound: row.soundTaskCount },
      sprites: row.sprites.filter((entry: Json) => owned.has(entry.template.symbol)).map(sprite),
      tasks: row.tasks.filter((entry: Json) => /(?:ShakeMon|UpdateMonBg|ClearMonBg)/u.test(entry.func.symbol ?? "")).map((entry: Json) => ({ slot: entry.slot, func: entry.func.symbol, data: entry.data })),
      battlers: { attacker: battler(row.battlerSprites.attacker), target: battler(row.battlerSprites.target) },
      painter: { spriteOrder: row.spriteOrder, softwareOam: sha(JSON.stringify(row.softwareOam)), hardwareOam: sha(JSON.stringify(row.hardwareOam)) },
      matrices: { software: sha(JSON.stringify(row.softwareMatrices)), hardware: sha(JSON.stringify(row.hardwareMatrices)), allocation: row.resourceAllocators.matrixBitmap },
      palettes: { unfaded: paletteBanks(row.unfadedPalette), faded: paletteBanks(row.fadedPalette), hardware: paletteBanks(row.hardwarePalette) },
      resources: { boneTileBank: row.tileTags.indexOf(10000), bonePaletteBank: row.paletteTags.indexOf(10000), impactTileBank: row.tileTags.indexOf(10135), impactPaletteBank: row.paletteTags.indexOf(10135), allocator: sha(JSON.stringify(row.resourceAllocators)) },
      registers: row.registers, bg: { scroll: row.battleBg, vram: row.bgVram },
      audio: { se1: row.audio.SE1.songHeaderIdentity.symbol, se1Tracks: row.audio.SE1.tracks.map((track: Json) => ({ flags: track.flags, pan: track.pan, panX: track.panX })), se2: row.audio.SE2.songHeaderIdentity.symbol },
      rng: { presentation: row.animationRng, gameplay: row.rawBattleState.gameplayRng },
      state: { immutable: row.immutableState, raw: Object.fromEntries(Object.entries(row.rawBattleState).map(([key, value]) => [key, sha(JSON.stringify(value))])) },
    };
  });
  return `${JSON.stringify({ schema: "bonemerang-normalized-banked-change-map/v1", side, rows: mapped }, null, 2)}\n`;
}

const retained: Record<Side, Json> = {
  "player-back": { state: "tools/compare/evidence/bonemerang-player-dense-state.json.gz", rgb: "tools/compare/evidence/bonemerang-player-raw-rgb.tar.gz", map: "tools/compare/evidence/bonemerang-changemap-player.json" },
  "opponent-front": { state: "tools/compare/evidence/bonemerang-opponent-dense-state.json.gz", rgb: "tools/compare/evidence/bonemerang-opponent-raw-rgb.tar.gz", map: "tools/compare/evidence/bonemerang-changemap-opponent.json" },
};

function verifySide(side: Side, config: Json): Json {
  const json = gunzipSync(file(config.denseState)); const probe = JSON.parse(json.toString("utf8")) as Json; const rows = probe.frames as Json[];
  const rgb = rawFrames(config.rawRgbArchive, rows);
  invariant(sha(json) === config.probeJsonSha256 && config.probeJsonSha256 === config.repeatProbeJsonSha256, `${side}: twice-fresh semantic bytes`);
  invariant(sha(Buffer.concat(rgb)) === config.rawRgbSequenceSha256 && config.rawRgbSequenceSha256 === config.repeatRawRgbSequenceSha256, `${side}: twice-fresh chronological RGB bytes`);
  invariant(probe.schema === "bonemerang-dense-evidence/v1" && probe.profile === "battle-scene-on" && probe.move === 155, `${side}: probe identity`);
  invariant(rows.length === 72 && same(probe.sourceWindow, config.sourceWindow) && rows[0]!.scriptPtr === 0x082d17cc && rows[0]!.scriptOffset === 0 && rows[0]!.animScriptActive && rows.at(-1)!.scriptPtr === 0x082d181f && rows.at(-1)!.scriptOffset === 83 && !rows.at(-1)!.animScriptActive, `${side}: complete root-to-cleanup window`);
  invariant(probe.sourcePointerContract.start === 0x082d17cc && probe.sourcePointerContract.endExclusive === 0x082d1820 && same(probe.sourcePointerContract.observedParities, [0,1]), `${side}: pointer contract`);
  invariant(rows.every((row) => row.softwareOam.length === 128 && row.hardwareOam.length === 128 && row.softwareMatrices.length === 32 && row.hardwareMatrices.length === 32 && row.fadedPalette.length === 512 && row.unfadedPalette.length === 512 && row.hardwarePalette.length === 512 && row.resourceAllocators && row.rawBattleState), `${side}: complete hardware/state banks`);

  invariant(same(ranges(rows, "sprites", (entry) => entry.template.symbol === "gBonemerangSpriteTemplate"), [{ slot: 3, start: 10, end: 50, rows: 41 }]), `${side}: BONE projectile life`);
  invariant(same(ranges(rows, "sprites", (entry) => entry.template.symbol === "gBasicHitSplatSpriteTemplate"), [{ slot: 4, start: 32, end: 41, rows: 10 }]), `${side}: IMPACT hitsplat life`);
  invariant(same(ranges(rows, "sprites", (entry) => entry.template.symbol === "gHorizontalLungeSpriteTemplate"), [{ slot: 4, start: 51, end: 65, rows: 15 }]), `${side}: lunge life`);
  invariant(same(ranges(rows, "tasks", (entry) => entry.func.symbol === "AnimTask_ShakeMon_Step"), [{ slot: 0, start: 32, end: 39, rows: 8 }]), `${side}: ShakeMon life`);
  invariant(same(ranges(rows, "tasks", (entry) => entry.func.symbol === "Task_UpdateMonBg"), [{ slot: 1, start: 7, end: 69, rows: 63 }]) && same(ranges(rows, "tasks", (entry) => entry.func.symbol === "Task_ClearMonBg"), [{ slot: 0, start: 67, end: 69, rows: 3 }]), `${side}: target monbg lifecycle`);
  invariant(rows.slice(1).every((row, age) => same(row.hardwareOam, rows[age]!.softwareOam)), `${side}: whole OAM RAM+1`);
  invariant(rows.slice(1).every((row, age) => same(row.hardwareMatrices, rows[age]!.softwareMatrices)), `${side}: whole matrices RAM+1`);
  invariant(same(rows.slice(1).flatMap((row, age) => same(row.hardwarePalette, rows[age]!.fadedPalette) ? [] : [age + 1]), [7]), `${side}: palette predecessor plus monbg exception`);
  invariant(same(edgeValues(rows, (row) => row.resourceAllocators.matrixBitmap), [[0,6],[10,7],[32,15],[42,7],[51,6]]), `${side}: BONE/hitsplat matrix allocation/free`);
  invariant(same(transitions(rows, (row) => row.tileTags), [1,4,71]) && same(transitions(rows, (row) => row.paletteTags), [1,4,71]) && rows.slice(1,71).every((row) => row.tileTags.includes(10000) && row.paletteTags.includes(10000)) && rows.slice(4,71).every((row) => row.tileTags.includes(10135) && row.paletteTags.includes(10135)), `${side}: tag allocation/free`);
  invariant(same(transitions(rows, (row) => row.battleBg), [7,34,36,38,40,70]) && same(transitions(rows, (row) => row.bgVram), [8,69,71]), `${side}: monbg source/VRAM lifecycle`);
  const bgKey = side === "player-back" ? "gBattle_BG1_X" : "gBattle_BG2_X"; const bgReg = side === "player-back" ? "bg1hofs" : "bg2hofs";
  invariant(same(transitions(rows, (row) => row.battleBg[bgKey]), [7,34,36,38,40,70]) && same(transitions(rows, (row) => row.registers[bgReg]), [8,35,37,39,41,71]), `${side}: own ShakeMon/monbg RAM+1 display`);
  invariant(same(edgeValues(rows, (row) => [row.registers.bldcnt,row.registers.bldalpha]), [[0,[0,0]],[10,[16192,2060]],[67,[0,0]]]), `${side}: alpha lifecycle`);
  invariant(same(edgeValues(rows, (row) => row.audio.SE1.songHeaderIdentity.symbol), [[0,"se_ball_open"],[10,"se_m_bonemerang"],[32,"se_m_horn_attack"],[51,"se_m_vital_throw"]]), `${side}: audio order`);
  const pan = side === "player-back" ? [-64,63,-64] : [63,-63,63];
  invariant(rows[10]!.audio.SE1.tracks[0].panX === pan[0] && rows[32]!.audio.SE1.tracks[0].panX === pan[1] && rows[51]!.audio.SE1.tracks[0].panX === pan[2], `${side}: bilateral audio pans`);
  invariant(transitions(rows, (row) => row.animationRng).length === 69 && transitions(rows, (row) => row.rawBattleState.gameplayRng).length === 0, `${side}: presentation/gameplay RNG separation`);
  for (const key of ["playerParty","opponentParty","battleMons","battleOutcome","battleWeather","gameplayRng"]) invariant(rows.every((row) => same(row.rawBattleState[key], rows[0]!.rawBattleState[key])), `${side}: opaque immutable ${key}`);
  invariant(rows.every((row) => same(row.immutableState, rows[0]!.immutableState)), `${side}: immutable gameplay semantic state`);
  const attacker = side === "player-back" ? rows[0]!.parties.player[0] : rows[0]!.parties.opponent[0];
  invariant(attacker.species === 105 && attacker.moves.every((move: number) => move === 155) && attacker.pp.filter((pp: number) => pp === 9).length === 1, `${side}: legal Marowak and one PP spent`);
  invariant(rows.every((row) => row.parties.player.slice(1).concat(row.parties.opponent.slice(1)).every((mon: Json) => mon.checksumValid)), `${side}: checksum-valid unchanged benches`);
  invariant(rows.at(-1)!.visualTaskCount === 0 && rows.at(-1)!.soundTaskCount === 0 && rows.at(-1)!.tasks.length === 0 && !rows.at(-1)!.sprites.some((entry: Json) => owned.has(entry.template.symbol)) && !rows.at(-1)!.tileTags.includes(10000) && !rows.at(-1)!.tileTags.includes(10135) && rows.at(-1)!.resourceAllocators.matrixBitmap === 6 && rows.at(-1)!.registers.bldcnt === 0 && rows.at(-1)!.registers.bldalpha === 0, `${side}: first inactive cleanup`);
  invariant(normalizedMap(side, rows, rgb) === file(config.changeMap).toString("utf8"), `${side}: normalized map regeneration`);
  const changedRows = rgb.slice(1).filter((frame, age) => !frame.equals(rgb[age]!)).length;
  return { rows: 72, changedRows, probeJsonSha256: sha(json), rawRgbSequenceSha256: sha(Buffer.concat(rgb)), cleanupAge: 71 };
}

export function verifyBonemerangEvidence(): Json {
  const fixture = JSON.parse(file("tools/compare/fixtures/bonemerang-evidence.json").toString("utf8")) as Json;
  invariant(fixture.schema === "bonemerang-bilateral-evidence/v1" && fixture.status === "unsupported-evidence-checkpoint" && fixture.coverageCredit === false, "unsupported evidence boundary");
  for (const side of ["player-back","opponent-front"] as const) for (const key of ["scenario","denseState","rawRgbArchive","changeMap"]) invariant(sha(file(fixture.orientations[side][key])) === fixture.orientations[side][`${key}Sha256`], `${side}: ${key} digest`);
  for (const key of ["audit","probe","sharedProbe","stagingReceipt"]) invariant(sha(file(fixture.source[key])) === fixture.source[`${key}Sha256`], `source ${key}`);
  const audit = execFileSync(process.execPath, ["--experimental-strip-types", fixture.source.audit], { cwd: root });
  invariant(sha(audit) === fixture.source.auditRunSha256, "source audit regeneration");
  return { schema: fixture.schema, status: fixture.status, coverageCredit: fixture.coverageCredit, orientations: Object.fromEntries((["player-back","opponent-front"] as const).map((side) => [side, verifySide(side, fixture.orientations[side])])) };
}

if (process.argv.includes("--write-maps")) {
  for (const side of ["player-back","opponent-front"] as const) {
    const probe = JSON.parse(gunzipSync(file(retained[side].state)).toString("utf8")) as Json;
    writeFileSync(resolve(root, retained[side].map), normalizedMap(side, probe.frames, rawFrames(retained[side].rgb, probe.frames)));
    console.log(`wrote ${retained[side].map}`);
  }
} else if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) console.log(JSON.stringify(verifyBonemerangEvidence(), null, 2));
