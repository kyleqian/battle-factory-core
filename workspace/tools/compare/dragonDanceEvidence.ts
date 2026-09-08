/** Strict hermetic verifier and normalized-map generator for MOVE_DRAGON_DANCE. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { gunzipSync } from "node:zlib";

type Json = Record<string, any>;
type Side = "player-back" | "opponent-front";
const root = resolve(new URL("../..", import.meta.url).pathname);
const sha = (value: Uint8Array | string): string => createHash("sha256").update(value).digest("hex");
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
function invariant(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
const file = (path: string): Buffer => readFileSync(resolve(root, path));

const paths: Record<Side, Json> = {
  "player-back": {
    state: "tools/compare/evidence/dragon-dance-player-dense-state.json.gz",
    rgb: "tools/compare/evidence/dragon-dance-player-raw-rgb.tar.gz",
    map: "tools/compare/evidence/dragon-dance-changemap-player.json",
    scenario: "tools/battle-lab/mechanic-dragon-dance-player-dragonair-opponent-onix.json",
  },
  "opponent-front": {
    state: "tools/compare/evidence/dragon-dance-opponent-dense-state.json.gz",
    rgb: "tools/compare/evidence/dragon-dance-opponent-raw-rgb.tar.gz",
    map: "tools/compare/evidence/dragon-dance-changemap-opponent.json",
    scenario: "tools/battle-lab/mechanic-dragon-dance-opponent-dragonair-player-onix.json",
  },
};

function transitions(rows: Json[], select: (row: Json) => unknown): number[] {
  return rows.flatMap((row, age) => age && !same(select(row), select(rows[age - 1]!)) ? [age] : []);
}

function ranges(rows: Json[], key: "tasks" | "sprites", predicate: (entry: Json) => boolean): Json[] {
  const slots = new Map<number, number[]>();
  for (const [age, row] of rows.entries()) for (const entry of row[key]) if (predicate(entry)) {
    const ages = slots.get(entry.slot) ?? []; ages.push(age); slots.set(entry.slot, ages);
  }
  return [...slots].map(([slot, ages]) => ({ slot, start: ages[0], end: ages.at(-1), rows: ages.length }))
    .sort((a, b) => a.start - b.start || a.slot - b.slot);
}

function rawFrames(path: string, rows: Json[]): Buffer[] {
  const names = execFileSync("tar", ["-tzf", resolve(root, path)], { encoding: "utf8" }).trim().split("\n").filter((name) => name.endsWith(".rgb"));
  const raw = execFileSync("tar", ["-xOzf", resolve(root, path)], { maxBuffer: 32 * 1024 * 1024 });
  const bytes = 240 * 160 * 3;
  invariant(names.length === rows.length && raw.length === rows.length * bytes, `${path}: RGB shape`);
  return rows.map((row, age) => {
    invariant(names[age]!.endsWith(`${String(row.frame).padStart(5, "0")}.rgb`), `${path}: member ${age}`);
    const frame = raw.subarray(age * bytes, (age + 1) * bytes);
    invariant(sha(frame) === row.sha256, `${path}: row ${age}`);
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
    return {
      age, frame: row.frame, active: row.animScriptActive, scriptOffset: row.scriptOffset, scriptWait: row.scriptWait,
      changedPixels, bounds: changedPixels ? [minX, minY, maxX, maxY] : null,
      orbs: row.sprites.filter((entry: Json) => entry.template.symbol === "gDragonDanceOrbSpriteTemplate").map((entry: Json) => ({
        slot: entry.slot, callback: entry.callback.symbol, attr: entry.attr, x: entry.x, y: entry.y,
        x2: entry.x2, y2: entry.y2, data: entry.data, matrixNum: entry.matrixNum, matrix: entry.matrix,
      })),
      tasks: row.tasks.map((entry: Json) => ({ slot: entry.slot, func: entry.func.symbol, data: entry.data })),
      tags: { tiles: row.tileTags, palettes: row.paletteTags },
      registers: { bg1cnt: row.registers.bg1cnt, bg2cnt: row.registers.bg2cnt, bg1hofs: row.registers.bg1hofs, bg2hofs: row.registers.bg2hofs },
      battleBg: row.battleBg, scanline: row.scanline,
      scanlineBufferSha256: row.scanlineBuffers.map((bank: number[]) => sha(JSON.stringify(bank))),
      audio: [row.audio.SE1.songHeaderIdentity.symbol, row.audio.SE2.songHeaderIdentity.symbol],
    };
  });
  return `${JSON.stringify({ schema: "dragon-dance-normalized-change-map/v1", side, rows: mapped }, null, 2)}\n`;
}

function verifySide(side: Side, config: Json): Json {
  const compressed = file(config.denseState), json = gunzipSync(compressed);
  const probe = JSON.parse(json.toString("utf8")) as Json, rows = probe.frames as Json[];
  const raw = rawFrames(config.rawRgbArchive, rows);
  invariant(sha(json) === config.probeJsonSha256 && config.probeJsonSha256 === config.repeatProbeJsonSha256, `${side}: twice-fresh semantic payload`);
  invariant(sha(Buffer.concat(raw)) === config.rawRgbSequenceSha256 && config.rawRgbSequenceSha256 === config.repeatRawRgbSequenceSha256, `${side}: twice-fresh RGB payload`);
  invariant(probe.schema === "dragon-dance-dense-evidence/v1" && probe.profile === "battle-scene-on" && probe.move === 349, `${side}: identity`);
  invariant(rows.length === 142 && same(probe.sourceWindow, config.sourceWindow), `${side}: complete window`);
  invariant(same(probe.sourcePointerContract.start, 0x082cf3b3) && same(probe.sourcePointerContract.endExclusive, 0x082cf422)
    && same(probe.sourcePointerContract.observedParities, [0, 1]), `${side}: pointer bounds/parity`);
  invariant(rows[0]!.scriptOffset === 0 && rows[0]!.animScriptActive && rows.at(-1)!.scriptOffset === 110 && !rows.at(-1)!.animScriptActive, `${side}: first-active/inactive`);
  invariant(rows.every((row) => row.softwareOam.length === 128 && row.hardwareOam.length === 128 && row.softwareMatrices.length === 32
    && row.hardwareMatrices.length === 32 && row.fadedPalette.length === 512 && row.unfadedPalette.length === 512
    && row.hardwarePalette.length === 512 && row.scanlineBuffers.length === 2 && row.scanlineBuffers.every((bank: number[]) => bank.length === 320)
    && row.parties.player.length === 3 && row.parties.opponent.length === 3), `${side}: retained shape`);

  const symbols = probe.sourceSymbols as Json;
  const orb = (entry: Json) => (entry.template.address & ~1) === (symbols.gDragonDanceOrbSpriteTemplate & ~1);
  invariant(same(ranges(rows, "sprites", orb), [
    { slot: 3, start: 20, end: 101, rows: 82 }, { slot: 4, start: 20, end: 101, rows: 82 },
    { slot: 5, start: 20, end: 101, rows: 82 }, { slot: 7, start: 20, end: 101, rows: 82 },
    { slot: 9, start: 20, end: 101, rows: 82 }, { slot: 10, start: 21, end: 101, rows: 81 },
  ]), `${side}: six-orb membership`);
  invariant(rows.flatMap((row) => row.sprites.filter(orb)).every((entry: Json) => entry.matrixNum === 0 && same(entry.matrix, [256, 0, 0, 256])), `${side}: plain orb matrices`);
  invariant(same(ranges(rows, "tasks", (entry) => entry.func.symbol === "AnimTask_DragonDanceWaver_Step"), [{ slot: 0, start: 10, end: 84, rows: 75 }]), `${side}: waver life`);
  invariant(same(ranges(rows, "tasks", (entry) => entry.func.symbol === "AnimTask_BlendMonInAndOut_Step"), [{ slot: 2, start: 20, end: 103, rows: 84 }]), `${side}: palette task life`);
  invariant(same(ranges(rows, "tasks", (entry) => entry.func.symbol === "Task_UpdateMonBg"), [{ slot: 1, start: 4, end: 107, rows: 104 }])
    && same(ranges(rows, "tasks", (entry) => entry.func.symbol === "Task_ClearMonBg"), [{ slot: 0, start: 105, end: 107, rows: 3 }]), `${side}: monbg lifecycle`);
  invariant(rows.slice(1).every((row, age) => same(row.hardwareOam, rows[age]!.softwareOam)), `${side}: OAM RAM+1`);
  invariant(rows.slice(1).every((row, age) => same(row.hardwareMatrices, rows[age]!.softwareMatrices)), `${side}: matrices RAM+1`);
  invariant(rows.slice(1).filter((row, age) => same(row.hardwarePalette, rows[age]!.fadedPalette)).length === 140
    && same(rows[4]!.hardwarePalette, rows[4]!.fadedPalette), `${side}: palette predecessor plus monbg exception`);
  invariant(same(transitions(rows, (row) => row.unfadedPalette), [1, 4])
    && same(transitions(rows, (row) => row.fadedPalette), [1, 4, ...Array.from({ length: 84 }, (_, i) => i + 21)]), `${side}: palette cycle`);
  invariant(rows.slice(1, 141).every((row) => row.tileTags.includes(10249) && row.paletteTags.includes(10249))
    && !rows[141]!.tileTags.includes(10249) && !rows[141]!.paletteTags.includes(10249), `${side}: HOLLOW_ORB resource life`);
  invariant(same(transitions(rows, (row) => row.scanline.state), [10, 84, 85])
    && same(transitions(rows, (row) => row.scanlineBuffers).slice(0, 10), [10, 11, 12, 13, 14, 15, 16, 17, 18, 19]), `${side}: scanline waver`);
  const selected = side === "player-back" ? "bg2hofs" : "bg1hofs";
  invariant(same(transitions(rows, (row) => row.registers[selected]), [5, 11, 85, 109]), `${side}: selected BG HOFS transfer`);
  invariant(same(transitions(rows, (row) => row.bgVram), [5, 107, 109]), `${side}: monbg VRAM setup/teardown`);
  invariant(same([10, 53, 85].map((age) => rows[age]!.audio.SE1.songHeaderIdentity.symbol), ["se_m_teleport", "se_m_teleport", "se_m_teleport"]), `${side}: three Teleport commands`);
  for (const key of ["battleMons", "battleOutcome", "battleWeather", "gameplayRng"]) invariant(rows.every((row) => same(row.rawBattleState[key], rows[0]!.rawBattleState[key])), `${side}: immutable ${key}`);
  invariant(rows.every((row) => same(row.immutableState, rows[0]!.immutableState)), `${side}: immutable outcome/weather/gameplay RNG`);
  const partyTransitions = transitions(rows, (row) => [row.rawBattleState.playerParty, row.rawBattleState.opponentParty]);
  invariant(same(partyTransitions, side === "player-back" ? [] : [20, 21]), `${side}: party transaction boundary`);
  invariant(rows[0]!.rawBattleState.playerParty === rows.at(-1)!.rawBattleState.playerParty
    && rows[0]!.rawBattleState.opponentParty === rows.at(-1)!.rawBattleState.opponentParty, `${side}: party restored`);
  invariant(transitions(rows, (row) => row.animationRng).length === 138, `${side}: animation RNG schedule`);
  invariant(rows.at(-1)!.visualTaskCount === 0 && rows.at(-1)!.soundTaskCount === 0 && rows.at(-1)!.tasks.length === 0
    && !rows.at(-1)!.sprites.some(orb) && rows.at(-1)!.scanline.state === 0, `${side}: cleanup`);
  invariant(normalizedMap(side, rows, raw) === file(config.changeMap).toString("utf8"), `${side}: normalized map drift`);
  const changedRows = transitions(rows, (row) => row.sha256).length;
  invariant(changedRows === 91, `${side}: changed-row count`);
  return { rows: 142, probeJsonSha256: sha(json), rawRgbSequenceSha256: sha(Buffer.concat(raw)), changedRows, partyTransitions };
}

export function verifyDragonDanceEvidence(): Json {
  const fixture = JSON.parse(file("tools/compare/fixtures/dragon-dance-evidence.json").toString("utf8")) as Json;
  invariant(fixture.schema === "dragon-dance-bilateral-evidence/v1" && fixture.status === "unsupported" && !fixture.coverageCredit, "fixture boundary");
  for (const side of ["player-back", "opponent-front"] as const) for (const key of ["scenario", "denseState", "rawRgbArchive", "changeMap"]) invariant(sha(file(fixture.orientations[side][key])) === fixture.orientations[side][`${key}Sha256`], `${side}: ${key} digest`);
  for (const key of ["audit", "probe", "sharedProbe"]) invariant(sha(file(fixture.source[key])) === fixture.source[`${key}Sha256`], `source ${key}`);
  const audit = execFileSync(process.execPath, ["--experimental-strip-types", fixture.source.audit], { cwd: root });
  invariant(sha(audit) === fixture.source.auditRunSha256, "audit output");
  return { schema: fixture.schema, status: fixture.status, coverageCredit: false, orientations: Object.fromEntries((["player-back", "opponent-front"] as const).map((side) => [side, verifySide(side, fixture.orientations[side])])) };
}

if (process.argv.includes("--write-maps")) {
  for (const side of ["player-back", "opponent-front"] as const) {
    const probe = JSON.parse(gunzipSync(file(paths[side].state)).toString("utf8")) as Json;
    writeFileSync(resolve(root, paths[side].map), normalizedMap(side, probe.frames, rawFrames(paths[side].rgb, probe.frames)));
    console.log(`wrote ${basename(paths[side].map)}`);
  }
} else if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) console.log(JSON.stringify(verifyDragonDanceEvidence(), null, 2));
