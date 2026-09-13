/** Strict hermetic verifier and normalized bank/change-map generator for MOVE_SMOG. */
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
function invariant(value: unknown, message: string): asserts value { if (!value) throw new Error(`MOVE_SMOG evidence drift: ${message}`); }
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
    for (const age of ages) {
      const group = groups.at(-1);
      if (!group || age !== group.at(-1)! + 1) groups.push([age]); else group.push(age);
    }
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
  "player-back": {
    state: "tools/compare/evidence/smog-player-dense-state.json.gz",
    rgb: "tools/compare/evidence/smog-player-raw-rgb.tar.gz",
    map: "tools/compare/evidence/smog-changemap-player.json",
  },
  "opponent-front": {
    state: "tools/compare/evidence/smog-opponent-dense-state.json.gz",
    rgb: "tools/compare/evidence/smog-opponent-raw-rgb.tar.gz",
    map: "tools/compare/evidence/smog-changemap-opponent.json",
  },
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
    const clouds = row.sprites.filter((entry: Json) => entry.template.symbol === "gSmogCloudSpriteTemplate");
    return {
      age, frame: row.frame, active: row.animScriptActive, scriptOffset: row.scriptOffset, scriptWait: row.scriptWait,
      changedPixels, bounds: changedPixels ? [minX, minY, maxX, maxY] : null,
      counts: { visual: row.visualTaskCount, sound: row.soundTaskCount },
      clouds: clouds.map((entry: Json) => ({ slot: entry.slot, callback: entry.callback.symbol, attr: entry.attr, x: entry.x, y: entry.y, x2: entry.x2, y2: entry.y2, animCmdIndex: entry.animCmdIndex, animDelayCounter: entry.animDelayCounter, data: entry.data, matrixNum: entry.matrixNum, matrix: entry.matrix, subpriority: entry.subpriority, flags: entry.flags })),
      target: { x2: row.battlerSprites.target.x2, y2: row.battlerSprites.target.y2, invisible: row.battlerSprites.target.invisible },
      tasks: row.tasks.map((entry: Json) => ({ slot: entry.slot, func: entry.func.symbol, data: entry.data })),
      spriteOrder: row.spriteOrder,
      oam: { software: sha(JSON.stringify(row.softwareOam)), hardware: sha(JSON.stringify(row.hardwareOam)) },
      matrices: { software: sha(JSON.stringify(row.softwareMatrices)), hardware: sha(JSON.stringify(row.hardwareMatrices)), allocation: row.resourceAllocators.matrixBitmap },
      palettes: {
        unfaded: sha(JSON.stringify(row.unfadedPalette)), faded: sha(JSON.stringify(row.fadedPalette)), hardware: sha(JSON.stringify(row.hardwarePalette)),
        selectedBanks: Object.fromEntries([8,16,17,23].map((bank) => [bank, {
          unfaded: paletteBanks(row.unfadedPalette)[bank], faded: paletteBanks(row.fadedPalette)[bank], hardware: paletteBanks(row.hardwarePalette)[bank],
        }])),
      },
      resources: { purpleTileBank: row.tileTags.indexOf(10172), purplePaletteBank: row.paletteTags.indexOf(10172), allocators: sha(JSON.stringify(row.resourceAllocators)) },
      registers: row.registers,
      bg: { scroll: row.battleBg, vram: sha(JSON.stringify(row.bgVram)) },
      audio: {
        se1: row.audio.SE1.songHeaderIdentity.symbol,
        se1Tracks: row.audio.SE1.tracks.map((track: Json) => ({ flags: track.flags, pan: track.pan, panX: track.panX })),
        se2: row.audio.SE2.songHeaderIdentity.symbol,
        se2Tracks: row.audio.SE2.tracks.map((track: Json) => ({ flags: track.flags, pan: track.pan, panX: track.panX })),
      },
      rng: { animation: row.animationRng, gameplay: row.rawBattleState.gameplayRng },
      state: { semantic: sha(JSON.stringify(row.immutableState)), rawBanks: Object.fromEntries(Object.entries(row.rawBattleState).map(([key, value]) => [key, sha(JSON.stringify(value))])) },
    };
  });
  return `${JSON.stringify({ schema: "smog-normalized-banked-change-map/v1", side, rows: mapped })}\n`;
}

