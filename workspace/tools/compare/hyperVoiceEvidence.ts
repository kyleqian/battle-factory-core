/** Strict hermetic verifier and normalized banked map generator for MOVE_HYPER_VOICE. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";

type Json = Record<string, any>;
type Side = "player-back" | "opponent-front";
const root = resolve(new URL("../..", import.meta.url).pathname);
const sha = (value: Uint8Array | string): string => createHash("sha256").update(value).digest("hex");
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const file = (path: string): Buffer => readFileSync(resolve(root, path));
function invariant(value: unknown, message: string): asserts value { if (!value) throw new Error(`MOVE_HYPER_VOICE evidence drift: ${message}`); }
function transitions(rows: Json[], select: (row: Json) => unknown): number[] { return rows.flatMap((row, age) => age && !same(select(row), select(rows[age - 1]!)) ? [age] : []); }
function ranges(rows: Json[], key: "tasks" | "sprites", predicate: (entry: Json) => boolean): Json[] {
  const slots = new Map<string, number[]>();
  for (const [age, row] of rows.entries()) for (const entry of row[key]) if (predicate(entry)) {
    const symbol = entry.func?.symbol ?? entry.template?.symbol ?? "";
    const id = `${entry.slot}:${symbol}`, ages = slots.get(id) ?? []; ages.push(age); slots.set(id, ages);
  }
  return [...slots].flatMap(([id, ages]) => {
    const groups: number[][] = [];
    for (const age of ages) { const group = groups.at(-1); if (!group || age !== group.at(-1)! + 1) groups.push([age]); else group.push(age); }
    const [slot, symbol] = id.split(":");
    return groups.map((group) => ({ slot: Number(slot), symbol, start: group[0], end: group.at(-1), rows: group.length }));
  }).sort((a, b) => a.start - b.start || a.slot - b.slot);
}
function paletteBank(palette: number[], bank: number): number[] { return palette.slice(bank * 16, bank * 16 + 16); }
function rawFrames(path: string, rows: Json[]): Buffer[] {
  const names = execFileSync("tar", ["-tzf", resolve(root, path)], { encoding: "utf8" }).trim().split("\n").filter((name) => name.endsWith(".rgb"));
  const raw = execFileSync("tar", ["-xOzf", resolve(root, path)], { maxBuffer: 32 * 1024 * 1024 });
  const bytes = 240 * 160 * 3;
  invariant(names.length === 105 && raw.length === 105 * bytes, `${path}: complete RGB archive shape`);
  return rows.map((row, age) => {
    invariant(names[age]!.endsWith(`${String(row.frame).padStart(5, "0")}.rgb`), `${path}: chronological member ${age}`);
    const frame = raw.subarray(age * bytes, (age + 1) * bytes);
    invariant(sha(frame) === row.sha256, `${path}: raw RGB digest ${age}`);
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
    const relevantSprite = (entry: Json) => ["gHyperVoiceRingSpriteTemplate", "gSimplePaletteBlendSpriteTemplate"].includes(entry.template.symbol);
    const compactSprite = (entry: Json) => ({ slot: entry.slot, template: entry.template.symbol, callback: entry.callback.symbol, attr: entry.attr, x: entry.x, y: entry.y, x2: entry.x2, y2: entry.y2, subpriority: entry.subpriority, flags: entry.flags, matrixNum: entry.matrixNum, matrix: entry.matrix, data: entry.data });
    const banks = (palette: number[]) => Object.fromEntries([1,2,16,17,23].map((bank) => [bank, sha(JSON.stringify(paletteBank(palette, bank)))]));
    return {
      age, frame: row.frame, active: row.animScriptActive, scriptPtr: row.scriptPtr, scriptOffset: row.scriptOffset, scriptWait: row.scriptWait, animArgs: row.animArgs,
      changedPixels, bounds: changedPixels ? [minX,minY,maxX,maxY] : null, counts: { visual: row.visualTaskCount, sound: row.soundTaskCount },
      tasks: row.tasks.map((entry: Json) => ({ slot: entry.slot, func: entry.func.symbol, data: entry.data })),
      sprites: row.sprites.filter(relevantSprite).map(compactSprite), battlers: { attacker: compactSprite(row.battlerSprites.attacker), target: compactSprite(row.battlerSprites.target) }, spriteOrder: row.spriteOrder,
      oam: { software: sha(JSON.stringify(row.softwareOam)), hardware: sha(JSON.stringify(row.hardwareOam)) }, matrices: { software: sha(JSON.stringify(row.softwareMatrices)), hardware: sha(JSON.stringify(row.hardwareMatrices)), allocation: row.resourceAllocators.matrixBitmap },
      palettes: { unfaded: banks(row.unfadedPalette), faded: banks(row.fadedPalette), hardware: banks(row.hardwarePalette) },
      resources: { thinRingTileBank: row.tileTags.indexOf(10203), thinRingPaletteBank: row.paletteTags.indexOf(10203), allocators: sha(JSON.stringify(row.resourceAllocators)) },
      registers: row.registers, battleBg: row.battleBg, bgVram: row.bgVram,
      audio: { se1: sha(JSON.stringify(row.audio.SE1)), se2: sha(JSON.stringify(row.audio.SE2)) }, rng: { animation: row.animationRng, gameplay: row.rawBattleState.gameplayRng },
      state: { semantic: sha(JSON.stringify(row.immutableState)), parties: sha(JSON.stringify(row.parties)), battlers: sha(JSON.stringify(row.battlers)), engine: sha(JSON.stringify(row.engine)), raw: sha(JSON.stringify(row.rawBattleState)) },
    };
  });
  return `${JSON.stringify({ schema: "hyper-voice-normalized-banked-change-map/v1", side, rows: mapped })}\n`;
}

const taskLives = [
  { slot: 0, symbol: "SoundTask_PlayCryWithEcho_Step", start: 4, end: 32, rows: 29 }, { slot: 1, symbol: "AnimTask_ScaleMonAndRestore_Step", start: 4, end: 12, rows: 9 },
  { slot: 2, symbol: "AnimTask_ShakeMon2_Step", start: 4, end: 13, rows: 10 }, { slot: 3, symbol: "AnimTask_ShakeBattlePlatforms_Step", start: 4, end: 13, rows: 10 }, { slot: 4, symbol: "SoundTask_WaitForCry", start: 4, end: 4, rows: 1 },
  { slot: 0, symbol: "SoundTask_PlayCryWithEcho_Step", start: 59, end: 87, rows: 29 }, { slot: 1, symbol: "AnimTask_ScaleMonAndRestore_Step", start: 59, end: 67, rows: 9 },
  { slot: 2, symbol: "AnimTask_ShakeMon2_Step", start: 59, end: 68, rows: 10 }, { slot: 3, symbol: "AnimTask_ShakeBattlePlatforms_Step", start: 59, end: 68, rows: 10 }, { slot: 4, symbol: "SoundTask_WaitForCry", start: 59, end: 59, rows: 1 },
  { slot: 1, symbol: "Task_DuckBGMForPokemonCry", start: 88, end: 104, rows: 17 },
];

function verifySide(side: Side, config: Json): Json {
  const json = gunzipSync(file(config.denseState)), probe = JSON.parse(json.toString("utf8")) as Json, rows = probe.frames as Json[];
  const rgb = rawFrames(config.rawRgbArchive, rows), startFrame = side === "player-back" ? 76 : 80;
  invariant(sha(json) === config.probeJsonSha256 && config.probeJsonSha256 === config.repeatProbeJsonSha256, `${side}: twice-fresh semantic payload`);
  invariant(sha(Buffer.concat(rgb)) === config.rawRgbSequenceSha256 && config.rawRgbSequenceSha256 === config.repeatRawRgbSequenceSha256, `${side}: twice-fresh raw RGB sequence`);
  invariant(probe.schema === "hyper-voice-dense-evidence/v1" && probe.profile === "battle-scene-on" && probe.move === 304, `${side}: identity`);
  invariant(rows.length === 105 && probe.sourceWindow.startFrame === startFrame && probe.sourceWindow.endFrame === startFrame + 104 && probe.sourceWindow.frameCount === 105 && probe.sourceWindow.sourceFrameCount === 105, `${side}: unthinned complete window`);
  invariant(probe.sourcePointerContract.start === 0x082d50d6 && probe.sourcePointerContract.endExclusive === 0x082d516a && same(probe.sourcePointerContract.observedParities, [0,1]), `${side}: source pointer contract`);
  invariant(rows[0]!.animScriptActive && rows[0]!.scriptOffset === 0 && !rows.at(-1)!.animScriptActive && rows.at(-1)!.scriptOffset === 35, `${side}: root through first inactive cleanup`);
  invariant(rows.every((row, age) => row.frame === startFrame + age), `${side}: chronological, gapless ages`);
  invariant(rows.every((row) => row.softwareOam.length === 128 && row.hardwareOam.length === 128 && row.softwareMatrices.length === 32 && row.hardwareMatrices.length === 32 && row.fadedPalette.length === 512 && row.hardwarePalette.length === 512), `${side}: complete transfer banks`);
  invariant(same(ranges(rows, "tasks", () => true), taskLives), `${side}: complete task lifecycles`);
  invariant(same(ranges(rows, "sprites", (entry) => entry.template.symbol === "gHyperVoiceRingSpriteTemplate"), [{ slot: 4, symbol: "gHyperVoiceRingSpriteTemplate", start: 4, end: 47, rows: 44 }, { slot: 4, symbol: "gHyperVoiceRingSpriteTemplate", start: 59, end: 102, rows: 44 }]), `${side}: both Thin Ring lives`);
  invariant(same(ranges(rows, "sprites", (entry) => entry.template.symbol === "gSimplePaletteBlendSpriteTemplate"), [{ slot: 3, symbol: "gSimplePaletteBlendSpriteTemplate", start: 4, end: 29, rows: 26 }, { slot: 3, symbol: "gSimplePaletteBlendSpriteTemplate", start: 59, end: 84, rows: 26 }]), `${side}: both palette-task lives`);
  for (const row of rows) for (const task of row.tasks) invariant(task.data.length === 16, `${side}: full task data`);

  invariant(rows.slice(1).every((row, index) => same(row.hardwareOam, rows[index]!.softwareOam)), `${side}: whole OAM RAM+1 including creation/teardown`);
  for (const start of [4,59]) {
    invariant(rows.slice(start + 1, start + 45).every((row, index) => same(row.hardwareMatrices[0], rows[start + index]!.softwareMatrices[0])), `${side}: ring affine matrix RAM+1 body ${start}`);
    const scaleMatrix = side === "player-back" ? 1 : 2;
    invariant(rows.slice(start + 2, start + 12).every((row, index) => same(row.hardwareMatrices[scaleMatrix], rows[start + index]!.softwareMatrices[scaleMatrix])), `${side}: ScaleMonAndRestore RAM+2 body ${start}`);
    invariant(!rows.slice(start + 1, start + 11).every((row, index) => same(row.hardwareMatrices[scaleMatrix], rows[start + index]!.softwareMatrices[scaleMatrix])), `${side}: reject ScaleMonAndRestore RAM+1 body ${start}`);
    const shake = [-1,-1,1,1,-1,-1,1,1,-1,-1,0];
    invariant(same(rows.slice(start, start + 11).map((row) => row.battlerSprites.target.x2), shake), `${side}: short target ShakeMon2 source schedule ${start}`);
    const oamRank = side === "player-back" ? 11 : 10, baseX = side === "player-back" ? 144 : 40;
    const x = (raw: string) => Buffer.from(raw, "hex").readUInt16LE(2) & 0x1ff;
    invariant(same(rows.slice(start + 2, start + 13).map((row) => x(row.hardwareOam[oamRank]) - baseX), shake), `${side}: short target ShakeMon2 RAM+2 display ${start}`);
    invariant(same(rows.slice(start, start + 11).map((row) => row.battleBg.gBattle_BG3_X), shake), `${side}: platform source schedule ${start}`);
    invariant(same(rows.slice(start + 1, start + 12).map((row) => ((row.registers.bg3hofs + 256) & 511) - 256), shake), `${side}: platform BG3 RAM+1 display ${start}`);
    invariant(rows[start]!.animArgs.slice(0,4).join(",") === "1,0,6,1" && rows[start]!.tasks.filter((entry: Json) => entry.func.symbol === "AnimTask_ShakeMon2_Step").length === 1, `${side}: platform args and singles partner immediate teardown ${start}`);
  }

  const bgEdges = [4,8,13,18,23,59,63,68,73,78], bgHardware = [4,9,14,19,24,59,64,69,74,79], objEdges = [4,9,14,19,24,59,64,69,74,79], objHardware = objEdges.map((age) => age + 1);
  for (const bank of [1,2]) { invariant(same(transitions(rows, (row) => paletteBank(row.fadedPalette, bank)), bgEdges), `${side}: BG blend source bank ${bank}`); invariant(same(transitions(rows, (row) => paletteBank(row.hardwarePalette, bank)), bgHardware), `${side}: BG blend display bank ${bank}`); }
  for (const bank of [16,17]) { invariant(same(transitions(rows, (row) => paletteBank(row.fadedPalette, bank)), objEdges), `${side}: battler blend source bank ${bank}`); invariant(same(transitions(rows, (row) => paletteBank(row.hardwarePalette, bank)), objHardware), `${side}: battler blend RAM+1 bank ${bank}`); }
  invariant(same(transitions(rows, (row) => paletteBank(row.fadedPalette, 23)), [1]) && same(transitions(rows, (row) => paletteBank(row.hardwarePalette, 23)), [2]), `${side}: Thin Ring palette RAM+1`);
  invariant(rows.slice(1).flatMap((row, age) => same(row.hardwarePalette, rows[age]!.fadedPalette) ? [] : [age + 1]).every((age) => age === 4 || age === 59), `${side}: whole palette predecessor except two mixed setup rows`);

  invariant(same(transitions(rows, (row) => row.resourceAllocators), [1,4,48,59,103,104]), `${side}: resource allocator lifecycle`);
  invariant(rows.slice(1,104).every((row) => row.tileTags.includes(10203) && row.paletteTags.includes(10203)) && !rows[0]!.tileTags.includes(10203) && !rows.at(-1)!.tileTags.includes(10203), `${side}: Thin Ring tags load/free`);
  for (const start of [4,59]) {
    const cry = rows[start]!.tasks.find((entry: Json) => entry.func.symbol === "SoundTask_PlayCryWithEcho_Step")!;
    invariant(same(cry.data.slice(0,12), [0,372,side === "player-back" ? -64 : 63,0,0,0,0,0,0,1,start === 59 ? 1 : 0,0]), `${side}: cry/echo args ${start}`);
    invariant(rows[start]!.tasks.some((entry: Json) => entry.func.symbol === "SoundTask_WaitForCry" && entry.data[9] === 2), `${side}: WaitForCry row ${start}`);
  }
  invariant(same(transitions(rows, (row) => [row.visualTaskCount,row.soundTaskCount]), [4,5,13,14,30,33,48,59,60,68,69,85,88,103]), `${side}: visual/sound task counts`);

  for (const key of ["playerParty","opponentParty","battleMons","battleOutcome","battleWeather","gameplayRng"]) invariant(rows.every((row) => same(row.rawBattleState[key], rows[0]!.rawBattleState[key])), `${side}: immutable ${key}`);
  invariant(rows.every((row) => same(row.immutableState, rows[0]!.immutableState)), `${side}: immutable gameplay semantic state`);
  invariant(rows.every((row) => row.parties.player.slice(1).concat(row.parties.opponent.slice(1)).every((mon: Json) => mon.checksumValid)), `${side}: checksum-valid benches`);
  const attacker = side === "player-back" ? rows[0]!.parties.player[0] : rows[0]!.parties.opponent[0];
  invariant(attacker.species === 372 && attacker.moves.every((move: number) => move === 304) && attacker.pp.reduce((sum: number, pp: number) => sum + pp, 0) === 39, `${side}: one legal Exploud Hyper Voice PP spent`);
  invariant(transitions(rows, (row) => row.animationRng).length === 104 && transitions(rows, (row) => row.rawBattleState.gameplayRng).length === 0, `${side}: animation/gameplay RNG split`);
  invariant(rows.at(-1)!.visualTaskCount === 0 && rows.at(-1)!.soundTaskCount === 0 && !rows.at(-1)!.sprites.some((entry: Json) => ["gHyperVoiceRingSpriteTemplate","gSimplePaletteBlendSpriteTemplate"].includes(entry.template.symbol)) && !rows.at(-1)!.tileTags.includes(10203) && rows.at(-1)!.resourceAllocators.matrixBitmap === 6, `${side}: first inactive owned cleanup`);
  invariant(normalizedMap(side, rows, rgb) === file(config.changeMap).toString("utf8"), `${side}: normalized map regeneration`);
  return { rows: 105, changedRows: transitions(rows, (row) => row.sha256).length, probeJsonSha256: sha(json), rawRgbSequenceSha256: sha(Buffer.concat(rgb)), cleanupAge: 104, oamRamPlusOneRows: 104, ringMatrixRamPlusOneRows: 88, scaleRamPlusTwoRows: 20, targetShakeRamPlusTwoBodies: 2, platformRamPlusOneBodies: 2 };
}

export function verifyHyperVoiceEvidence(): Json {
  const fixture = JSON.parse(file("tools/compare/fixtures/hyper-voice-evidence.json").toString("utf8")) as Json;
  invariant(fixture.schema === "hyper-voice-bilateral-evidence/v1" && fixture.status === "unsupported-evidence-checkpoint" && fixture.coverageCredit === false, "unsupported evidence boundary");
  for (const side of ["player-back","opponent-front"] as const) for (const key of ["scenario","denseState","rawRgbArchive","changeMap"]) invariant(sha(file(fixture.orientations[side][key])) === fixture.orientations[side][`${key}Sha256`], `${side}: ${key} digest`);
  for (const key of ["audit","probe","sharedProbe","stagingReceipt"]) invariant(sha(file(fixture.source[key])) === fixture.source[`${key}Sha256`], `source ${key}`);
  const audit = JSON.parse(execFileSync(process.execPath, ["--experimental-strip-types", fixture.source.audit], { cwd: root, encoding: "utf8" })) as Json;
  // The named sibling statuses are live coverage bookkeeping and must not
  // invalidate Hyper Voice's immutable source/evidence receipt when one of
  // those moves earns its own independent acceptance. Pin the move-owned
  // graph and partner invocation here; source bytes remain pinned above.
  invariant(audit.schema === "hyper-voice-source-audit/v1"
    && audit.move === "MOVE_HYPER_VOICE"
    && audit.graph.track.fulfilled === false
    && same(Object.keys(audit.controls.named).sort(),
      ["MOVE_ROAR", "MOVE_ROCK_TOMB", "MOVE_SNORE", "MOVE_UPROAR"])
    && same(audit.behavior.partnerShake.args, ["ANIM_DEF_PARTNER",1,0,6,1]),
  "source graph/partner invocation/no transferred credit");
  return { schema: fixture.schema, status: fixture.status, coverageCredit: fixture.coverageCredit, orientations: Object.fromEntries((["player-back","opponent-front"] as const).map((side) => [side, verifySide(side, fixture.orientations[side])])) };
}

if (process.argv.includes("--write-maps")) {
  const fixture = JSON.parse(file("tools/compare/fixtures/hyper-voice-evidence.json").toString("utf8")) as Json;
  for (const side of ["player-back","opponent-front"] as const) {
    const probe = JSON.parse(gunzipSync(file(fixture.orientations[side].denseState)).toString("utf8")) as Json;
    writeFileSync(resolve(root, fixture.orientations[side].changeMap), normalizedMap(side, probe.frames, rawFrames(fixture.orientations[side].rawRgbArchive, probe.frames)));
  }
} else if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) console.log(JSON.stringify(verifyHyperVoiceEvidence(), null, 2));
