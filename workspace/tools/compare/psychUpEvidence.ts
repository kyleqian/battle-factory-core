/** Strict hermetic verifier and normalized banked change-map generator for MOVE_PSYCH_UP. */
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
function invariant(value: unknown, message: string): asserts value { if (!value) throw new Error(`MOVE_PSYCH_UP evidence drift: ${message}`); }
function transitions(rows: Json[], select: (row: Json) => unknown): number[] {
  return rows.flatMap((row, age) => age && !same(select(row), select(rows[age - 1]!)) ? [age] : []);
}
function edgeValues(rows: Json[], select: (row: Json) => unknown): [number, unknown][] {
  return transitions(rows, select).map((age) => [age, select(rows[age]!)]);
}
function ranges(rows: Json[], key: "tasks" | "sprites", predicate: (entry: Json) => boolean): Json[] {
  const slots = new Map<number, number[]>();
  for (const [age, row] of rows.entries()) for (const entry of row[key]) if (predicate(entry)) {
    const ages = slots.get(entry.slot) ?? []; ages.push(age); slots.set(entry.slot, ages);
  }
  return [...slots].flatMap(([slot, ages]) => {
    const groups: number[][] = [];
    for (const age of ages) { const group = groups.at(-1); if (!group || age !== group.at(-1)! + 1) groups.push([age]); else group.push(age); }
    return groups.map((group) => ({ slot, start: group[0], end: group.at(-1), rows: group.length }));
  }).sort((a, b) => a.start - b.start || a.slot - b.slot);
}
function paletteBanks(palette: number[]): string[] {
  return Array.from({ length: 32 }, (_, bank) => sha(JSON.stringify(palette.slice(bank * 16, bank * 16 + 16))));
}
function rawFrames(path: string, rows: Json[]): Buffer[] {
  const names = execFileSync("tar", ["-tzf", resolve(root, path)], { encoding: "utf8" }).trim().split("\n").filter((name) => name.endsWith(".rgb"));
  const raw = execFileSync("tar", ["-xOzf", resolve(root, path)], { maxBuffer: 64 * 1024 * 1024 });
  const bytes = 240 * 160 * 3;
  invariant(names.length === rows.length && raw.length === rows.length * bytes, `${path}: raw RGB shape`);
  return rows.map((row, age) => {
    invariant(names[age]!.endsWith(`${String(row.frame).padStart(5, "0")}.rgb`), `${path}: raw member ${age}`);
    const frame = raw.subarray(age * bytes, (age + 1) * bytes);
    invariant(sha(frame) === row.sha256, `${path}: raw row ${age}`);
    return frame;
  });
}

const retained: Record<Side, { state: string; rgb: string; map: string }> = {
  "player-back": { state: "tools/compare/evidence/psych-up-player-dense-state.json.gz", rgb: "tools/compare/evidence/psych-up-player-raw-rgb.tar.gz", map: "tools/compare/evidence/psych-up-changemap-player.json" },
  "opponent-front": { state: "tools/compare/evidence/psych-up-opponent-dense-state.json.gz", rgb: "tools/compare/evidence/psych-up-opponent-raw-rgb.tar.gz", map: "tools/compare/evidence/psych-up-changemap-opponent.json" },
};