const cloudLives = [
  { slot: 3, start: 7, end: 245, rows: 239 }, { slot: 4, start: 16, end: 254, rows: 239 },
  { slot: 5, start: 25, end: 263, rows: 239 }, { slot: 7, start: 34, end: 272, rows: 239 },
  { slot: 9, start: 43, end: 281, rows: 239 }, { slot: 10, start: 52, end: 290, rows: 239 },
  { slot: 11, start: 61, end: 299, rows: 239 },
];
const targetPaletteFadedEdges = [196,200,204,208,212,216,226,230,234,238,242,246];
const shakeEdges = [[204,[-2,0]],[206,[2,0]],[208,[-2,0]],[210,[2,0]],[212,[-2,0]],[214,[2,0]],[216,[-2,0]],[218,[2,0]],[220,[-2,0]],[222,[2,0]],[224,[-2,0]],[226,[2,0]],[228,[-2,0]],[230,[2,0]],[232,[0,0]]];

function verifyCloudPainterOrder(rows: Json[]): number {
  let equalTieRows = 0;
  for (const row of rows) {
    const clouds = new Map<number, Json>(row.sprites.filter((entry: Json) => entry.template.symbol === "gSmogCloudSpriteTemplate").map((entry: Json) => [entry.slot, entry]));
    const ordered = row.spriteOrder.filter((slot: number) => clouds.has(slot));
    invariant(ordered.length === clouds.size, `cloud sprite-order membership age ${row.frame}`);
    const keys = ordered.map((slot: number) => {
      const entry = clouds.get(slot)!, rawY = entry.attr[0] & 0xff;
      return { priority: entry.subpriority | (((entry.attr[2] >> 10) & 3) << 8), y: rawY >= 160 ? rawY - 256 : rawY };
    });
    invariant(keys.every((key: Json, index: number) => !index || keys[index - 1]!.priority < key.priority || (keys[index - 1]!.priority === key.priority && keys[index - 1]!.y >= key.y)), `cloud priority/descending-y order age ${row.frame}`);
    if (keys.some((key: Json, index: number) => index && keys[index - 1]!.priority === key.priority && keys[index - 1]!.y === key.y)) equalTieRows++;
  }
  return equalTieRows;
}

