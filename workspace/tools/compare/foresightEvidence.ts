/** Strict verifier and normalized change-map builder for Foresight evidence. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";

type Json = Record<string, any>;
type Side = "player-back" | "opponent-front";
const root = resolve(new URL("../..", import.meta.url).pathname);
const fixture = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/foresight-evidence.json"), "utf8")) as Json;
const sha = (value: Uint8Array | string) => createHash("sha256").update(value).digest("hex");
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
function invariant(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
const transitions = (rows: Json[], select: (row: Json) => unknown) => rows.flatMap((row, age) =>
  age > 0 && !same(select(row), select(rows[age - 1]!)) ? [age] : []);
function ranges(ages: number[]) { const out: number[][] = []; for (const age of ages) {
  const last = out.at(-1); if (!last || age !== last[1]! + 1) out.push([age, age]); else last[1] = age;
} return out; }
const taskRanges = (rows: Json[], symbol: string) => ranges(rows.flatMap((row, age) =>
  row.tasks.some((task: Json) => task.func?.symbol === symbol) ? [age] : []));
const glass = (row: Json) => row.sprites.find((sprite: Json) =>
  sprite.template?.symbol === "gForesightMagnifyingGlassSpriteTemplate");

function rawRgb(entry: Json, rows: Json[]): Buffer {
  const archive = resolve(root, entry.rawRgbArchive);
  invariant(sha(readFileSync(archive)) === entry.rawRgbArchiveSha256, "raw archive digest");
  const names = execFileSync("tar", ["-tzf", archive], { encoding: "utf8" }).trim().split("\n")
    .filter((name) => name.endsWith(".rgb"));
  invariant(names.length === rows.length, "raw member count");
  const bytes = execFileSync("tar", ["-xOzf", archive], { maxBuffer: 64 * 1024 * 1024 });
  const size = 240 * 160 * 3;
  invariant(bytes.length === rows.length * size && sha(bytes) === entry.rawRgbSequenceSha256, "raw sequence");
  rows.forEach((row, age) => invariant(sha(bytes.subarray(age * size, (age + 1) * size)) === row.sha256, `raw row ${age}`));
  return bytes;
}

function normalizedMap(side: Side, evidence: Json): Json {
  const rows = evidence.frames as Json[];
  return {
    schema: "foresight-normalized-change-map/v1", side, sourceWindow: evidence.sourceWindow,
    source: rows.map((row, age) => ({ age, frame: row.frame, pointer: row.scriptPtr,
      parity: row.scriptPtrParity, offset: row.scriptOffset, wait: row.scriptWait,
      active: row.animScriptActive, sha256: row.sha256 })),
    rows: rows.map((row, age) => ({
      age, frame: row.frame, offset: row.scriptOffset, wait: row.scriptWait, active: row.animScriptActive,
      sprite: glass(row) ? { slot: glass(row).slot, attr: glass(row).attr, x: glass(row).x, y: glass(row).y,
        x2: glass(row).x2, y2: glass(row).y2, data: glass(row).data,
        callback: glass(row).callback?.symbol, invisible: glass(row).invisible } : null,
      tasks: row.tasks.map((task: Json) => ({ slot: task.slot, func: task.func?.symbol, data: task.data })),
      display: age === 0 ? null : { oam: same(row.hardwareOam, rows[age - 1]!.softwareOam),
        matrices: same(row.hardwareMatrices, rows[age - 1]!.softwareMatrices),
        palette: same(row.hardwarePalette, rows[age - 1]!.fadedPalette),
        paletteSameRow: same(row.hardwarePalette, row.fadedPalette) },
      palette: { unfadedChanged: age > 0 && !same(row.unfadedPalette, rows[age - 1]!.unfadedPalette),
        fadedChanged: age > 0 && !same(row.fadedPalette, rows[age - 1]!.fadedPalette),
        hardwareChanged: age > 0 && !same(row.hardwarePalette, rows[age - 1]!.hardwarePalette) },
      tags: { palette: row.paletteTags.indexOf(10258), tile: row.tileTags.indexOf(10258) },
      registers: { bldcnt: row.registers.bldcnt, bldalpha: row.registers.bldalpha,
        bg1hofs: row.registers.bg1hofs, bg1vofs: row.registers.bg1vofs,
        bg2hofs: row.registers.bg2hofs, bg2vofs: row.registers.bg2vofs },
      bgVram: row.bgVram.allSha256, battleBg: row.battleBg,
      audio: { se1: row.audio.SE1.songHeaderIdentity.symbol, se2: row.audio.SE2.songHeaderIdentity.symbol },
      animationRng: row.animationRng, gameplayRng: row.immutableState.rngValue,
    })),
  };
}

function verifySide(side: Side): Json {
  const entry = fixture.orientations[side];
  for (const key of ["scenario", "denseState"] as const)
    invariant(sha(readFileSync(resolve(root, entry[key]))) === entry[`${key}Sha256`], `${side}: ${key} digest`);
  invariant(entry.probeJsonSha256 === entry.repeatProbeJsonSha256
    && entry.rawRgbSequenceSha256 === entry.repeatRawRgbSequenceSha256, `${side}: twice fresh`);
  const unpacked = gunzipSync(readFileSync(resolve(root, entry.denseState)));
  invariant(sha(unpacked) === entry.probeJsonSha256, `${side}: probe digest`);
  const evidence = JSON.parse(unpacked.toString("utf8")) as Json;
  const rows = evidence.frames as Json[];
  invariant(evidence.schema === "foresight-dense-evidence/v1" && evidence.profile === "battle-scene-on"
    && evidence.move === 193 && same(evidence.sourceWindow, entry.window) && rows.length === 167, `${side}: identity/window`);
  invariant(rows.every((row, age) => row.frame === rows[0]!.frame + age && row.scriptOwner === "Move_FORESIGHT"
    && row.scriptPtr >= 0x082cd5ed && row.scriptPtr < 0x082cd62c && row.scriptOffset === row.scriptPtr - 0x082cd5ed), `${side}: source ownership`);
  invariant(rows[0]!.scriptOffset === 0 && rows[0]!.animScriptActive
    && rows.at(-1)!.scriptOffset === 62 && !rows.at(-1)!.animScriptActive, `${side}: entry/cleanup`);
  rawRgb(entry, rows);
  const map = normalizedMap(side, evidence);
  const mapPath = resolve(root, entry.changeMap);
  if (process.argv.includes("--write-maps")) writeFileSync(mapPath, `${JSON.stringify(map, null, 2)}\n`);
  else invariant(sha(readFileSync(mapPath)) === entry.changeMapSha256
    && same(JSON.parse(readFileSync(mapPath, "utf8")), map), `${side}: retained map`);
  invariant(same(taskRanges(rows, "Task_UpdateMonBg"), [[4, 164]])
    && same(taskRanges(rows, "Task_LoopAndPlaySE"), [[26, 75]])
    && same(taskRanges(rows, "AnimTask_BlendMonInAndOut_Step"), [[114, 160]])
    && same(taskRanges(rows, "Task_ClearMonBg"), [[162, 164]]), `${side}: task lifetimes`);
  invariant(same(ranges(rows.flatMap((row, age) => glass(row) ? [age] : [])), [[7, 144]]), `${side}: glass lifetime`);
  invariant(rows.slice(1).every((row, age) => same(row.hardwareOam, rows[age]!.softwareOam)
    && same(row.hardwareMatrices, rows[age]!.softwareMatrices)), `${side}: OAM/matrix RAM+1`);
  const paletteExceptions = rows.slice(1).flatMap((row, age) =>
    same(row.hardwarePalette, rows[age]!.fadedPalette) ? [] : [age + 1]);
  invariant(same(paletteExceptions, [4]) && same(rows[4]!.hardwarePalette, rows[4]!.fadedPalette), `${side}: palette latch`);
  invariant(["parties", "battlers", "engine", "immutableState", "rawBattleState"].every((field) =>
    rows.every((row) => same(row[field], rows[0]![field]))), `${side}: immutable state`);
  invariant(transitions(rows, (row) => row.immutableState.rngValue).length === 0
    && transitions(rows, (row) => row.animationRng).length === 164, `${side}: RNG split`);
  invariant(rows.at(-1)!.tasks.length === 0 && rows.at(-1)!.visualTaskCount === 0
    && rows.at(-1)!.soundTaskCount === 0 && !glass(rows.at(-1)!)
    && !rows.at(-1)!.paletteTags.includes(10258) && !rows.at(-1)!.tileTags.includes(10258), `${side}: inactive cleanup`);
  return { window: evidence.sourceWindow, rows: rows.length, sprite: "ages 7..144",
    tasks: "monbg 4..164; sound 26..75; blend 114..160; clear 162..164",
    latches: { oam: "166/166 RAM+1", matrices: "166/166 RAM+1", palette: "165/166 RAM+1; age 4 same-row monbg" },
    animationRngTransitions: 164, gameplayRngTransitions: 0, cleanupAge: 166 };
}

export function verifyForesightEvidence() {
  invariant(fixture.status === "unsupported" && fixture.coverageCredit === false
    && fixture.acceptance.productionFramebufferRows === "0/334", "honest acceptance boundary");
  return { "player-back": verifySide("player-back"), "opponent-front": verifySide("opponent-front") };
}
if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname))
  console.log(JSON.stringify(verifyForesightEvidence(), null, 2));