function normalizedMap(side: Side, rows: Json[], rgb: Buffer[]): string {
  const mapped = rows.map((row, age) => {
    let changedPixels = 0, minX = 240, minY = 160, maxX = -1, maxY = -1;
    if (age) for (let pixel = 0; pixel < 240 * 160; pixel++) {
      const offset = pixel * 3;
      if (rgb[age]![offset] === rgb[age - 1]![offset] && rgb[age]![offset + 1] === rgb[age - 1]![offset + 1] && rgb[age]![offset + 2] === rgb[age - 1]![offset + 2]) continue;
      changedPixels++; const x = pixel % 240, y = Math.floor(pixel / 240);
      minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
    const spiral = row.sprites.filter((entry: Json) => entry.template.symbol === "gPsychUpSpiralSpriteTemplate");
    const banked = (palette: number[]) => Object.fromEntries([1,2,3,8,9,16,17,23].map((bank) => [bank, paletteBanks(palette)[bank]]));
    const battler = (entry: Json) => ({ slot: entry.slot, attr: entry.attr, x: entry.x, y: entry.y, x2: entry.x2, y2: entry.y2, flags: entry.flags, invisible: entry.invisible, matrixNum: entry.matrixNum, matrix: entry.matrix });
    return {
      age, frame: row.frame, active: row.animScriptActive, scriptOffset: row.scriptOffset, scriptWait: row.scriptWait, animArgs: row.animArgs,
      changedPixels, bounds: changedPixels ? [minX,minY,maxX,maxY] : null, counts: { visual: row.visualTaskCount, sound: row.soundTaskCount },
      spiral: spiral.map((entry: Json) => ({ slot: entry.slot, callback: entry.callback.symbol, attr: entry.attr, x: entry.x, y: entry.y, x2: entry.x2, y2: entry.y2, animNum: entry.animNum, animCmdIndex: entry.animCmdIndex, animDelayCounter: entry.animDelayCounter, subpriority: entry.subpriority, flags: entry.flags, matrixNum: entry.matrixNum, matrix: entry.matrix, data: entry.data })),
      battlers: { attacker: battler(row.battlerSprites.attacker), target: battler(row.battlerSprites.target) },
      tasks: row.tasks.map((entry: Json) => ({ slot: entry.slot, func: entry.func.symbol, data: entry.data })), spriteOrder: row.spriteOrder,
      oam: { software: sha(JSON.stringify(row.softwareOam)), hardware: sha(JSON.stringify(row.hardwareOam)) },
      matrices: { software: sha(JSON.stringify(row.softwareMatrices)), hardware: sha(JSON.stringify(row.hardwareMatrices)), allocation: row.resourceAllocators.matrixBitmap },
      palettes: { unfaded: banked(row.unfadedPalette), faded: banked(row.fadedPalette), hardware: banked(row.hardwarePalette) },
      resources: { spiralTileBank: row.tileTags.indexOf(10196), spiralPaletteBank: row.paletteTags.indexOf(10196), allocators: sha(JSON.stringify(row.resourceAllocators)) },
      registers: row.registers, bg: { scroll: row.battleBg, vram: sha(JSON.stringify(row.bgVram)) },
      audio: { SE1: { symbol: row.audio.SE1.songHeaderIdentity.symbol, status: row.audio.SE1.status, tracks: row.audio.SE1.tracks.map((track: Json) => ({ flags: track.flags, pan: track.pan, panX: track.panX })) }, SE2: { symbol: row.audio.SE2.songHeaderIdentity.symbol, status: row.audio.SE2.status } },
      rng: { animation: row.animationRng, gameplay: row.rawBattleState.gameplayRng },
      state: { semantic: sha(JSON.stringify(row.immutableState)), rawBanks: Object.fromEntries(Object.entries(row.rawBattleState).map(([key, value]) => [key, sha(JSON.stringify(value))])) },
    };
  });
  return `${JSON.stringify({ schema: "psych-up-normalized-banked-change-map/v1", side, rows: mapped })}\n`;
}

const bgCycleEdges = [10,14,18,22,26,30,40,44,48,52,56,66,70,74,78,82,92,96,100,104,108,118,122,126,130,134,144,148,152,156,160,164];
const attackerBlendEdges = [143,146,149,152,155,158,161,164,167,170,173];
const taskLives: Record<string, Json[]> = {
  AnimTask_BlendColorCycleExcludeLoop: [{ slot: 0, start: 7, end: 169, rows: 163 }],
  AnimTask_SwayMonStep: [{ slot: 3, start: 7, end: 108, rows: 102 }],
  AnimTask_ScaleMonAndRestore_Step: [{ slot: 2, start: 142, end: 160, rows: 19 }],
  AnimTask_BlendSpriteColor_Step2: [{ slot: 3, start: 142, end: 172, rows: 31 }],
  Task_UpdateMonBg: [{ slot: 1, start: 4, end: 176, rows: 173 }],
  Task_ClearMonBg: [{ slot: 0, start: 174, end: 176, rows: 3 }],
  Task_LoopAndPlaySE: [{ slot: 2, start: 7, end: 59, rows: 53 }],
};

function verifySide(side: Side, config: Json): Json {
  const json = gunzipSync(file(config.denseState)); const probe = JSON.parse(json.toString("utf8")) as Json, rows = probe.frames as Json[];
  const rgb = rawFrames(config.rawRgbArchive, rows), startFrame = side === "player-back" ? 379 : 375;
  invariant(sha(json) === config.probeJsonSha256 && config.probeJsonSha256 === config.repeatProbeJsonSha256, `${side}: twice-fresh semantic payload`);
  invariant(sha(Buffer.concat(rgb)) === config.rawRgbSequenceSha256 && config.rawRgbSequenceSha256 === config.repeatRawRgbSequenceSha256, `${side}: twice-fresh RGB payload`);
  invariant(probe.schema === "psych-up-dense-evidence/v1" && probe.profile === "battle-scene-on" && probe.move === 244, `${side}: identity`);
  invariant(rows.length === 179 && probe.sourceWindow.startFrame === startFrame && probe.sourceWindow.endFrame === startFrame + 178 && probe.sourceWindow.sourceFrameCount === 179, `${side}: complete unthinned window`);
  invariant(probe.sourcePointerContract.start === 0x082caaea && probe.sourcePointerContract.endExclusive === 0x082cab5c && same(probe.sourcePointerContract.observedParities, [0,1]), `${side}: pointer contract`);
  invariant(rows[0]!.animScriptActive && rows[0]!.scriptOffset === 0 && !rows.at(-1)!.animScriptActive && rows.at(-1)!.scriptOffset === 113, `${side}: root through first inactive`);
  invariant(same(edgeValues(rows, (row) => row.scriptOffset), [[1,3],[4,5],[7,67],[136,69],[142,109],[174,113]]), `${side}: source cursor`);
  invariant(same(edgeValues(rows, (row) => row.animArgs), [[7,[0,side === "player-back" ? 5 : -5,2560,8,0,0,0,0]],[142,[2,2,10,0,1023,0,0,0]]]), `${side}: source anim args`);
  invariant(rows.every((row) => row.softwareOam.length === 128 && row.hardwareOam.length === 128 && row.softwareMatrices.length === 32 && row.hardwareMatrices.length === 32 && row.fadedPalette.length === 512 && row.hardwarePalette.length === 512), `${side}: full hardware banks`);

  for (const [symbol, expected] of Object.entries(taskLives)) {
    invariant(same(ranges(rows, "tasks", (entry) => entry.func.symbol === symbol), expected), `${side}: ${symbol} life`);
    for (const row of rows) for (const task of row.tasks.filter((entry: Json) => entry.func.symbol === symbol)) invariant(task.data.length === 16, `${side}: ${symbol} full data`);
  }
  const expectedUpdate = side === "player-back" ? [6,72,84,-40,-52,1,0,0,0,0,0,0,0,0,0,0] : [8,176,38,-144,-6,0,1,0,0,0,0,0,0,0,0,0];
  invariant(same(rows[4]!.tasks.find((entry: Json) => entry.func.symbol === "Task_UpdateMonBg")!.data, expectedUpdate), `${side}: monbg task data`);
  invariant(same(rows[7]!.tasks.find((entry: Json) => entry.func.symbol === "AnimTask_BlendColorCycleExcludeLoop")!.data, [1,2,5,1,11,0,0,0,1,0,14,0,0,0,0,0]), `${side}: exclude-cycle mask/coefficients`);
  invariant(same(rows[142]!.tasks.find((entry: Json) => entry.func.symbol === "AnimTask_ScaleMonAndRestore_Step")!.data.slice(0,12), [-5,-5,9,10,side === "player-back" ? 6 : 8,0,0,0,0,0,251,251]), `${side}: scale task initializer`);
  invariant(same(rows[142]!.tasks.find((entry: Json) => entry.func.symbol === "AnimTask_BlendSpriteColor_Step2")!.data.slice(0,12), [0,side === "player-back" ? 1 : 2,2,10,0,1023,0,0,0,2,10,0]), `${side}: attacker yellow blend initializer`);

  const spiral = (entry: Json) => entry.template.symbol === "gPsychUpSpiralSpriteTemplate";
  invariant(same(ranges(rows, "sprites", spiral), [{ slot: 3, start: 7, end: 127, rows: 121 }]), `${side}: spiral life`);
  for (let age = 7; age <= 127; age++) {
    const entry = rows[age]!.sprites.find(spiral)!;
    invariant(entry.callback.symbol === "AnimSpriteOnMonPos" && entry.slot === 3 && entry.x === (side === "player-back" ? 72 : 176) && entry.y === (side === "player-back" ? 92 : 38), `${side}: spiral callback/geometry age ${age}`);
    invariant(entry.x2 === 0 && entry.y2 === 0 && entry.animNum === 0 && entry.animCmdIndex === 0 && entry.animDelayCounter === 0 && entry.subpriority === (side === "player-back" ? 28 : 38) && entry.flags === 1 && entry.matrixNum === 0 && same(entry.data, [1,0,0,0,0,0,0,0]), `${side}: spiral cell/OAM age ${age}`);
    invariant(rows[age]!.spriteOrder.filter((slot: number) => slot === 3).length === 1, `${side}: spiral stable painter membership age ${age}`);
  }
  invariant(rows.slice(1).every((row, age) => same(row.hardwareOam, rows[age]!.softwareOam)), `${side}: OAM RAM+1`);
  invariant(rows.slice(1).every((row, age) => age + 1 >= 143 && age + 1 <= 162 || same(row.hardwareMatrices, rows[age]!.softwareMatrices)), `${side}: ordinary matrices RAM+1 outside scale`);
  const attackerMatrix = rows[142]!.battlerSprites.attacker.matrixNum;
  invariant(rows.slice(144,163).every((row, index) => same(row.hardwareMatrices[attackerMatrix], rows[index + 142]!.softwareMatrices[attackerMatrix])), `${side}: ScaleMonAndRestore matrix RAM+2`);
  invariant(rows[7]!.resourceAllocators.matrixBitmap === 7 && rows[128]!.resourceAllocators.matrixBitmap === 6, `${side}: spiral matrix birth/teardown`);

  const attackerBank = side === "player-back" ? 16 : 17, copyBank = side === "player-back" ? 9 : 8;
  for (const bank of [1,2,3]) {
    invariant(same(transitions(rows, (row) => paletteBanks(row.fadedPalette)[bank]), bgCycleEdges), `${side}: excluded-cycle BG bank ${bank}`);
    invariant(same(transitions(rows, (row) => paletteBanks(row.hardwarePalette)[bank]), bgCycleEdges.map((age) => age + 1)), `${side}: excluded-cycle hardware bank ${bank}`);
  }
  for (const bank of [attackerBank,copyBank]) {
    const faded = bank === copyBank ? [4,...attackerBlendEdges] : attackerBlendEdges;
    const hardware = bank === copyBank ? [4,...attackerBlendEdges.map((age) => age + 1)] : attackerBlendEdges.map((age) => age + 1);
    invariant(same(transitions(rows, (row) => paletteBanks(row.fadedPalette)[bank]), faded), `${side}: attacker blend faded bank ${bank}`);
    invariant(same(transitions(rows, (row) => paletteBanks(row.hardwarePalette)[bank]), hardware), `${side}: attacker blend hardware bank ${bank}`);
  }
  invariant(rows.slice(1).flatMap((row, age) => same(row.hardwarePalette, rows[age]!.fadedPalette) ? [] : [age + 1]).every((age) => age === 4) && same(rows[4]!.hardwarePalette, rows[4]!.fadedPalette), `${side}: palette RAM+1 except monbg setup`);

  const sourceBg = side === "player-back" ? "gBattle_BG2_X" : "gBattle_BG1_X", hardwareBg = side === "player-back" ? "bg2hofs" : "bg1hofs";
  const bgEdges = transitions(rows, (row) => row.battleBg[sourceBg]);
  invariant(bgEdges[0] === 4 && bgEdges.at(-1) === 177 && same(transitions(rows, (row) => row.registers[hardwareBg]), bgEdges.map((age) => age + 1)), `${side}: monbg/SwayMon selected-BG RAM+1`);
  invariant(same(transitions(rows, (row) => row.battlerSprites.attacker.invisible), [4,142]), `${side}: attacker monbg membership`);
  invariant(same(transitions(rows, (row) => row.bgVram), [5,176,178]), `${side}: monbg VRAM copy/clear`);
  invariant(same(edgeValues(rows, (row) => [row.registers.bldcnt,row.registers.bldalpha,row.registers.bldy]), [[7,[16192,2060,0]],[174,[0,0,0]]]), `${side}: direct alpha/blendoff registers`);

  invariant(same(transitions(rows, (row) => row.resourceAllocators), [1,7,128,178]), `${side}: resource allocator lifecycle`);
  invariant(rows.slice(1,178).every((row) => row.tileTags.includes(10196) && row.paletteTags.includes(10196)) && !rows[0]!.tileTags.includes(10196) && !rows.at(-1)!.tileTags.includes(10196), `${side}: SPIRAL tag allocation/free`);
  invariant(same(edgeValues(rows, (row) => row.audio.SE1.songHeaderIdentity.symbol), [[7,"se_m_psybeam2"],[142,"se_m_psybeam"]]), `${side}: two audio schedules`);
  invariant(rows[7]!.tasks.find((entry: Json) => entry.func.symbol === "Task_LoopAndPlaySE")!.data[1] === (side === "player-back" ? -64 : 63), `${side}: loop audio pan`);
  invariant(same(edgeValues(rows, (row) => [row.visualTaskCount,row.soundTaskCount]), [[7,[3,1]],[60,[3,0]],[109,[2,0]],[128,[1,0]],[142,[3,0]],[161,[2,0]],[170,[1,0]],[173,[0,0]]]), `${side}: visual/sound counts`);

  for (const key of ["playerParty","opponentParty","battleMons","battleOutcome","battleWeather","gameplayRng"]) invariant(rows.every((row) => same(row.rawBattleState[key], rows[0]!.rawBattleState[key])), `${side}: immutable ${key}`);
  invariant(rows.every((row) => same(row.immutableState, rows[0]!.immutableState)), `${side}: immutable outcome/weather/sides/gameplay RNG`);
  invariant(rows.every((row) => row.parties.player.slice(1).concat(row.parties.opponent.slice(1)).every((mon: Json) => mon.checksumValid)), `${side}: checksum-valid benches`);
  const attacker = side === "player-back" ? rows[0]!.parties.player[0] : rows[0]!.parties.opponent[0];
  invariant(attacker.species === 189 && attacker.moves.every((move: number) => move === 244) && attacker.pp.reduce((sum: number, pp: number) => sum + pp, 0) === 39, `${side}: one legal Jumpluff Psych Up PP spent`);
  invariant(transitions(rows, (row) => row.animationRng).length === 176 && transitions(rows, (row) => row.rawBattleState.gameplayRng).length === 0, `${side}: presentation/gameplay RNG split`);
  invariant(rows.at(-1)!.visualTaskCount === 0 && rows.at(-1)!.soundTaskCount === 0 && rows.at(-1)!.tasks.length === 0 && !rows.at(-1)!.sprites.some(spiral) && rows.at(-1)!.registers.bldcnt === 0 && rows.at(-1)!.resourceAllocators.matrixBitmap === 6, `${side}: exact inactive cleanup`);
  invariant(normalizedMap(side, rows, rgb) === file(config.changeMap).toString("utf8"), `${side}: normalized map regeneration`);
  const changedRows = transitions(rows, (row) => row.sha256).length;
  invariant(changedRows === 149, `${side}: raw RGB transitions`);
  return { rows: 179, changedRows, probeJsonSha256: sha(json), rawRgbSequenceSha256: sha(Buffer.concat(rgb)), cleanupAge: 178, oamRamPlusOneRows: 178, scaleRamPlusTwoRows: 19 };
}

export function verifyPsychUpEvidence(): Json {
  const fixture = JSON.parse(file("tools/compare/fixtures/psych-up-evidence.json").toString("utf8")) as Json;
  invariant(fixture.schema === "psych-up-bilateral-evidence/v1" && fixture.status === "unsupported-evidence-checkpoint" && fixture.coverageCredit === false, "unsupported evidence boundary");
  for (const side of ["player-back","opponent-front"] as const) for (const key of ["scenario","denseState","rawRgbArchive","changeMap"]) invariant(sha(file(fixture.orientations[side][key])) === fixture.orientations[side][`${key}Sha256`], `${side}: ${key} digest`);
  for (const key of ["audit","probe","sharedProbe","stagingReceipt"]) invariant(sha(file(fixture.source[key])) === fixture.source[`${key}Sha256`], `source ${key}`);
  const audit = JSON.parse(execFileSync(process.execPath, ["--experimental-strip-types", fixture.source.audit], { cwd: root, encoding: "utf8" })) as Json;
  invariant(sha(`${JSON.stringify(audit, null, 2)}\n`) === fixture.source.auditRunSha256, "source audit repeatability");
  invariant(audit.coverageCredit === false && audit.graph.track.fulfilled === false && Object.keys(audit.controls.named).length === 7 && audit.controls.paletteSiblings.some((entry: Json) => entry.move === "MOVE_HYPER_BEAM") && audit.controls.paletteSiblings.some((entry: Json) => entry.move === "MOVE_THUNDERBOLT"), "identity-only sibling controls");
  return { schema: fixture.schema, status: fixture.status, coverageCredit: fixture.coverageCredit, orientations: Object.fromEntries((["player-back","opponent-front"] as const).map((side) => [side, verifySide(side, fixture.orientations[side])])) };
}

if (process.argv.includes("--write-maps")) {
  for (const side of ["player-back","opponent-front"] as const) {
    const probe = JSON.parse(gunzipSync(file(retained[side].state)).toString("utf8")) as Json;
    writeFileSync(resolve(root, retained[side].map), normalizedMap(side, probe.frames, rawFrames(retained[side].rgb, probe.frames)));
    console.log(`wrote ${retained[side].map}`);
  }
} else if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) console.log(JSON.stringify(verifyPsychUpEvidence(), null, 2));