function verifySide(side: Side, config: Json): Json {
  const compressed = file(config.denseState), json = gunzipSync(compressed);
  const probe = JSON.parse(json.toString("utf8")) as Json, rows = probe.frames as Json[];
  const rgb = rawFrames(config.rawRgbArchive, rows), startFrame = side === "player-back" ? 69 : 73;
  invariant(sha(json) === config.probeJsonSha256 && config.probeJsonSha256 === config.repeatProbeJsonSha256, `${side}: twice-fresh semantic payload`);
  invariant(sha(Buffer.concat(rgb)) === config.rawRgbSequenceSha256 && config.rawRgbSequenceSha256 === config.repeatRawRgbSequenceSha256, `${side}: twice-fresh RGB payload`);
  invariant(probe.schema === "smog-dense-evidence/v1" && probe.profile === "battle-scene-on" && probe.move === 123, `${side}: identity`);
  invariant(rows.length === 306 && probe.sourceWindow.startFrame === startFrame && probe.sourceWindow.endFrame === startFrame + 305 && probe.sourceWindow.sourceFrameCount === 306, `${side}: complete window`);
  invariant(probe.sourcePointerContract.start === 0x082d01e5 && probe.sourcePointerContract.endExclusive === 0x082d0260 && same(probe.sourcePointerContract.observedParities, [0,1]), `${side}: pointer contract`);
  invariant(rows[0]!.animScriptActive && rows[0]!.scriptOffset === 0 && !rows.at(-1)!.animScriptActive && rows.at(-1)!.scriptOffset === 100, `${side}: root age zero through first inactive`);
  invariant(same(edgeValues(rows, (row) => row.scriptOffset), [[1,3],[4,5],[7,122],[70,52],[192,79],[204,96],[301,100]]), `${side}: source cursor schedule`);
  invariant(rows.every((row) => row.softwareOam.length === 128 && row.hardwareOam.length === 128 && row.softwareMatrices.length === 32 && row.hardwareMatrices.length === 32 && row.fadedPalette.length === 512 && row.unfadedPalette.length === 512 && row.hardwarePalette.length === 512), `${side}: retained hardware banks`);

  const cloud = (entry: Json) => entry.template.symbol === "gSmogCloudSpriteTemplate";
  invariant(same(ranges(rows, "sprites", cloud), cloudLives), `${side}: all seven cloud lives`);
  for (const life of cloudLives) for (let age = life.start; age <= life.end; age++) {
    const entry = rows[age]!.sprites.find((candidate: Json) => candidate.slot === life.slot && cloud(candidate));
    const local = age - life.start;
    invariant(entry && entry.callback.symbol === "AnimSwirlingFogAnim" && entry.matrixNum === 0 && same(entry.matrix, [256,0,0,256]) && entry.flags === 1, `${side}: cloud callback/matrix age ${age}`);
    invariant(entry.animCmdIndex === Math.floor((local + 1) / 8) % 2 && entry.animDelayCounter === ((6 - local) % 8 + 8) % 8, `${side}: cloud 8-frame cell timing age ${age}`);
    invariant(entry.data[0] === 238 - local && entry.data[4] === 100 + 50 * local && entry.data[5] === (70 + 3 * local) % 256 && entry.data[6] === 32 && entry.data[7] === (side === "player-back" ? 1 : 0), `${side}: cloud linear/sine callback age ${age}`);
  }
  invariant(cloudLives.every((life) => { const entry = rows[life.start]!.sprites.find((candidate: Json) => candidate.slot === life.slot && cloud(candidate)); return entry.x === (side === "player-back" ? 176 : 72) && entry.y === (side === "player-back" ? 16 : 64) && entry.x2 === 31 && entry.y2 === 0 && entry.subpriority === (side === "player-back" ? 28 : 38); }), `${side}: cloud side geometry`);
  invariant(rows.slice(1).every((row, age) => same(row.hardwareOam, rows[age]!.softwareOam)), `${side}: whole OAM RAM+1`);
  invariant(rows.slice(1).every((row, age) => same(row.hardwareMatrices, rows[age]!.softwareMatrices)), `${side}: whole matrices RAM+1`);
  invariant(transitions(rows, (row) => row.resourceAllocators.matrixBitmap).length === 0, `${side}: no affine allocation`);
  const equalTieRows = verifyCloudPainterOrder(rows);
  invariant(equalTieRows === 175, `${side}: stable equal-y painter witnesses`);

  invariant(same(ranges(rows, "tasks", (entry) => entry.func.symbol === "Task_UpdateMonBg"), [{ slot: 1, start: 4, end: 303, rows: 300 }]), `${side}: monbg update life`);
  invariant(same(ranges(rows, "tasks", (entry) => entry.func.symbol === "Task_ClearMonBg"), [{ slot: 0, start: 301, end: 303, rows: 3 }]), `${side}: monbg clear life`);
  invariant(same(ranges(rows, "tasks", (entry) => entry.func.symbol === "AnimTask_BlendColorCycleLoop"), [{ slot: 2, start: 192, end: 250, rows: 59 }]), `${side}: target blend-cycle life`);
  invariant(ranges(rows, "tasks", (entry) => entry.func.symbol?.includes("BlendColorCycleByTag")).length === 0, `${side}: source-correct selector task, not by-tag variant`);
  invariant(same(edgeValues(rows, (row) => row.tasks.find((entry: Json) => entry.func.symbol === "AnimTask_BlendColorCycleLoop")?.data ?? null), [[192,[4,2,1,0,12,26650,0,0,1,0,0,0,0,0,0,0]],[221,[4,2,0,0,12,26650,0,0,0,0,0,0,0,0,0,0]],[251,null]]), `${side}: target blend-cycle body/teardown`);
  const targetPaletteBank = side === "player-back" ? 17 : 16;
  invariant(same(transitions(rows, (row) => paletteBanks(row.fadedPalette)[targetPaletteBank]), targetPaletteFadedEdges), `${side}: target faded palette edges`);
  invariant(same(transitions(rows, (row) => paletteBanks(row.hardwarePalette)[targetPaletteBank]), targetPaletteFadedEdges.map((age) => age + 1)), `${side}: target hardware palette RAM+1 edges`);
  invariant(rows.slice(1).flatMap((row, age) => same(row.hardwarePalette, rows[age]!.fadedPalette) ? [] : [age + 1]).every((age) => age === 4) && same(rows[4]!.hardwarePalette, rows[4]!.fadedPalette), `${side}: palette RAM+1 except same-row monbg setup`);

  invariant(same(ranges(rows, "tasks", (entry) => entry.func.symbol === "AnimTask_ShakeMon2_Step"), [{ slot: 3, start: 204, end: 231, rows: 28 }]), `${side}: ShakeMon2 life`);
  invariant(same(edgeValues(rows, (row) => [row.battlerSprites.target.x2, row.battlerSprites.target.y2]), shakeEdges), `${side}: ShakeMon2 source axis`);
  const bgKey = side === "player-back" ? "gBattle_BG1_X" : "gBattle_BG2_X", bgReg = side === "player-back" ? "bg1hofs" : "bg2hofs";
  const sourceBgEdges = transitions(rows, (row) => row.battleBg[bgKey]), hardwareBgEdges = transitions(rows, (row) => row.registers[bgReg]);
  invariant(same(sourceBgEdges, [4,204,206,208,210,212,214,216,218,220,222,224,226,228,230,232,304]), `${side}: target monbg source/setup/shake/clear`);
  invariant(same(hardwareBgEdges, sourceBgEdges.map((age) => age + 1)), `${side}: target monbg and Smog ShakeMon2 RAM+1`);
  invariant(same(transitions(rows, (row) => row.battlerSprites.target.invisible), [4,301]), `${side}: target monbg visibility`);
  invariant(same(transitions(rows, (row) => row.bgVram), [5,303,305]), `${side}: monbg copy/clear VRAM`);
  invariant(same(edgeValues(rows, (row) => [row.registers.dispcnt,row.registers.bg1cnt,row.registers.bg2cnt,row.registers.winout]), side === "player-back" ? [[5,[48960,23554,24064,16191]],[7,[48960,23553,24066,16191]]] : [[5,[48960,39936,24066,16191]],[7,[48960,39937,24066,16191]]]), `${side}: defender-partner split priority`);
  invariant(same(edgeValues(rows, (row) => [row.registers.bldcnt,row.registers.bldalpha,row.registers.bldy]), [[7,[16192,2060,0]],[301,[0,0,0]]]), `${side}: setalpha/blendoff registers`);

  invariant(same(ranges(rows, "tasks", (entry) => entry.func.symbol === "Task_LoopAndPlaySE"), [{ slot: 0, start: 7, end: 167, rows: 161 }, { slot: 0, start: 192, end: 209, rows: 18 }]), `${side}: looped sound waits`);
  invariant(same(edgeValues(rows, (row) => row.audio.SE1.songHeaderIdentity.symbol), [[7,"se_m_mist"],[192,"se_m_toxic"]]), `${side}: MIST/TOXIC audio order`);
  invariant(rows[7]!.audio.SE1.tracks[0].panX === (side === "player-back" ? 63 : -63) && rows[192]!.audio.SE1.tracks[0].panX === (side === "player-back" ? 63 : -63), `${side}: target audio panning`);
  invariant(same(rows[7]!.tasks.find((entry: Json) => entry.func.symbol === "Task_LoopAndPlaySE")!.data.slice(0,4), [168,side === "player-back" ? 63 : -63,17,9]) && same(rows[192]!.tasks.find((entry: Json) => entry.func.symbol === "Task_LoopAndPlaySE")!.data.slice(0,4), [148,side === "player-back" ? 63 : -63,18,1]), `${side}: sound ids/intervals/repeats`);

  invariant(same(transitions(rows, (row) => row.resourceAllocators), [1,305]) && rows.slice(1,305).every((row) => row.tileTags.includes(10172) && row.paletteTags.includes(10172)), `${side}: PURPLE_GAS_CLOUD allocation life`);
  invariant(!rows[0]!.tileTags.includes(10172) && !rows.at(-1)!.tileTags.includes(10172) && !rows.at(-1)!.paletteTags.includes(10172), `${side}: PURPLE_GAS_CLOUD allocation/free`);
  invariant(same(transitions(rows, (row) => paletteBanks(row.fadedPalette)[23]), [1]) && same(transitions(rows, (row) => paletteBanks(row.hardwarePalette)[23]), [2]), `${side}: purple cloud palette transfer`);
  for (const key of ["playerParty","opponentParty","battleMons","battleOutcome","battleWeather","gameplayRng"]) invariant(rows.every((row) => same(row.rawBattleState[key], rows[0]!.rawBattleState[key])), `${side}: immutable ${key}`);
  invariant(rows.every((row) => same(row.immutableState, rows[0]!.immutableState)), `${side}: immutable semantic gameplay state`);
  invariant(rows.every((row) => row.parties.player.slice(1).concat(row.parties.opponent.slice(1)).every((mon: Json) => mon.checksumValid)), `${side}: checksum-valid benches`);
  const attacker = side === "player-back" ? rows[0]!.parties.player[0] : rows[0]!.parties.opponent[0];
  invariant(attacker.species === 240 && attacker.moves.every((move: number) => move === 123) && attacker.pp.reduce((sum: number, pp: number) => sum + pp, 0) === 79, `${side}: legal Magby and exactly one Smog PP spent`);
  invariant(transitions(rows, (row) => row.animationRng).length === 303 && transitions(rows, (row) => row.rawBattleState.gameplayRng).length === 0, `${side}: animation/gameplay RNG split`);
  invariant(rows.at(-1)!.visualTaskCount === 0 && rows.at(-1)!.soundTaskCount === 0 && rows.at(-1)!.tasks.length === 0 && !rows.at(-1)!.sprites.some(cloud) && rows.at(-1)!.registers.bldcnt === 0 && rows.at(-1)!.registers.bldalpha === 0 && rows.at(-1)!.registers.bldy === 0, `${side}: first fully clean inactive row`);
  invariant(normalizedMap(side, rows, rgb) === file(config.changeMap).toString("utf8"), `${side}: normalized map regeneration`);
  const changedRows = transitions(rows, (row) => row.sha256).length;
  invariant(changedRows === 293, `${side}: raw RGB change count`);
  return { rows: 306, changedRows, probeJsonSha256: sha(json), rawRgbSequenceSha256: sha(Buffer.concat(rgb)), cleanupAge: 305, equalTieRows };
}

