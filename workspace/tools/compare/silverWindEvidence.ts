/** Strict hermetic verifier and normalized bilateral map generator for MOVE_SILVER_WIND. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import coverage from "../../ANIMATION_COVERAGE.json" with { type: "json" };

type Json = Record<string, any>;
type Side = "player-back" | "opponent-front";
const root = resolve(import.meta.dirname, "../..");
const sha = (value: Uint8Array | string): string => createHash("sha256").update(value).digest("hex");
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const file = (path: string): Buffer => readFileSync(resolve(root, path));
function invariant(value: unknown, message: string): asserts value { if (!value) throw new Error(`MOVE_SILVER_WIND evidence drift: ${message}`); }
function transitions(rows: Json[], select: (row: Json) => unknown): number[] { return rows.flatMap((row, age) => age && !same(select(row), select(rows[age - 1]!)) ? [age] : []); }
function paletteBank(palette: number[], bank: number): number[] { return palette.slice(bank * 16, bank * 16 + 16); }
function ranges(rows: Json[], key: "tasks" | "sprites", predicate: (entry: Json) => boolean): Json[] {
  const slots = new Map<string, number[]>();
  for (const [age, row] of rows.entries()) for (const entry of row[key]) if (predicate(entry)) {
    const symbol = entry.func?.symbol ?? entry.template?.symbol ?? "", id = `${entry.slot}:${symbol}`;
    slots.set(id, [...(slots.get(id) ?? []), age]);
  }
  return [...slots].flatMap(([id, ages]) => {
    const groups: number[][] = [];
    for (const age of ages) { const group = groups.at(-1); if (!group || age !== group.at(-1)! + 1) groups.push([age]); else group.push(age); }
    const [slot, symbol] = id.split(":");
    return groups.map((group) => ({ slot: Number(slot), symbol, start: group[0], end: group.at(-1), rows: group.length }));
  }).sort((a, b) => a.start - b.start || a.slot - b.slot);
}
function rawFrames(path: string, rows: Json[]): Buffer[] {
  const names = execFileSync("tar", ["-tzf", resolve(root, path)], { encoding: "utf8" }).trim().split("\n").filter((name) => name.endsWith(".rgb"));
  const raw = execFileSync("tar", ["-xOzf", resolve(root, path)], { maxBuffer: 32 * 1024 * 1024 });
  const bytes = 240 * 160 * 3;
  invariant(names.length === rows.length && raw.length === rows.length * bytes, `${path}: complete RGB888 archive shape`);
  return rows.map((row, age) => {
    invariant(names[age]!.endsWith(`${String(row.frame).padStart(5, "0")}.rgb`), `${path}: chronological member ${age}`);
    const frame = raw.subarray(age * bytes, (age + 1) * bytes);
    invariant(sha(frame) === row.sha256, `${path}: raw RGB digest ${age}`);
    return frame;
  });
}
function normalizedMap(side: Side, rows: Json[], rgb: Buffer[]): string {
  const compactSprite = (entry: Json) => ({ slot: entry.slot, template: entry.template.symbol, callback: entry.callback.symbol, attr: entry.attr, x: entry.x, y: entry.y, x2: entry.x2, y2: entry.y2, animNum: entry.animNum, animCmdIndex: entry.animCmdIndex, subpriority: entry.subpriority, flags: entry.flags, matrixNum: entry.matrixNum, matrix: entry.matrix, data: entry.data });
  const owned = (entry: Json) => entry.template.symbol?.startsWith("gSilverWind");
  const mapped = rows.map((row, age) => {
    let changedPixels = 0, minX = 240, minY = 160, maxX = -1, maxY = -1;
    if (age) for (let pixel = 0; pixel < 240 * 160; pixel++) {
      const offset = pixel * 3;
      if (rgb[age]![offset] === rgb[age - 1]![offset] && rgb[age]![offset + 1] === rgb[age - 1]![offset + 1] && rgb[age]![offset + 2] === rgb[age - 1]![offset + 2]) continue;
      changedPixels++; const x = pixel % 240, y = Math.floor(pixel / 240);
      minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
    const banks = (palette: number[]) => Object.fromEntries([1,2,3,8,9,16,17,23].map((bank) => [bank, sha(JSON.stringify(paletteBank(palette, bank)))]));
    return {
      age, frame: row.frame, rgb: row.sha256, active: row.animScriptActive, scriptOffset: row.scriptOffset, scriptWait: row.scriptWait, animArgs: row.animArgs,
      changedPixels, bounds: changedPixels ? [minX, minY, maxX, maxY] : null, counts: { visual: row.visualTaskCount, sound: row.soundTaskCount },
      tasks: row.tasks.map((entry: Json) => ({ slot: entry.slot, func: entry.func.symbol, data: entry.data })), sprites: row.sprites.filter(owned).map(compactSprite),
      battlers: { attacker: compactSprite(row.battlerSprites.attacker), target: compactSprite(row.battlerSprites.target) }, spriteOrder: sha(JSON.stringify(row.spriteOrder)),
      oam: { software: sha(JSON.stringify(row.softwareOam)), hardware: sha(JSON.stringify(row.hardwareOam)) },
      matrices: { software: sha(JSON.stringify(row.softwareMatrices)), hardware: sha(JSON.stringify(row.hardwareMatrices)) },
      palettes: { unfaded: banks(row.unfadedPalette), faded: banks(row.fadedPalette), hardware: banks(row.hardwarePalette) },
      resources: { sparkle: [row.tileTags.indexOf(10271), row.paletteTags.indexOf(10271)], tags: sha(JSON.stringify([row.tileTags, row.paletteTags])), allocators: sha(JSON.stringify(row.resourceAllocators)) },
      registers: row.registers, battleBg: row.battleBg, bgVram: { all: row.bgVram.allSha256, charBlocks: sha(JSON.stringify(row.bgVram.charBlockSha256)), screenBlocks: sha(JSON.stringify(row.bgVram.screenBlockSha256)) },
      audio: { se1: sha(JSON.stringify(row.audio.SE1)), se2: sha(JSON.stringify(row.audio.SE2)), identities: [row.audio.SE1.songHeaderIdentity.symbol, row.audio.SE2.songHeaderIdentity.symbol] },
      rng: { presentation: row.animationRng, gameplay: row.rawBattleState.gameplayRng },
      state: { semantic: sha(JSON.stringify(row.immutableState)), parties: sha(JSON.stringify(row.parties)), battlers: sha(JSON.stringify(row.battlers)), engine: sha(JSON.stringify(row.engine)), raw: sha(JSON.stringify(row.rawBattleState)) },
    };
  });
  return `${JSON.stringify({ schema: "silver-wind-normalized-banked-change-map/v1", side, rows: mapped })}\n`;
}

const expected: Record<Side, Json> = {
  "player-back": {
    rows: 193, start: 81, cleanup: 192, attackerBank: 16, targetBank: 17, monBgBank: 8,
    selectedSource: "gBattle_BG1_X", selectedRegister: "bg1hofs", monBgClear: 145, slidingEnd: 165,
    fadeOutStart: 166, audioEnd: 142, rngHolds: [144, 145, 166], bgVram: [7, 30, 144, 146, 165],
    taskLives: [
      { slot: 0, symbol: "Task_PanFromInitialToTarget", start: 4, end: 66, rows: 63 },
      { slot: 2, symbol: "Task_UpdateMonBg", start: 6, end: 144, rows: 139 },
      { slot: 1, symbol: "AnimTask_BlendSpriteColor_Step2", start: 11, end: 13, rows: 3 },
      { slot: 3, symbol: "Task_FadeToBg", start: 11, end: 47, rows: 37 },
      { slot: 4, symbol: "AnimTask_UpdateSlidingBg", start: 30, end: 164, rows: 135 },
      { slot: 0, symbol: "Task_ClearMonBg", start: 142, end: 144, rows: 3 },
      { slot: 0, symbol: "Task_FadeToBg", start: 146, end: 183, rows: 38 },
      { slot: 1, symbol: "AnimTask_BlendSpriteColor_Step2", start: 165, end: 168, rows: 4 },
    ],
    sparkEnds: [92, 136, 101, 114, 94, 138, 103, 116, 96, 140, 105, 118, 104, 113, 106, 115, 108, 117],
  },
  "opponent-front": {
    rows: 196, start: 223, cleanup: 195, attackerBank: 17, targetBank: 16, monBgBank: 9,
    selectedSource: "gBattle_BG2_X", selectedRegister: "bg2hofs", monBgClear: 148, slidingEnd: 168,
    fadeOutStart: 169, audioEnd: 145, rngHolds: [147, 148, 169], bgVram: [7, 30, 147, 149, 168],
    taskLives: [
      { slot: 0, symbol: "Task_PanFromInitialToTarget", start: 4, end: 65, rows: 62 },
      { slot: 2, symbol: "Task_UpdateMonBg", start: 6, end: 147, rows: 142 },
      { slot: 1, symbol: "AnimTask_BlendSpriteColor_Step2", start: 11, end: 13, rows: 3 },
      { slot: 3, symbol: "Task_FadeToBg", start: 11, end: 47, rows: 37 },
      { slot: 4, symbol: "AnimTask_UpdateSlidingBg", start: 30, end: 167, rows: 138 },
      { slot: 0, symbol: "Task_ClearMonBg", start: 145, end: 147, rows: 3 },
      { slot: 0, symbol: "Task_FadeToBg", start: 149, end: 186, rows: 38 },
      { slot: 1, symbol: "AnimTask_BlendSpriteColor_Step2", start: 168, end: 171, rows: 4 },
    ],
    sparkEnds: [94, 139, 103, 116, 96, 141, 105, 118, 98, 143, 107, 120, 106, 115, 108, 117, 110, 119],
  },
};

function verifySide(side: Side, config: Json, compareMap = true): Json {
  const want = expected[side], json = gunzipSync(file(config.denseState)), probe = JSON.parse(json.toString("utf8")) as Json, rows = probe.frames as Json[];
  const rgb = rawFrames(config.rawRgbArchive, rows);
  invariant(sha(json) === config.probeJsonSha256 && config.probeJsonSha256 === config.repeatProbeJsonSha256, `${side}: twice-fresh semantic payload`);
  invariant(sha(Buffer.concat(rgb)) === config.rawRgbSequenceSha256 && config.rawRgbSequenceSha256 === config.repeatRawRgbSequenceSha256, `${side}: twice-fresh raw RGB sequence`);
  invariant(probe.schema === "silver-wind-dense-evidence/v1" && probe.profile === "battle-scene-on" && probe.move === 318, `${side}: identity`);
  invariant(rows.length === want.rows && probe.sourceWindow.startFrame === want.start && probe.sourceWindow.endFrame === want.start + want.rows - 1 && probe.sourceWindow.frameCount === want.rows && probe.sourceWindow.sourceFrameCount === want.rows, `${side}: complete unthinned root window`);
  invariant(probe.sourcePointerContract.start === 0x082d630b && probe.sourcePointerContract.endExclusive === 0x082d6523 && same(probe.sourcePointerContract.observedParities, [0, 1]), `${side}: pointer-owned root`);
  invariant(rows.every((row, age) => row.frame === want.start + age) && rows[0]!.animScriptActive && rows[0]!.scriptOffset === 0 && !rows.at(-1)!.animScriptActive, `${side}: chronological root through first inactive cleanup`);
  invariant(rows.every((row) => row.softwareOam.length === 128 && row.hardwareOam.length === 128 && row.softwareMatrices.length === 32 && row.hardwareMatrices.length === 32 && row.fadedPalette.length === 512 && row.unfadedPalette.length === 512 && row.hardwarePalette.length === 512), `${side}: complete transfer banks`);
  invariant(same(ranges(rows, "tasks", () => true), want.taskLives), `${side}: complete task lives`);

  const sparkles = ranges(rows, "sprites", (entry) => entry.template.symbol?.startsWith("gSilverWind"));
  invariant(sparkles.length === 18 && same(sparkles.map((entry) => entry.start), [49,49,49,49,51,51,51,51,53,53,53,53,61,61,63,63,65,65]) && same(sparkles.map((entry) => entry.end), want.sparkEnds), `${side}: all eighteen sparkle lives`);
  const owned = rows.flatMap((row) => row.sprites.filter((entry: Json) => entry.template.symbol?.startsWith("gSilverWind")));
  invariant(owned.every((entry: Json) => entry.callback.symbol === "AnimFlyingParticle_Step") && ["Big", "Medium", "Small"].every((size) => sparkles.filter((entry) => entry.symbol.includes(size)).length === 6), `${side}: sparkle callback/template census`);

  invariant(rows.slice(1).every((row, index) => same(row.hardwareOam, rows[index]!.softwareOam)), `${side}: whole OAM RAM+1`);
  invariant(rows.slice(1).every((row, index) => same(row.hardwareMatrices, rows[index]!.softwareMatrices)), `${side}: whole matrix transfer RAM+1`);
  invariant(same(rows.slice(1).flatMap((row, index) => same(row.hardwarePalette, rows[index]!.fadedPalette) ? [] : [index + 1]), [6]), `${side}: whole palette RAM+1 except same-row monbg load`);

  const firstExclude = [11,12,13,14], secondExclude = [want.fadeOutStart, want.fadeOutStart + 1, want.fadeOutStart + 2, want.fadeOutStart + 3];
  for (const bank of [1, 3, want.attackerBank]) {
    invariant(same(transitions(rows, (row) => paletteBank(row.fadedPalette, bank)), [...firstExclude, ...secondExclude]), `${side}: exclude affected bank ${bank}`);
    invariant(same(transitions(rows, (row) => paletteBank(row.hardwarePalette, bank)), [...firstExclude.map((age) => age + 1), ...secondExclude.map((age) => age + 1)]), `${side}: affected bank ${bank} hardware RAM+1`);
  }
  invariant(same(transitions(rows, (row) => paletteBank(row.fadedPalette, 2)), [...firstExclude, 30, 32, ...secondExclude]), `${side}: affected BG bank plus middle BG-only pass`);
  invariant(transitions(rows, (row) => paletteBank(row.fadedPalette, want.targetBank)).length === 0, `${side}: target OBJ bank excluded from both passes`);
  invariant(same(transitions(rows, (row) => paletteBank(row.fadedPalette, want.monBgBank)), [6]) && same(transitions(rows, (row) => paletteBank(row.hardwarePalette, want.monBgBank)), [6]), `${side}: monbg palette same-row load`);
  invariant(same(transitions(rows, (row) => paletteBank(row.fadedPalette, 23)), [1]) && same(transitions(rows, (row) => paletteBank(row.hardwarePalette, 23)), [2]), `${side}: sparkle palette load and hardware RAM+1`);

  invariant(same(transitions(rows, (row) => row.battleBg[want.selectedSource]), [6, want.monBgClear]) && same(transitions(rows, (row) => row.registers[want.selectedRegister]), [7, want.monBgClear + 1]), `${side}: target monbg and cleanup RAM+1`);
  const signed9 = (value: number): number => value >= 0x100 ? value - 0x200 : value;
  invariant(rows.slice(31, want.slidingEnd + 2).every((row, index) => signed9(row.registers.bg3hofs) === signed9(rows[index + 30]!.battleBg.gBattle_BG3_X & 0x1ff)), `${side}: sliding BG software to hardware RAM+1`);
  invariant(rows[30]!.battleBg.gBattle_BG3_X === (side === "player-back" ? -6 : 6) && rows[want.slidingEnd]!.battleBg.gBattle_BG3_X === 0 && rows[want.slidingEnd + 1]!.registers.bg3hofs === 0, `${side}: side-specific sliding BG direction and cleanup`);
  invariant(same(transitions(rows, (row) => row.bgVram.allSha256), want.bgVram), `${side}: BUG BG load/restore VRAM lifecycle`);
  invariant(rows[7]!.registers[side === "player-back" ? "bg1cnt" : "bg2cnt"] === (side === "player-back" ? 23554 : 24066) && rows[9]!.registers.bg1cnt === 23553 && rows[9]!.registers.bg2cnt === 24066, `${side}: monbg plus splitbgprio_foes setup`);

  invariant(same(transitions(rows, (row) => row.tileTags), [1, want.cleanup]) && same(transitions(rows, (row) => row.paletteTags), [1, want.cleanup]) && rows[1]!.tileTags[6] === 10271 && rows[1]!.paletteTags[7] === 10271 && rows.at(-1)!.tileTags[6] === 0xffff && rows.at(-1)!.paletteTags[7] === 0xffff, `${side}: Sparkle6 tag/resource lifecycle`);
  invariant(rows[4]!.audio.SE1.songHeaderIdentity.symbol === "se_m_morning_sun" && rows[4]!.audio.SE2.songHeaderIdentity.symbol === "se_m_gust" && rows[want.audioEnd]!.audio.SE2.songHeaderIdentity.symbol === "se_m_gust2", `${side}: all three audio commands`);
  invariant(same(rows.slice(1).flatMap((row, index) => row.animationRng === rows[index]!.animationRng ? [index + 1] : []), want.rngHolds), `${side}: presentation RNG cadence`);
  for (const key of ["playerParty", "opponentParty", "battleMons", "battleOutcome", "battleWeather", "gameplayRng"]) invariant(rows.every((row) => same(row.rawBattleState[key], rows[0]!.rawBattleState[key])), `${side}: immutable ${key}`);
  for (const key of ["immutableState", "parties", "battlers", "engine"]) invariant(rows.every((row) => same(row[key], rows[0]![key])), `${side}: immutable ${key}`);
  const attacker = side === "player-back" ? rows[0]!.parties.player[0] : rows[0]!.parties.opponent[0];
  invariant(attacker.species === 12 && attacker.moves.every((move: number) => move === 318), `${side}: legal Butterfree carrier`);
  invariant(rows.every((row) => row.parties.player.slice(1).concat(row.parties.opponent.slice(1)).every((mon: Json) => mon.checksumValid)), `${side}: checksum-valid benches`);
  invariant(rows.at(-1)!.visualTaskCount === 0 && rows.at(-1)!.soundTaskCount === 0 && rows.at(-1)!.tasks.length === 0 && !rows.at(-1)!.sprites.some((entry: Json) => entry.template.symbol?.startsWith("gSilverWind")) && rows.at(-1)!.registers.bldcnt === 0 && rows.at(-1)!.registers.bldy === 0, `${side}: first inactive cleanup`);
  if (compareMap) invariant(normalizedMap(side, rows, rgb) === file(config.changeMap).toString("utf8"), `${side}: normalized map regeneration`);
  return { rows: want.rows, startFrame: want.start, cleanupAge: want.cleanup, probeJsonSha256: sha(json), rawRgbSequenceSha256: sha(Buffer.concat(rgb)), sparkles: 18, oamRamPlusOneRows: want.rows - 1, matrixRamPlusOneRows: want.rows - 1, paletteRamPlusOneRows: want.rows - 2, paletteSameRowExceptions: [6], slidingBgFirstSourceAge: 30, slidingBgFirstHardwareAge: 31, slidingBgClearSourceAge: want.slidingEnd, slidingBgClearHardwareAge: want.slidingEnd + 1, excludedTargetBank: want.targetBank, affectedBanks: [1,2,3,want.attackerBank] };
}

export function verifySilverWindEvidence(compareMaps = true): Json {
  const fixture = JSON.parse(file("tools/compare/fixtures/silver-wind-evidence.json").toString("utf8")) as Json;
  invariant(fixture.schema === "silver-wind-bilateral-evidence/v1" && fixture.status === "unsupported-evidence-checkpoint" && fixture.coverageCredit === false, "unsupported evidence boundary");
  for (const side of ["player-back", "opponent-front"] as const) for (const key of ["scenario", "denseState", "rawRgbArchive", ...(compareMaps ? ["changeMap"] : [])]) invariant(sha(file(fixture.orientations[side][key])) === fixture.orientations[side][`${key}Sha256`], `${side}: ${key} digest`);
  for (const key of ["audit", "probe", "sharedProbe", "stagingReceipt"]) invariant(sha(file(fixture.source[key])) === fixture.source[`${key}Sha256`], `source ${key}`);
  const auditText = execFileSync(process.execPath, ["--experimental-strip-types", fixture.source.audit], { cwd: root, encoding: "utf8", maxBuffer: 16 << 20 });
  const audit = JSON.parse(auditText) as Json;
  invariant(sha(auditText) === fixture.source.auditRunSha256 && audit.graph.coverage.entryPresent === false && audit.graph.coverage.queueContainsMove === false && audit.graph.coverage.sharedTrackListedButUnfulfilled === "blend-battle-anim-palette-exclude", "source repeatability/no credit");
  const data = coverage as Json;
  invariant(data.entries.find((entry: Json) => entry.move === "MOVE_SILVER_WIND")?.status === "exact"
    && data.entries.find((entry: Json) => entry.move === "MOVE_SKY_ATTACK")?.status === "exact"
    && !data.queue.includes("MOVE_SILVER_WIND")
    && data.componentTracks.find((track: Json) => track.id === "blend-battle-anim-palette-exclude")?.fulfilled === true,
  "exact coverage/queue/component-track boundary");
  return { schema: fixture.schema, status: fixture.status, coverageCredit: fixture.coverageCredit, orientations: Object.fromEntries((["player-back", "opponent-front"] as const).map((side) => [side, verifySide(side, fixture.orientations[side], compareMaps)])) };
}

if (process.argv.includes("--write-maps")) {
  const fixture = JSON.parse(file("tools/compare/fixtures/silver-wind-evidence.json").toString("utf8")) as Json;
  for (const side of ["player-back", "opponent-front"] as const) {
    const probe = JSON.parse(gunzipSync(file(fixture.orientations[side].denseState)).toString("utf8")) as Json;
    writeFileSync(resolve(root, fixture.orientations[side].changeMap), normalizedMap(side, probe.frames, rawFrames(fixture.orientations[side].rawRgbArchive, probe.frames)));
  }
} else if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) console.log(JSON.stringify(verifySilverWindEvidence(), null, 2));