export function verifySmogEvidence(): Json {
  const fixture = JSON.parse(file("tools/compare/fixtures/smog-evidence.json").toString("utf8")) as Json;
  invariant(fixture.schema === "smog-bilateral-evidence/v1" && fixture.status === "unsupported-evidence-checkpoint" && fixture.coverageCredit === false, "unsupported evidence boundary");
  for (const side of ["player-back","opponent-front"] as const) for (const key of ["scenario","denseState","rawRgbArchive","changeMap"]) invariant(sha(file(fixture.orientations[side][key])) === fixture.orientations[side][`${key}Sha256`], `${side}: ${key} digest`);
  for (const key of ["audit","probe","sharedProbe","stagingReceipt"]) invariant(sha(file(fixture.source[key])) === fixture.source[`${key}Sha256`], `source ${key}`);
  const audit = execFileSync(process.execPath, ["--experimental-strip-types", fixture.source.audit], { cwd: root });
  invariant(sha(audit) === fixture.source.auditRunSha256, "source audit output repeatability");
  const staging = JSON.parse(file(fixture.source.stagingReceipt).toString("utf8")) as Json;
  invariant(staging.runs["player-back"].romOutcome.targetFinalPartyHp === 141 && staging.runs["player-back"].romOutcome.targetFinalStatus === "none" && staging.runs["opponent-front"].romOutcome.targetFinalPartyHp === 124 && staging.runs["opponent-front"].romOutcome.targetFinalStatus === "poison", "linked legal damage/status outcomes");
  for (const side of ["player-back","opponent-front"] as const) invariant(staging.runs[side].pp.spent === 1 && staging.runs[side].benches.unchanged && staging.runs[side].benches.checksumValid, `${side}: linked legal PP/bench receipt`);
  return { schema: fixture.schema, status: fixture.status, coverageCredit: fixture.coverageCredit, orientations: Object.fromEntries((["player-back","opponent-front"] as const).map((side) => [side, verifySide(side, fixture.orientations[side])])) };
}

if (process.argv.includes("--write-maps")) {
  for (const side of ["player-back","opponent-front"] as const) {
    const probe = JSON.parse(gunzipSync(file(retained[side].state)).toString("utf8")) as Json;
    writeFileSync(resolve(root, retained[side].map), normalizedMap(side, probe.frames, rawFrames(retained[side].rgb, probe.frames)));
    console.log(`wrote ${retained[side].map}`);
  }
} else if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) console.log(JSON.stringify(verifySmogEvidence(), null, 2));
